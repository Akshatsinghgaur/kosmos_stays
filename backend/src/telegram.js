const axios = require('axios');
const Unit = require('./models/Unit');
const User = require('./models/User');
let offset = 0;
const api = token => `https://api.telegram.org/bot${token}`;
async function sendMessage(token, chatId, text, reply_markup) {
  return axios.post(`${api(token)}/sendMessage`, { chat_id: chatId, text, ...(reply_markup ? { reply_markup } : {}) });
}
async function handleUpdate(token, update) {
  const msg = update.message;
  if (msg?.text?.startsWith('/start') || msg?.text?.startsWith('/myid')) {
    const text = `Welcome to Kosmos Stays cleaning updates.\n\nYour Telegram chat ID is:\n${msg.chat.id}\n\nShare this number with your host so they can connect you. Keep this chat open to receive cleaning tasks.`;
    await sendMessage(token, msg.chat.id, text);
  }
  const cb = update.callback_query;
  if (cb?.data?.startsWith('clean:')) {
    const unitId = cb.data.slice(6);
    const unit = await Unit.findById(unitId);
    if (!unit) {
      await axios.post(`${api(token)}/answerCallbackQuery`, { callback_query_id: cb.id, text: 'Unit not found.' });
      return;
    }
    const owner = await User.findById(unit.hostId);
    if (unit.status !== 'cleaning') { await axios.post(`${api(token)}/answerCallbackQuery`, { callback_query_id: cb.id, text: 'This unit is no longer waiting for cleaning.' }); return; }
    if (!owner || String(owner.telegramCleanerId) !== String(cb.message.chat.id)) { await axios.post(`${api(token)}/answerCallbackQuery`, { callback_query_id: cb.id, text: 'This task is assigned to another cleaner.' }); return; }
    unit.status = 'available'; unit.cleaningStartedAt = null; unit.overdueAlertedAt = null; await unit.save();
    await axios.post(`${api(token)}/answerCallbackQuery`, { callback_query_id: cb.id, text: `${unit.unitCode} marked ready` });
    await axios.post(`${api(token)}/editMessageText`, { chat_id: cb.message.chat.id, message_id: cb.message.message_id, text: `✅ Unit ${unit.unitCode} is marked clean and available.` });
    const host = await User.findById(unit.hostId);
    if (host?.telegramCleanerId && host.telegramCleanerId !== String(cb.message.chat.id)) {
      try { await sendMessage(token, host.telegramCleanerId, `✅ Unit ${unit.unitCode} has been marked clean and is available.`); } catch {}
    }
  }
}
async function poll(token) {
  while (true) {
    try {
      const r = await axios.get(`${api(token)}/getUpdates`, { params: { timeout: 25, offset, allowed_updates: ['message', 'callback_query'] }, timeout: 35000 });
      for (const update of r.data.result || []) { offset = update.update_id + 1; try { await handleUpdate(token, update); } catch (e) { console.error('Telegram update error:', e.response?.data?.description || e.message); } }
    } catch (e) { console.error('Telegram polling error:', e.response?.data?.description || e.message); await new Promise(resolve => setTimeout(resolve, 5000)); }
  }
}
async function notifyCheckout(unit, host) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !host?.telegramCleanerId) return { sent: false, reason: 'Cleaner Telegram is not connected' };
  await sendMessage(token, host.telegramCleanerId, `🧹 Kosmos Stays cleaning task\n\nUnit: ${unit.unitCode}\nA guest has checked out. Please clean the unit and tap Mark Unit Ready.`, { inline_keyboard: [[{ text: '✅ Mark Unit Ready', callback_data: `clean:${unit._id}` }]] });
  return { sent: true };
}
async function sendTest(token, chatId) { return sendMessage(token, chatId, '🔔 Kosmos Stays test notification\n\nYour cleaner notifications are connected successfully. No booking or unit status has been changed.'); }
async function alertOverdue() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  const cutoff = new Date(Date.now() - 30 * 60 * 1000);
  const overdue = await Unit.find({ status: 'cleaning', cleaningStartedAt: { $lte: cutoff }, overdueAlertedAt: null });
  for (const unit of overdue) {
    const host = await User.findById(unit.hostId);
    const text = `⚠️ Kosmos Stays cleaning delay\nUnit ${unit.unitCode} has not been marked ready within 30 minutes.`;
    try { if (host?.telegramCleanerId) await sendMessage(token, host.telegramCleanerId, text); } catch (e) { console.error('Cleaner delay alert failed:', e.message); }
    try { if (host?.telegramHostId) await sendMessage(token, host.telegramHostId, `${text}\nCleaner: ${host.telegramCleanerName || 'Assigned cleaner'}`); } catch (e) { console.error('Host delay alert failed:', e.message); }
    try { if (process.env.ADMIN_TELEGRAM_ID) await sendMessage(token, process.env.ADMIN_TELEGRAM_ID, `${text}\nHost: ${host?.name || 'Unknown'}`); } catch (e) { console.error('Admin delay alert failed:', e.message); }
    unit.overdueAlertedAt = new Date(); await unit.save();
  }
}
module.exports = { poll, notifyCheckout, sendTest, alertOverdue };

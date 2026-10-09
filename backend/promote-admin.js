require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
async function main() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  if (!process.env.MONGODB_URI || !email) throw new Error('Set MONGODB_URI and ADMIN_EMAIL in backend/.env first.');
  await mongoose.connect(process.env.MONGODB_URI);
  const user = await User.findOneAndUpdate({ email }, { $set: { role: 'admin' } }, { new: true });
  if (!user) {
    console.error(`No account found for ${email}. Create that account in the app first, then rerun this script.`);
    process.exitCode = 1;
  } else {
    console.log(`Admin access enabled for ${user.email}. Delete this script from the deployment repository after use.`);
  }
  await mongoose.disconnect();
}
main().catch(async error => { console.error('Admin promotion failed:', error.message); await mongoose.disconnect().catch(() => {}); process.exitCode = 1; });

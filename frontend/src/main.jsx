import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import axios from 'axios';
import './index.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const api = axios.create({ baseURL: API });
api.interceptors.request.use(config => {
  const token = localStorage.getItem('ks_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
const money = n => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const prettyDate = d => d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('ks_user') || 'null'));
  const [page, setPage] = useState('home');
  const [bookings, setBookings] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  async function refresh() {
    if (!user) return;
    setLoading(true);
    try {
      const [b, u] = await Promise.all([api.get('/bookings'), api.get('/units')]);
      setBookings(Array.isArray(b.data) ? b.data : []);
      setUnits(Array.isArray(u.data) ? u.data : []);
    } catch (e) {
      setNotice(e.response?.data?.message || 'Could not load records. Please refresh.');
    } finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, [user]);

  function login(nextUser, token) {
    localStorage.setItem('ks_token', token);
    localStorage.setItem('ks_user', JSON.stringify(nextUser));
    setUser(nextUser);
  }
  function logout() {
    localStorage.removeItem('ks_token'); localStorage.removeItem('ks_user');
    setUser(null); setPage('home'); setBookings([]); setUnits([]);
  }
  if (!user) return <Login onLogin={login} />;

  const todayKey = new Date().toDateString();
  const todayBookings = bookings.filter(b => new Date(b.checkIn).toDateString() === todayKey && b.status !== 'cancelled');
  const activeBookings = bookings.filter(b => b.status === 'active');
  const revenueToday = todayBookings.reduce((sum, b) => sum + Number(b.amount || 0), 0);
  const nav = [
    { id: 'home', label: 'Home', icon: '⌂' },
    { id: 'bookings', label: 'Bookings', icon: '▤' },
    { id: 'units', label: 'Units', icon: '▦' },
    { id: 'stats', label: 'Stats', icon: '↗' },
    { id: 'profile', label: 'Profile', icon: '●' },
  ];

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand-lockup"><img src="/kosmos-logo.webp" alt="Kosmos Stays logo"/><div><div className="brand-name">KOSMOS <span>STAYS</span></div><div className="brand-sub">Your stays, beautifully organised</div></div></div>
      <div className="profile-area"><button className="avatar avatar-button" onClick={() => setPage('profile')} aria-label="Open profile">{(user.name || 'K').slice(0,1).toUpperCase()}</button><button className="profile-copy profile-open" onClick={() => setPage('profile')}><b>{user.name}</b><small>{user.role === 'admin' ? 'Administrator' : 'Host profile'}</small></button><button className="quiet-button" onClick={logout}>Log out</button></div>
    </header>
    {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice('')}>×</button></div>}
    <main className="main-content">
      {page === 'home' && <>
        <div className="welcome-row"><div><p className="eyebrow">YOUR DASHBOARD</p><h1>Good to see you, {user.name?.split(' ')[0] || 'there'}.</h1><p className="muted">Here’s how your stays are looking today.</p></div><button className="primary-button" onClick={() => setPage('new')}><span className="plus-icon">＋</span> Add booking</button></div>
        <div className="stats-grid"><Stat label="Today's check-ins" value={todayBookings.length} icon="↘"/><Stat label="Currently checked in" value={activeBookings.length} icon="⌂"/><Stat label="Today's booking value" value={money(revenueToday)} icon="₹"/><Stat label="Your units" value={units.length} icon="▦"/></div>
        <section className="section-card"><div className="section-heading"><div><h2>Today's register</h2><p className="muted">Bookings arriving today</p></div><button className="text-button" onClick={() => setPage('bookings')}>View all →</button></div>
          {loading ? <div className="empty-state">Loading your register…</div> : todayBookings.length ? todayBookings.map(b => <BookingCard key={b._id} booking={b} onCheckout={async id => { try { await api.post(`/bookings/${id}/checkout`); setNotice('Checkout recorded. Unit marked for cleaning.'); refresh(); } catch (e) { setNotice(e.response?.data?.message || 'Could not record checkout.'); } }} />) : <Empty title="A clear day starts here" text="When a guest checks in, add their booking and it will appear in your register." action="Add booking" onAction={() => setPage('new')} />}
        </section>
      </>}
      {page === 'bookings' && <BookingsPage bookings={bookings} onNew={() => setPage('new')} onCheckout={async id => { try { await api.post(`/bookings/${id}/checkout`); setNotice('Checkout recorded. Unit marked for cleaning.'); refresh(); } catch (e) { setNotice(e.response?.data?.message || 'Could not record checkout.'); } }} />}
      {page === 'new' && <NewBooking units={units} onCancel={() => setPage('bookings')} onDone={() => { setPage('bookings'); setNotice('Booking added successfully.'); refresh(); }} />}
      {page === 'units' && <UnitsPage units={units} refresh={refresh} />}
      {page === 'stats' && <StatsPage bookings={bookings} units={units} />}
      {page === 'profile' && <ProfilePage user={user} units={units} onUser={next => { setUser(next); localStorage.setItem('ks_user', JSON.stringify(next)); }} onPage={setPage} />}
      {page === 'cleaner' && <CleanerSetup user={user} onNotice={setNotice} />}
      {page === 'admin' && user.role === 'admin' && <AdminPanel onNotice={setNotice} />} 
    </main>
    <nav className="bottom-nav" aria-label="Main navigation">{nav.map(item => <button key={item.id} className={`nav-item ${page === item.id ? 'selected' : ''}`} onClick={() => setPage(item.id)}><span className="nav-icon">{item.icon}</span><span>{item.label}</span></button>)}<button className="nav-add" onClick={() => setPage('new')} aria-label="Add booking"><span>＋</span><small>Add</small></button></nav>
  </div>;
}

function Login({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', token: '' });
  const [err, setErr] = useState(''); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  async function go(e) {
    e.preventDefault(); setErr(''); setMessage(''); setBusy(true);
    try {
      if (mode === 'forgot') {
        const r = await api.post('/auth/forgot-password', { email: form.email });
        setMessage(r.data?.message || 'If this email is registered, password reset instructions have been sent.');
      } else if (mode === 'reset') {
        const r = await api.post('/auth/reset-password', { email: form.email, token: form.token, password: form.password });
        setMessage(r.data?.message || 'Password updated. You can now log in.');
        setMode('login'); setForm(v => ({ ...v, password: '' }));
      } else {
        const r = await api.post(`/auth/${mode}`, form);
        if (!r.data?.token || !r.data?.user) throw new Error('The server returned an incomplete response.');
        onLogin(r.data.user, r.data.token);
      }
    } catch (error) { setErr(error.response?.data?.message || error.message || 'Could not connect to the server.'); }
    finally { setBusy(false); }
  }
  const title = mode === 'login' ? 'Welcome back' : mode === 'register' ? 'Create your account' : mode === 'forgot' ? 'Reset your password' : 'Choose a new password';
  return <div className="login-screen"><div className="login-art"><img src="/kosmos-logo.webp" alt="Kosmos Stays"/><p>Thoughtful stays. Seamless records.</p></div><form className="login-card" onSubmit={go}><p className="eyebrow">KOSMOS STAYS</p><h1>{title}</h1><p className="muted">{mode === 'forgot' ? 'We’ll send reset instructions if the account exists.' : mode === 'reset' ? 'Enter the reset code from your email and a new password.' : 'Your simple, beautiful booking register.'}</p>
    {mode === 'register' && <label>Full name<input required autoComplete="name" placeholder="Your name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/></label>}
    <label>Email address<input required type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}/></label>
    {mode === 'reset' && <label>Reset code<input required autoComplete="one-time-code" placeholder="Paste reset code" value={form.token} onChange={e => setForm({ ...form, token: e.target.value })}/></label>}
    {['login','register','reset'].includes(mode) && <label>{mode === 'reset' ? 'New password' : 'Password'}<input required minLength={8} type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder={mode === 'reset' ? 'At least 8 characters' : 'Enter password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}/></label>}
    {err && <p className="form-error">{err}</p>}{message && <p className="success-message" role="status">{message}</p>}
    <button className="primary-button full-button" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Log in' : mode === 'register' ? 'Create account' : mode === 'forgot' ? 'Send reset instructions' : 'Update password'}</button>
    <div className="login-links">{mode === 'login' && <button type="button" className="text-button centered" onClick={() => {setMode('forgot');setErr('');setMessage('')}}>Forgot password?</button>}{mode === 'forgot' && <button type="button" className="text-button centered" onClick={() => {setMode('reset');setErr('');setMessage('')}}>I have a reset code</button>}{mode !== 'login' && <button type="button" className="text-button centered" onClick={() => {setMode('login');setErr('');setMessage('')}}>Back to log in</button>}{mode === 'login' && <button type="button" className="text-button centered" onClick={() => {setMode('register');setErr('');setMessage('')}}>New to Kosmos? Create an account</button>}{mode === 'register' && <button type="button" className="text-button centered" onClick={() => {setMode('login');setErr('');setMessage('')}}>Already have an account? Log in</button>}</div>
    <div className="support-inline"><span>Need help?</span> <a href="tel:+918796485062">+91 8796485062</a> <span aria-hidden="true">·</span> <a href="mailto:support@kosmosstays.in">support@kosmosstays.in</a></div>
  </form></div>;
}
function Stat({ label, value, icon }) { return <div className="stat-card"><span className="stat-icon">{icon}</span><p>{label}</p><strong>{value}</strong></div>; }
function StatusPill({ status }) { const labels = { active: 'Checked in', upcoming: 'Not checked in', checked_out: 'Checked out', cancelled: 'Cancelled' }; return <span className={`status-pill ${status || 'active'}`}>{labels[status] || status || 'Checked in'}</span>; }
function BookingCard({ booking: b, onCheckout }) { const [showIds,setShowIds]=useState(false),[photos,setPhotos]=useState([]),[photoError,setPhotoError]=useState(''); async function viewIds(){setShowIds(true);setPhotoError('');try{const list=[];for(const item of (b.ids||[])){const r=await api.get(`/bookings/${b._id}/ids/${encodeURIComponent(item.filename)}`,{responseType:'blob'});list.push({url:URL.createObjectURL(r.data),name:item.originalName||'Customer ID'});}setPhotos(list);if(!list.length)setPhotoError('No ID photos were attached to this booking.');}catch(e){setPhotoError('Could not load ID photos securely.');}} useEffect(()=>()=>photos.forEach(p=>URL.revokeObjectURL(p.url)),[photos]);return <><article className="booking-row"><div className="booking-symbol">⌂</div><div className="booking-info"><div className="booking-title"><b>{b.customerName || 'Guest'}</b><StatusPill status={b.status}/></div><p>{b.unitId?.unitCode || 'Unit'} <span>·</span> {b.bookingId}</p><p className="booking-time">{prettyDate(b.checkIn)} → {prettyDate(b.checkOut)}</p><div className="booking-meta"><span>{b.source || 'Direct'}</span><strong>{money(b.amount)}</strong></div><div className="action-row"><button className="secondary-button compact" onClick={viewIds}>View ID photos ({b.ids?.length||0})</button>{b.status === 'active' && <button className="checkout-button" onClick={() => onCheckout?.(b._id)}>✓ Check out</button>}</div></div></article>{showIds&&<div className="modal-backdrop" onClick={()=>setShowIds(false)}><div className="modal-card" onClick={e=>e.stopPropagation()}><div className="section-heading"><h2>Customer ID photos</h2><button className="quiet-button" onClick={()=>setShowIds(false)}>Close</button></div><p className="muted">{b.customerName} · {b.bookingId}</p>{photoError&&<p className="form-error">{photoError}</p>}<div className="id-photo-grid">{photos.map((ph,i)=><a key={ph.url} href={ph.url} target="_blank" rel="noreferrer"><img src={ph.url} alt={ph.name}/><small>{ph.name}</small></a>)}</div></div></div>}</>; }
function Empty({ title, text, action, onAction }) { return <div className="empty-state"><div className="empty-art">✧</div><h3>{title}</h3><p>{text}</p>{action && <button className="secondary-button" onClick={onAction}>{action}</button>}</div>; }
function BookingsPage({ bookings, onNew, onCheckout }) {
  const [filter, setFilter] = useState('all'); const [search, setSearch] = useState('');
  const rows = useMemo(() => bookings.filter(b => (filter === 'all' || (filter === 'active' ? b.status === 'active' : filter === 'checked_out' ? b.status === 'checked_out' : b.status !== 'checked_out' && b.status !== 'cancelled')) && `${b.bookingId} ${b.customerName} ${b.unitId?.unitCode || ''}`.toLowerCase().includes(search.toLowerCase())), [bookings, filter, search]);
  return <><div className="page-heading"><div><p className="eyebrow">YOUR RECORDS</p><h1>Bookings</h1><p className="muted">Add a booking when your guest has checked in.</p></div><button className="primary-button" onClick={onNew}><span className="plus-icon">＋</span> Add booking</button></div><div className="filter-bar"><input className="search-input" placeholder="Search guest, booking ID or unit" value={search} onChange={e => setSearch(e.target.value)}/><div className="filter-pills">{[['all','All'],['active','Checked in'],['checked_out','Checked out']].map(([id,label]) => <button key={id} className={filter === id ? 'filter-pill active-filter' : 'filter-pill'} onClick={() => setFilter(id)}>{label}</button>)}</div></div><section className="section-card">{rows.length ? rows.map(b => <BookingCard key={b._id} booking={b} onCheckout={onCheckout}/>) : <Empty title="No bookings found" text="Try another search or add a new guest booking." action="Add booking" onAction={onNew}/>}</section></>;
}
function NewBooking({ units, onCancel, onDone }) {
  const [f, setF] = useState({ unitId: '', customerName: '', checkIn: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0,16), checkOut: '', amount: '', source: 'Airbnb' });
  const [ids, setIds] = useState([]); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(e) { e.preventDefault(); setErr(''); setBusy(true); const data = new FormData(); Object.entries(f).forEach(([k,v]) => data.append(k,v)); ids.forEach(file => data.append('ids',file)); try { await api.post('/bookings',data); onDone(); } catch (error) { setErr(error.response?.data?.message || 'Could not create booking.'); } finally { setBusy(false); } }
  const available = units.filter(u => u.status === 'available' && u.active !== false);
  return <><div className="page-heading"><div><p className="eyebrow">GUEST REGISTER</p><h1>Add a booking</h1><p className="muted">Use this when the guest has arrived and checked in.</p></div><button className="quiet-button" onClick={onCancel}>Cancel</button></div><form className="form-card" onSubmit={submit}><div className="form-section-title"><span>01</span><div><h2>Guest and unit</h2><p>Who checked in?</p></div></div><label>Unit<select required value={f.unitId} onChange={e => setF({ ...f, unitId: e.target.value })}><option value="">Select a unit</option>{available.map(u => <option key={u._id} value={u._id}>{u.unitCode}</option>)}</select>{!available.length && <small className="muted">No available units. Add a unit or check a guest out first.</small>}</label><label>Guest full name<input required placeholder="Enter guest name" value={f.customerName} onChange={e => setF({ ...f, customerName: e.target.value })}/></label><label>Guest ID photo(s)<input type="file" required multiple accept="image/*" capture="environment" onChange={e => setIds(Array.from(e.target.files || []))}/><small className="muted">{ids.length ? `${ids.length} photo(s) selected` : 'Upload one or more clear ID photos.'}</small></label><div className="form-section-title spaced"><span>02</span><div><h2>Stay details</h2><p>Check-in and expected checkout</p></div></div><div className="two-col"><label>Check-in date & time<input required type="datetime-local" value={f.checkIn} onChange={e => setF({ ...f, checkIn: e.target.value })}/></label><label>Check-out date & time<input required type="datetime-local" value={f.checkOut} onChange={e => setF({ ...f, checkOut: e.target.value })}/></label></div><div className="form-section-title spaced"><span>03</span><div><h2>Payment record</h2><p>Booking amount and source</p></div></div><div className="two-col"><label>Total amount (₹)<input required min="0" type="number" placeholder="e.g. 2500" value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })}/></label><label>Booking source<select value={f.source} onChange={e => setF({ ...f, source: e.target.value })}>{['Airbnb','MakeMyTrip','Booking.com','Direct','Other'].map(x => <option key={x}>{x}</option>)}</select></label></div>{err && <p className="form-error">{err}</p>}<div className="form-actions"><button type="button" className="secondary-button" onClick={onCancel}>Cancel</button><button className="primary-button" disabled={busy || !available.length}>{busy ? 'Saving…' : 'Save checked-in booking'}</button></div></form></>;
}
function UnitsPage({ units, refresh }) {
 const [code,setCode]=useState(''),[err,setErr]=useState(''),[deleteTarget,setDeleteTarget]=useState(null),[confirmCode,setConfirmCode]=useState(''),[busy,setBusy]=useState(false);
 async function add(){if(!code.trim())return;setErr('');try{await api.post('/units',{unitCode:code.trim()});setCode('');refresh();setErr('Unit added. Subscription is pending until payment is confirmed by Kosmos Stays.')}catch(e){setErr(e.response?.data?.message||'Could not add unit.')}}
 async function remove(){if(!deleteTarget)return;setBusy(true);try{const r=await api.delete(`/units/${deleteTarget._id}`,{data:{confirmCode}});setErr(r.data.message);setDeleteTarget(null);setConfirmCode('');refresh()}catch(e){setErr(e.response?.data?.message||'Could not remove unit.')}finally{setBusy(false)}}
 async function clean(u){try{await api.post(`/units/${u._id}/clean`);setErr(`${u.unitCode} marked clean and available.`);refresh()}catch(e){setErr(e.response?.data?.message||'Could not mark unit clean')}}
 return <><div className="page-heading"><div><p className="eyebrow">YOUR SPACE</p><h1>Units</h1><p className="muted">Each active unit costs ₹299 for 28 days.</p></div></div><section className="section-card"><h2>Add a unit</h2><div className="add-unit-row"><input placeholder="Unit number, e.g. 620A" value={code} onChange={e=>setCode(e.target.value)} onKeyDown={e=>e.key==='Enter'&&(e.preventDefault(),add())}/><button className="primary-button" onClick={add}>Add unit</button></div>{err&&<p className="form-error">{err}</p>}<div className="unit-list">{units.map(u=><div className="unit-row unit-row-wrap" key={u._id}><span className="unit-icon">⌂</span><div><b>{u.unitCode}</b><small>{u.status==='occupied'?'Guest checked in':u.status==='cleaning'?'Needs cleaning':'Available'} · {u.subscriptionStatus==='active'&&u.subscriptionExpiresAt?`Subscription until ${new Date(u.subscriptionExpiresAt).toLocaleDateString('en-IN')}`:'Subscription pending'}</small><div className="unit-actions">{u.status==='cleaning'&&<button className="secondary-button compact" onClick={()=>clean(u)}>Mark unit clean</button>}<button className="danger-button" onClick={()=>{setDeleteTarget(u);setConfirmCode('')}}>Remove unit</button></div></div><span className={`unit-status ${u.status}`}>{u.status==='occupied'?'Occupied':u.status==='cleaning'?'Cleaning':'Available'}</span></div>)}</div>{!units.length&&<Empty title="No units yet" text="Add your first unit above. Subscription activation is managed by Kosmos Stays."/>}</section>{deleteTarget&&<div className="modal-backdrop"><div className="modal-card"><h2>Remove {deleteTarget.unitCode}?</h2><p className="muted">Type the exact unit number to confirm. Old booking history is preserved. Units with an active stay or cleaning task cannot be removed.</p><label>Unit number<input value={confirmCode} onChange={e=>setConfirmCode(e.target.value)} placeholder={deleteTarget.unitCode}/></label><div className="form-actions"><button className="secondary-button" onClick={()=>setDeleteTarget(null)}>Cancel</button><button className="danger-button" disabled={busy||confirmCode.trim().toUpperCase()!==deleteTarget.unitCode} onClick={remove}>{busy?'Removing…':'Confirm removal'}</button></div></div></div>}</>;
}

function StatsPage({ bookings = [], units = [] }) {
  const [period, setPeriod] = useState('month');

  const now = new Date();
  const start = new Date(now);

  if (period === 'week') {
    start.setDate(now.getDate() - 6);
  } else {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  }

  const filtered = bookings.filter(b => {
    const date = new Date(b.checkIn);
    return date >= start && date <= now && b.status !== 'cancelled';
  });

  const revenue = filtered.reduce(
    (sum, b) => sum + Number(b.amount || 0), 0
  );

  const checkedOut = filtered.filter(
    b => b.status === 'checked_out'
  ).length;

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR PERFORMANCE</p>
          <h1>Statistics</h1>
          <p className="muted">Your booking register at a glance.</p>
        </div>
      </div>

      <section className="section-card">
        <div className="filter-pills">
          <button
            className={period === 'week' ? 'filter-pill active-filter' : 'filter-pill'}
            onClick={() => setPeriod('week')}
          >
            Last 7 days
          </button>
          <button
            className={period === 'month' ? 'filter-pill active-filter' : 'filter-pill'}
            onClick={() => setPeriod('month')}
          >
            This month
          </button>
        </div>

        <div className="stats-grid">
          <Stat label="Bookings" value={filtered.length} icon="▤" />
          <Stat label="Recorded revenue" value={money(revenue)} icon="₹" />
          <Stat label="Checked out" value={checkedOut} icon="✓" />
          <Stat label="Your units" value={units.length} icon="▦" />
        </div>

        {!filtered.length && (
          <Empty
            title="No bookings in this period"
            text="Bookings you record will appear in your statistics."
          />
        )}
      </section>
    </>
  );
}

function CleanerSetup({user,onNotice}){const [id,setId]=useState(user.telegramCleanerId||''),[name,setName]=useState(user.telegramCleanerName||''),[busy,setBusy]=useState(false);async function save(){setBusy(true);try{const r=await api.patch('/auth/me',{telegramCleanerId:id,telegramCleanerName:name});onNotice('Cleaner details saved.');}catch(e){onNotice(e.response?.data?.message||'Could not save cleaner details.')}finally{setBusy(false)}}async function test(){setBusy(true);try{await api.patch('/auth/me',{telegramCleanerId:id,telegramCleanerName:name});const r=await api.post('/auth/test-cleaner');onNotice(r.data.message)}catch(e){onNotice(e.response?.data?.message||'Could not send test message. Ask your cleaner to start @kosmosstays_bot first.')}finally{setBusy(false)}}return <><div className="page-heading"><div><p className="eyebrow">OPERATIONS</p><h1>Cleaner setup</h1><p className="muted">Connect your cleaner in a few simple steps.</p></div></div><section className="section-card cleaner-card"><div className="cleaner-illustration">✦</div><h2>Connect your cleaner</h2><p className="muted">No API keys or technical setup needed.</p><div className="instruction-step"><span>1</span><div><b>Ask your cleaner to open @kosmosstays_bot</b><p>They should press Start. The bot will show their Telegram chat ID.</p><a className="text-button" href="https://t.me/kosmosstays_bot" target="_blank" rel="noreferrer">Open Kosmos Stays bot ↗</a></div></div><div className="instruction-step"><span>2</span><div><b>Enter the cleaner details below</b><p>Ask the cleaner to send you the number the bot displayed.</p></div></div><label>Cleaner name<input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Rahul"/></label><label>Cleaner Telegram ID<input value={id} onChange={e=>setId(e.target.value)} placeholder="Numeric ID from the bot" inputMode="numeric"/></label><div className="form-actions"><button className="secondary-button" disabled={busy||!id.trim()} onClick={test}>Send test message</button><button className="primary-button" disabled={busy} onClick={save}>{busy?'Saving…':'Save cleaner'}</button></div><div className="setup-note"><b>How notifications work</b><p>When you mark a booking checked out, your cleaner receives the unit number and a Mark Unit Ready button. You can also mark the unit clean from the Units page. If cleaning takes more than 30 minutes, the system alerts the cleaner and admin when configured.</p></div></section></>}
function ProfilePage({user,units=[],onUser,onPage}){
 const [form,setForm]=useState({name:user.name||'',phone:user.phone||'',businessName:user.businessName||'',telegramHostId:user.telegramHostId||''}),[msg,setMsg]=useState(''),[busy,setBusy]=useState(false);
 async function save(e){e.preventDefault();setBusy(true);try{const r=await api.patch('/auth/me',form);const next={...user,...r.data};onUser(next);setMsg('Profile saved.')}catch(e){setMsg(e.response?.data?.message||'Could not save profile.')}finally{setBusy(false)}}
 const active=units.filter(u=>u.subscriptionStatus==='active'&&u.subscriptionExpiresAt&&new Date(u.subscriptionExpiresAt)>new Date());
 const pending=units.filter(u=>u.subscriptionStatus==='pending');
 const expired=units.filter(u=>u.subscriptionStatus==='expired'||(u.subscriptionExpiresAt&&new Date(u.subscriptionExpiresAt)<=new Date()));
 return <><div className="page-heading"><div><p className="eyebrow">ACCOUNT</p><h1>My profile</h1><p className="muted">Your account details and the subscription status of your own units.</p></div></div>
 <section className="section-card profile-subscriptions"><div className="section-heading"><div><h2>My unit subscriptions</h2><p className="muted">Only subscriptions attached to your units appear here.</p></div><button type="button" className="text-button" onClick={()=>onPage('units')}>Manage units →</button></div>
 {user.role==='admin' ? <p className="muted">Use the admin panel to manage subscriptions across all hosts.</p> : units.length===0 ? <p className="muted">No units yet. Add a unit to start tracking its subscription here.</p> : <div className="subscription-status-list">{units.map(u=>{const isActive=u.subscriptionStatus==='active'&&u.subscriptionExpiresAt&&new Date(u.subscriptionExpiresAt)>new Date();const isExpired=u.subscriptionStatus==='expired'||(u.subscriptionExpiresAt&&new Date(u.subscriptionExpiresAt)<=new Date());return <div className="subscription-status-row" key={u._id}><div><b>Unit {u.unitCode}</b><small>{isActive?`Active until ${new Date(u.subscriptionExpiresAt).toLocaleDateString('en-IN')}`:isExpired?'Subscription expired':'Awaiting admin activation'}</small></div><span className={`subscription-tag ${isActive?'is-active':isExpired?'is-expired':'is-pending'}`}>{isActive?'Active':isExpired?'Expired':'Pending'}</span></div>})}</div>}
 {user.role!=='admin'&&(pending.length>0||expired.length>0)&&<p className="subscription-help">{pending.length>0?`${pending.length} unit subscription${pending.length===1?' is':'s are'} waiting for administrator activation.`:`${expired.length} unit subscription${expired.length===1?' has':'s have'} expired. Contact Kosmos Stays to renew.`}</p>}
 </section>
 <section className="section-card support-card"><div className="section-heading"><div><h2>Customer support</h2><p className="muted">Need help with your account, bookings, or subscription?</p></div></div><div className="support-actions"><a className="secondary-button" href="tel:+918796485062">Call +91 8796485062</a><a className="secondary-button" href="mailto:support@kosmosstays.in?subject=Kosmos%20Stays%20Support">Email support@kosmosstays.in</a></div></section>
 <form className="form-card" onSubmit={save}><label>Full name<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Email address<input disabled value={user.email}/></label><label>Business / brand name<input value={form.businessName} onChange={e=>setForm({...form,businessName:e.target.value})} placeholder="e.g. Your business name"/></label><label>Contact number<input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="Optional"/></label><label>Your Telegram ID (for cleaning delay alerts)<input value={form.telegramHostId} onChange={e=>setForm({...form,telegramHostId:e.target.value})} placeholder="Optional numeric ID" inputMode="numeric"/></label><small className="muted">Open @kosmosstays_bot and press Start to see your ID.</small>{msg&&<p className="muted" role="status">{msg}</p>}<button className="primary-button" disabled={busy}>{busy?'Saving…':'Save profile'}</button><div className="profile-links"><button type="button" className="secondary-button" onClick={()=>onPage('cleaner')}>Cleaner setup</button><button type="button" className="secondary-button" onClick={()=>onPage('stats')}>Weekly & monthly stats</button>{user.role==='admin'&&<button type="button" className="primary-button" onClick={()=>onPage('admin')}>Open admin panel</button>}</div></form>
 </>;
}
function AdminPanel({onNotice}){const [data,setData]=useState(null),[hosts,setHosts]=useState([]),[units,setUnits]=useState([]),[bookings,setBookings]=useState([]),[tab,setTab]=useState('overview'),[err,setErr]=useState('');async function load(){try{const [s,h,u,b]=await Promise.all([api.get('/admin/summary'),api.get('/admin/hosts'),api.get('/admin/units'),api.get('/admin/bookings')]);setData(s.data);setHosts(h.data);setUnits(u.data);setBookings(b.data)}catch(e){setErr(e.response?.data?.message||'Could not load admin panel')}}useEffect(()=>{load()},[]);async function activate(u){try{await api.post(`/admin/units/${u._id}/activate-subscription`,{paymentNote:'Manually confirmed by admin'});onNotice(`Subscription activated for ${u.unitCode} for 28 days.`);load()}catch(e){setErr(e.response?.data?.message||'Could not activate subscription')}}async function hostToggle(h){try{await api.patch(`/admin/hosts/${h._id}`,{active:!h.active});load()}catch(e){setErr('Could not update host')}}if(err)return <><h1>Admin panel</h1><p className="form-error">{err}</p><button className="secondary-button" onClick={load}>Retry</button></>;if(!data)return <section className="section-card">Loading admin panel…</section>;return <><div className="page-heading"><div><p className="eyebrow">SYSTEM ADMINISTRATION</p><h1>Admin panel</h1><p className="muted">Manage hosts, units, bookings and 28-day subscriptions.</p></div><button className="secondary-button" onClick={load}>Refresh</button></div><div className="stats-grid"><Stat label="Hosts" value={data.hosts} icon="●"/><Stat label="Active subscriptions" value={data.activeSubs} icon="✓"/><Stat label="Pending activation" value={data.pendingSubs} icon="◷"/><Stat label="Expired subscriptions" value={data.expiredSubs} icon="!"/><Stat label="Units" value={data.units} icon="▦"/><Stat label="Bookings" value={data.bookings} icon="▤"/><Stat label="Recorded revenue" value={money(data.revenue)} icon="₹"/></div><div className="filter-pills admin-tabs">{[['overview','Subscriptions'],['hosts','Hosts'],['units','All units'],['bookings','Bookings']].map(([id,label])=><button key={id} className={tab===id?'filter-pill active-filter':'filter-pill'} onClick={()=>setTab(id)}>{label}</button>)}</div>{tab==='overview'&&<section className="section-card"><h2>Subscription activation queue</h2><p className="muted">Confirm payment outside the app, then activate a unit for 28 days.</p>{units.filter(u=>u.active&&(u.subscriptionStatus!=='active'||!u.subscriptionExpiresAt||new Date(u.subscriptionExpiresAt)<=new Date())).map(u=><div className="unit-row" key={u._id}><div><b>{u.unitCode}</b><small>{u.hostId?.name||'Host'} · {u.hostId?.email||''} · ₹299 / 28 days</small></div><button className="primary-button compact" onClick={()=>activate(u)}>Activate 28 days</button></div>)}</section>}{tab==='hosts'&&<section className="section-card"><h2>Hosts</h2>{hosts.map(h=><div className="unit-row" key={h._id}><div><b>{h.name}</b><small>{h.email} · {h.active?'Active account':'Disabled'}</small></div><button className="secondary-button compact" onClick={()=>hostToggle(h)}>{h.active?'Disable':'Enable'}</button></div>)}</section>}{tab==='units'&&<section className="section-card"><h2>All units</h2>{units.map(u=><div className="unit-row" key={u._id}><div><b>{u.unitCode}</b><small>{u.hostId?.name||'Unknown host'} · {u.subscriptionStatus} · {u.subscriptionExpiresAt?`expires ${new Date(u.subscriptionExpiresAt).toLocaleDateString('en-IN')}`:'not activated'}</small></div>{(u.subscriptionStatus!=='active'||!u.subscriptionExpiresAt||new Date(u.subscriptionExpiresAt)<=new Date())&&<button className="primary-button compact" onClick={()=>activate(u)}>Activate</button>}</div>)}</section>}{tab==='bookings'&&<section className="section-card"><h2>Recent bookings</h2>{bookings.map(b=><div className="unit-row" key={b._id}><div><b>{b.customerName} · {b.bookingId}</b><small>{b.hostId?.name||'Host'} · {b.unitId?.unitCode||'Unit'} · {b.status}</small></div><strong>{money(b.amount)}</strong></div>)}</section>}</>}

createRoot(document.getElementById('root')).render(<App/>);

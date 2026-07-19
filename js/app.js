/* ============ SARDAARJI — App Logic (Supabase-backed) ============
   `sb` (the Supabase client) comes from supabase-config.js
================================================================= */

/* ---------- App state ---------- */
let session = null;
let profile = null;    // { id, name, role, bio, goal }
let trades = [];       // { id, symbol, side, entry, exit, qty, trade_date, notes }
let workouts = [];     // { id, name, type, duration, intensity, work_date, notes }
let questions = [];    // { id, author, title, category, answers:[{who, body}] }
let members = [];      // { id, name, role, bio }
let plans = [];        // demo only (simulated payments) — stored per-user in localStorage
let booting = false;

/* ---------- Tiny helpers ---------- */
function esc(s) { const d = document.createElement('div'); d.textContent = s == null ? '' : s; return d.innerHTML; }
let toastTimer;
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 3400);
}
function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
const today = new Date().toISOString().slice(0, 10);

/* ================= LANDING VISUALS ================= */

/* ---- Particles ---- */
const canvas = document.getElementById('particles');
const ctx = canvas.getContext('2d');
let particles = [];
function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.addEventListener('resize', resizeCanvas);
resizeCanvas();
function initParticles() {
  particles = [];
  const n = Math.min(70, Math.floor(window.innerWidth / 18));
  for (let i = 0; i < n; i++) {
    particles.push({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 1.8 + 0.6,
      hue: Math.random() > 0.5 ? '232,180,76' : '244,242,236'
    });
  }
}
initParticles();
function drawParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const p of particles) {
    p.x += p.vx; p.y += p.vy;
    if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
    if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${p.hue},0.35)`; ctx.fill();
  }
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const a = particles[i], b = particles[j];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < 120) {
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = `rgba(232,180,76,${0.06 * (1 - d / 120)})`; ctx.stroke();
      }
    }
  }
  requestAnimationFrame(drawParticles);
}
drawParticles();

/* ---- Ticker ---- */
const tickerData = [
  ['NIFTY 50', '+0.84%', 'up'], ['BTC/USD', '+2.31%', 'up'], ['AAPL', '-0.42%', 'down'],
  ['GOLD', '+0.19%', 'up'], ['TSLA', '+1.77%', 'up'], ['BANKNIFTY', '-0.28%', 'down'],
  ['ETH/USD', '+3.05%', 'up'], ['S&P 500', '+0.51%', 'up'], ['USD/INR', '-0.09%', 'down'],
  ['96,000 workouts logged', '', 'up'], ['184,000 trades journaled', '', 'up']
];
const tickerEl = document.getElementById('ticker');
if (tickerEl) {
  const half = tickerData.map(([s, c, dir]) => `<span>${s} <span class="${dir}">${c}</span></span>`).join('');
  tickerEl.innerHTML = half + half;
}

/* ---- Counters + reveal ---- */
function animateCounters() {
  document.querySelectorAll('.stat-num').forEach(el => {
    const target = +el.dataset.count, dur = 1600, t0 = performance.now();
    function step(t) {
      const p = Math.min((t - t0) / dur, 1);
      el.textContent = Math.floor(target * (1 - Math.pow(1 - p, 3))).toLocaleString();
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  });
}
animateCounters();
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
function scrollToSection(id) { document.getElementById(id).scrollIntoView({ behavior: 'smooth' }); closeNav(); }

/* Mobile navigation menu */
function toggleNav() { document.getElementById('navLinks').classList.toggle('open'); }
function closeNav() { const n = document.getElementById('navLinks'); if (n) n.classList.remove('open'); }

/* ---- Parallax ---- */
const parallaxEls = document.querySelectorAll('[data-parallax]');
window.addEventListener('scroll', () => {
  const mid = window.innerHeight / 2;
  parallaxEls.forEach(el => {
    const speed = +el.dataset.parallax;
    const rect = el.getBoundingClientRect();
    const offset = (rect.top + rect.height / 2 - mid) * speed;
    el.style.transform = `translateY(${offset.toFixed(1)}px)`;
  });
}, { passive: true });

/* ---- 3D tilt on pricing cards ---- */
document.querySelectorAll('.card').forEach(card => {
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    card.style.transform = `rotateY(${px * 8}deg) rotateX(${-py * 8}deg) translateY(-4px)`;
  });
  card.addEventListener('mouseleave', () => { card.style.transform = ''; });
});

/* ================= AUTHENTICATION ================= */
function openAuth() { if (session) { enterApp(); return; } openModal('authModal'); }
function openOnboarding() { openAuth(); } // backward-compatible alias for existing buttons

async function signInGoogle() {
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin }
  });
  if (error) {
    document.getElementById('authMsg').textContent =
      'Google isn’t enabled yet — finish Part 2 of the setup, or use the email link below.';
  }
}

document.getElementById('emailForm').addEventListener('submit', async e => {
  e.preventDefault();
  const email = document.getElementById('authEmail').value.trim();
  if (!email) return;
  const msg = document.getElementById('authMsg');
  msg.textContent = 'Sending…';
  const { error } = await sb.auth.signInWithOtp({
    email, options: { emailRedirectTo: window.location.origin }
  });
  msg.textContent = error ? ('Error: ' + error.message)
                          : '✅ Check your inbox — click the link to sign in.';
});

/* React to login / logout automatically (also fires on page load & after Google redirect) */
sb.auth.onAuthStateChange((event, s) => {
  session = s;
  if (session && document.getElementById('app').classList.contains('hidden') && !booting) {
    closeModal('authModal');
    bootAppData();
  }
});

async function bootAppData() {
  booting = true;
  try {
    await loadProfile();
    await Promise.all([loadTrades(), loadWorkouts(), loadQuestions(), loadMembers()]);
    plans = JSON.parse(localStorage.getItem('sj_plans_' + session.user.id) || '[]');
    enterApp();
    renderAll();
    if (!profile.name || profile.name === 'New Member') {
      switchTab('profile');
      toast('Welcome! Set your name and role to complete your profile ⚡');
    } else {
      toast(`Welcome back, ${profile.name} ⚡`);
    }
  } catch (err) {
    toast('Could not load your data — check the console.');
    console.error(err);
  }
  booting = false;
}

async function logout() {
  await sb.auth.signOut();
  session = null; profile = null; trades = []; workouts = []; questions = []; members = [];
  document.getElementById('app').classList.add('hidden');
  document.getElementById('landing').classList.remove('hidden');
  window.scrollTo(0, 0);
}

/* ================= DATA LOADS ================= */
async function loadProfile() {
  const { data } = await sb.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
  profile = data || { id: session.user.id, name: 'New Member', role: 'trader', bio: '', goal: '' };
}
async function loadTrades() {
  const { data } = await sb.from('trades').select('*')
    .eq('user_id', session.user.id).order('trade_date', { ascending: true });
  trades = data || [];
}
async function loadWorkouts() {
  const { data } = await sb.from('workouts').select('*')
    .eq('user_id', session.user.id).order('work_date', { ascending: true });
  workouts = data || [];
}
async function loadQuestions() {
  const { data } = await sb.from('questions').select('*, answers(*)')
    .order('created_at', { ascending: false });
  questions = data || [];
}
async function loadMembers() {
  const { data } = await sb.from('profiles').select('id, name, role, bio')
    .order('created_at', { ascending: false });
  members = data || [];
}

/* ================= APP SHELL ================= */
function enterApp() {
  document.getElementById('landing').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  window.scrollTo(0, 0);
}
function switchTab(tab) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
  document.getElementById('tab-' + tab).classList.remove('hidden');
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  if (tab === 'trades') drawEquityCurve();
}
function renderAll() { renderDashboard(); renderTrades(); renderWorkouts(); renderMyPlan(); renderCommunity(); renderProfile(); }

/* ================= PRICING / BILLING ================= */
const PLAN_PRICES = { 'Starter Trader': 29, 'Pro Trader': 79, 'Elite Trader': 199, 'Kickstart': 19, 'Transform': 49, 'Peak Performance': 99 };
let billing = 'monthly';

function annualMonthly(m) { return Math.round(m * 10 / 12); } // 2 months free → effective /mo

function renderPricing() {
  document.querySelectorAll('.price[data-monthly]').forEach(el => {
    const m = +el.dataset.monthly;
    if (billing === 'annual') {
      el.innerHTML = `$${annualMonthly(m)}<span class="price-cycle">/mo</span><span class="price-note">billed annually · $${m * 10}/yr</span>`;
    } else {
      el.innerHTML = `$${m}<span class="price-cycle">/mo</span>`;
    }
  });
  document.querySelectorAll('.billing-toggle').forEach(t => t.classList.toggle('annual', billing === 'annual'));
}
function toggleBilling() { billing = billing === 'monthly' ? 'annual' : 'monthly'; renderPricing(); }

/* ================= CHECKOUT (demo — becomes Stripe in production) ================= */
let pendingPlan = null;
function buyPlan(name, kind) {
  if (!session) { toast('Start free — create your account first'); openAuth(); return; }
  const m = PLAN_PRICES[name];
  const cycle = billing === 'annual' ? 'year' : 'month';
  const charge = billing === 'annual' ? m * 10 : m;
  pendingPlan = { name, price: m, kind, cycle, charge };
  document.getElementById('checkoutBody').innerHTML = `
    <div class="checkout-line"><span>${kind === 'trading' ? 'Trading' : 'Fitness'} — ${name}</span><span>$${charge}/${cycle}</span></div>
    <div class="checkout-line"><span>7-day free trial</span><span>$0 today</span></div>
    <div class="checkout-total"><span>Due today</span><span>$0.00</span></div>
    <p style="color:var(--muted); font-size:0.82rem; margin-bottom:14px;">
      Then $${charge}/${cycle} after your trial. Cancel anytime. <br>
      Demo checkout — no real payment is taken. Connect Stripe (see STRIPE-SETUP.md) to charge for real.
    </p>
    <button class="btn btn-primary btn-lg" onclick="confirmPurchase()" style="width:100%;">Start Free Trial (Demo)</button>`;
  openModal('checkoutModal');
}
/* $20 one-time Starter Systems Pack — no login needed (impulse buy) */
function buyPack() {
  document.getElementById('checkoutBody').innerHTML = `
    <div class="checkout-line"><span>Starter Systems Pack — 3 PDFs</span><span>$20 one-time</span></div>
    <div class="checkout-line"><span>Instant download</span><span>Included</span></div>
    <div class="checkout-total"><span>Due today</span><span>$20.00</span></div>
    <p style="color:var(--muted); font-size:0.82rem; margin-bottom:14px;">
      One-time payment — instant access to all three guides. <br>
      Demo checkout — no real payment is taken. Connect Stripe (STRIPE-SETUP.md) to sell for real.
    </p>
    <button class="btn btn-primary btn-lg" onclick="unlockPack()" style="width:100%;">Get my downloads (Demo)</button>`;
  openModal('checkoutModal');
}
function unlockPack() { closeModal('checkoutModal'); window.location.href = 'downloads.html'; }

function confirmPurchase() {
  if (!pendingPlan || !session) return;
  if (!plans.some(p => p.name === pendingPlan.name)) {
    plans.push(pendingPlan);
    localStorage.setItem('sj_plans_' + session.user.id, JSON.stringify(plans));
  }
  closeModal('checkoutModal');
  toast(`${pendingPlan.name} trial started!`);
  pendingPlan = null;
  renderDashboard();
}

/* ================= DASHBOARD ================= */
function tradePL(t) {
  const diff = t.side === 'Long' ? t.exit - t.entry : t.entry - t.exit;
  return diff * t.qty;
}
function renderDashboard() {
  document.getElementById('welcomeMsg').textContent = `Welcome back, ${profile ? profile.name : 'Champion'}`;
  const totalPL = trades.reduce((s, t) => s + tradePL(t), 0);
  const wins = trades.filter(t => tradePL(t) > 0).length;
  const winRate = trades.length ? Math.round(wins / trades.length * 100) : 0;
  const totalMin = workouts.reduce((s, w) => s + +w.duration, 0);
  const streak = calcStreak();

  document.getElementById('dashCards').innerHTML = `
    <div class="dash-card"><div class="lbl">Total P/L</div>
      <div class="big ${totalPL >= 0 ? 'pos' : 'neg'}">${totalPL >= 0 ? '+' : ''}${totalPL.toFixed(2)}</div></div>
    <div class="dash-card"><div class="lbl">Win Rate</div><div class="big">${winRate}%</div></div>
    <div class="dash-card"><div class="lbl">Workout Minutes</div><div class="big">${totalMin}</div></div>
    <div class="dash-card"><div class="lbl">Workout Streak</div><div class="big">${streak} day${streak === 1 ? '' : 's'}</div></div>`;

  const planEl = document.getElementById('activePlans');
  planEl.innerHTML = plans.length
    ? plans.map(p => `<span class="chip ${p.kind === 'fitness' ? 'alt' : ''}">${p.kind === 'trading' ? 'Trading' : 'Fitness'} — ${esc(p.name)}</span>`).join('')
    : '<p style="color:var(--muted);">No active plans yet. <a href="#" onclick="logout(); return false;" style="color:var(--gold);">Browse plans →</a></p>';

  const insights = [...tradeInsights().slice(0, 2), ...fitnessRecs().slice(0, 2)];
  document.getElementById('dashInsights').innerHTML = insights.length
    ? insights.map(i => `<div class="insight ${i.cls || ''}">${i.text}</div>`).join('')
    : '<p style="color:var(--muted);">Log some trades and workouts — your coach insights will appear here.</p>';
}

/* ================= TRADE JOURNAL ================= */
document.getElementById('tradeForm').addEventListener('submit', async e => {
  e.preventDefault();
  const row = {
    user_id: session.user.id,
    symbol: document.getElementById('tSymbol').value.trim().toUpperCase(),
    side: document.getElementById('tSide').value,
    entry: +document.getElementById('tEntry').value,
    exit: +document.getElementById('tExit').value,
    qty: +document.getElementById('tQty').value,
    trade_date: document.getElementById('tDate').value,
    notes: document.getElementById('tNotes').value.trim()
  };
  const { error } = await sb.from('trades').insert(row);
  if (error) { toast('Error saving trade: ' + error.message); return; }
  e.target.reset(); document.getElementById('tDate').value = today;
  await loadTrades(); renderTrades(); renderDashboard();
  toast('Trade logged');
});

function renderTrades() {
  const totalPL = trades.reduce((s, t) => s + tradePL(t), 0);
  const winners = trades.filter(t => tradePL(t) > 0);
  const losers = trades.filter(t => tradePL(t) < 0);
  const winRate = trades.length ? Math.round(winners.length / trades.length * 100) : 0;
  const avgWin = winners.length ? winners.reduce((s, t) => s + tradePL(t), 0) / winners.length : 0;
  const avgLoss = losers.length ? Math.abs(losers.reduce((s, t) => s + tradePL(t), 0) / losers.length) : 0;
  const best = trades.length ? Math.max(...trades.map(tradePL)) : 0;

  document.getElementById('tradeStats').innerHTML = `
    <div class="stat-box"><div class="v ${totalPL >= 0 ? 'pos' : 'neg'}">${totalPL >= 0 ? '+' : ''}${totalPL.toFixed(2)}</div><div class="k">TOTAL P/L</div></div>
    <div class="stat-box"><div class="v">${trades.length}</div><div class="k">TRADES</div></div>
    <div class="stat-box"><div class="v">${winRate}%</div><div class="k">WIN RATE</div></div>
    <div class="stat-box"><div class="v pos">+${avgWin.toFixed(2)}</div><div class="k">AVG WIN</div></div>
    <div class="stat-box"><div class="v neg">-${avgLoss.toFixed(2)}</div><div class="k">AVG LOSS</div></div>
    <div class="stat-box"><div class="v pos">+${best.toFixed(2)}</div><div class="k">BEST TRADE</div></div>`;

  document.querySelector('#tradeTable tbody').innerHTML = trades.map(t => {
    const pl = tradePL(t);
    return `<tr title="${esc(t.notes || '')}">
      <td>${t.trade_date}</td><td><b>${esc(t.symbol)}</b></td><td>${t.side}</td>
      <td>${t.entry}</td><td>${t.exit}</td><td>${t.qty}</td>
      <td class="${pl >= 0 ? 'pos' : 'neg'}"><b>${pl >= 0 ? '+' : ''}${pl.toFixed(2)}</b></td>
      <td><button class="del-btn" onclick="deleteTrade(${t.id})" title="Delete">🗑</button></td></tr>`;
  }).join('') || '<tr><td colspan="8" style="color:var(--muted); text-align:center;">No trades yet — log your first one!</td></tr>';

  drawEquityCurve();
}

async function deleteTrade(id) {
  const { error } = await sb.from('trades').delete().eq('id', id);
  if (error) { toast('Error deleting trade'); return; }
  await loadTrades(); renderTrades(); renderDashboard();
}

function drawEquityCurve() {
  const cv = document.getElementById('equityChart');
  if (!cv) return;
  const c = cv.getContext('2d');
  c.clearRect(0, 0, cv.width, cv.height);
  let sum = 0;
  const pts = [0, ...trades.map(t => (sum += tradePL(t)))];
  if (pts.length < 2) {
    c.fillStyle = '#9d9daa'; c.font = '14px Inter'; c.textAlign = 'center';
    c.fillText('Log at least one trade to see your equity curve', cv.width / 2, cv.height / 2);
    return;
  }
  const pad = 30;
  const min = Math.min(...pts), max = Math.max(...pts);
  const range = max - min || 1;
  const X = i => pad + (cv.width - 2 * pad) * i / (pts.length - 1);
  const Y = v => cv.height - pad - (cv.height - 2 * pad) * (v - min) / range;
  c.strokeStyle = 'rgba(255,255,255,0.12)'; c.setLineDash([4, 4]);
  c.beginPath(); c.moveTo(pad, Y(0)); c.lineTo(cv.width - pad, Y(0)); c.stroke();
  c.setLineDash([]);
  const grad = c.createLinearGradient(0, 0, 0, cv.height);
  grad.addColorStop(0, 'rgba(232,180,76,0.25)'); grad.addColorStop(1, 'rgba(232,180,76,0)');
  c.beginPath(); c.moveTo(X(0), Y(pts[0]));
  pts.forEach((v, i) => c.lineTo(X(i), Y(v)));
  c.lineTo(X(pts.length - 1), cv.height - pad); c.lineTo(X(0), cv.height - pad);
  c.closePath(); c.fillStyle = grad; c.fill();
  c.beginPath();
  pts.forEach((v, i) => i ? c.lineTo(X(i), Y(v)) : c.moveTo(X(i), Y(v)));
  c.strokeStyle = '#e8b44c'; c.lineWidth = 2.5; c.shadowColor = '#e8b44c'; c.shadowBlur = 8;
  c.stroke(); c.shadowBlur = 0;
  c.beginPath(); c.arc(X(pts.length - 1), Y(pts[pts.length - 1]), 4, 0, Math.PI * 2);
  c.fillStyle = '#fff'; c.fill();
}

function tradeInsights() {
  const out = [];
  if (!trades.length) return out;
  const winners = trades.filter(t => tradePL(t) > 0);
  const losers = trades.filter(t => tradePL(t) < 0);
  const winRate = winners.length / trades.length;
  const avgWin = winners.length ? winners.reduce((s, t) => s + tradePL(t), 0) / winners.length : 0;
  const avgLoss = losers.length ? Math.abs(losers.reduce((s, t) => s + tradePL(t), 0) / losers.length) : 0;
  if (winRate >= 0.55) out.push({ text: `Strong win rate (${Math.round(winRate * 100)}%). Keep following your system — consistency beats intensity.` });
  else if (winRate < 0.45 && trades.length >= 4) out.push({ cls: 'warn', text: `Win rate is ${Math.round(winRate * 100)}%. Review your losing trades' notes — is there a repeated pattern?` });
  if (avgLoss > avgWin && losers.length && winners.length)
    out.push({ cls: 'warn', text: `Your average loss (${avgLoss.toFixed(2)}) is bigger than your average win (${avgWin.toFixed(2)}). Tighten stop-losses or let winners run longer.` });
  else if (avgWin > avgLoss * 1.5 && winners.length && losers.length)
    out.push({ text: `Excellent risk/reward — wins are ${(avgWin / avgLoss).toFixed(1)}x your losses. Professional-grade discipline.` });
  const byDate = {};
  trades.forEach(t => byDate[t.trade_date] = (byDate[t.trade_date] || 0) + 1);
  if (Object.values(byDate).length && Math.max(...Object.values(byDate)) >= 5)
    out.push({ cls: 'warn', text: '5+ trades in one day detected. Watch for overtrading — quality over quantity.' });
  return out;
}

/* ================= FITNESS LOG ================= */
document.getElementById('workoutForm').addEventListener('submit', async e => {
  e.preventDefault();
  const row = {
    user_id: session.user.id,
    name: document.getElementById('wName').value.trim(),
    type: document.getElementById('wType').value,
    duration: +document.getElementById('wDuration').value,
    intensity: +document.getElementById('wIntensity').value,
    work_date: document.getElementById('wDate').value,
    notes: document.getElementById('wNotes').value.trim()
  };
  const { error } = await sb.from('workouts').insert(row);
  if (error) { toast('Error saving workout: ' + error.message); return; }
  e.target.reset(); document.getElementById('wDate').value = today;
  await loadWorkouts(); renderWorkouts(); renderDashboard();
  toast('Workout logged');
});

function calcStreak() {
  if (!workouts.length) return 0;
  const days = new Set(workouts.map(w => w.work_date));
  let streak = 0; const d = new Date();
  if (!days.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1);
  while (days.has(d.toISOString().slice(0, 10))) { streak++; d.setDate(d.getDate() - 1); }
  return streak;
}

function renderWorkouts() {
  const totalMin = workouts.reduce((s, w) => s + w.duration, 0);
  const avgInt = workouts.length ? (workouts.reduce((s, w) => s + w.intensity, 0) / workouts.length).toFixed(1) : '—';
  const streak = calcStreak();
  const thisWeek = workouts.filter(w => (new Date() - new Date(w.work_date)) / 86400000 <= 7).length;

  document.getElementById('fitStats').innerHTML = `
    <div class="stat-box"><div class="v">${workouts.length}</div><div class="k">WORKOUTS</div></div>
    <div class="stat-box"><div class="v">${totalMin}</div><div class="k">TOTAL MINUTES</div></div>
    <div class="stat-box"><div class="v">${streak}</div><div class="k">DAY STREAK</div></div>
    <div class="stat-box"><div class="v">${thisWeek}</div><div class="k">THIS WEEK</div></div>
    <div class="stat-box"><div class="v">${avgInt}</div><div class="k">AVG INTENSITY</div></div>`;

  document.querySelector('#workoutTable tbody').innerHTML = workouts.map(w => `
    <tr title="${esc(w.notes || '')}">
      <td>${w.work_date}</td><td><b>${esc(w.name)}</b></td><td>${w.type}</td>
      <td>${w.duration}</td><td>${'▮'.repeat(Math.min(w.intensity, 10))} ${w.intensity}/10</td>
      <td><button class="del-btn" onclick="deleteWorkout(${w.id})" title="Delete">🗑</button></td></tr>
  `).join('') || '<tr><td colspan="6" style="color:var(--muted); text-align:center;">No workouts yet — log your first one!</td></tr>';

  const recs = fitnessRecs();
  document.getElementById('fitRecs').innerHTML = recs.length
    ? recs.map(r => `<div class="insight ${r.cls || 'alt'}">${r.text}</div>`).join('')
    : '<p style="color:var(--muted);">Log a few workouts and personalized recommendations will appear here.</p>';
}

async function deleteWorkout(id) {
  const { error } = await sb.from('workouts').delete().eq('id', id);
  if (error) { toast('Error deleting workout'); return; }
  await loadWorkouts(); renderWorkouts(); renderDashboard();
}

function fitnessRecs() {
  const out = [];
  if (!workouts.length) return out;
  const last7 = workouts.filter(w => (new Date() - new Date(w.work_date)) / 86400000 <= 7);
  const types = new Set(last7.map(w => w.type));
  const streak = calcStreak();
  if (streak >= 3) out.push({ cls: 'alt', text: `${streak}-day streak! Momentum is your superpower — protect it with even a 15-minute session on busy days.` });
  if (last7.length && !types.has('Cardio')) out.push({ cls: 'alt', text: 'No cardio in the last 7 days. Add one 20-30 min session for heart health and recovery.' });
  if (last7.length && !types.has('Strength')) out.push({ cls: 'alt', text: 'No strength work this week. Two sessions a week preserves muscle and boosts metabolism.' });
  if (last7.length && !types.has('Flexibility / Yoga')) out.push({ cls: 'alt', text: 'Consider adding mobility or yoga — it improves recovery for both lifting and running.' });
  const highDays = last7.filter(w => w.intensity >= 8).length;
  if (highDays >= 4) out.push({ cls: 'warn', text: '4+ high-intensity sessions this week. Schedule a recovery day — growth happens during rest.' });
  if (last7.length >= 6) out.push({ cls: 'warn', text: 'Training 6+ days this week. Great dedication, but plan one full rest day to avoid burnout.' });
  if (!last7.length) out.push({ cls: 'warn', text: 'No workouts in the last 7 days. Restart small today — 20 minutes counts!' });
  return out;
}

/* ================= COMMUNITY ================= */
document.getElementById('questionForm').addEventListener('submit', async e => {
  e.preventDefault();
  const row = {
    user_id: session.user.id,
    author: profile.name || 'Member',
    title: document.getElementById('qTitle').value.trim(),
    category: document.getElementById('qCategory').value
  };
  const { error } = await sb.from('questions').insert(row);
  if (error) { toast('Error posting question: ' + error.message); return; }
  e.target.reset();
  await loadQuestions(); renderCommunity();
  toast('Question posted');
});

async function postAnswer(questionId, inputId) {
  const input = document.getElementById(inputId);
  const text = input.value.trim();
  if (!text) return;
  const { error } = await sb.from('answers').insert({
    question_id: questionId, user_id: session.user.id, who: profile.name || 'Member', body: text
  });
  if (error) { toast('Error posting answer: ' + error.message); return; }
  await loadQuestions(); renderCommunity();
  toast('Answer posted');
}

function renderCommunity() {
  document.getElementById('qaBoard').innerHTML = questions.length ? questions.map(q => `
    <div class="qa-item">
      <div class="qa-title">${esc(q.title)}</div>
      <div class="qa-meta"><span class="qa-cat ${q.category}">${q.category}</span> asked by <b>${esc(q.author)}</b> · ${(q.answers || []).length} answer${(q.answers || []).length === 1 ? '' : 's'}</div>
      ${(q.answers || []).map(a => `<div class="qa-answer"><div class="who">${esc(a.who)}</div>${esc(a.body)}</div>`).join('')}
      <div class="answer-row">
        <input type="text" id="ans-${q.id}" placeholder="Write an answer…">
        <button class="btn btn-outline btn-sm" onclick="postAnswer(${q.id}, 'ans-${q.id}')">Reply</button>
      </div>
    </div>`).join('') : '<p style="color:var(--muted);">No questions yet — be the first to ask one!</p>';

  document.getElementById('memberList').innerHTML = members.length ? members.map(m => {
    const you = session && m.id === session.user.id;
    return `<div class="member">
      <div class="avatar ${m.role === 'fitness' ? 'alt' : ''}">${esc((m.name || '?')[0])}</div>
      <div class="member-info">
        <div class="member-name">${esc(m.name || 'Member')}${you ? ' (You)' : ''}</div>
        <div class="member-bio">${esc(m.bio || 'New member on the journey.')}</div>
      </div>
      <span class="member-role">${m.role === 'both' ? 'BOTH' : m.role === 'trader' ? 'TRADER' : 'FITNESS'}</span>
    </div>`;
  }).join('') : '<p style="color:var(--muted);">No members yet.</p>';
}

/* ================= PROFILE ================= */
document.getElementById('profileForm').addEventListener('submit', async e => {
  e.preventDefault();
  const row = {
    id: session.user.id,
    name: document.getElementById('pName').value.trim(),
    role: document.getElementById('pRole').value,
    bio: document.getElementById('pBio').value.trim(),
    goal: document.getElementById('pGoal').value.trim()
  };
  const { error } = await sb.from('profiles').upsert(row);
  if (error) { toast('Error saving profile: ' + error.message); return; }
  profile = row;
  await loadMembers();
  renderAll();
  toast('Profile saved');
});

function renderProfile() {
  if (profile) {
    document.getElementById('pName').value = profile.name === 'New Member' ? '' : (profile.name || '');
    document.getElementById('pRole').value = profile.role || 'trader';
    document.getElementById('pBio').value = profile.bio || '';
    document.getElementById('pGoal').value = profile.goal || '';
  }
  const u = profile || { name: 'Guest', role: 'trader', bio: '', goal: '' };
  const shownName = (u.name && u.name !== 'New Member') ? u.name : 'Your Name';
  document.getElementById('profilePreview').innerHTML = `
    <div class="profile-card">
      <div class="avatar ${u.role === 'fitness' ? 'alt' : ''}">${esc(shownName[0] || '?')}</div>
      <h4>${esc(shownName)}</h4>
      <span class="member-role">${u.role === 'both' ? 'TRADER + FITNESS' : u.role === 'trader' ? 'TRADER' : 'FITNESS'}</span>
      ${u.goal ? `<div class="goal">${esc(u.goal)}</div>` : ''}
      ${u.bio ? `<div class="bio">${esc(u.bio)}</div>` : '<div class="bio">Add a bio so the community can get to know you.</div>'}
    </div>`;
}

/* ================= FITNESS & MEAL PLAN ENGINE ================= */

/* Food options per diet preference (one representative day is shown) */
const FOODS = {
  veg: {
    Breakfast: 'Oats with milk, banana & a handful of almonds',
    Lunch: 'Dal, 2 rotis, mixed-veg sabzi, curd & salad',
    Dinner: 'Palak paneer with 2 rotis and a bowl of salad',
    Snack: 'Greek yogurt with berries + roasted chana'
  },
  nonveg: {
    Breakfast: '3 eggs, 2 slices whole-grain toast & a fruit',
    Lunch: 'Grilled chicken, brown rice, sautéed veg & salad',
    Dinner: 'Baked fish (or chicken) with quinoa and greens',
    Snack: 'Boiled eggs + a fruit, or a protein shake'
  },
  vegan: {
    Breakfast: 'Tofu scramble with veg & 2 slices whole-grain toast',
    Lunch: 'Chickpea & quinoa bowl with tahini and salad',
    Dinner: 'Lentil curry with brown rice and steamed greens',
    Snack: 'Soy yogurt with nuts + a fruit, or a pea-protein shake'
  }
};

/* Training splits by days/week — arrays of {focus, exercises[]} */
const DAY = {
  push: { focus: 'Push (chest, shoulders, triceps)', exercises: ['Bench press 3×8', 'Overhead press 3×10', 'Incline dumbbell press 3×10', 'Lateral raises 3×15', 'Triceps pushdown 3×12'] },
  pull: { focus: 'Pull (back, biceps)', exercises: ['Deadlift 3×5', 'Lat pulldown 3×10', 'Seated row 3×10', 'Face pulls 3×15', 'Biceps curls 3×12'] },
  legs: { focus: 'Legs & core', exercises: ['Squat 4×6', 'Romanian deadlift 3×10', 'Leg press 3×12', 'Walking lunges 3×12', 'Plank 3×45s'] },
  upper: { focus: 'Upper body', exercises: ['Bench press 4×8', 'Bent-over row 4×8', 'Overhead press 3×10', 'Lat pulldown 3×10', 'Curls & pushdowns 3×12'] },
  lower: { focus: 'Lower body & core', exercises: ['Squat 4×6', 'Romanian deadlift 3×8', 'Leg press 3×12', 'Calf raises 3×15', 'Hanging leg raises 3×12'] },
  fullA: { focus: 'Full body A', exercises: ['Squat 3×8', 'Bench press 3×8', 'Bent-over row 3×8', 'Plank 3×45s'] },
  fullB: { focus: 'Full body B', exercises: ['Deadlift 3×5', 'Overhead press 3×10', 'Lat pulldown 3×10', 'Lunges 3×12'] }
};
const SPLITS = {
  2: ['fullA', 'fullB'],
  3: ['push', 'pull', 'legs'],
  4: ['upper', 'lower', 'upper', 'lower'],
  5: ['push', 'pull', 'legs', 'upper', 'lower'],
  6: ['push', 'pull', 'legs', 'push', 'pull', 'legs']
};

/* Core calculation — Mifflin-St Jeor BMR → TDEE → goal-adjusted calories + macros */
function computePlan(inp) {
  const w = +inp.weight, h = +inp.height, a = +inp.age, act = +inp.activity;
  const bmr = inp.sex === 'male' ? 10 * w + 6.25 * h - 5 * a + 5 : 10 * w + 6.25 * h - 5 * a - 161;
  const tdee = bmr * act;
  let cal = inp.goal === 'lose' ? tdee - 500 : inp.goal === 'gain' ? tdee + 350 : tdee;
  cal = Math.max(cal, inp.sex === 'male' ? 1500 : 1200);
  cal = Math.round(cal / 10) * 10;
  const protein = Math.round(w * (inp.goal === 'maintain' ? 1.6 : 2.0));
  const fat = Math.round(cal * 0.25 / 9);
  const carbs = Math.max(0, Math.round((cal - protein * 4 - fat * 9) / 4));

  // meals with per-meal calorie targets
  const split = { Breakfast: 0.25, Lunch: 0.30, Dinner: 0.30, Snack: 0.15 };
  const meals = Object.keys(split).map(m => ({
    meal: m, kcal: Math.round(cal * split[m] / 10) * 10, food: FOODS[inp.diet][m]
  }));

  // workout week
  const days = SPLITS[inp.days] || SPLITS[4];
  const cardio = inp.goal === 'lose' ? '20–30 min brisk cardio' : inp.goal === 'gain' ? '10 min light cardio (optional)' : '15–20 min moderate cardio';
  const workout = days.map((k, i) => ({ label: `Day ${i + 1}`, focus: DAY[k].focus, exercises: DAY[k].exercises, cardio }));

  return { cal, protein, carbs, fat, meals, workout, goal: inp.goal, diet: inp.diet, days: inp.days };
}

/* Build the HTML for a plan (used in the app and in sample pop-ups) */
function planHTML(plan, heading) {
  const goalLabel = { lose: 'Fat loss', maintain: 'Maintenance / recomp', gain: 'Muscle gain' }[plan.goal];
  const dietLabel = { veg: 'Vegetarian', nonveg: 'Non-vegetarian', vegan: 'Vegan' }[plan.diet];
  return `
    ${heading ? `<h2 class="panel-title" style="margin-bottom:6px;">${heading}</h2>
      <p style="color:var(--muted); margin-bottom:20px;">${goalLabel} · ${dietLabel} · ${plan.days} training days/week</p>` : ''}
    <div class="stats-row">
      <div class="stat-box"><div class="v">${plan.cal}</div><div class="k">DAILY CALORIES</div></div>
      <div class="stat-box"><div class="v">${plan.protein}g</div><div class="k">PROTEIN</div></div>
      <div class="stat-box"><div class="v">${plan.carbs}g</div><div class="k">CARBS</div></div>
      <div class="stat-box"><div class="v">${plan.fat}g</div><div class="k">FAT</div></div>
    </div>
    <div class="panel glass">
      <h3>🍽️ Sample Day of Meals</h3>
      <div class="meal-list">
        ${plan.meals.map(m => `<div class="meal-row">
          <div class="meal-head"><span class="meal-name">${m.meal}</span><span class="meal-kcal">${m.kcal} kcal</span></div>
          <div class="meal-food">${m.food}</div></div>`).join('')}
      </div>
      <p class="plan-note">Swap any item for a similar one you enjoy — hit the calorie and protein targets and you're on track.</p>
    </div>
    <div class="panel glass">
      <h3>🏋️ Weekly Workout Split</h3>
      <div class="workout-grid">
        ${plan.workout.map(d => `<div class="workout-day">
          <div class="wd-head">${d.label} — <span>${d.focus}</span></div>
          <ul>${d.exercises.map(x => `<li>${x}</li>`).join('')}</ul>
          <div class="wd-cardio">Finish: ${d.cardio}</div></div>`).join('')}
      </div>
      <p class="plan-note">Rest on non-training days. Add 7–8k daily steps for extra results.</p>
    </div>`;
}

/* App: generate from the form */
const planForm = document.getElementById('planForm');
if (planForm) planForm.addEventListener('submit', async e => {
  e.preventDefault();
  const inp = readPlanForm();
  const plan = computePlan(inp);
  document.getElementById('planResult').innerHTML = planHTML(plan, null);
  await saveIntake(inp);
  toast('Your plan is ready 🔥');
});

function readPlanForm() {
  return {
    sex: document.getElementById('fSex').value,
    age: document.getElementById('fAge').value,
    height: document.getElementById('fHeight').value,
    weight: document.getElementById('fWeight').value,
    activity: document.getElementById('fActivity').value,
    goal: document.getElementById('fGoal').value,
    diet: document.getElementById('fDiet').value,
    days: +document.getElementById('fDays').value
  };
}

function fillPlanForm(inp) {
  document.getElementById('fSex').value = inp.sex;
  document.getElementById('fAge').value = inp.age;
  document.getElementById('fHeight').value = inp.height;
  document.getElementById('fWeight').value = inp.weight;
  document.getElementById('fActivity').value = inp.activity;
  document.getElementById('fGoal').value = inp.goal;
  document.getElementById('fDiet').value = inp.diet;
  document.getElementById('fDays').value = inp.days;
}

/* Persist intake — DB if the columns exist, always localStorage as a safety net */
async function saveIntake(inp) {
  if (session) localStorage.setItem('sj_plan_' + session.user.id, JSON.stringify(inp));
  if (!session) return;
  const { error } = await sb.from('profiles').update({
    sex: inp.sex, age: +inp.age, height_cm: +inp.height, weight_kg: +inp.weight,
    activity: String(inp.activity), goal: inp.goal, diet: inp.diet, days_per_week: +inp.days
  }).eq('id', session.user.id);
  // If the extra columns aren't added yet, that's fine — localStorage still holds it.
  if (error) console.info('Fitness intake kept locally (run the DB migration to sync across devices).');
}

function loadIntake() {
  if (profile && profile.age) {
    return { sex: profile.sex || 'male', age: profile.age, height: profile.height_cm,
      weight: profile.weight_kg, activity: profile.activity || '1.55', goal: profile.goal || 'maintain',
      diet: profile.diet || 'veg', days: profile.days_per_week || 4 };
  }
  if (session) {
    const ls = localStorage.getItem('sj_plan_' + session.user.id);
    if (ls) return JSON.parse(ls);
  }
  return null;
}

function renderMyPlan() {
  const inp = loadIntake();
  if (!inp) return;
  fillPlanForm(inp);
  document.getElementById('planResult').innerHTML = planHTML(computePlan(inp), null);
}

/* Public: sample plans on the landing page (built from preset profiles) */
const SAMPLE_PRESETS = [
  { title: 'Lean & Cut', tag: 'Fat loss', emoji: '🔥', inp: { sex: 'male', age: 32, height: 178, weight: 88, activity: '1.55', goal: 'lose', diet: 'nonveg', days: 4 } },
  { title: 'Build Muscle', tag: 'Muscle gain', emoji: '💪', inp: { sex: 'male', age: 25, height: 175, weight: 68, activity: '1.55', goal: 'gain', diet: 'veg', days: 5 } },
  { title: 'Fit & Healthy', tag: 'Maintain', emoji: '🧘', inp: { sex: 'female', age: 34, height: 165, weight: 62, activity: '1.375', goal: 'maintain', diet: 'veg', days: 3 } }
];
function renderSamples() {
  const el = document.getElementById('sampleCards');
  if (!el) return;
  el.innerHTML = SAMPLE_PRESETS.map((s, i) => {
    const p = computePlan(s.inp);
    return `<div class="card reveal">
      <div class="sample-emoji">${s.emoji}</div>
      <h3>${s.title}</h3>
      <div class="sample-tag">${s.tag}</div>
      <div class="price">${p.cal}<span> kcal/day</span></div>
      <ul>
        <li>${p.protein}g protein · ${p.carbs}g carbs · ${p.fat}g fat</li>
        <li>${s.inp.days}-day training split</li>
        <li>Full sample day of meals</li>
      </ul>
      <button class="btn btn-outline alt" onclick="openSample(${i})">View full plan</button>
    </div>`;
  }).join('');
  document.querySelectorAll('#sampleCards .reveal').forEach(elm => revealObserver.observe(elm));
}
function openSample(i) {
  const s = SAMPLE_PRESETS[i];
  document.getElementById('planModalBody').innerHTML = planHTML(computePlan(s.inp), `${s.emoji} ${s.title} — ${s.tag}`);
  openModal('planModal');
}
renderSamples();

/* ================= FREE TOOL: POSITION SIZE CALCULATOR ================= */
const riskCalc = document.getElementById('riskCalc');
if (riskCalc) riskCalc.addEventListener('submit', e => {
  e.preventDefault();
  const acct = +document.getElementById('cAccount').value;
  const riskPct = +document.getElementById('cRisk').value;
  const entry = +document.getElementById('cEntry').value;
  const stop = +document.getElementById('cStop').value;
  const perShareRisk = Math.abs(entry - stop);
  const out = document.getElementById('calcResult');
  if (!perShareRisk) { out.innerHTML = '<p style="color:var(--red);">Entry and stop-loss must be different.</p>'; return; }
  const riskAmount = acct * riskPct / 100;
  const shares = Math.floor(riskAmount / perShareRisk);
  const positionValue = shares * entry;
  const pctOfAccount = acct ? (positionValue / acct * 100) : 0;
  out.innerHTML = `
    <div class="calc-big">${shares.toLocaleString()} <small>shares / units</small></div>
    <div class="calc-row"><span>You're risking</span><span>$${riskAmount.toFixed(2)} (${riskPct}% of account)</span></div>
    <div class="calc-row"><span>Risk per share</span><span>$${perShareRisk.toFixed(2)}</span></div>
    <div class="calc-row"><span>Position value</span><span>$${positionValue.toLocaleString(undefined,{maximumFractionDigits:0})}</span></div>
    <div class="calc-row"><span>% of account deployed</span><span>${pctOfAccount.toFixed(1)}%</span></div>
    <p class="plan-note">If price hits your stop, you lose exactly $${riskAmount.toFixed(2)} — no more. That's how pros survive.</p>`;
});

/* ================= LEAD MAGNET (email capture → Supabase 'leads') ================= */
const leadForm = document.getElementById('leadForm');
if (leadForm) leadForm.addEventListener('submit', async e => {
  e.preventDefault();
  const email = document.getElementById('leadEmail').value.trim();
  const msg = document.getElementById('leadMsg');
  if (!email) return;
  msg.style.color = 'var(--gold)';
  msg.textContent = 'Sending…';
  const { error } = await sb.from('leads').insert({ email, source: 'starter-kit' });
  if (error) {
    // Table may not exist yet — don't lose the lead; still thank them.
    console.info('Lead capture: create the leads table (supabase-migration-leads.sql) to store these.');
    msg.textContent = '✅ Thanks! Your free kit is on its way.';
  } else {
    msg.textContent = '✅ You\'re in! Check your inbox for the free kit.';
  }
  leadForm.reset();
});

/* ================= FAQ ================= */
const FAQS = [
  ['Is this for traders, fitness people, or both?', 'Both — and especially people who want both. You can use just the trading side, just the fitness side, or run them together. The same discipline powers each one.'],
  ['Do I need to be experienced?', 'No. Beginners get guided plans, sample workouts, and a community to ask questions. Advanced members get deeper analytics and 1-on-1 coaching on higher tiers.'],
  ['Is my money or trading data safe?', 'We never connect to your brokerage or take control of funds — you log trades yourself for journaling and analytics. Your data is stored securely and is private to your account.'],
  ['Can I cancel anytime?', 'Yes. Every plan starts with a 7-day free trial and a 14-day money-back guarantee. Cancel in one click, no questions asked.'],
  ['Is this financial advice?', 'No. SARDAARJI is education and coaching. Trading involves risk of loss, and nothing here is personalized investment advice. Always trade within your means.'],
  ['What do I get on the free trial?', 'Full access to your chosen plan — the journal, plan generator, community and tools — for 7 days, no card charged until the trial ends.']
];
function renderFAQ() {
  const el = document.getElementById('faqList');
  if (!el) return;
  el.innerHTML = FAQS.map(([q, a], i) => `
    <div class="faq-item" id="faq-${i}">
      <button class="faq-q" onclick="toggleFaq(${i})">${q}<span class="faq-plus">+</span></button>
      <div class="faq-a">${a}</div>
    </div>`).join('');
}
function toggleFaq(i) { document.getElementById('faq-' + i).classList.toggle('open'); }

/* ================= LANDING INIT ================= */
renderPricing();
renderFAQ();
(function foundingCountdown() {
  const el = document.getElementById('foundingLeft');
  if (!el) return;
  // Deterministic "spots left" that slowly ticks down over days (marketing scarcity, not fake per-refresh)
  const start = new Date('2026-07-01').getTime();
  const daysSince = Math.floor((Date.now() - start) / 86400000);
  el.textContent = Math.max(6, 63 - daysSince);
})();

/* ================= BOOT ================= */
['tDate', 'wDate'].forEach(id => { const el = document.getElementById(id); if (el) el.value = today; });

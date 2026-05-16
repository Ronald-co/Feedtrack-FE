// ─── utils/helpers.js — Formatting & UI Utilities ───────────────────────────

export function goTo(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const splash = document.getElementById('screen-splash');
  if (splash) splash.style.display = 'none';
  const el = document.getElementById(id);
  if (el) { el.classList.add('active'); window.scrollTo(0, 0); }
}

export function showErr(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
}

export function hideErr(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

export function showOk(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
}

export function togglePwd(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  inp.type = inp.type === 'password' ? 'text' : 'password';
  btn.textContent = inp.type === 'password' ? '👁' : '🙈';
}

export function setBtnLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  btn.querySelector('.btn-label')?.classList.toggle('hidden', loading);
  btn.querySelector('.spinner')?.classList.toggle('hidden', !loading);
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const diffMins = Math.floor((Date.now() - d) / 60000);
  if (diffMins < 1)    return 'Just now';
  if (diffMins < 60)   return `${diffMins} min ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hrs ago`;
  if (diffMins < 2880) return 'Yesterday';
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatFullDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const isToday = d.toDateString() === new Date().toDateString();
  const time = d.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit', hour12: true });
  return isToday
    ? `Today at ${time}`
    : d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }) + ` at ${time}`;
}

export function getTodayString() {
  return new Date().toLocaleDateString('en-NG', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

export function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export function getCategoryClass(type) {
  if (!type) return 'c-other';
  const t = type.toLowerCase();
  if (t.includes('service'))     return 'c-service';
  if (t.includes('staff'))       return 'c-staff';
  if (t.includes('food'))        return 'c-food';
  if (t.includes('maintenance')) return 'c-maintenance';
  return 'c-other';
}

export function getCategoryBarColor(cat) {
  const c = cat.toLowerCase();
  if (c === 'staff')       return '#e74c3c';
  if (c === 'food')        return '#e67e22';
  if (c === 'service')     return '#1B2D5B';
  if (c === 'maintenance') return '#8e44ad';
  return '#94a3b8';
}

export function showToast(message) {
  document.getElementById('gp-toast')?.remove();
  const toast = document.createElement('div');
  toast.id = 'gp-toast';
  toast.textContent = message;
  toast.style.cssText = `
    position:fixed;bottom:80px;left:50%;transform:translateX(-50%);
    background:#1B2D5B;color:#fff;padding:12px 20px;
    border-radius:99px;font-size:13px;font-weight:600;
    z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.2);
    animation:slideUp 0.3s ease;white-space:nowrap;max-width:90vw;
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.4s';
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}

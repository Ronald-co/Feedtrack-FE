// ─── modules/alerts.js — Alert Preferences ───────────────────────────────────
import { goTo } from '../utils/helpers.js';

const ALERT_IDS = ['staff', 'food', 'service', 'maintenance', 'other', 'overdue'];

// ─── Toggle a single alert checkbox + its mirror on the other screen ─────────
export function toggleAlert(id) {
  const cb = document.getElementById(id);
  if (!cb) return;
  cb.checked = !cb.checked;

  const wrap = document.getElementById('diy-' + id);
  if (wrap) wrap.classList.toggle('on', cb.checked);

  // Keep onboarding (alert-*) and settings (s-alert-*) in sync
  const isSettings = id.startsWith('s-');
  const otherId    = isSettings
    ? id.replace('s-alert-', 'alert-')
    : 's-alert-' + id.replace('alert-', '');
  const otherCb   = document.getElementById(otherId);
  const otherWrap = document.getElementById('diy-' + otherId);
  if (otherCb)   otherCb.checked = cb.checked;
  if (otherWrap) otherWrap.classList.toggle('on', cb.checked);

  saveAlertPrefs();
}

// ─── Reset all toggles to off ────────────────────────────────────────────────
export function resetAlertToggles() {
  ALERT_IDS.forEach(id => {
    ['alert-' + id, 's-alert-' + id].forEach(tid => {
      const cb   = document.getElementById(tid);
      const wrap = document.getElementById('diy-' + tid);
      if (cb)   cb.checked = false;
      if (wrap) wrap.classList.remove('on');
    });
  });
}

// ─── Load preferences from localStorage ──────────────────────────────────────
export function loadAlertPrefs() {
  const saved = localStorage.getItem('gp_alert_prefs');
  const prefs = saved ? JSON.parse(saved) : {};
  ALERT_IDS.forEach(id => {
    const val = saved ? (prefs[id] || false) : false;
    ['alert-' + id, 's-alert-' + id].forEach(tid => {
      const cb   = document.getElementById(tid);
      const wrap = document.getElementById('diy-' + tid);
      if (cb)   cb.checked = val;
      if (wrap) wrap.classList.toggle('on', val);
    });
  });
}

// ─── Persist preferences to localStorage ─────────────────────────────────────
export function saveAlertPrefs() {
  const prefs = {};
  ALERT_IDS.forEach(id => {
    const ob  = document.getElementById('alert-' + id);
    const st  = document.getElementById('s-alert-' + id);
    const val = st ? st.checked : (ob ? ob.checked : false);
    prefs[id] = val;
    if (ob) {
      ob.checked = val;
      const w = document.getElementById('diy-alert-' + id);
      if (w) w.classList.toggle('on', val);
    }
    if (st) {
      st.checked = val;
      const w = document.getElementById('diy-s-alert-' + id);
      if (w) w.classList.toggle('on', val);
    }
  });
  localStorage.setItem('gp_alert_prefs', JSON.stringify(prefs));
}

// ─── Onboarding step 3 continue handler ──────────────────────────────────────
export function handleOb3() {
  const phone = document.getElementById('alert-phone')?.value.trim();
  if (phone) {
    // Store for later API calls if needed
    if (window._ob3) window._ob3.phone = phone;
  }
  saveAlertPrefs();
  // QR code auto-generates via MutationObserver in main.js when screen-ob4 activates
  goTo('screen-ob4');
}

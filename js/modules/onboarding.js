// ─── modules/onboarding.js — Onboarding Steps 1–4 ───────────────────────────
import { state }                         from '../config.js';
import { apiFetch }                      from '../utils/api.js';
import { goTo, showErr, hideErr }        from '../utils/helpers.js';

// ─── Step 1 — Business Info ───────────────────────────────────────────────────
export async function handleOb1() {
  hideErr('ob1-err');
  const bizName   = document.getElementById('ob-biz-name').value.trim();
  const bizType   = document.getElementById('ob-biz-type').value;
  const ownerName = document.getElementById('ob-owner-name').value.trim();
  const role      = document.getElementById('ob-role').value;
  const location  = document.getElementById('ob-location').value.trim();

  if (!bizName)              { showErr('ob1-err', 'Please enter your business name.'); return; }
  if (!bizType || bizType === '') { showErr('ob1-err', 'Please select a business type.'); return; }
  if (!ownerName)            { showErr('ob1-err', 'Please enter your name.'); return; }
  if (!role || role === '')  { showErr('ob1-err', 'Please select your role.'); return; }

  state._ob1 = { bizName, bizType, ownerName, role, location };

  if (state._signupData) {
    const { email, password, phone } = state._signupData;
    try {
      await apiFetch('/auth/signup-owner', {
        method: 'POST',
        body: JSON.stringify({
          name: ownerName, email, password,
          businessName: bizName, businessType: bizType,
          businessPhone: phone || '',
        }),
      });
      try {
        const meData = await apiFetch('/auth/me');
        const user = meData.user || meData;
        state.user = user;
        const biz = user.business;
        state.business = (biz && typeof biz === 'object')
          ? biz
          : (biz ? { _id: biz, name: bizName } : { name: bizName, _id: 'local-' + Date.now() });
        localStorage.setItem('gp_user',     JSON.stringify(state.user));
        localStorage.setItem('gp_business', JSON.stringify(state.business));
      } catch (_) {
        state.business = { name: bizName, _id: 'local-' + Date.now() };
        localStorage.setItem('gp_business', JSON.stringify(state.business));
      }
    } catch (e) {
      const isNetworkError =
        e.message === 'Failed to fetch' ||
        e.message.includes('fetch') ||
        e.message.includes('network');
      if (isNetworkError) {
        console.warn('Signup API unreachable, continuing offline:', e.message);
        state.business = { name: bizName, _id: 'local-' + Date.now() };
        state.user     = { name: ownerName, email: state._signupData.email };
        localStorage.setItem('gp_business', JSON.stringify(state.business));
        localStorage.setItem('gp_user',     JSON.stringify(state.user));
      } else {
        showErr('ob1-err', e.message || 'Could not create account. Please try again.');
        return;
      }
    }
  } else {
    if (!state.business) {
      state.business = { name: bizName, _id: 'local-' + Date.now() };
      localStorage.setItem('gp_business', JSON.stringify(state.business));
    }
  }

  const qrLabel = document.getElementById('qr-biz-label');
  const qrName  = document.getElementById('qr-biz-name');
  if (qrLabel) qrLabel.textContent = bizName;
  if (qrName)  qrName.textContent  = bizName;

  goTo('screen-ob2');
}

// ─── Step 2 — Staff (continue button) ────────────────────────────────────────
export function handleOb2() { goTo('screen-ob3'); }

// ─── Step 3 — Alerts (continue button is handled in alerts.js) ───────────────
// (defined in alerts.js as handleOb3)

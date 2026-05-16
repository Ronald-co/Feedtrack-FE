// ─── modules/auth.js — Login, Signup, Forgot Password, Logout ───────────────
import { state }                         from '../config.js';
import { apiFetch }                      from '../utils/api.js';
import { goTo, showErr, hideErr, showOk, setBtnLoading } from '../utils/helpers.js';
import { disconnectSocket }              from './socket.js';
// Lazy imports to avoid circular dependency (auth ↔ dashboard)
const getDashboard = () => import('./dashboard.js');

// ─── Login ───────────────────────────────────────────────────────────────────
export async function handleLogin() {
  hideErr('login-err');
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) {
    showErr('login-err', 'Please enter your email and password.');
    return;
  }
  setBtnLoading('login-btn', true);
  try {
    await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });
    await loadMe();
  } catch (e) {
    const isNetwork = e.message === 'Failed to fetch' || e.message.includes('fetch');
    showErr('login-err', isNetwork
      ? 'Cannot reach the server. Please check your connection or try again later.'
      : e.message || 'Invalid credentials. Please try again.');
  } finally {
    setBtnLoading('login-btn', false);
  }
}

// ─── Load Me (session restore & post-login) ───────────────────────────────────
export async function loadMe() {
  try {
    const data = await apiFetch('/auth/me');
    const user = data.user || data;
    state.user = user;

    const biz   = user.business;
    const bizId = (biz && typeof biz === 'object') ? biz._id : biz;

    if (bizId) {
      try {
        const bizData = await apiFetch('/business/my-business');
        state.business = bizData.business;
      } catch (_) {
        const saved = JSON.parse(localStorage.getItem('gp_business') || 'null');
        state.business = { _id: bizId, name: saved?.name || '' };
      }
    } else {
      state.business = null;
    }

    localStorage.setItem('gp_user',     JSON.stringify(state.user));
    localStorage.setItem('gp_business', JSON.stringify(state.business));

    if (state.business?._id) {
      const { startSocketListeners, goToDashboard } = await getDashboard();
      startSocketListeners(user._id);
      goToDashboard();
    } else {
      goTo('screen-ob1');
    }
  } catch (e) {
    goTo('screen-login');
  }
}

// ─── Forgot Password ─────────────────────────────────────────────────────────
export async function handleForgot() {
  hideErr('forgot-err');
  document.getElementById('forgot-ok').classList.add('hidden');
  const email = document.getElementById('forgot-email').value.trim();
  if (!email) { showErr('forgot-err', 'Please enter your email address.'); return; }
  setBtnLoading('forgot-btn', true);
  try {
    await apiFetch('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    showOk('forgot-ok', '✓ Reset link sent — check your inbox.');
  } catch (e) {
    showErr('forgot-err', e.message || 'Could not send reset email. Please try again.');
  } finally {
    setBtnLoading('forgot-btn', false);
  }
}

// ─── Signup ───────────────────────────────────────────────────────────────────
export async function handleSignup() {
  hideErr('su-err');
  const name     = document.getElementById('su-name').value.trim();
  const email    = document.getElementById('su-email').value.trim();
  const phone    = document.getElementById('su-phone').value.trim();
  const password = document.getElementById('su-password').value;
  if (!name || !email || !password) {
    showErr('su-err', 'Please fill in all required fields.');
    return;
  }
  if (password.length < 8) {
    showErr('su-err', 'Password must be at least 8 characters.');
    return;
  }
  setBtnLoading('su-btn', true);
  try {
    state._signupData = { name, email, phone, password };
    document.getElementById('ob-owner-name').value = name;
    goTo('screen-ob1');
  } catch (e) {
    showErr('su-err', e.message);
  } finally {
    setBtnLoading('su-btn', false);
  }
}

// ─── Logout ───────────────────────────────────────────────────────────────────
export function showLogoutModal() {
  document.getElementById('logout-modal').classList.remove('hidden');
}

export function hideLogoutModal() {
  document.getElementById('logout-modal').classList.add('hidden');
}

export function logout() {
  hideLogoutModal();
  apiFetch('/auth/logout', { method: 'POST' }).catch(() => {});
  disconnectSocket();
  localStorage.removeItem('gp_user');
  localStorage.removeItem('gp_business');
  localStorage.removeItem('gp_alert_prefs');
  state.user       = null;
  state.business   = null;
  state.complaints = [];
  state.staffList  = [];
  document.querySelectorAll('.diy-toggle').forEach(t => t.classList.remove('on'));
  document.querySelectorAll('input[type="checkbox"]').forEach(c => c.checked = false);
  goTo('screen-login');
}


// ─── Reset Password ───────────────────────────────────────────────────────────
export async function handleResetPassword() {
  hideErr('reset-err');
  document.getElementById('reset-ok').classList.add('hidden');

  const password = document.getElementById('reset-password-input').value;
  const confirm  = document.getElementById('reset-confirm-input').value;
  const token    = new URLSearchParams(window.location.search).get('token');

  if (!token) {
    showErr('reset-err', 'Invalid reset link. Please request a new one.');
    return;
  }
  if (!password || password.length < 8) {
    showErr('reset-err', 'Password must be at least 8 characters.');
    return;
  }
  if (password !== confirm) {
    showErr('reset-err', 'Passwords do not match.');
    return;
  }

  setBtnLoading('reset-btn', true);
  try {
    await apiFetch('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
    document.getElementById('reset-ok').textContent = '✓ Password updated! Redirecting to login...';
    document.getElementById('reset-ok').classList.remove('hidden');
    setTimeout(() => goTo('screen-login'), 2000);
  } catch (e) {
    showErr('reset-err', e.message || 'Could not reset password. Please try again.');
  } finally {
    setBtnLoading('reset-btn', false);
  }
}
// ─── main.js — Entry Point & Global App Namespace ────────────────────────────
//
// Imports every module and:
//   1. Boots the app on DOMContentLoaded
//   2. Exposes a single `App` global so inline HTML onclick="App.xxx()" works
//

import { state }                from './config.js';
import { goTo, togglePwd }      from './utils/helpers.js';

// Auth
import {
  handleLogin, loadMe,
  handleForgot, handleSignup, handleResetPassword,
  showLogoutModal, hideLogoutModal, logout,
} from './modules/auth.js';

// Onboarding
import { handleOb1, handleOb2 } from './modules/onboarding.js';
import { handleOb3 }            from './modules/alerts.js';

// Staff
import {
  addStaffMember, removeStaff,
  addStaffFromSettings, removeStaffFromSettings,
  fetchStaff,
} from './modules/staff.js';

// QR
import {
  generateQRCode, downloadQR,
  generateSettingsQR, downloadSettingsQR,
} from './modules/qr.js';

// Dashboard
import {
  goToDashboard,
  loadComplaints,
  filterComplaints,
  setFilter,
  switchFeedType,
} from './modules/dashboard.js';

// Complaints
import {
  openComplaint,
  assignStaff,
  updateStatus,
  saveNote,
} from './modules/complaints.js';

// Analytics
import { setAnalyticsFilter, loadAnalyticsData } from './modules/analytics.js';

// Alerts
import {
  toggleAlert, resetAlertToggles,
  loadAlertPrefs, saveAlertPrefs,
} from './modules/alerts.js';

// Feedback (guest side)
import { selectFbType, submitFeedback } from './modules/feedback.js';

// Staff Screen
import {
  goToStaffScreen,
  loadStaffScreen,
  renderStaffScreen,
  setStaffRoleFilter,
  searchStaffScreen,
  addStaffFromScreen,
  removeStaffFromScreen,
} from './modules/staffScreen.js';

// Staff Detail
import { openStaffDetail } from './modules/staffDetail.js';

// MutationObservers for screens that need to react when they become active

// ─── Boot ────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  // Guest QR scan — skip splash, go straight to feedback form
  const params     = new URLSearchParams(window.location.search);
  const businessId = params.get('businessId');
  const resetToken = params.get('token'); 
  if (businessId) {
    state.feedbackBusinessId = businessId; 
    const bizName = params.get('n') || 'Business';
    document.getElementById('fb-biz-name').textContent = decodeURIComponent(bizName);
    goTo('screen-feedback');
    return;
  }

  if (resetToken) {
  goTo('screen-reset-password');
  return;
}

  resetAlertToggles();
  if (localStorage.getItem('gp_alert_prefs')) loadAlertPrefs();

  const splash = document.getElementById('screen-splash');
  if (splash) splash.classList.add('active');

  setTimeout(() => {
    if (state.user && state.business) {
      loadMe();
    } else {
      goTo('screen-login');
    }
  }, 1600);
});

// ─── Screen Observers ────────────────────────────────────────────────────────
// Onboarding step 4 — generate QR when screen activates
const ob4El = document.getElementById('screen-ob4');
if (ob4El) {
  new MutationObserver(() => {
    if (ob4El.classList.contains('active')) generateQRCode();
  }).observe(ob4El, { attributes: true });
}

// Analytics screen
const analyticsEl = document.getElementById('screen-analytics');
if (analyticsEl) {
  new MutationObserver(() => {
    if (analyticsEl.classList.contains('active')) loadAnalyticsData('week');
  }).observe(analyticsEl, { attributes: true });
}

// Settings screen
const settingsEl = document.getElementById('screen-settings');
if (settingsEl) {
  new MutationObserver(() => {
    if (settingsEl.classList.contains('active')) {
      fetchStaff();
      if (localStorage.getItem('gp_alert_prefs')) loadAlertPrefs();
      else resetAlertToggles();
      generateSettingsQR();
    }
  }).observe(settingsEl, { attributes: true });
}

// Staff screen
const staffScreenEl = document.getElementById('screen-staff');
if (staffScreenEl) {
  new MutationObserver(() => {
    if (staffScreenEl.classList.contains('active')) loadStaffScreen();
  }).observe(staffScreenEl, { attributes: true });
}
// Exposes all public functions used by inline HTML onclick="App.xxx()" handlers.
window.App = {
  // Navigation
  goTo,

  // Auth
  handleLogin, loadMe,
  handleForgot, handleSignup, handleResetPassword,
  showLogoutModal, hideLogoutModal, logout,

  // Onboarding
  handleOb1, handleOb2, handleOb3,

  // Staff
  addStaffMember, removeStaff,
  addStaffFromSettings, removeStaffFromSettings,

  // QR
  downloadQR, downloadSettingsQR,

  // Dashboard
  goToDashboard, filterComplaints, setFilter, switchFeedType,

  // Complaints
  openComplaint, assignStaff, updateStatus, saveNote,

  // Analytics
  setAnalyticsFilter,

  // Alerts
  toggleAlert, saveAlertPrefs,

  // Feedback form
  selectFbType, submitFeedback,

  // Helpers exposed for inline use
  togglePwd,

  // Staff Screen
  goToStaffScreen,
  setStaffRoleFilter,
  searchStaffScreen,
  addStaffFromScreen,
  removeStaffFromScreen,

  // Staff Detail
  openStaffDetail,
};

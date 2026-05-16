// ─── modules/feedback.js — Guest Feedback Form (QR Scan Side) ────────────────
import { state }            from '../config.js';
import { apiFetch }         from '../utils/api.js';
import { goTo, showErr, hideErr } from '../utils/helpers.js';

// ─── Select feedback type (complaint / compliment / suggestion) ───────────────
export function selectFbType(btn, type) {
  state.feedbackType = type;
  document.querySelectorAll('.fb-type-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// ─── Submit guest feedback ────────────────────────────────────────────────────
export async function submitFeedback() {
  hideErr('fb-err');
  const message    = document.getElementById('fb-message').value.trim();
  const guestName  = document.getElementById('fb-guest-name').value.trim();
  const businessId = state.feedbackBusinessId;

  if (!message) {
    showErr('fb-err', 'Please describe your experience before submitting.');
    return;
  }

  const btn = document.getElementById('fb-submit-btn');
  if (btn) {
    btn.disabled = true;
    btn.querySelector('.btn-label')?.classList.add('hidden');
    btn.querySelector('.spinner')?.classList.remove('hidden');
  }

  try {
    await apiFetch('/feedbacks', {
      method: 'POST',
      body: JSON.stringify({
        businessId,
        type:      state.feedbackType,
        guestName: guestName || 'Anonymous',
        message,
      }),
    });
  } catch (e) {
    // Offline-friendly — show success screen regardless
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.querySelector('.btn-label')?.classList.remove('hidden');
      btn.querySelector('.spinner')?.classList.add('hidden');
    }
    document.getElementById('fb-message').value    = '';
    document.getElementById('fb-guest-name').value = '';
    state.feedbackType = 'complaint';
    document.querySelectorAll('.fb-type-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
    goTo('screen-feedback-done');
  }
}

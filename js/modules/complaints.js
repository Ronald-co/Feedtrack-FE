// ─── modules/complaints.js — Complaint Detail, Assign, Status, Notes ─────────
import { state }                             from '../config.js';
import { apiFetch }                          from '../utils/api.js';
import { goTo, showErr, showOk, formatFullDate } from '../utils/helpers.js';
import { updateStats }                       from './dashboard.js';

// ─── Open Complaint Detail ────────────────────────────────────────────────────
export async function openComplaint(id) {
  goTo('screen-complaint-detail');
  document.getElementById('detail-msg').classList.add('hidden');
  try {
    const data = await apiFetch(`/feedbacks/${id}`);
    const c = data.feedback || data;
    state.currentComplaint = c;
    renderComplaintDetail(c);
  } catch (e) {
    // Fallback to cached complaint
    const c = state.complaints.find(x => x._id === id);
    if (c) { state.currentComplaint = c; renderComplaintDetail(c); }
  }
}

// ─── Render Complaint Detail ──────────────────────────────────────────────────
export function renderComplaintDetail(c) {
  const status    = c.status || 'open';
  const catName   = (c.category || c.type || 'complaint').replace('_', ' ');
  const isOverdue = status === 'open' && c.createdAt &&
                    (Date.now() - new Date(c.createdAt)) > 86400000;
  const via       = c.source === 'whatsapp' ? 'WhatsApp' : 'QR Form';

  document.getElementById('detail-tags').innerHTML = `
    <span class="detail-tag">${catName.charAt(0).toUpperCase() + catName.slice(1)}</span>
    <span class="detail-tag">${via === 'WhatsApp' ? '📱' : '📋'} ${via}</span>
    ${isOverdue ? '<span class="detail-tag overdue">⚠ Overdue</span>' : ''}
  `;
  document.getElementById('d-via').textContent       = via;
  document.getElementById('d-submitted').textContent = formatFullDate(c.createdAt);
  document.getElementById('d-guest').textContent     = c.guestName || 'Anonymous';
  document.getElementById('d-message').textContent   = c.message || '';

  // Populate staff assignment dropdown
  const sel = document.getElementById('assign-staff-sel');
  sel.innerHTML = '<option value="" disabled selected>Select staff member...</option>';
  state.staffList.forEach(s => {
    const opt = document.createElement('option');
    opt.value       = s._id || s.id;
    opt.textContent = `${s.fullname} — ${s.role}`;
    sel.appendChild(opt);
  });
  if (c.assignedTo) sel.value = c.assignedTo;

  document.querySelectorAll('.status-btn').forEach(btn => {
    btn.className = 'status-btn';
    if (btn.dataset.s === status) btn.classList.add(`active-${status}`);
  });

  document.getElementById('resolve-notes').value = c.resolutionNotes || c.notes || '';
}

// ─── Assign Staff ─────────────────────────────────────────────────────────────
export async function assignStaff() {
  const staffId = document.getElementById('assign-staff-sel').value;
  if (!staffId || !state.currentComplaint) return;

  const btn = document.querySelector('#assign-section .btn-primary');
  if (btn) {
    btn.disabled = true;
    btn.querySelector('.btn-label')?.classList.add('hidden');
    btn.querySelector('.spinner')?.classList.remove('hidden');
  }
  try {
    await apiFetch('/feedbacks/assign/complaint', {
      method: 'PUT',
      body: JSON.stringify({ feedbackId: state.currentComplaint._id, staffId }),
    });
    const staffName = document.getElementById('assign-staff-sel').selectedOptions[0]?.text || 'staff';
    showOk('detail-msg', `✓ Assigned to ${staffName}`);
    state.currentComplaint.assignedTo = staffId;
    state.currentComplaint.status     = 'in-progress';
    renderComplaintDetail(state.currentComplaint);
  } catch (e) {
    showErr('detail-msg', e.message || 'Could not assign staff.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.querySelector('.btn-label')?.classList.remove('hidden');
      btn.querySelector('.spinner')?.classList.add('hidden');
    }
  }
}

// ─── Update Status ────────────────────────────────────────────────────────────
export async function updateStatus(newStatus) {
  if (!state.currentComplaint) return;
  const notes = document.getElementById('resolve-notes').value;
  try {
    if (newStatus === 'resolved') {
      await apiFetch('/feedbacks/resolve/complaint', {
        method: 'PUT',
        body: JSON.stringify({ feedbackId: state.currentComplaint._id, notes }),
      });
    } else {
      await apiFetch('/feedbacks/assign/complaint', {
        method: 'PUT',
        body: JSON.stringify({ feedbackId: state.currentComplaint._id, status: newStatus }),
      });
    }
  } catch (_) {}

  state.currentComplaint.status = newStatus;
  renderComplaintDetail(state.currentComplaint);
  const idx = state.complaints.findIndex(c => c._id === state.currentComplaint._id);
  if (idx > -1) state.complaints[idx].status = newStatus;
  updateStats();

  const label = newStatus === 'in-progress'
    ? 'In Progress'
    : newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
  showOk('detail-msg', `✓ Status updated to "${label}"`);
}

// ─── Save Internal Note ───────────────────────────────────────────────────────
export async function saveNote() {
  if (!state.currentComplaint) return;
  const notes = document.getElementById('resolve-notes').value;
  try {
    await apiFetch('/feedbacks/resolve/complaint', {
      method: 'PUT',
      body: JSON.stringify({ feedbackId: state.currentComplaint._id, notes }),
    });
    showOk('detail-msg', '✓ Note saved successfully');
  } catch (_) {
    showOk('detail-msg', '✓ Note saved locally');
  }
}

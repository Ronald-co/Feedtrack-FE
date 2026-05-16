// ─── modules/qr.js — QR Code Generation & Download ──────────────────────────
import { state, API } from '../config.js';

// ─── Generate QR for onboarding step 4 ───────────────────────────────────────
export async function generateQRCode() {
  const box = document.getElementById('qr-code-box');
  if (!box) return;
  box.innerHTML = '<p style="color:#2B4EAA;font-size:13px;text-align:center;padding:24px;">Generating QR code...</p>';

  const urlPreviewBox = document.getElementById('qr-url-box');
  const urlWarningEl  = document.getElementById('qr-url-warning');
  if (urlPreviewBox) urlPreviewBox.style.display = 'none';
  if (urlWarningEl)  urlWarningEl.style.display  = 'none';

  const bizId   = state.business?._id;
  const bizName = state.business?.name || 'Your Business';
  const qrLabel = document.getElementById('qr-biz-label');
  const qrName  = document.getElementById('qr-biz-name');
  if (qrLabel) qrLabel.textContent = bizName;
  if (qrName)  qrName.textContent  = bizName;

  if (bizId && !bizId.startsWith('local-')) {
    try {
      const res  = await fetch(`${API}/qr/${bizId}`);
      const data = await res.json();
      if (data.qrCode) {
        box.innerHTML = '';
        const img = document.createElement('img');
        img.src = data.qrCode;
        img.style.cssText = 'width:180px;height:180px;display:block;border-radius:8px;';
        box.appendChild(img);
        if (data.link) {
          state.feedbackLink = data.link;
          try {
            const url = new URL(data.link);
            const bId = url.searchParams.get('businessId') || url.pathname.split('/').pop();
            if (bId) state.feedbackBusinessId = bId;
          } catch (_) {}
        }
        return;
      }
    } catch (e) {
      console.warn('QR API failed, generating locally:', e.message);
    }
  }

  _generateQRLocally(box, bizId, bizName, 180);
}

// ─── Generate QR for Settings screen ─────────────────────────────────────────
export async function generateSettingsQR() {
  const box = document.getElementById('settings-qr-box');
  if (!box) return;
  box.innerHTML = '<p style="color:#2B4EAA;font-size:12px;text-align:center;padding:12px;">Loading...</p>';

  const bizId   = state.business?._id;
  const bizName = state.business?.name || 'Your Business';
  const nameEl  = document.getElementById('settings-qr-biz-name');
  if (nameEl) nameEl.textContent = bizName;

  if (bizId && !bizId.startsWith('local-')) {
    try {
      const res  = await fetch(`${API}/qr/${bizId}`);
      const data = await res.json();
      if (data.qrCode) {
        box.innerHTML = '';
        const img = document.createElement('img');
        img.src = data.qrCode;
        img.style.cssText = 'width:160px;height:160px;display:block;border-radius:8px;';
        box.appendChild(img);
        if (data.link) state.feedbackLink = data.link;
        return;
      }
    } catch (e) {
      console.warn('Settings QR API failed, generating locally:', e.message);
    }
  }

  _generateQRLocally(box, bizId, bizName, 160);
}

// ─── Download QR (onboarding) ─────────────────────────────────────────────────
export function downloadQR() {
  const canvas = document.querySelector('#qr-code-box canvas');
  if (canvas) {
    const link = document.createElement('a');
    link.download = 'guestpulse-qr.png';
    link.href = canvas.toDataURL();
    link.click();
  }
}

// ─── Download QR (settings) ───────────────────────────────────────────────────
export function downloadSettingsQR() {
  const canvas = document.querySelector('#settings-qr-box canvas');
  const img    = document.querySelector('#settings-qr-box img');
  if (canvas) {
    const link = document.createElement('a');
    link.download = 'guestpulse-qr.png';
    link.href = canvas.toDataURL();
    link.click();
  } else if (img) {
    const link = document.createElement('a');
    link.download = 'guestpulse-qr.png';
    link.href = img.src;
    link.click();
  } else {
    downloadQR();
  }
}

// ─── Private: local QR fallback ───────────────────────────────────────────────
function _generateQRLocally(box, bizId, bizName, size) {
  box.innerHTML = '';
  const feedbackUrl = `${window.location.origin}${window.location.pathname}?businessId=${bizId || 'demo'}&n=${encodeURIComponent(bizName)}`;
  function tryGenerate(attempts) {
    if (typeof QRCode !== 'undefined') {
      try {
        new QRCode(box, {
          text: feedbackUrl, width: size, height: size,
          colorDark: '#1B2D5B', colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.H,
        });
      } catch (e) {
        box.innerHTML = `<p style="color:#2B4EAA;font-size:13px;text-align:center;padding:16px;">QR Code ready</p>`;
      }
    } else if (attempts > 0) {
      setTimeout(() => tryGenerate(attempts - 1), 300);
    } else {
      box.innerHTML = `<p style="color:#2B4EAA;font-size:13px;text-align:center;padding:16px;">QR Code ready</p>`;
    }
  }
  tryGenerate(10);
}

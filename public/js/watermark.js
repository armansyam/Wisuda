(function() {
  const version = "v1.2.0-dev";
  const amsLogo = "data:image/webp;base64,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";
  
  // Deteksi Halaman & Seting Tema Kontekstual
  const isClientPage = !window.location.pathname.includes('/admin') && !window.location.pathname.includes('freelance');
  
  // Konfigurasi Tema & Deskripsi
  let primaryColor = "#0f766e"; // Teal untuk Admin
  let buttonTextColor = "#ffffff";
  let darkTextColor = "#1e293b";
  let shadowColor = "rgba(15, 118, 110, 0.2)";
  let description = "Designed, built, and optimized with Node.js, Express, and custom styling.";

  if (window.location.pathname.includes('freelance')) {
    primaryColor = "#111E35"; // Navy untuk Freelance Portal
    buttonTextColor = "#D4AF37"; // Gold text untuk Freelance Portal
    shadowColor = "rgba(17, 30, 53, 0.2)";
    description = "Designed & built with Express.js, Alpine.js, and custom styling.";
  } else if (isClientPage) {
    primaryColor = "#C59B63"; // Gold/Bronze untuk Portfolio Publik
    buttonTextColor = "#1A1A2E"; // Navy text untuk kontras
    darkTextColor = "#1A1A2E";
    shadowColor = "rgba(197, 155, 99, 0.3)";
  }

  // Create Style Element
  const style = document.createElement('style');
  style.type = 'text/css';
  style.innerHTML = `
    .dev-watermark-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 48px;
      height: 48px;
      background: transparent;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 9999;
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      border: none;
    }
    .dev-watermark-btn:hover {
      transform: scale(1.1) rotate(5deg);
    }
    .dev-watermark-btn:active {
      transform: scale(0.95);
    }
    .dev-watermark-popup {
      position: fixed;
      bottom: 84px;
      right: 24px;
      width: 320px;
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.5);
      border-radius: 20px;
      padding: 20px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
      z-index: 9998;
      animation: slideUpFade 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
      display: none;
      flex-direction: column;
      gap: 14px;
      font-family: 'Inter', sans-serif;
    }
    @keyframes slideUpFade {
      from {
        opacity: 0;
        transform: translateY(12px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    .dev-watermark-status {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      color: #0f766e;
      background: #f0fdfa;
      padding: 4px 10px;
      border-radius: 99px;
      width: fit-content;
      border: 1px solid #ccfbf1;
      font-weight: 600;
    }
    .dev-watermark-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #14b8a6;
      box-shadow: 0 0 8px #14b8a6;
      animation: pulseGlow 2s infinite;
    }
    @keyframes pulseGlow {
      0% { transform: scale(1); opacity: 0.6; }
      50% { transform: scale(1.3); opacity: 1; box-shadow: 0 0 12px #14b8a6; }
      100% { transform: scale(1); opacity: 0.6; }
    }
  `;
  document.head.appendChild(style);

  // Create Button Element
  const btn = document.createElement('div');
  btn.className = 'dev-watermark-btn';
  btn.id = 'dev-watermark-btn';
  btn.title = 'Developer Info';
  btn.innerHTML = `<img src="data:image/webp;base64,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" alt="AMS Logo" style="width: 38px; height: 38px; object-fit: contain;" />`;

  // Create Popup Element
  const popup = document.createElement('div');
  popup.className = 'dev-watermark-popup';
  popup.id = 'dev-watermark-popup';
  popup.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; border: none; background: transparent; padding: 0;">
      <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: 700; text-align: left;">Developer Credit</span>
      <div class="dev-watermark-status" id="dev-watermark-status-box">
        <span class="dev-watermark-dot"></span>
        <span>Active Release</span>
      </div>
    </div>
    <div style="text-align: left; border: none; background: transparent; padding: 0;">
      <img src="data:image/webp;base64,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" alt="AMS Logo" style="height: 36px; object-fit: contain; margin-bottom: 8px; display: block;" />
      <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.4; text-align: left;">${description}</p>
    </div>
    <div style="border-top: 1px solid rgba(0,0,0,0.06); padding-top: 12px; display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
      <span style="color: #64748b;">System Version</span>
      <strong id="dev-watermark-version-tag" style="color: ${darkTextColor};">${version}</strong>
    </div>
    <div style="display: flex; gap: 8px; margin-top: 4px; border: none; background: transparent; padding: 0;">
      <a href="https://github.com/armansyam" target="_blank" rel="noopener noreferrer" style="
        flex: 1;
        text-align: center;
        background: ${primaryColor};
        color: ${buttonTextColor};
        padding: 8px 0;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        text-decoration: none;
        box-shadow: 0 2px 8px ${shadowColor};
      ">
        GitHub Profile
      </a>
      <button id="dev-watermark-close" style="
        padding: 8px 12px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        background: white;
        color: #64748b;
        font-size: 12px;
        cursor: pointer;
        font-weight: 600;
      ">
        Tutup
      </button>
    </div>
  `;

  // Append to body
  document.body.appendChild(btn);
  document.body.appendChild(popup);

  // Fetch dynamic version from API
  try {
    fetch('/api/public/version')
      .then(r => r.json())
      .then(d => {
        if (d && (d.release || d.version)) {
          const vTag = document.getElementById('dev-watermark-version-tag');
          if (vTag) vTag.textContent = d.release || ('v' + d.version);
          
          if (d.updateAvailable) {
            const statusEl = document.getElementById('dev-watermark-status-box');
            if (statusEl) {
              statusEl.innerHTML = '<span style="width:6px;height:6px;border-radius:50%;background:#f59e0b;box-shadow:0 0 8px #f59e0b;"></span><span style="color:#b45309;">🔔 Update Tersedia</span>';
              statusEl.style.background = '#fffbeb';
              statusEl.style.borderColor = '#fef3c7';
              statusEl.title = `Commit baru tersedia di GitHub: ${d.latestGitHubHash || ''} - ${d.latestCommitMessage || ''}`;
            }
          }
        }
      })
      .catch(() => {});
  } catch(e) {}

  // Event Listeners
  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    if (popup.style.display === 'flex') {
      popup.style.display = 'none';
    } else {
      popup.style.display = 'flex';
    }
  });

  const closeBtn = document.getElementById('dev-watermark-close');
  closeBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    popup.style.display = 'none';
  });

  document.addEventListener('click', function(e) {
    if (!popup.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
      popup.style.display = 'none';
    }
  });
})();

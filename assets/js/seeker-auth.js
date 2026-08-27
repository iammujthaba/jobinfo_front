let currentSeekerPhone = "";
let seekerResendTimer = null;
let seekerPinPollTimer = null;

async function sendSeekerOtp(isResend = false) {
  let phoneInput = document.getElementById("loginPhone").value.trim();
  if (isResend) {
    phoneInput = currentSeekerPhone.replace(/^91/, "");
  } else {
    if (!phoneInput || phoneInput.length < 10) {
      alert("Please enter a valid 10-digit WhatsApp number.");
      return;
    }
    currentSeekerPhone = "91" + phoneInput;
  }

  const btn = document.getElementById("btnSendOtp");
  const resendBtn = document.getElementById("btnResendOtp");

  if (!isResend) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true" style="margin-right:8px;"></span> Sending...';
  } else if (resendBtn) {
    resendBtn.disabled = true;
    resendBtn.innerHTML = 'Sending...';
  }

  try {
    const res = await fetch(`${JOBINFO_CONFIG.API_URL}/api/otp/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wa_number: currentSeekerPhone, role: "seeker" })
    });

    if (res.ok) {
      const data = await res.json();

      // ── Outside 24h window — switch to Reverse OTP PIN flow ──────────────
      if (data.within_24h === false) {
        if (!isResend) {
          document.getElementById("loginStepPhone").style.display = "none";
          document.getElementById("loginStepUnregistered").style.display = "none";
          document.getElementById("loginStepOtp").style.display = "none";
          document.getElementById("loginStepPin").style.display = "block";
          document.getElementById("s-dot1").classList.add("active");
          document.getElementById("s-dot2").classList.add("active");
          await showSeekerPinQrStep();
        }
        return;
      }

      // ── Within 24h window — normal OTP flow ──────────────────────────────
      if (!isResend) {
        document.getElementById("loginStepPhone").style.display = "none";
        document.getElementById("loginStepUnregistered").style.display = "none";
        document.getElementById("loginStepOtp").style.display = "block";
        document.getElementById("s-dot1").classList.add("active");
        document.getElementById("s-dot2").classList.add("active");
      }
      startSeekerResendTimer();
    } else {
      const data = await res.json();
      if (data.detail === "not_registered") {
        document.getElementById("loginStepPhone").style.display = "none";
        document.getElementById("loginStepOtp").style.display = "none";
        document.getElementById("loginStepUnregistered").style.display = "block";
      } else {
        alert("Failed to send OTP: " + data.detail);
      }
      if (resendBtn && isResend) resendBtn.disabled = false;
    }
  } catch (error) {
    console.error(error);
    alert("Network error. Please try again.");
    if (resendBtn && isResend) resendBtn.disabled = false;
  } finally {
    if (!isResend) {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-send me-2"></i>Send OTP';
    }
  }
}

async function showSeekerPinQrStep() {
  // ── 1. Create OTP session — wa_number stored server-side ──────────────
  let sessionId, otp;
  try {
    const res = await fetch(`${JOBINFO_CONFIG.API_URL}/api/auth/pin/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "seeker", wa_number: currentSeekerPhone }),
    });
    if (!res.ok) throw new Error("OTP create failed");
    const data = await res.json();
    sessionId = data.session_id;
    otp = data.otp;
  } catch (e) {
    alert("Could not generate a verification code. Please try again.");
    return;
  }

  // ── 2. Display OTP — QR / deep link pre-fills just the 6 digits ───────
  const pinDisplay = document.getElementById("seeker-pin-display");
  if (pinDisplay) pinDisplay.textContent = otp;

  // Pre-fill only the 6-digit OTP — user just taps Send, like any standard OTP
  const waLink = "https://wa.me/" + JOBINFO_CONFIG.BUSINESS_WA + "?text=" + encodeURIComponent(otp);
  const qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=" + encodeURIComponent(waLink);

  const qrImg = document.getElementById("seeker-pin-qr-img");
  if (qrImg) qrImg.src = qrUrl;

  const waBtn = document.getElementById("seeker-pin-wa-btn");
  if (waBtn) waBtn.href = waLink;

  // ── 3. Poll every 5s — hard stop at 5 min (matches backend TTL) ───────
  if (seekerPinPollTimer) clearInterval(seekerPinPollTimer);
  const MAX_POLLS = 60; // 60 × 5s = 300s = 5 min
  let pollCount = 0;

  const handleExpiry = () => {
    if (seekerPinPollTimer) {
      clearInterval(seekerPinPollTimer);
      seekerPinPollTimer = null;
    }
    const statusWrap = document.getElementById("seeker-pin-status-wrap")
      || (document.getElementById("seeker-pin-status-text") ? document.getElementById("seeker-pin-status-text").parentNode : null);
    if (statusWrap) {
      statusWrap.innerHTML = `
        <div style="text-align:center;padding:4px 0;">
          <p class="text-danger small mb-2 fw-semibold" style="font-size:.82rem;">
            <i class="bi bi-exclamation-circle me-1"></i>OTP Expired (5 min time out). Generate a new code to continue.
          </p>
          <button type="button" class="btn btn-outline-success btn-sm rounded-pill px-3 py-1 fw-bold" id="seeker-refresh-otp-btn">
            <i class="bi bi-arrow-clockwise me-1"></i>Generate New OTP
          </button>
        </div>
      `;
      const refreshBtn = document.getElementById("seeker-refresh-otp-btn");
      if (refreshBtn) {
        refreshBtn.addEventListener("click", () => {
          statusWrap.innerHTML = `
            <div class="spinner-border spinner-border-sm text-success" role="status"></div>
            <span id="seeker-pin-status-text" style="font-size:.8rem;color:#888;">Waiting for your OTP…</span>
          `;
          showSeekerPinQrStep();
        });
      }
    }
  };

  const checkStatus = async () => {
    pollCount++;
    if (pollCount > MAX_POLLS) {
      handleExpiry();
      return;
    }

    try {
      const res = await fetch(`${JOBINFO_CONFIG.API_URL}/api/auth/pin/status/${sessionId}`);
      if (!res.ok) return;
      const data = await res.json();

      if (data.status === "expired") {
        handleExpiry();
        return;
      }

      if (data.status === "verified") {
        clearInterval(seekerPinPollTimer);
        seekerPinPollTimer = null;

        localStorage.setItem("seeker_session_token", data.session_token);
        localStorage.setItem("seeker_wa_number", data.wa_number);

        if (data.is_new_user) {
          window.location.href = "register.html";
        } else {
          window.location.href = "dashboard.html";
        }
      }
    } catch (e) { console.error(e); }
  };

  seekerPinPollTimer = setInterval(checkStatus, 5000);
}

function startSeekerResendTimer() {
  const resendBtn = document.getElementById("btnResendOtp");
  const cdSpan = document.getElementById("s-cd");
  if (!resendBtn || !cdSpan) return;

  resendBtn.disabled = true;
  let timeLeft = 60;
  resendBtn.innerHTML = `Resend in <span id="s-cd">${timeLeft}</span>s`;

  if (seekerResendTimer) clearInterval(seekerResendTimer);

  seekerResendTimer = setInterval(() => {
    timeLeft--;
    const currentCd = document.getElementById("s-cd");
    if (currentCd) currentCd.textContent = timeLeft;

    if (timeLeft <= 0) {
      clearInterval(seekerResendTimer);
      resendBtn.disabled = false;
      resendBtn.innerHTML = "Resend OTP";
    }
  }, 1000);
}

async function verifySeekerOtp() {
  const otpInput = document.getElementById("loginOtp").value.trim();
  if (otpInput.length !== 6) {
    alert("Please enter the 6-digit OTP.");
    return;
  }
  const btn = document.getElementById("btnVerifyOtp");
  btn.disabled = true;
  btn.innerHTML = 'Verifying...';

  try {
    const res = await fetch(`${JOBINFO_CONFIG.API_URL}/api/otp/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wa_number: currentSeekerPhone,
        otp_code: otpInput,
        role: "seeker"
      })
    });

    if (res.ok) {
      const data = await res.json();
      localStorage.setItem("seeker_session_token", data.session_token);
      localStorage.setItem("seeker_wa_number", data.wa_number);

      // Route based on newly returned flag
      if (data.is_new_user) {
        window.location.href = "register.html";
      } else {
        window.location.href = "dashboard.html";
      }
    } else {
      alert("Invalid or Expired OTP. Please try again.");
    }
  } catch (error) {
    console.error(error);
    alert("Network error.");
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Verify &amp; Open Dashboard';
  }
}

function changePhoneNumber() {
  document.getElementById("loginStepOtp").style.display = "none";
  document.getElementById("loginStepUnregistered").style.display = "none";
  document.getElementById("loginStepPhone").style.display = "block";
  document.getElementById("s-dot2").classList.remove("active");
  document.getElementById("s-dot1").classList.add("active");
  document.getElementById("loginOtp").value = "";
  if (seekerResendTimer) {
    clearInterval(seekerResendTimer);
    seekerResendTimer = null;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Auto-Login Interceptor for Magic Links
  const urlParams = new URLSearchParams(window.location.search);
  const magicToken = urlParams.get('magic_token');

  if (magicToken) {
    // Show full-page overlay
    const overlayHtml = `
      <div id="magic-auth-overlay" style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:#fff;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;">
        <div class="spinner-border text-success mb-3" role="status" style="width:3rem;height:3rem;"></div>
        <h5 class="text-muted fw-bold">Authenticating...</h5>
        <p class="text-muted small">Please wait while we log you in securely.</p>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', overlayHtml);

    fetch(`${JOBINFO_CONFIG.API_URL}/api/auth/magic/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: magicToken })
    })
      .then(res => {
        if (!res.ok) throw new Error("Invalid or expired magic link");
        return res.json();
      })
      .then(data => {
        localStorage.setItem("seeker_session_token", data.session_token);
        localStorage.setItem("seeker_wa_number", data.wa_number);

        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.replaceState({ path: newUrl }, '', newUrl);

        if (data.is_new_user) {
          window.location.href = "register.html";
        } else {
          window.location.href = "dashboard.html";
        }
      })
      .catch(err => {
        console.error(err);
        document.getElementById('magic-auth-overlay').remove();

        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.replaceState({ path: newUrl }, '', newUrl);

        swal("Authentication Failed", "This session has expired or No-longer available. Please log in using OTP.", "warning")
          .then(() => {
            const seekerModal = document.getElementById('seekerLoginModal');
            if (seekerModal) {
              const modalInstance = new bootstrap.Modal(seekerModal);
              modalInstance.show();
            }
          });
      });

    return; // Stop further initialized of DOM elements behind the overlay
  }

  const seekerModal = document.getElementById('seekerLoginModal');
  if (seekerModal) {
    seekerModal.addEventListener('hidden.bs.modal', () => {
      changePhoneNumber();
      document.getElementById("loginPhone").value = "";
      currentSeekerPhone = "";
    });
  }
});

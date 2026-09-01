/**
 * recruiter.js — Handles the 3-step OTP authenticated vacancy submission & Registration.
 */

"use strict";

/* ── BFCache Reset: clear stale OTP state when navigating back ───────────── */
window.addEventListener('pageshow', (event) => {
  if (!event.persisted) return; // Only runs when restored from bfcache (back/forward nav)

  // ── 1. Force-close the Bootstrap recruiter login modal if it's open ───────
  const modalEl = document.getElementById('recruiterLoginModal');
  if (modalEl) {
    // Remove Bootstrap modal open classes/styles from the DOM
    modalEl.style.display = 'none';
    modalEl.classList.remove('show');
    modalEl.removeAttribute('aria-modal');
    modalEl.setAttribute('aria-hidden', 'true');
    // Remove backdrop if lingering
    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('padding-right');
    document.body.style.removeProperty('overflow');
    // Destroy Bootstrap instance so it reinitialises cleanly next time
    try {
      if (window.bootstrap) {
        const inst = bootstrap.Modal.getInstance(modalEl);
        if (inst) inst.dispose();
      }
    } catch (e) { /* ignore */ }
  }

  // ── 2. Reset modal OTP steps back to step 1 ──────────────────────────────
  ['modal-step2', 'modal-step3', 'modal-step-qr'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  const modalStep1 = document.getElementById('modal-step1');
  if (modalStep1) modalStep1.style.display = 'block';

  // Clear modal OTP and phone inputs
  const modalOtp = document.getElementById('modal-otp-input');
  if (modalOtp) modalOtp.value = '';
  const modalWa = document.getElementById('modal-wa-input');
  if (modalWa) modalWa.value = '';

  // ── 3. Reset inline OTP surface back to step 1 ───────────────────────────
  ['otp-step2', 'otp-step3', 'otp-step-qr'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  const step1 = document.getElementById('otp-step1');
  if (step1) step1.style.display = 'block';

  // Clear inline OTP and phone inputs
  const otpInput = document.getElementById('otp-input');
  if (otpInput) otpInput.value = '';
  const waInput = document.getElementById('wa-number-input');
  if (waInput) waInput.value = '';

  // ── 4. Reset in-memory auth state ────────────────────────────────────────
  verifiedWaNumber = null;
  sessionToken = null;
  qrVerifiedForReg = null;
});


let sessionToken = null;
let verifiedWaNumber = null;
// Store whether this specific surface is in registration mode
let surfaceRegMode = {};
let registrationData = {};
// Set when the user was pre-verified via Reverse OTP — allows skipping OTP in reg form
let qrVerifiedForReg = null;  // { session_token, wa_number } | null

/* ── Magic Link Interception ─────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const magicToken = urlParams.get('token') || urlParams.get('magic_token');

  if (magicToken) {
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
        const sessionToken = data.session_token;
        const verifiedWaNumber = data.wa_number;

        sessionStorage.setItem("ji_token", sessionToken);
        sessionStorage.setItem("ji_wa", verifiedWaNumber);
        sessionStorage.setItem("ji_r_token", sessionToken);
        sessionStorage.setItem("ji_r_wa", verifiedWaNumber);

        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.replaceState({ path: newUrl }, '', newUrl);

        window.location.href = 'recruiter-dashboard.html';
      })
      .catch(err => {
        console.error(err);
        const overlay = document.getElementById('magic-auth-overlay');
        if (overlay) overlay.remove();

        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.replaceState({ path: newUrl }, '', newUrl);

        swal("Authentication Failed", "This session has expired or No-longer available. Please log in using OTP.", "warning");
      });
  }
});

/* ── DOM Init & Gatekeeper Logic ─────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  // Initialize WhatsApp Banner Link
  if (typeof JOBINFO_CONFIG !== 'undefined' && JOBINFO_CONFIG.BUSINESS_WA) {
    const waBtn = document.getElementById('wa-post-btn');
    if (waBtn) {
      const triggerMessage = encodeURIComponent("Post Vacancy");
      waBtn.href = `https://wa.me/${JOBINFO_CONFIG.BUSINESS_WA}?text=${triggerMessage}`;
    }

    // Modal WhatsApp button (components/modals.html)
    const waModalBtn = document.getElementById('wa-modal-btn');
    if (waModalBtn) {
      waModalBtn.href = `https://wa.me/${JOBINFO_CONFIG.BUSINESS_WA}?text=Hi`;
    }

    // Recruiter page WhatsApp button (recruiter.html)
    const waRecruiterBtn = document.getElementById('wa-recruiter-btn');
    if (waRecruiterBtn) {
      const recruiterMsg = encodeURIComponent("Hi JobInfo, I am a recruiter!");
      waRecruiterBtn.href = `https://wa.me/${JOBINFO_CONFIG.BUSINESS_WA}?text=${recruiterMsg}`;
    }
  }
  // Initialize the inline surfaces conditionally based on what is present
  if (document.getElementById('inline-reg-form')) {
    initSurface('inline-', 'post-vacancy');
  } else if (document.getElementById('pv-reg-form')) {
    initSurface('pv-', 'post-vacancy');
  }

  // Initialize modal surface asynchronously after components.js fetches it
  const mc = document.getElementById("modals-container");
  if (mc) {
    if (document.getElementById("modal-step1")) {
      initSurface('modal-', 'dashboard');
    } else {
      const observer = new MutationObserver((mutations, obs) => {
        if (document.getElementById("modal-step1")) {
          initSurface('modal-', 'dashboard');
          obs.disconnect();
        }
      });
      observer.observe(mc, { childList: true, subtree: true });
    }
  }

  // Job form submit
  const jobForm = document.querySelector(".job-form");
  if (jobForm) {
    initCharCounter();

    jobForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!sessionToken) sessionToken = sessionStorage.getItem("ji_token") || sessionStorage.getItem("ji_r_token");
      if (!verifiedWaNumber) verifiedWaNumber = sessionStorage.getItem("ji_wa") || sessionStorage.getItem("ji_r_wa");

      if (!sessionToken || !verifiedWaNumber) {
        swal("Session Expired", "Please verify your WhatsApp number again.", "warning");
        return;
      }

      const submitBtn = jobForm.querySelector("[type=submit]");
      const originalBtnHtml = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Submitting…';

      const fd = new FormData(jobForm);
      const payload = {
        wa_number: verifiedWaNumber,
        session_token: sessionToken,
        job_category: fd.get("job_category"),
        district_region: fd.get("district_region"),
        exact_location: fd.get("exact_location"),
        job_title: fd.get("job_title"),
        job_description: (fd.get("job_description") || "").slice(0, 600),
        job_mode: fd.get("job_mode"),
        experience_required: fd.get("experience_required"),
        salary_range: fd.get("salary_range"),
        cv_required: fd.get("cv_required") === "true"
      };

      try {
        const res = await fetch(`${JOBINFO_CONFIG.API_URL}/api/recruiters/vacancy`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.status === 401) {
          sessionStorage.removeItem("ji_token");
          sessionStorage.removeItem("ji_r_token");
          sessionToken = null;
          swal("Session Expired", "Your login session has expired or something went wrong. Please log in again to post your vacancy.", "warning")
            .then(() => {
              window.location.reload();
            });
          return;
        }

        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();

        // 1. Reset the form immediately upon successful submission
        try {
          resetJobForm(jobForm);
        } catch (resetErr) {
          console.warn("Form reset failed:", resetErr);
        }

        // 2. Show confirmation pop-up modal or sweetalert
        let modalShown = false;
        try {
          const successModalEl = document.getElementById("vacancySuccessModal");
          if (successModalEl && typeof bootstrap !== "undefined" && bootstrap.Modal) {
            const codeEl = document.getElementById("success-job-code");
            if (codeEl) {
              const jCode = data.job_code || "";
              codeEl.textContent = jCode ? (jCode.startsWith("#") || jCode.startsWith("JC:") ? jCode : `#${jCode}`) : "---";
            }
            const modalInstance = (bootstrap.Modal.getInstance && bootstrap.Modal.getInstance(successModalEl))
              || new bootstrap.Modal(successModalEl);
            modalInstance.show();

            const postAnotherBtn = document.getElementById("post-another-btn");
            if (postAnotherBtn) {
              postAnotherBtn.onclick = () => {
                modalInstance.hide();
                const firstInput = jobForm.querySelector("select, input");
                if (firstInput) firstInput.focus();
              };
            }
            modalShown = true;
          }
        } catch (modalErr) {
          console.warn("Bootstrap modal show error, falling back to swal:", modalErr);
        }

        if (!modalShown) {
          swal(
            "Vacancy Submitted! 🎉",
            `Your vacancy (${data.job_code || ""}) has been received and is under review. You'll get a WhatsApp notification once it's approved.`,
            "success"
          );
        }
      } catch (err) {
        swal("Submission Failed", "Something went wrong. Please try again or contact us on WhatsApp.", "error");
        console.error("Vacancy submission error:", err);
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
      }
    });
  }
});

function initCharCounter() {
  const descTextarea = document.querySelector('textarea[name="job_description"]');
  const countSpan = document.getElementById("desc-char-count");
  const wrapSpan = document.getElementById("desc-char-wrap");

  if (!descTextarea || !countSpan) return;

  const updateCount = () => {
    let len = descTextarea.value.length;
    if (len > 600) {
      descTextarea.value = descTextarea.value.substring(0, 600);
      len = 600;
    }
    countSpan.textContent = len;
    if (wrapSpan) {
      wrapSpan.classList.toggle("limit-warn", len >= 550 && len < 600);
      wrapSpan.classList.toggle("limit-reached", len >= 600);
    }
  };

  descTextarea.removeEventListener("input", updateCount);
  descTextarea.addEventListener("input", updateCount);
  updateCount();
}

function resetJobForm(form) {
  if (!form) return;
  form.reset();

  // Explicitly reset select dropdowns
  form.querySelectorAll("select").forEach(sel => {
    sel.selectedIndex = 0;
  });

  // Explicitly clear text fields & textarea
  form.querySelectorAll('input[type="text"], input[type="tel"]').forEach(inp => {
    inp.value = "";
  });
  const ta = form.querySelector('textarea[name="job_description"]');
  if (ta) {
    ta.value = "";
  }

  // Reset char counter
  const countSpan = document.getElementById("desc-char-count");
  const wrapSpan = document.getElementById("desc-char-wrap");
  if (countSpan) countSpan.textContent = "0";
  if (wrapSpan) {
    wrapSpan.classList.remove("limit-warn", "limit-reached");
  }

  // Restore verified WhatsApp number into hidden field
  const rWa = verifiedWaNumber || sessionStorage.getItem("ji_r_wa") || sessionStorage.getItem("ji_wa");
  const hiddenWa = document.getElementById("form-wa-number");
  if (hiddenWa && rWa) {
    hiddenWa.value = rWa;
  }
}

function initSurface(prefix, intent) {
  const isModal = (prefix === 'modal-');
  const step1Id = isModal ? 'modal-step1' : 'otp-step1';
  const step2Id = isModal ? 'modal-step2' : 'otp-step2';
  const step3Id = isModal ? 'modal-step3' : 'otp-step3';
  const step4Id = isModal ? null : 'otp-step4'; // Success banner
  const stepQrId = isModal ? 'modal-step-qr' : 'otp-step-qr';

  const waInputId = isModal ? 'modal-wa-input' : 'wa-number-input';
  const sendBtnId = isModal ? 'modal-send-otp-btn' : 'send-otp-btn';

  const regFormId = prefix + 'reg-form';
  const reqCompanyId = prefix + 'company';
  const reqTypeId = prefix + 'type';
  const reqRoleId = prefix + 'role';
  const reqLocId = prefix + 'location';
  const reqContactId = prefix + 'contact';

  const otpInputId = isModal ? 'modal-otp-input' : 'otp-input';
  const verifyBtnId = isModal ? 'modal-verify-btn' : 'verify-otp-btn';
  const resendBtnId = isModal ? 'modal-resend-btn' : 'resend-otp-btn';

  const s1 = document.getElementById(step1Id);
  const s2 = document.getElementById(step2Id);
  const s3 = document.getElementById(step3Id);
  const s4 = document.getElementById(step4Id);
  const sQr = document.getElementById(stepQrId);

  if (!s1 || !s2 || !s3) return; // Surface not present on this page

  const waInput = document.getElementById(waInputId);
  const sendBtn = document.getElementById(sendBtnId);
  const regForm = document.getElementById(regFormId);
  const otpInput = document.getElementById(otpInputId);
  const verifyBtn = document.getElementById(verifyBtnId);
  const resendBtn = document.getElementById(resendBtnId);

  const setDisplay = (n) => {
    s1.style.display = (n === 1) ? 'block' : 'none';
    s2.style.display = (n === 2) ? 'block' : 'none';
    s3.style.display = (n === 3) ? 'block' : 'none';
    if (s4) s4.style.display = (n === 4) ? 'block' : 'none';
    if (sQr) sQr.style.display = (n === 'qr') ? 'block' : 'none';

    const authCard = document.getElementById(prefix + 'auth-card');
    if (authCard) authCard.style.display = (n === 4) ? 'none' : 'block';

    const dotPrefix = isModal ? 'modal-dot' : prefix + 'dot';
    document.getElementById(dotPrefix + '1')?.classList.toggle('active', n === 1 || n === 'qr' || n >= 1);
    document.getElementById(dotPrefix + '2')?.classList.toggle('active', n === 2 || n >= 2);
    document.getElementById(dotPrefix + '3')?.classList.toggle('active', n === 3 || n >= 3);
  };

  sendBtn.addEventListener('click', async () => {
    const number = (waInput.value || "").replace(/\D/g, "");
    if (number.length < 10) {
      swal("Invalid Number", "Please enter a valid WhatsApp number (10 digits minimum).", "warning"); return;
    }
    if (number === "7025962176") { window.location.href = "admin.html"; return; }

    verifiedWaNumber = number.startsWith("91") ? number : "91" + number;

    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Checking...';

    try {
      const res = await fetch(`${JOBINFO_CONFIG.API_URL}/api/auth/check-recruiter`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wa_number: verifiedWaNumber })
      });
      if (!res.ok) throw new Error();
      const data = await res.json();

      if (data.is_jobzon_admin) {
        // JobZon admin number entered — redirect to the shared admin login page
        window.location.href = JOBINFO_CONFIG.API_URL + "/admin/login";
        return;
      }

      if (data.exists) {
        surfaceRegMode[prefix] = false;
        if (data.within_24h) {
          setDisplay(3);
          startResend(resendBtn, isModal ? 'modal-cd' : (document.getElementById(prefix + 'cd') ? prefix + 'cd' : null));
        } else {
          showQrStep(prefix, verifiedWaNumber, false, setDisplay, resendBtn, isModal);
        }
      } else {
        surfaceRegMode[prefix] = true;
        if (data.within_24h) {
          setDisplay(2);
        } else {
          showQrStep(prefix, verifiedWaNumber, true, setDisplay, resendBtn, isModal);
        }
      }
    } catch (err) {
      swal("Error", "Could not check number. Try again.", "error");
    } finally {
      sendBtn.disabled = false;
      sendBtn.innerHTML = isModal ? 'Continue' : '<i class="bi bi-send me-1"></i>Send OTP';
    }
  });

  if (waInput) waInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendBtn.click(); });

  if (regForm) {
    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      registrationData[prefix] = {
        company_name: document.getElementById(reqCompanyId).value,
        business_type: document.getElementById(reqTypeId).value,
        registrant_role: document.getElementById(reqRoleId) ? document.getElementById(reqRoleId).value : "other",
        location: document.getElementById(reqLocId).value,
        business_contact: document.getElementById(reqContactId).value
      };

      const subBtn = document.getElementById(prefix + 'reg-submit');

      // ── Path A: number already verified via Reverse OTP ────────────────────
      if (qrVerifiedForReg) {
        if (subBtn) { subBtn.disabled = true; subBtn.textContent = "Registering..."; }
        try {
          const res = await fetch(`${JOBINFO_CONFIG.API_URL}/api/auth/recruiter/register-verified`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              session_token: qrVerifiedForReg.session_token,
              wa_number: qrVerifiedForReg.wa_number,
              ...registrationData[prefix]
            })
          });
          if (!res.ok) throw new Error();
          const data = await res.json();
          sessionToken = data.session_token;
          verifiedWaNumber = data.wa_number;
          sessionStorage.setItem("ji_token", data.session_token);
          sessionStorage.setItem("ji_wa", data.wa_number);
          sessionStorage.setItem("ji_r_token", data.session_token);
          sessionStorage.setItem("ji_r_wa", data.wa_number);
          qrVerifiedForReg = null;  // clear flag
          handleSuccessfulLogin(intent, setDisplay);
        } catch (e) {
          swal("Error", "Could not complete registration. Please try again.", "error");
        } finally {
          if (subBtn) { subBtn.disabled = false; subBtn.innerHTML = '<i class="bi bi-person-check me-1"></i>Complete Registration'; }
        }
        return;
      }

      // ── Path B: normal flow — send OTP, then step 3 ────────────────────────
      if (subBtn) { subBtn.disabled = true; subBtn.textContent = "Sending OTP..."; }
      try {
        const res = await fetch(`${JOBINFO_CONFIG.API_URL}/api/otp/send`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wa_number: verifiedWaNumber, role: "recruiter" })
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (data.within_24h === false) {
          showQrStep(prefix, verifiedWaNumber, true, setDisplay, resendBtn, isModal);
        } else {
          setDisplay(3);
          startResend(resendBtn, isModal ? 'modal-cd' : null);
        }
      } catch (e) {
        swal("Error", "Could not send OTP.", "error");
      } finally {
        if (subBtn) { subBtn.disabled = false; subBtn.innerHTML = `<i class="bi bi-person-check me-1"></i>Register & Send OTP`; }
      }
    });
  }

  verifyBtn.addEventListener('click', async () => {
    const code = (otpInput.value || "").trim();
    if (code.length !== 6) {
      swal("Invalid OTP", "Please enter the 6-digit OTP.", "warning"); return;
    }

    verifyBtn.disabled = true;
    verifyBtn.textContent = "Verifying...";

    try {
      let url, bodyData;
      if (surfaceRegMode[prefix]) {
        url = `${JOBINFO_CONFIG.API_URL}/api/auth/recruiter/register`;
        bodyData = { wa_number: verifiedWaNumber, otp_code: code, ...registrationData[prefix] };
      } else {
        url = `${JOBINFO_CONFIG.API_URL}/api/otp/verify`;
        bodyData = { wa_number: verifiedWaNumber, otp_code: code };
      }

      const res = await fetch(url, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData)
      });
      if (!res.ok) throw new Error("Verification failed.");

      const data = await res.json();
      sessionToken = data.session_token;
      sessionStorage.setItem("ji_token", sessionToken);
      sessionStorage.setItem("ji_wa", verifiedWaNumber);
      sessionStorage.setItem("ji_r_token", sessionToken);
      sessionStorage.setItem("ji_r_wa", verifiedWaNumber);

      handleSuccessfulLogin(intent, setDisplay);
    } catch (e) {
      swal("Error", "Incorrect OTP. Try again.", "error");
    } finally {
      verifyBtn.disabled = false;
      verifyBtn.textContent = "Verify OTP";
    }
  });

  if (otpInput) otpInput.addEventListener('keydown', e => { if (e.key === 'Enter') verifyBtn.click(); });

  if (resendBtn) {
    resendBtn.addEventListener('click', async () => {
      resendBtn.disabled = true;
      try {
        await fetch(`${JOBINFO_CONFIG.API_URL}/api/otp/send`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wa_number: verifiedWaNumber })
        });
        startResend(resendBtn, isModal ? 'modal-cd' : null);
        swal("OTP Sent", "A new OTP has been sent.", "success");
      } catch {
        resendBtn.disabled = false;
      }
    });
  }
}

function startResend(btn, cdSpanId) {
  if (!btn) return;
  let sec = 60;
  btn.disabled = true;
  if (cdSpanId) {
    const span = document.getElementById(cdSpanId);
    if (span) span.textContent = sec;
  } else {
    btn.textContent = `Resend in ${sec}s`;
  }

  const timer = setInterval(() => {
    sec--;
    if (sec <= 0) {
      clearInterval(timer);
      btn.disabled = false;
      btn.textContent = "Resend OTP";
    } else {
      if (cdSpanId) {
        const span = document.getElementById(cdSpanId);
        if (span) span.textContent = sec;
      } else {
        btn.textContent = `Resend in ${sec}s`;
      }
    }
  }, 1000);
}

function handleSuccessfulLogin(intent, setDisplay) {
  // Update nav buttons to point to dashboard
  const mb = document.getElementById("login-nav-btn-mobile");
  const db = document.getElementById("login-nav-btn");
  if (mb) { mb.innerHTML = '<i class="bi bi-layout-text-sidebar-reverse me-1"></i>My Vacancies'; mb.href = "recruiter-dashboard.html"; mb.removeAttribute("data-bs-toggle"); mb.removeAttribute("data-bs-target"); }
  if (db) { db.innerHTML = '<i class="bi bi-layout-text-sidebar-reverse me-1"></i>My Vacancies'; db.href = "recruiter-dashboard.html"; db.removeAttribute("data-bs-toggle"); db.removeAttribute("data-bs-target"); }

  if (intent === 'dashboard') {
    window.location.href = 'recruiter-dashboard.html';
  } else {
    // Hide modal if it's open
    const modalEl = document.getElementById('recruiterLoginModal');
    if (modalEl && window.bootstrap) {
      const modalInstance = bootstrap.Modal.getInstance(modalEl);
      if (modalInstance) modalInstance.hide();
    }

    // Set display for the active flow if applicable
    setDisplay(4);

    const step4 = document.getElementById("otp-step4");
    if (step4) {
      step4.innerHTML = `
        <div class="recruiter-session-banner mb-4">
          <i class="bi bi-patch-check-fill text-success fs-5"></i>
          <span>You're logged in as <strong>+${verifiedWaNumber}</strong>. Fill in your vacancy details below.</span>
        </div>`;
    }

    const pvAuth = document.getElementById("pv-auth-card");
    if (pvAuth) pvAuth.style.display = "none";

    const jf = document.querySelector(".job-form");
    if (jf) {
      jf.style.display = "block";
      const hiddenWa = document.getElementById("form-wa-number");
      if (hiddenWa) hiddenWa.value = verifiedWaNumber;
      initCharCounter();
    }
  }
}

// buildDescription has been removed since job_description is used directly

/* ── FAQ toggle (preserved) ──────────────────────────────────────────────── */
const toggleBtn = document.getElementById("toggle-question-form");
const formWrapper = document.getElementById("question-form-wrapper");
if (toggleBtn && formWrapper) {
  toggleBtn.addEventListener("click", () => {
    const isHidden = formWrapper.style.display === "none";
    formWrapper.style.display = isHidden ? "block" : "none";
    toggleBtn.textContent = isHidden ? "Close" : "Ask Question";
  });
}

document.querySelectorAll(".accordion-header").forEach((header) => {
  header.addEventListener("click", () => {
    const body = header.nextElementSibling;
    const isOpen = body.style.maxHeight;
    document.querySelectorAll(".accordion-body").forEach((b) => (b.style.maxHeight = null));
    document.querySelectorAll(".accordion-header").forEach((h) => h.classList.add("collapsed"));
    if (!isOpen) {
      body.style.maxHeight = body.scrollHeight + "px";
      header.classList.remove("collapsed");
    }
  });
});

/* ── Auto-skip OTP ───────────────────────────────────────────────────────── */
(function restoreDashboardSession() {
  const rToken = sessionStorage.getItem("ji_r_token") || sessionStorage.getItem("ji_token");
  const rWa = sessionStorage.getItem("ji_r_wa") || sessionStorage.getItem("ji_wa");
  if (!rToken || !rWa) return;

  sessionToken = rToken;
  verifiedWaNumber = rWa;

  const hiddenWa = document.getElementById("form-wa-number");
  if (hiddenWa) hiddenWa.value = rWa;

  const mb = document.getElementById("login-nav-btn-mobile");
  const db = document.getElementById("login-nav-btn");
  if (mb) { mb.innerHTML = '<i class="bi bi-layout-text-sidebar-reverse me-1"></i>My Vacancies'; mb.href = "recruiter-dashboard.html"; mb.removeAttribute("data-bs-toggle"); mb.removeAttribute("data-bs-target"); }
  if (db) { db.innerHTML = '<i class="bi bi-layout-text-sidebar-reverse me-1"></i>My Vacancies'; db.href = "recruiter-dashboard.html"; db.removeAttribute("data-bs-toggle"); db.removeAttribute("data-bs-target"); }

  const pvAuth = document.getElementById("pv-auth-card");
  if (pvAuth) pvAuth.style.display = "none";

  if (document.getElementById("otp-step1")) document.getElementById("otp-step1").style.display = "none";
  if (document.getElementById("otp-step2")) document.getElementById("otp-step2").style.display = "none";
  if (document.getElementById("otp-step3")) document.getElementById("otp-step3").style.display = "none";

  const step4 = document.getElementById("otp-step4");
  if (step4) {
    step4.style.display = "block";
    step4.innerHTML = `
      <div class="recruiter-session-banner mb-4">
        <i class="bi bi-patch-check-fill text-success fs-5"></i>
        <span>You're logged in as <strong>+${rWa}</strong>. Fill in your vacancy details below.</span>
      </div>`;
  }
  const jf = document.querySelector(".job-form");
  if (jf) {
    jf.style.display = "block";
    initCharCounter();
  }
})();

let pollTimers = {};

async function showQrStep(prefix, waNumber, isReg, setDisplay, resendBtn, isModal) {
  setDisplay('qr');

  const isM = (prefix === 'modal-');
  const pinDisplayId = isM ? 'modal-pin-display' : (prefix + 'pin-display');
  const qrImgId = isM ? 'modal-qr-img' : (prefix + 'qr-img');
  const waChatBtnId = isM ? 'modal-wa-chat-btn' : (prefix + 'wa-chat-btn');
  const statusTxtId = isM ? 'modal-pin-status-text' : (prefix + 'pin-status-text');

  // ── 1. Create OTP session — wa_number stored server-side ─────────────────
  let sessionId, otp;
  try {
    const res = await fetch(`${JOBINFO_CONFIG.API_URL}/api/auth/pin/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'recruiter', wa_number: waNumber }),
    });
    if (!res.ok) throw new Error('Failed to create OTP session');
    const data = await res.json();
    sessionId = data.session_id;
    otp = data.otp;
  } catch (e) {
    swal('Error', 'Could not generate a verification code. Please try again.', 'error');
    return;
  }

  // ── 2. Display OTP — QR / deep link pre-fills just the 6 digits ──────────
  const pinDisplay = document.getElementById(pinDisplayId);
  if (pinDisplay) pinDisplay.textContent = otp;

  // Pre-fill only the 6-digit OTP — user just taps Send, like any standard OTP
  const waLink = 'https://wa.me/' + JOBINFO_CONFIG.BUSINESS_WA + '?text=' + encodeURIComponent(otp);
  const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' + encodeURIComponent(waLink);

  const qrImg = document.getElementById(qrImgId);
  if (qrImg) qrImg.src = qrUrl;

  const waChatBtn = document.getElementById(waChatBtnId);
  if (waChatBtn) waChatBtn.href = waLink;

  // ── 3. Poll every 5s — hard stop at 5 min (matches backend TTL) ──────────
  if (pollTimers[prefix]) clearInterval(pollTimers[prefix]);
  const MAX_POLLS = 60;  // 60 × 5s = 300s = 5 minutes
  let pollCount = 0;

  const handleExpiry = () => {
    if (pollTimers[prefix]) {
      clearInterval(pollTimers[prefix]);
      delete pollTimers[prefix];
    }
    const statusWrapId = isM ? 'modal-pin-status-wrap' : (prefix + 'pin-status-wrap');
    const statusWrap = document.getElementById(statusWrapId)
      || (document.getElementById(statusTxtId) ? document.getElementById(statusTxtId).parentNode : null);
    if (statusWrap) {
      statusWrap.innerHTML = `
        <div style="text-align:center;padding:4px 0;">
          <p class="text-danger small mb-2 fw-semibold" style="font-size:.82rem;">
            <i class="bi bi-exclamation-circle me-1"></i>OTP Expired (5 min time out). Generate a new code to continue.
          </p>
          <button type="button" class="btn btn-outline-success btn-sm rounded-pill px-3 py-1 fw-bold" id="${prefix}refresh-otp-btn">
            <i class="bi bi-arrow-clockwise me-1"></i>Generate New OTP
          </button>
        </div>
      `;
      const refreshBtn = document.getElementById(`${prefix}refresh-otp-btn`);
      if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
          statusWrap.innerHTML = `
            <div class="spinner-border spinner-border-sm text-success" role="status"></div>
            <span id="${statusTxtId}" style="font-size:.8rem;color:#888;">Waiting for your OTP…</span>
          `;
          showQrStep(prefix, waNumber, isReg, setDisplay, resendBtn, isModal);
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

      if (data.status === 'expired') {
        handleExpiry();
        return;
      }

      if (data.status === 'verified') {
        clearInterval(pollTimers[prefix]);
        delete pollTimers[prefix];

        if (data.is_new_user) {
          // ── New user: keep session in memory ONLY until registration completes ──
          // Do NOT write sessionStorage here — restoreDashboardSession() would
          // activate "My Vacancies" on refresh before the profile exists.
          sessionToken = data.session_token;
          verifiedWaNumber = data.wa_number;
          qrVerifiedForReg = { session_token: data.session_token, wa_number: data.wa_number };
          const regBtn = document.getElementById(isM ? 'modal-reg-submit' : (prefix + 'reg-submit'));
          if (regBtn) regBtn.innerHTML = '<i class="bi bi-person-check me-1"></i>Complete Registration';
          swal('WhatsApp Verified! ✅', 'Your number is confirmed. Please complete your profile to continue.', 'success');
          setDisplay(2);
        } else {
          // ── Existing recruiter: store session fully and redirect ──────────────
          sessionToken = data.session_token;
          sessionStorage.setItem('ji_token', data.session_token);
          sessionStorage.setItem('ji_wa', data.wa_number);
          sessionStorage.setItem('ji_r_token', data.session_token);
          sessionStorage.setItem('ji_r_wa', data.wa_number);
          verifiedWaNumber = data.wa_number;
          swal('You\'re logged in! 🎉', 'WhatsApp verified. Tap OK to go to your dashboard.', 'success')
            .then(() => handleSuccessfulLogin(isM ? 'dashboard' : 'post-vacancy', setDisplay));
        }
      }
    } catch (e) { console.error(e); }
  };

  pollTimers[prefix] = setInterval(checkStatus, 5000);
}

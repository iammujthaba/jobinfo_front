/**
 * web-apply.js — Direct Web Application Flow for Job Seekers
 * Enables applying directly via the website with parity to the WhatsApp flow.
 */

"use strict";

let currentApplyJob = null;
let currentCandidateCvs = [];
let selectedResumeId = null;
let selectedNewCvFile = null;
let isSubmittingWebApply = false;

/**
 * Entry point: triggered by clicking "Apply on Website" on cards or modal.
 */
window.triggerWebApply = async function(jobCode) {
  if (!jobCode) return;

  // Retrieve cached job or fetch from API
  let job = (window.loadedJobs && window.loadedJobs[jobCode]) ? window.loadedJobs[jobCode] : null;
  if (!job) {
    try {
      // Try to find vacancy by job_code
      const res = await fetch(`${JOBINFO_CONFIG.API_URL}/api/vacancies?keyword=${encodeURIComponent(jobCode)}&page_size=1`);
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          job = data.results[0];
          window.loadedJobs = window.loadedJobs || {};
          window.loadedJobs[jobCode] = job;
        }
      }
    } catch (e) {
      console.error("Failed to fetch vacancy details for apply:", e);
    }
  }

  if (!job) {
    if (typeof swal !== "undefined") {
      swal("Vacancy Not Found", "Unable to load vacancy information. Please try again.", "error");
    } else {
      alert("Unable to load vacancy information.");
    }
    return;
  }

  currentApplyJob = job;

  // Check auth
  const token = localStorage.getItem("seeker_session_token");
  const wa = localStorage.getItem("seeker_wa_number");

  if (!token || !wa) {
    // Unauthenticated: store pending apply job code and show seeker auth modal
    sessionStorage.setItem("pending_apply_job_code", jobCode);

    // Close Job Details modal if open
    const detailsModalEl = document.getElementById("jobDetailsModal");
    if (detailsModalEl && typeof bootstrap !== "undefined") {
      const detailsModal = bootstrap.Modal.getInstance(detailsModalEl);
      if (detailsModal) detailsModal.hide();
    }

    const loginModalEl = document.getElementById("seekerLoginModal");
    if (loginModalEl && typeof bootstrap !== "undefined") {
      const loginModal = bootstrap.Modal.getOrCreateInstance(loginModalEl);
      loginModal.show();
    } else if (typeof swal !== "undefined") {
      swal("Login Required", "Please log in with your WhatsApp number to apply directly.", "info");
    }
    return;
  }

  // Authenticated: open apply modal
  await openWebApplyModal(job, wa, token);
};

/**
 * Populates and opens the Direct Web Apply Modal.
 */
async function openWebApplyModal(job, wa, token) {
  // Close Job Details modal if open
  const detailsModalEl = document.getElementById("jobDetailsModal");
  if (detailsModalEl && typeof bootstrap !== "undefined") {
    const detailsModal = bootstrap.Modal.getInstance(detailsModalEl);
    if (detailsModal) detailsModal.hide();
  }

  const modalEl = document.getElementById("webApplyModal");
  if (!modalEl || typeof bootstrap === "undefined") {
    console.error("webApplyModal not found in DOM.");
    return;
  }

  // Reset modal states
  selectedResumeId = null;
  selectedNewCvFile = null;
  document.getElementById("apply-error-msg").style.display = "none";
  document.getElementById("apply-error-msg").textContent = "";
  document.getElementById("apply-form-container").style.display = "block";
  document.getElementById("apply-success-container").style.display = "none";
  document.getElementById("apply-already-applied").style.setProperty("display", "none", "important");

  const newCvInput = document.getElementById("apply-new-cv-input");
  if (newCvInput) {
    newCvInput.value = "";
    newCvInput.onchange = () => window.handleApplyCvFileChange ? window.handleApplyCvFileChange(newCvInput) : null;
  }
  const newCvFilename = document.getElementById("apply-new-cv-filename");
  if (newCvFilename) {
    newCvFilename.style.display = "none";
    newCvFilename.textContent = "";
  }

  const submitBtn = document.getElementById("btn-submit-web-apply");
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="bi bi-send-fill me-2"></i>Confirm &amp; Submit Application';
    submitBtn.onclick = (e) => {
      e.preventDefault();
      if (typeof window.submitWebApply === "function") {
        window.submitWebApply();
      }
    };
  }

  // Format Salary
  const salaryMap = {
    "interview_based": "Based on Interview",
    "not_mentioned": "Not Mentioned",
    "stipend": "Stipend",
    "below_10k": "Below ₹10,000",
    "10k_15k": "₹10,000 - ₹14,999",
    "15k_20k": "₹15,000 - ₹19,999",
    "20k_25k": "₹20,000 - ₹24,999",
    "25k_30k": "₹25,000 - ₹29,999",
    "30k_35k": "₹30,000 - ₹34,999",
    "35k_40k": "₹35,000 - ₹39,999",
    "40k_45k": "₹40,000 - ₹44,999",
    "45k_50k": "₹45,000 - ₹49,999",
    "50k_60k": "₹50,000 - ₹59,999",
    "60k_70k": "₹60,000 - ₹69,999",
    "70k_80k": "₹70,000 - ₹79,999",
    "80k_90k": "₹80,000 - ₹89,999",
    "90k_100k": "₹90,000 - ₹99,999",
    "100k_125k": "₹1,00,000 - ₹1,24,999",
    "125k_150k": "₹1,25,000 - ₹1,49,999",
    "150k_175k": "₹1,50,000 - ₹1,74,999",
    "175k_200k": "₹1,75,000 - ₹1,99,999",
    "above_200k": "Above ₹2,00,000",
    "above_250k": "Above ₹2,50,000",
    "above_300k": "Above ₹3,00,000",
    "10k_20k": "₹10,000 - ₹20,000",
    "20k_30k": "₹20,000 - ₹30,000",
    "30k_40k": "₹30,000 - ₹40,000",
    "40k_50k": "₹40,000 - ₹50,000",
    "above_50k": "Above ₹50,000"
  };
  const salaryText = job.salary_range ? (salaryMap[job.salary_range] || job.salary_range) : "Not specified";

  // Location display
  const locParts = [];
  if (job.exact_location && job.exact_location.trim()) {
    locParts.push(job.exact_location.trim());
  }
  if (job.district_region && job.district_region.trim() && (!job.exact_location || job.district_region.trim().toLowerCase() !== job.exact_location.trim().toLowerCase())) {
    locParts.push(job.district_region.trim());
  }
  const displayLoc = locParts.length > 0 ? locParts.join(", ") : (job.district_region || "—");

  // Populate Job Summary
  document.getElementById("apply-job-code").textContent = job.job_code || "JC:—";
  document.getElementById("apply-job-title").textContent = job.job_title || "Job Opening";
  document.getElementById("apply-job-company").innerHTML = `<i class="bi bi-building me-1"></i>${window.escHtml ? window.escHtml(job.company_name || "—") : (job.company_name || "—")}`;
  document.getElementById("apply-job-location").innerHTML = `<i class="bi bi-geo-alt me-1"></i>${window.escHtml ? window.escHtml(displayLoc) : displayLoc}`;
  document.getElementById("apply-job-salary").innerHTML = `<i class="bi bi-currency-rupee"></i>${salaryText}`;

  // CV badge & requirements
  const cvBadge = document.getElementById("apply-cv-badge");
  const cvReqStar = document.getElementById("apply-cv-req-star");
  const cvHint = document.getElementById("apply-cv-hint");
  if (job.cv_required) {
    if (cvBadge) cvBadge.style.display = "inline-block";
    if (cvReqStar) cvReqStar.style.display = "inline";
    if (cvHint) cvHint.innerHTML = '<span class="text-warning fw-semibold"><i class="bi bi-exclamation-circle me-1"></i>Mandatory for this role</span>';
  } else {
    if (cvBadge) cvBadge.style.display = "none";
    if (cvReqStar) cvReqStar.style.display = "none";
    if (cvHint) cvHint.textContent = "Profiles with CV get 5x more callbacks!";
  }

  // Populate Seeker Info Preview
  document.getElementById("apply-seeker-contact").innerHTML = `<i class="bi bi-whatsapp text-success me-1"></i>+${wa}`;

  // Open the modal now so the user sees it loading
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  modal.show();

  // Async load candidate profile name
  fetchCandidateProfile(wa, token);

  // Async check duplicate application status
  checkExistingApplication(job.id, wa, token);

  // Async load candidate resumes
  loadCandidateResumesForApply(wa, token, Boolean(job.cv_required));
}

/**
 * Fetch candidate profile to show name.
 */
async function fetchCandidateProfile(wa, token) {
  try {
    const res = await fetch(`${JOBINFO_CONFIG.API_URL}/api/candidates/me?wa_number=${wa}&session_token=${token}`);
    if (res.ok) {
      const data = await res.json();
      document.getElementById("apply-seeker-name").textContent = data.name || "Candidate";
    } else {
      document.getElementById("apply-seeker-name").textContent = "Candidate";
    }
  } catch (e) {
    document.getElementById("apply-seeker-name").textContent = "Candidate";
  }
}

/**
 * Check if the candidate has already applied to this vacancy.
 */
async function checkExistingApplication(vacancyId, wa, token) {
  try {
    const res = await fetch(`${JOBINFO_CONFIG.API_URL}/api/candidates/applications/check?vacancy_id=${vacancyId}&wa_number=${wa}&session_token=${token}`);
    if (res.ok) {
      const data = await res.json();
      if (data.has_applied) {
        const alreadyAppliedBanner = document.getElementById("apply-already-applied");
        const statusEl = document.getElementById("apply-already-status");
        if (alreadyAppliedBanner) {
          alreadyAppliedBanner.style.setProperty("display", "flex", "important");
        }
        if (statusEl) {
          const dateStr = data.applied_at ? new Date(data.applied_at).toLocaleDateString("en-GB") : "";
          statusEl.innerHTML = `Current Status: <span class="badge bg-success ms-1">${data.status || "Applied"}</span> ${dateStr ? `<span class="text-muted ms-2">(${dateStr})</span>` : ""}`;
        }
        const submitBtn = document.getElementById("btn-submit-web-apply");
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<i class="bi bi-check-circle me-2"></i>Already Applied';
        }
      }
    }
  } catch (e) {
    console.error("Error checking application status:", e);
  }
}

/**
 * Load resumes and render selection options.
 */
async function loadCandidateResumesForApply(wa, token, isCvRequired) {
  const listEl = document.getElementById("apply-cv-list");
  if (!listEl) return;

  try {
    const res = await fetch(`${JOBINFO_CONFIG.API_URL}/api/candidates/cvs?wa_number=${wa}&session_token=${token}`);
    if (!res.ok) throw new Error("Could not load resumes");
    const data = await res.json();
    currentCandidateCvs = data.cvs || [];

    listEl.innerHTML = "";

    if (currentCandidateCvs.length > 0) {
      // Find default CV or pick first
      const defaultCv = currentCandidateCvs.find(cv => cv.is_default) || currentCandidateCvs[0];
      selectedResumeId = defaultCv.id;

      currentCandidateCvs.forEach(cv => {
        const isChecked = (cv.id === selectedResumeId);
        const dateText = cv.uploaded_at ? new Date(cv.uploaded_at).toLocaleDateString("en-GB") : "";
        const itemHtml = `
          <label class="d-flex align-items-center justify-content-between p-3 rounded-3 border bg-white cv-radio-item" style="cursor:pointer; transition:border-color .2s;">
            <div class="d-flex align-items-center gap-3">
              <input type="radio" name="apply_resume_selection" value="${cv.id}" class="form-check-input mt-0" ${isChecked ? "checked" : ""}>
              <div>
                <div class="fw-semibold small text-dark">${window.escHtml ? window.escHtml(cv.filename) : cv.filename} ${cv.is_default ? '<span class="badge bg-success-subtle text-success ms-1" style="font-size:0.65rem;">Default</span>' : ''}</div>
                <div class="text-muted" style="font-size:0.75rem;">Uploaded on ${dateText}</div>
              </div>
            </div>
            <i class="bi bi-file-earmark-pdf text-danger fs-5"></i>
          </label>
        `;
        listEl.insertAdjacentHTML("beforeend", itemHtml);
      });

      // If CV is optional, offer "Apply without CV" option
      if (!isCvRequired) {
        const noCvHtml = `
          <label class="d-flex align-items-center justify-content-between p-3 rounded-3 border bg-white cv-radio-item" style="cursor:pointer;">
            <div class="d-flex align-items-center gap-3">
              <input type="radio" name="apply_resume_selection" value="none" class="form-check-input mt-0">
              <div>
                <div class="fw-semibold small text-dark">Apply without attaching a CV</div>
                <div class="text-muted" style="font-size:0.75rem;">Employer will review your verified profile details</div>
              </div>
            </div>
            <i class="bi bi-person-badge text-secondary fs-5"></i>
          </label>
        `;
        listEl.insertAdjacentHTML("beforeend", noCvHtml);
      }
    } else {
      // Candidate has 0 resumes
      selectedResumeId = null;
      if (!isCvRequired) {
        listEl.innerHTML = `
          <div class="p-3 bg-light rounded-3 text-muted small d-flex align-items-center">
            <i class="bi bi-info-circle text-primary fs-5 me-2"></i>
            <div>No CV uploaded. You can apply directly with your profile, or upload a CV below to stand out!</div>
          </div>
        `;
      } else {
        listEl.innerHTML = `
          <div class="p-3 bg-warning-subtle text-warning-emphasis rounded-3 small d-flex align-items-center">
            <i class="bi bi-exclamation-triangle-fill fs-5 me-2"></i>
            <div>This employer requires a CV. Please upload your resume below to complete your application.</div>
          </div>
        `;
      }
    }

    // Attach change listeners to radio buttons
    listEl.querySelectorAll('input[name="apply_resume_selection"]').forEach(radio => {
      radio.addEventListener("change", (e) => {
        if (e.target.value === "none") {
          selectedResumeId = null;
        } else {
          selectedResumeId = parseInt(e.target.value, 10);
        }
        // Deselect new file if user toggled to an existing CV
        selectedNewCvFile = null;
        const newCvFilename = document.getElementById("apply-new-cv-filename");
        if (newCvFilename) newCvFilename.style.display = "none";
        const newCvInput = document.getElementById("apply-new-cv-input");
        if (newCvInput) newCvInput.value = "";
      });
    });

  } catch (e) {
    console.error("Failed to load resumes:", e);
    listEl.innerHTML = `<div class="text-danger small py-2">Could not load resumes. You can upload a new CV below.</div>`;
  }
}

// ── Handlers & Global Event Delegation ──────────────────────────────────────
window.handleApplyCvFileChange = function(inputEl) {
  if (!inputEl || !inputEl.files || inputEl.files.length === 0) return;
  const file = inputEl.files[0];

  // Validate file type
  const allowed = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
  let isAllowed = allowed.includes(file.type);
  if (!isAllowed) {
    const fn = file.name.toLowerCase();
    if (fn.endsWith(".pdf") || fn.endsWith(".doc") || fn.endsWith(".docx")) {
      isAllowed = true;
    }
  }

  const errorMsg = document.getElementById("apply-error-msg");
  if (!isAllowed) {
    if (errorMsg) {
      errorMsg.textContent = "Only PDF or Word documents (.pdf, .doc, .docx) are allowed.";
      errorMsg.style.display = "block";
    }
    inputEl.value = "";
    selectedNewCvFile = null;
    return;
  }

  if (file.size > 350 * 1024) {
    if (errorMsg) {
      errorMsg.textContent = `File size (${(file.size / 1024).toFixed(0)} KB) exceeds the 350 KB limit. Please compress your file.`;
      errorMsg.style.display = "block";
    }
    inputEl.value = "";
    selectedNewCvFile = null;
    return;
  }

  if (errorMsg) errorMsg.style.display = "none";
  selectedNewCvFile = file;

  // Show chosen file name
  const fnEl = document.getElementById("apply-new-cv-filename");
  if (fnEl) {
    const sizeKb = (file.size / 1024).toFixed(0);
    fnEl.textContent = `Selected: ${file.name} (${sizeKb} KB)`;
    fnEl.style.display = "block";
  }

  // Uncheck radio buttons in the list
  document.querySelectorAll('input[name="apply_resume_selection"]').forEach(r => r.checked = false);
  selectedResumeId = null;
};

// Global delegation listeners ensure clicks and file uploads work even after async modal injection
document.addEventListener("click", function(e) {
  const btn = e.target.closest("#btn-submit-web-apply");
  if (btn) {
    e.preventDefault();
    if (typeof window.submitWebApply === "function") {
      window.submitWebApply();
    }
  }
});

document.addEventListener("change", function(e) {
  if (e.target && e.target.id === "apply-new-cv-input") {
    if (typeof window.handleApplyCvFileChange === "function") {
      window.handleApplyCvFileChange(e.target);
    }
  }
});

/**
 * Handles application submission.
 */
window.submitWebApply = async function() {
  if (isSubmittingWebApply) return;
  if (!currentApplyJob) {
    console.warn("submitWebApply called but currentApplyJob is not set");
    return;
  }

  const wa = localStorage.getItem("seeker_wa_number");
  const token = localStorage.getItem("seeker_session_token");
  if (!wa || !token) {
    if (typeof swal !== "undefined") {
      swal("Session Expired", "Please log in with your WhatsApp number to submit applications.", "warning");
    } else {
      alert("Session expired. Please log in again.");
    }
    return;
  }

  const submitBtn = document.getElementById("btn-submit-web-apply");
  const errorMsg = document.getElementById("apply-error-msg");
  if (errorMsg) errorMsg.style.display = "none";

  // Check mandatory CV requirement
  const isCvRequired = Boolean(currentApplyJob.cv_required);
  if (isCvRequired && !selectedResumeId && !selectedNewCvFile) {
    if (errorMsg) {
      errorMsg.textContent = "The employer requires a CV for this position. Please choose or upload a CV.";
      errorMsg.style.display = "block";
    }
    return;
  }

  isSubmittingWebApply = true;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Submitting Application…';
  }

  try {
    let finalResumeId = selectedResumeId;

    // 1. If a new CV was selected, upload it first
    if (selectedNewCvFile) {
      const formData = new FormData();
      formData.append("wa_number", wa);
      formData.append("session_token", token);
      formData.append("file", selectedNewCvFile);
      if (currentApplyJob && currentApplyJob.job_category) {
        formData.append("category_tag", currentApplyJob.job_category);
      }

      const cvRes = await fetch(`${JOBINFO_CONFIG.API_URL}/api/candidates/cvs`, {
        method: "POST",
        body: formData,
      });

      if (!cvRes.ok) {
        const errData = await cvRes.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to upload CV. Please try again.");
      }

      const cvData = await cvRes.json();
      finalResumeId = cvData.resume_id || null;
    }

    const vacancyId = currentApplyJob.id || parseInt(String(currentApplyJob.job_code).replace(/\D/g, ""), 10);
    if (!vacancyId) {
      throw new Error("Unable to identify vacancy ID. Please try again.");
    }

    // 2. Submit application
    const applyRes = await fetch(`${JOBINFO_CONFIG.API_URL}/api/candidates/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wa_number: wa,
        session_token: token,
        vacancy_id: vacancyId,
        resume_id: finalResumeId,
      }),
    });

    if (!applyRes.ok) {
      const errData = await applyRes.json().catch(() => ({}));
      throw new Error(errData.detail || `Application submission failed (${applyRes.status}).`);
    }

    // Success! Show confirmation view in modal
    const formContainer = document.getElementById("apply-form-container");
    const successContainer = document.getElementById("apply-success-container");
    if (formContainer) formContainer.style.display = "none";
    if (successContainer) successContainer.style.display = "block";

    const titleEl = document.getElementById("apply-success-job-title");
    if (titleEl) {
      titleEl.textContent = currentApplyJob.job_title || "this position";
    }

  } catch (err) {
    console.error("Web apply error:", err);
    if (errorMsg) {
      errorMsg.textContent = err.message || "An error occurred while submitting your application. Please try again.";
      errorMsg.style.display = "block";
    }
  } finally {
    isSubmittingWebApply = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="bi bi-send-fill me-2"></i>Confirm &amp; Submit Application';
    }
  }
};

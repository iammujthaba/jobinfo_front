/**
 * seeker-auth.js — Job Seeker Authentication & Onboarding
 * Implements Reverse OTP via Dynamic QR (outside 24h) and Direct OTP (within 24h)
 * with complete in-modal 2-tab profile registration for new seekers.
 */

let currentSeekerPhone = "";
let qrVerifiedForSeekerReg = null;  // { session_token, wa_number } when Reverse OTP completes for new seeker
let pendingSeekerRegData = null;    // Pending registration payload for within-24h OTP verification
let pendingSeekerCvFile = null;     // Pending CV file for upload after registration
let seekerResendTimer = null;
let seekerPinPollTimer = null;

// Submission mutex guards to prevent duplicate execution
let isSubmittingPhone = false;
let isSubmittingReg = false;
let isVerifyingOtp = false;
let isResendingOtp = false;

// ─── Category → Sub-Category Data Mapping ───────────────────────────────────
const SEEKER_CATEGORY_SUBCATEGORIES = {
  "retail": [
    { id: "showroom_manager", title: "Showroom Manager" },
    { id: "sales_executive", title: "Sales Executive" },
    { id: "cashier", title: "Cashier / Billing" },
    { id: "floor_manager", title: "Floor Manager" },
    { id: "customer_support", title: "Customer Support" },
    { id: "packing_staff", title: "Packing Staff" },
    { id: "other", title: "Other / General" }
  ],
  "sales_business": [
    { id: "business_executive", title: "Business Executive" },
    { id: "field_sales", title: "Field Sales Executive" },
    { id: "sales_manager", title: "Sales Manager" },
    { id: "medical_rep", title: "Medical Representative" },
    { id: "fmcg_sales", title: "FMCG Sales" },
    { id: "other", title: "Other / General" }
  ],
  "hospitality": [
    { id: "chef_cook", title: "Chef / Cook" },
    { id: "waiter_server", title: "Waiter / Server" },
    { id: "kitchen_helper", title: "Kitchen Helper" },
    { id: "restaurant_manager", title: "Restaurant Manager" },
    { id: "juice_tea_maker", title: "Juice / Tea Maker" },
    { id: "housekeeping", title: "Housekeeping" },
    { id: "other", title: "Other / General" }
  ],
  "healthcare": [
    { id: "home_nurse", title: "Home Nurse / Caretaker" },
    { id: "clinic_receptionist", title: "Clinic Receptionist" },
    { id: "pharmacy_staff", title: "Pharmacy Staff" },
    { id: "lab_technician", title: "Lab Technician" },
    { id: "ward_boy", title: "Ward Boy / Helper" },
    { id: "physiotherapist", title: "Physiotherapist" },
    { id: "other", title: "Other / General" }
  ],
  "education": [
    { id: "academic_advisor", title: "Academic Advisor" },
    { id: "teacher", title: "Teacher" },
    { id: "professor_lecturer", title: "Professor / Lecturer" },
    { id: "tuition_coaching", title: "Tuition / Coaching Staff" },
    { id: "school_admin", title: "School Admin" },
    { id: "daycare_staff", title: "Daycare / Play-school Staff" },
    { id: "other", title: "Other / General" }
  ],
  "office_data_entry": [
    { id: "data_entry", title: "Data Entry" },
    { id: "office_admin", title: "Office Admin" },
    { id: "clerk", title: "Clerk" },
    { id: "office_peon", title: "Office Peon / Helper" },
    { id: "other", title: "Other / General" }
  ],
  "front_office": [
    { id: "front_office_executive", title: "Front Office Executive" },
    { id: "receptionist", title: "Receptionist" },
    { id: "guest_relations", title: "Guest Relations Executive" },
    { id: "other", title: "Other / General" }
  ],
  "finance_accounts": [
    { id: "senior_accountant", title: "Senior Accountant" },
    { id: "accountant", title: "Accountant" },
    { id: "billing_staff", title: "Billing Staff" },
    { id: "tally_operator", title: "Tally Operator" },
    { id: "audit_assistant", title: "Audit / Finance Assistant" },
    { id: "other", title: "Other / General" }
  ],
  "hr_management": [
    { id: "branch_manager", title: "Branch Manager" },
    { id: "hr_manager", title: "HR Manager" },
    { id: "team_leader", title: "Team Leader" },
    { id: "hr_admin", title: "HR / Admin Executive" },
    { id: "operations_manager", title: "Operations Manager" },
    { id: "other", title: "Other / General" }
  ],
  "telecalling": [
    { id: "telecaller", title: "Telecaller" },
    { id: "customer_care", title: "Customer Care Executive" },
    { id: "telesales", title: "Telesales Executive" },
    { id: "bpo_staff", title: "BPO / Call Center Staff" },
    { id: "other", title: "Other / General" }
  ],
  "it_digital_marketing": [
    { id: "digital_marketing_staff", title: "Digital Marketing Staff" },
    { id: "software_developer", title: "Software Developer" },
    { id: "graphic_designer", title: "Graphic Designer" },
    { id: "it_hardware_support", title: "IT Hardware / Support" },
    { id: "video_editor", title: "Video Editor" },
    { id: "content_writer", title: "Content Writer" },
    { id: "other", title: "Other / General" }
  ],
  "logistics_store": [
    { id: "store_keeper", title: "Store Keeper" },
    { id: "warehouse_manager", title: "Warehouse Manager" },
    { id: "logistics_coordinator", title: "Logistics Coordinator" },
    { id: "two_wheeler_delivery", title: "Two-Wheeler Delivery" },
    { id: "heavy_vehicle_driver", title: "Heavy Vehicle Driver" },
    { id: "private_car_taxi", title: "Private Car / Taxi Driver" },
    { id: "auto_goods_driver", title: "Auto Rickshaw / Goods Driver" },
    { id: "forklift_operator", title: "Forklift Operator" },
    { id: "other", title: "Other / General" }
  ],
  "beauty_wellness": [
    { id: "beautician_salon", title: "Beautician / Salon Staff" },
    { id: "hair_stylist", title: "Hair Stylist" },
    { id: "spa_therapist", title: "Spa Therapist" },
    { id: "makeup_artist", title: "Makeup Artist" },
    { id: "other", title: "Other / General" }
  ],
  "maintenance_technician": [
    { id: "electrician", title: "Electrician" },
    { id: "ac_mechanic", title: "AC Mechanic" },
    { id: "plumber", title: "Plumber" },
    { id: "automobile_mechanic", title: "Automobile Mechanic" },
    { id: "welder_fitter", title: "Welder / Fitter" },
    { id: "lift_cctv_technician", title: "Lift / CCTV Technician" },
    { id: "other", title: "Other / General" }
  ],
  "construction_labor": [
    { id: "site_supervisor", title: "Site Supervisor" },
    { id: "construction_worker", title: "Construction Worker" },
    { id: "general_labor", title: "General Labor / Helper" },
    { id: "painter_carpenter", title: "Painter / Carpenter" },
    { id: "factory_warehouse", title: "Factory Worker" },
    { id: "other", title: "Other / General" }
  ],
  "gulf_abroad": [
    { id: "construction_worker_gcc", title: "Construction Worker (GCC)" },
    { id: "driver_gcc", title: "Driver (GCC License)" },
    { id: "nurse_medical_gcc", title: "Nurse / Medical (GCC)" },
    { id: "retail_sales_gcc", title: "Retail / Sales (GCC)" },
    { id: "camp_boss_gcc", title: "Camp Boss / Supervisor" },
    { id: "it_professional_gcc", title: "IT / Professional (GCC)" },
    { id: "office_admin_gcc", title: "Office Admin (GCC)" },
    { id: "chef_cook_gcc", title: "Chef / Cook (GCC)" },
    { id: "other", title: "Other / General" }
  ],
  "other": [
    { id: "security_guard", title: "Security Guard / Supervisor" },
    { id: "housekeeping_cleaning", title: "Housekeeping / Cleaning" },
    { id: "tailor_garment", title: "Tailor / Garment Worker" },
    { id: "event_management", title: "Event Management Staff" },
    { id: "petrol_pump", title: "Petrol Pump Attendant" },
    { id: "any_other", title: "Any Other Role" }
  ]
};

function onSeekerCategoryChange() {
  const catSelect = document.getElementById("seeker-category");
  const subCatSelect = document.getElementById("seeker-sub-category");
  if (!catSelect || !subCatSelect) return;

  const selectedCategory = catSelect.value;
  const currentSubVal = subCatSelect.value;
  subCatSelect.innerHTML = '<option value="">Select Role</option>';

  if (selectedCategory && SEEKER_CATEGORY_SUBCATEGORIES[selectedCategory]) {
    SEEKER_CATEGORY_SUBCATEGORIES[selectedCategory].forEach((role) => {
      const opt = document.createElement("option");
      opt.value = role.id;
      opt.textContent = role.title;
      if (role.id === currentSubVal) opt.selected = true;
      subCatSelect.appendChild(opt);
    });
  }
}

function goToSeekerTab(tabNum) {
  const tab1 = document.getElementById("seeker-tab-1");
  const tab2 = document.getElementById("seeker-tab-2");

  if (tabNum === 2) {
    // Validate Tab 1 fields before proceeding
    const name = document.getElementById("seeker-name")?.value.trim();
    const district = document.getElementById("seeker-district")?.value;
    const exactLoc = document.getElementById("seeker-exact-location")?.value.trim();
    const category = document.getElementById("seeker-category")?.value;

    if (!name) {
      swal("Missing Name", "Please enter your Full Name.", "warning");
      document.getElementById("seeker-name")?.focus();
      return;
    }
    if (!district) {
      swal("Missing District", "Please select your District.", "warning");
      document.getElementById("seeker-district")?.focus();
      return;
    }
    if (!exactLoc) {
      swal("Missing Location", "Please enter your Location / Town Name.", "warning");
      document.getElementById("seeker-exact-location")?.focus();
      return;
    }
    if (!category) {
      swal("Missing Job Category", "Please select your Preferred Job Area.", "warning");
      document.getElementById("seeker-category")?.focus();
      return;
    }

    onSeekerCategoryChange();

    if (tab1) tab1.style.display = "none";
    if (tab2) tab2.style.display = "block";
  } else {
    if (tab2) tab2.style.display = "none";
    if (tab1) tab1.style.display = "block";
  }
}

function setSeekerDisplay(step) {
  const s1 = document.getElementById("loginStepPhone");
  const s2 = document.getElementById("loginStepRegister");
  const s3 = document.getElementById("loginStepOtp");
  const sQr = document.getElementById("loginStepPin");

  if (s1) s1.style.display = (step === 1) ? "block" : "none";
  if (s2) s2.style.display = (step === 2) ? "block" : "none";
  if (s3) s3.style.display = (step === 3) ? "block" : "none";
  if (sQr) sQr.style.display = (step === "qr") ? "block" : "none";

  const dot1 = document.getElementById("s-dot1");
  const dot2 = document.getElementById("s-dot2");
  const dot3 = document.getElementById("s-dot3");

  if (dot1) dot1.classList.toggle("active", step === 1 || step === "qr" || step >= 1);
  if (dot2) dot2.classList.toggle("active", step === 2 || (typeof step === 'number' && step >= 2));
  if (dot3) dot3.classList.toggle("active", step === 3 || (typeof step === 'number' && step >= 3));

  if (step === 2) {
    goToSeekerTab(1);
  }
}

// ─── Step 1: Check Seeker Status (Phone Input) ──────────────────────────────

async function handleSeekerPhoneSubmit() {
  if (isSubmittingPhone) return;
  const phoneInput = document.getElementById("loginPhone");
  if (!phoneInput) return;

  const rawNumber = phoneInput.value.replace(/\D/g, "");
  if (rawNumber.length < 10) {
    swal("Invalid Number", "Please enter a valid 10-digit WhatsApp number.", "warning");
    return;
  }

  currentSeekerPhone = rawNumber.startsWith("91") ? rawNumber : "91" + rawNumber;
  qrVerifiedForSeekerReg = null;
  pendingSeekerRegData = null;
  pendingSeekerCvFile = null;

  isSubmittingPhone = true;
  const btn = document.getElementById("btnSendOtp");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Checking...';
  }

  try {
    const res = await fetch(`${JOBINFO_CONFIG.API_URL}/api/auth/check-seeker`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wa_number: currentSeekerPhone })
    });

    if (!res.ok) throw new Error("Check failed");
    const data = await res.json();

    if (data.exists) {
      // Existing registered seeker
      if (data.within_24h) {
        setSeekerDisplay(3);
        startSeekerResendTimer();
      } else {
        await showSeekerPinQrStep(false);
      }
    } else {
      // New unregistered seeker
      if (data.within_24h) {
        setSeekerDisplay(2);
      } else {
        await showSeekerPinQrStep(true);
      }
    }
  } catch (err) {
    console.error("Check seeker error:", err);
    swal("Error", "Could not verify your WhatsApp number. Please check your connection and try again.", "error");
  } finally {
    isSubmittingPhone = false;
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-send me-2"></i>Continue';
    }
  }
}

// ─── Step QR: Reverse OTP Flow via WhatsApp ──────────────────────────────────

async function showSeekerPinQrStep(isReg = false) {
  setSeekerDisplay("qr");

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
    swal("Error", "Could not generate a verification code. Please try again.", "error");
    setSeekerDisplay(1);
    return;
  }

  // Display 6-digit OTP
  const pinDisplay = document.getElementById("seeker-pin-display");
  if (pinDisplay) pinDisplay.textContent = otp;

  // Pre-fill only the 6 digits for standard WhatsApp message
  const waLink = "https://wa.me/" + JOBINFO_CONFIG.BUSINESS_WA + "?text=" + encodeURIComponent(otp);
  const qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=" + encodeURIComponent(waLink);

  const qrImg = document.getElementById("seeker-pin-qr-img");
  if (qrImg) qrImg.src = qrUrl;

  const waBtn = document.getElementById("seeker-pin-wa-btn");
  if (waBtn) waBtn.href = waLink;

  // Poll every 5s for up to 5 minutes (60 polls)
  if (seekerPinPollTimer) clearInterval(seekerPinPollTimer);
  const MAX_POLLS = 60;
  let pollCount = 0;

  const handleExpiry = () => {
    if (seekerPinPollTimer) {
      clearInterval(seekerPinPollTimer);
      seekerPinPollTimer = null;
    }
    const statusWrap = document.getElementById("seeker-pin-status-wrap");
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
      document.getElementById("seeker-refresh-otp-btn")?.addEventListener("click", () => {
        statusWrap.innerHTML = `
          <div class="spinner-border spinner-border-sm text-success" role="status"></div>
          <span id="seeker-pin-status-text" style="font-size:.8rem;color:#888;">Waiting for your OTP…</span>
        `;
        showSeekerPinQrStep(isReg);
      });
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

        if (isReg) {
          // Store verified Reverse OTP session in memory for registration form submission
          qrVerifiedForSeekerReg = {
            session_token: data.session_token,
            wa_number: data.wa_number,
          };

          const regSubmitBtn = document.getElementById("seeker-reg-submit");
          if (regSubmitBtn) {
            regSubmitBtn.innerHTML = '<i class="bi bi-person-check me-2"></i>Complete Registration';
          }

          swal(
            "WhatsApp Verified! 🎉",
            "Your WhatsApp number is confirmed. Please complete your profile to continue.",
            "success"
          ).then(() => {
            setSeekerDisplay(2);
          });
        } else {
          // Existing seeker: write session to localStorage and redirect to dashboard
          localStorage.setItem("seeker_session_token", data.session_token);
          localStorage.setItem("seeker_wa_number", data.wa_number);

          swal(
            "You're logged in! 🎉",
            "WhatsApp verified successfully.",
            "success"
          ).then(() => {
            window.location.href = "dashboard.html";
          });
        }
      }
    } catch (e) {
      console.error("Pin poll error:", e);
    }
  };

  seekerPinPollTimer = setInterval(checkStatus, 5000);
}

// ─── Step 2: Seeker Profile Registration Form Submission ─────────────────────

async function uploadSeekerCvIfPresent(waNumber, sessionToken, file) {
  if (!file) return;
  try {
    const fd = new FormData();
    fd.append("wa_number", waNumber);
    fd.append("session_token", sessionToken);
    fd.append("file", file);

    await fetch(`${JOBINFO_CONFIG.API_URL}/api/candidates/cvs`, {
      method: "POST",
      body: fd,
    });
  } catch (err) {
    console.warn("CV upload error (non-fatal):", err);
  }
}

async function handleSeekerRegistration(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (isSubmittingReg) return;

  const name = document.getElementById("seeker-name")?.value.trim();
  const district = document.getElementById("seeker-district")?.value;
  const exactLocation = document.getElementById("seeker-exact-location")?.value.trim();
  const category = document.getElementById("seeker-category")?.value;
  const subCategory = document.getElementById("seeker-sub-category")?.value;
  const gender = document.getElementById("seeker-gender")?.value || "male";
  const ageVal = document.getElementById("seeker-age")?.value;
  const age = ageVal ? parseInt(ageVal, 10) : null;
  const altPhone = document.getElementById("seeker-alt-phone")?.value.trim() || null;
  const cvFileInput = document.getElementById("seeker-cv-file");
  const cvFile = cvFileInput && cvFileInput.files.length > 0 ? cvFileInput.files[0] : null;

  if (!name || !district || !exactLocation || !category) {
    swal("Missing Basic Details", "Please complete Step 1 details.", "warning");
    goToSeekerTab(1);
    return;
  }

  if (!subCategory) {
    swal("Missing Role", "Please select your Preferred Role in Step 2.", "warning");
    document.getElementById("seeker-sub-category")?.focus();
    return;
  }

  if (!age || age < 18 || age > 65) {
    swal("Invalid Age", "Please enter a valid age between 18 and 65.", "warning");
    document.getElementById("seeker-age")?.focus();
    return;
  }

  isSubmittingReg = true;
  const submitBtn = document.getElementById("seeker-reg-submit");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Submitting...';
  }

  try {
    if (qrVerifiedForSeekerReg) {
      // ── Reverse OTP pre-verified registration (outside 24h) ─────────────────
      const res = await fetch(`${JOBINFO_CONFIG.API_URL}/api/auth/seeker/register-verified`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_token: qrVerifiedForSeekerReg.session_token,
          wa_number: qrVerifiedForSeekerReg.wa_number,
          name,
          district,
          exact_location: exactLocation,
          category,
          sub_category: subCategory,
          gender,
          age,
          alt_phone: altPhone,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Registration failed");
      }

      const data = await res.json();
      localStorage.setItem("seeker_session_token", data.session_token);
      localStorage.setItem("seeker_wa_number", data.wa_number);

      if (cvFile) {
        await uploadSeekerCvIfPresent(data.wa_number, data.session_token, cvFile);
      }

      swal("Profile Created! 🎉", "Welcome to JobInfo! Tap OK to view your dashboard.", "success").then(() => {
        window.location.href = "dashboard.html";
      });
    } else {
      // ── Standard 24h window registration — send OTP & go to Step 3 ──────────
      const otpRes = await fetch(`${JOBINFO_CONFIG.API_URL}/api/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wa_number: currentSeekerPhone, role: "seeker" }),
      });

      if (!otpRes.ok) {
        const errData = await otpRes.json();
        throw new Error(errData.detail || "Failed to send OTP");
      }

      pendingSeekerRegData = {
        name,
        district,
        exact_location: exactLocation,
        category,
        sub_category: subCategory,
        gender,
        age,
        alt_phone: altPhone,
      };
      pendingSeekerCvFile = cvFile;

      setSeekerDisplay(3);
      startSeekerResendTimer();
    }
  } catch (err) {
    console.error("Seeker registration error:", err);
    swal("Registration Failed", err.message || "Something went wrong. Please try again.", "error");
  } finally {
    isSubmittingReg = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = qrVerifiedForSeekerReg
        ? '<i class="bi bi-person-check me-2"></i>Complete Registration'
        : '<i class="bi bi-person-check me-2"></i>Register &amp; Send OTP';
    }
  }
}

// ─── Step 3: Verify OTP (Within 24h window) ──────────────────────────────────

async function verifySeekerOtp() {
  if (isVerifyingOtp) return;
  const otpInput = document.getElementById("loginOtp")?.value.trim();
  if (!otpInput || otpInput.length !== 6) {
    swal("Invalid OTP", "Please enter the 6-digit verification code.", "warning");
    return;
  }

  isVerifyingOtp = true;
  const btn = document.getElementById("btnVerifyOtp");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Verifying...';
  }

  try {
    if (pendingSeekerRegData) {
      // New seeker completing registration with OTP
      const res = await fetch(`${JOBINFO_CONFIG.API_URL}/api/auth/seeker/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wa_number: currentSeekerPhone,
          otp_code: otpInput,
          name: pendingSeekerRegData.name,
          district: pendingSeekerRegData.district,
          exact_location: pendingSeekerRegData.exact_location,
          category: pendingSeekerRegData.category,
          sub_category: pendingSeekerRegData.sub_category,
          gender: pendingSeekerRegData.gender,
          age: pendingSeekerRegData.age,
          alt_phone: pendingSeekerRegData.alt_phone,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Invalid or expired OTP");
      }

      const data = await res.json();
      localStorage.setItem("seeker_session_token", data.session_token);
      localStorage.setItem("seeker_wa_number", data.wa_number);

      if (pendingSeekerCvFile) {
        await uploadSeekerCvIfPresent(data.wa_number, data.session_token, pendingSeekerCvFile);
      }

      swal("Profile Created! 🎉", "Welcome to JobInfo! Tap OK to view your dashboard.", "success").then(() => {
        window.location.href = "dashboard.html";
      });
    } else {
      // Existing seeker logging in
      const res = await fetch(`${JOBINFO_CONFIG.API_URL}/api/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wa_number: currentSeekerPhone,
          otp_code: otpInput,
          role: "seeker",
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Invalid or expired OTP");
      }

      const data = await res.json();
      localStorage.setItem("seeker_session_token", data.session_token);
      localStorage.setItem("seeker_wa_number", data.wa_number);

      swal("You're logged in! 🎉", "Welcome back.", "success").then(() => {
        window.location.href = "dashboard.html";
      });
    }
  } catch (err) {
    console.error("Seeker verify error:", err);
    swal("Verification Failed", err.message || "Invalid or expired OTP. Please try again.", "error");
  } finally {
    isVerifyingOtp = false;
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = "Verify &amp; Open Dashboard";
    }
  }
}

// ─── Resend Countdown Timer ──────────────────────────────────────────────────

function startSeekerResendTimer() {
  const resendBtn = document.getElementById("btnResendOtp");
  const cdSpan = document.getElementById("s-cd");
  if (!resendBtn || !cdSpan) return;

  resendBtn.disabled = true;
  let timeLeft = 60;
  cdSpan.textContent = timeLeft;
  resendBtn.innerHTML = `Resend in <span id="s-cd">${timeLeft}</span>s`;

  if (seekerResendTimer) clearInterval(seekerResendTimer);

  seekerResendTimer = setInterval(() => {
    timeLeft--;
    const currentCd = document.getElementById("s-cd");
    if (currentCd) currentCd.textContent = timeLeft;

    if (timeLeft <= 0) {
      clearInterval(seekerResendTimer);
      seekerResendTimer = null;
      resendBtn.disabled = false;
      resendBtn.innerHTML = "Resend OTP";
    }
  }, 1000);
}

async function resendSeekerOtp() {
  if (isResendingOtp) return;
  isResendingOtp = true;
  const resendBtn = document.getElementById("btnResendOtp");
  if (resendBtn) {
    resendBtn.disabled = true;
    resendBtn.innerHTML = "Sending...";
  }

  try {
    const res = await fetch(`${JOBINFO_CONFIG.API_URL}/api/otp/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wa_number: currentSeekerPhone, role: "seeker" }),
    });

    if (res.ok) {
      swal("OTP Sent", "A new OTP has been sent to your WhatsApp.", "success");
      startSeekerResendTimer();
    } else {
      const err = await res.json();
      swal("Failed", err.detail || "Could not resend OTP.", "error");
      if (resendBtn) resendBtn.disabled = false;
    }
  } catch (e) {
    console.error("Resend error:", e);
    swal("Error", "Network error. Please try again.", "error");
    if (resendBtn) resendBtn.disabled = false;
  } finally {
    isResendingOtp = false;
  }
}

// ─── Reset / Initialization ─────────────────────────────────────────────────

function resetSeekerModal() {
  setSeekerDisplay(1);
  goToSeekerTab(1);
  const phoneInput = document.getElementById("loginPhone");
  if (phoneInput) phoneInput.value = "";
  const otpInput = document.getElementById("loginOtp");
  if (otpInput) otpInput.value = "";
  const regForm = document.getElementById("seeker-reg-form");
  if (regForm) regForm.reset();

  currentSeekerPhone = "";
  qrVerifiedForSeekerReg = null;
  pendingSeekerRegData = null;
  pendingSeekerCvFile = null;

  if (seekerResendTimer) {
    clearInterval(seekerResendTimer);
    seekerResendTimer = null;
  }
  if (seekerPinPollTimer) {
    clearInterval(seekerPinPollTimer);
    seekerPinPollTimer = null;
  }
}

// Expose handlers globally for inline HTML event attributes
window.handleSeekerPhoneSubmit = handleSeekerPhoneSubmit;
window.handleSeekerRegistration = handleSeekerRegistration;
window.verifySeekerOtp = verifySeekerOtp;
window.resendSeekerOtp = resendSeekerOtp;
window.resetSeekerModal = resetSeekerModal;
window.goToSeekerTab = goToSeekerTab;
window.onSeekerCategoryChange = onSeekerCategoryChange;

function bindSeekerEvents() {
  const btnSend = document.getElementById("btnSendOtp");
  if (btnSend && !btnSend.dataset.bound) {
    btnSend.dataset.bound = "true";
    btnSend.addEventListener("click", handleSeekerPhoneSubmit);
  }

  const regForm = document.getElementById("seeker-reg-form");
  if (regForm && !regForm.dataset.bound) {
    regForm.dataset.bound = "true";
    regForm.addEventListener("submit", handleSeekerRegistration);
  }

  const btnVerify = document.getElementById("btnVerifyOtp");
  if (btnVerify && !btnVerify.dataset.bound) {
    btnVerify.dataset.bound = "true";
    btnVerify.addEventListener("click", verifySeekerOtp);
  }

  const btnResend = document.getElementById("btnResendOtp");
  if (btnResend && !btnResend.dataset.bound) {
    btnResend.dataset.bound = "true";
    btnResend.addEventListener("click", resendSeekerOtp);
  }

  const catSelect = document.getElementById("seeker-category");
  if (catSelect && !catSelect.dataset.bound) {
    catSelect.dataset.bound = "true";
    catSelect.addEventListener("change", onSeekerCategoryChange);
  }

  const seekerModal = document.getElementById("seekerLoginModal");
  if (seekerModal && !seekerModal.dataset.bound) {
    seekerModal.dataset.bound = "true";
    seekerModal.addEventListener("hidden.bs.modal", resetSeekerModal);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  bindSeekerEvents();

  // Watch for dynamic component injection into #modals-container
  const mc = document.getElementById("modals-container");
  if (mc) {
    if (document.getElementById("loginStepPhone")) {
      bindSeekerEvents();
    } else {
      const observer = new MutationObserver((mutations, obs) => {
        if (document.getElementById("loginStepPhone")) {
          bindSeekerEvents();
          obs.disconnect();
        }
      });
      observer.observe(mc, { childList: true, subtree: true });
    }
  }

  // Also bind when modal is shown
  document.addEventListener("show.bs.modal", (e) => {
    if (e.target && e.target.id === "seekerLoginModal") {
      bindSeekerEvents();
    }
  });

  // Auto-Login Interceptor for Magic Links
  const urlParams = new URLSearchParams(window.location.search);
  const magicToken = urlParams.get("magic_token");

  if (magicToken) {
    const overlayHtml = `
      <div id="magic-auth-overlay" style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:#fff;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;">
        <div class="spinner-border text-success mb-3" role="status" style="width:3rem;height:3rem;"></div>
        <h5 class="text-muted fw-bold">Authenticating...</h5>
        <p class="text-muted small">Please wait while we log you in securely.</p>
      </div>
    `;
    document.body.insertAdjacentHTML("beforeend", overlayHtml);

    fetch(`${JOBINFO_CONFIG.API_URL}/api/auth/magic/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: magicToken }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Invalid or expired magic link");
        return res.json();
      })
      .then((data) => {
        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.replaceState({ path: newUrl }, "", newUrl);

        document.getElementById("magic-auth-overlay")?.remove();

        if (data.is_new_user) {
          qrVerifiedForSeekerReg = {
            session_token: data.session_token,
            wa_number: data.wa_number,
          };
          currentSeekerPhone = data.wa_number;

          const seekerModal = document.getElementById("seekerLoginModal");
          if (seekerModal) {
            const modalInstance = bootstrap.Modal.getInstance(seekerModal) || new bootstrap.Modal(seekerModal);
            modalInstance.show();
            setSeekerDisplay(2);
            const regSubmitBtn = document.getElementById("seeker-reg-submit");
            if (regSubmitBtn) {
              regSubmitBtn.innerHTML = '<i class="bi bi-person-check me-2"></i>Complete Registration';
            }
          }
        } else {
          localStorage.setItem("seeker_session_token", data.session_token);
          localStorage.setItem("seeker_wa_number", data.wa_number);
          window.location.href = "dashboard.html";
        }
      })
      .catch((err) => {
        console.error(err);
        document.getElementById("magic-auth-overlay")?.remove();

        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.replaceState({ path: newUrl }, "", newUrl);

        swal("Authentication Failed", "This session has expired or is no longer available. Please log in.", "warning")
          .then(() => {
            const seekerModal = document.getElementById("seekerLoginModal");
            if (seekerModal) {
              const modalInstance = new bootstrap.Modal(seekerModal);
              modalInstance.show();
            }
          });
      });

    return;
  }
});

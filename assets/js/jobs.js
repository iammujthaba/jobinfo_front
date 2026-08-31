/**
 * jobs.js — Loads and renders live job listings from the backend API.
 * Powers jobs.html (browse/search/filter page).
 */

"use strict";

const PAGE_SIZE = 12;
let currentPage = 1;
let totalJobs = 0;
let currentLocation = "";
let currentTitle = "";
let locationTimeout = null;
let titleTimeout = null;

function closeAllSuggestions() {
  const titleSug = document.getElementById("title-suggestions");
  const locSug = document.getElementById("location-suggestions");
  if (titleSug) titleSug.style.display = "none";
  if (locSug) locSug.style.display = "none";
}

function clearSearch() {
  currentTitle = "";
  currentLocation = "";
  const titleInput = document.getElementById("job-search");
  const locInput = document.getElementById("location-filter");
  if (titleInput) titleInput.value = "";
  if (locInput) locInput.value = "";
  closeAllSuggestions();
  currentPage = 1;
  const clearBtn = document.getElementById("clear-search-btn");
  if (clearBtn) clearBtn.style.display = "none";
  loadJobs(true);
}

/* ── Bootstrap ─────────────────────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  // Read initial query params from URL if available
  const urlParams = new URLSearchParams(window.location.search);
  const qTitle = urlParams.get("title") || urlParams.get("job_title") || urlParams.get("keyword") || urlParams.get("q") || "";
  const qLoc = urlParams.get("location") || urlParams.get("district_region") || "";

  if (qTitle) {
    currentTitle = qTitle;
    const titleInput = document.getElementById("job-search");
    if (titleInput) titleInput.value = qTitle;
  }
  if (qLoc) {
    currentLocation = qLoc;
    const locInput = document.getElementById("location-filter");
    if (locInput) locInput.value = qLoc;
  }

  loadJobs(true);

  // Search button click
  document.getElementById("search-btn")?.addEventListener("click", () => {
    closeAllSuggestions();
    currentTitle = document.getElementById("job-search")?.value.trim() || "";
    currentLocation = document.getElementById("location-filter")?.value.trim() || "";
    currentPage = 1;
    loadJobs(true);
  });

  // Clear search button click
  document.getElementById("clear-search-btn")?.addEventListener("click", () => {
    clearSearch();
  });

  // Enter key on title search
  document.getElementById("job-search")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      closeAllSuggestions();
      document.getElementById("search-btn")?.click();
    }
  });

  // ── Title autocomplete
  const titleInput = document.getElementById("job-search");
  const titleSuggestions = document.getElementById("title-suggestions");
  if (titleInput && titleSuggestions) {
    titleInput.addEventListener("input", (e) => {
      clearTimeout(titleTimeout);
      const query = e.target.value.trim();
      if (!query) {
        titleSuggestions.style.display = "none";
        return;
      }
      titleTimeout = setTimeout(() => fetchTitleSuggestions(query), 250);
    });
    document.addEventListener("click", (e) => {
      if (!titleInput.contains(e.target) && !titleSuggestions.contains(e.target)) {
        titleSuggestions.style.display = "none";
      }
    });
  }

  // ── Location autocomplete
  const locInput = document.getElementById("location-filter");
  const locSuggestions = document.getElementById("location-suggestions");
  if (locInput && locSuggestions) {
    locInput.addEventListener("input", (e) => {
      clearTimeout(locationTimeout);
      const query = e.target.value.trim();
      if (!query) {
        locSuggestions.style.display = "none";
        return;
      }
      locationTimeout = setTimeout(() => fetchLocationSuggestions(query), 250);
    });

    document.addEventListener("click", (e) => {
      if (!locInput.contains(e.target) && !locSuggestions.contains(e.target)) {
        locSuggestions.style.display = "none";
      }
    });

    locInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        closeAllSuggestions();
        document.getElementById("search-btn")?.click();
      }
    });
  }

  document.getElementById("load-more-btn")?.addEventListener("click", () => {
    currentPage++;
    loadJobs(false);
  });
});

/* ── Title Suggestions ────────────────────────────────────────────────── */
async function fetchTitleSuggestions(query) {
  const titleSuggestions = document.getElementById("title-suggestions");
  try {
    const res = await fetch(`${JOBINFO_CONFIG.API_URL}/api/vacancies/titles/suggest?query=${encodeURIComponent(query)}`);
    if (!res.ok) return;
    const data = await res.json();
    if (!data.results || data.results.length === 0) {
      titleSuggestions.style.display = "none";
      return;
    }
    titleSuggestions.innerHTML = "";
    data.results.forEach((t) => {
      const li = document.createElement("li");
      li.textContent = t;
      li.addEventListener("click", () => {
        const input = document.getElementById("job-search");
        if (input) input.value = t;
        closeAllSuggestions();
        document.getElementById("search-btn")?.click();
      });
      titleSuggestions.appendChild(li);
    });
    titleSuggestions.style.display = "block";
  } catch (err) {
    console.error("Title suggest error:", err);
  }
}

/* ── Location Suggestions ────────────────────────────────────────────────── */
async function fetchLocationSuggestions(query) {
  const locSuggestions = document.getElementById("location-suggestions");
  try {
    const res = await fetch(`${JOBINFO_CONFIG.API_URL}/api/vacancies/locations/suggest?query=${encodeURIComponent(query)}`);
    if (!res.ok) return;
    const data = await res.json();

    if (!data.results || data.results.length === 0) {
      locSuggestions.style.display = "none";
      return;
    }

    locSuggestions.innerHTML = "";
    data.results.forEach((loc) => {
      const li = document.createElement("li");
      li.textContent = loc;
      li.addEventListener("click", () => {
        const input = document.getElementById("location-filter");
        if (input) input.value = loc;
        closeAllSuggestions();
        document.getElementById("search-btn")?.click();
      });
      locSuggestions.appendChild(li);
    });

    locSuggestions.style.display = "block";
  } catch (err) {
    console.error("Location suggest error:", err);
  }
}

/* ── Fetch jobs from API ─────────────────────────────────────────────────── */
async function loadJobs(reset) {
  const grid = document.getElementById("jobs-grid");
  const loadMoreBtn = document.getElementById("load-more-btn");
  const clearBtn = document.getElementById("clear-search-btn");

  if (reset) {
    currentPage = 1;
  }

  // Update clear button visibility
  if (clearBtn) {
    clearBtn.style.display = (currentTitle || currentLocation) ? "inline-block" : "none";
  }

  if (reset && grid) {
    grid.innerHTML = `<div class="col-12 text-center py-5"><div class="spinner-border text-primary" role="status"></div><p class="mt-2 text-muted">Loading jobs…</p></div>`;
  }

  const params = new URLSearchParams({
    page: currentPage,
    page_size: PAGE_SIZE,
  });
  if (currentTitle) {
    params.append("title", currentTitle);
    params.append("job_title", currentTitle);
  }
  if (currentLocation) {
    params.append("location", currentLocation);
    params.append("district_region", currentLocation);
  }

  try {
    const res = await fetch(`${JOBINFO_CONFIG.API_URL}/api/vacancies?${params}`);
    if (!res.ok) throw new Error("API error");
    const data = await res.json();
    totalJobs = data.total;

    if (reset && grid) grid.innerHTML = "";

    if (data.results.length === 0 && currentPage === 1) {
      const hasFilter = Boolean(currentTitle || currentLocation);
      grid.innerHTML = `
        <div class="col-12 text-center py-5">
          <i class="bi bi-search" style="font-size:2.5rem;color:#ccc"></i>
          <p class="mt-2 text-muted">No jobs found${hasFilter ? " matching your search criteria" : ""}.</p>
          ${hasFilter ? '<button id="empty-clear-btn" class="btn btn-outline-success btn-sm mt-2"><i class="bi bi-arrow-counterclockwise me-1"></i>Clear Search</button>' : ""}
        </div>`;
      document.getElementById("empty-clear-btn")?.addEventListener("click", () => {
        clearSearch();
      });
    } else {
      const renderCard = (typeof window.buildJobCard === "function") ? window.buildJobCard : localBuildJobCard;
      data.results.forEach((job) => {
        grid.insertAdjacentHTML("beforeend", renderCard(job));
      });
      if (typeof AOS !== "undefined") {
        AOS.refresh();
      }
    }
    const loaded = (currentPage - 1) * PAGE_SIZE + data.results.length;
    if (loadMoreBtn) {
      loadMoreBtn.style.display = loaded < totalJobs ? "inline-block" : "none";
    }
  } catch (err) {
    console.error("loadJobs error:", err);
    if (grid) {
      grid.innerHTML = `
        <div class="col-12 text-center py-5 text-danger">
          <i class="bi bi-exclamation-triangle" style="font-size:2rem"></i>
          <p class="mt-2 mb-1 fw-semibold">Could not load jobs. Please try again.</p>
          <div class="text-muted small mb-3">${err.message || err}</div>
          <button onclick="loadJobs(true)" class="btn btn-outline-success btn-sm"><i class="bi bi-arrow-clockwise me-1"></i>Try Again</button>
        </div>`;
    }
  }
}

/* ── Fallback job card builder ───────────────────────────────────────────── */
function localBuildJobCard(job) {
  window.loadedJobs = window.loadedJobs || {};
  window.loadedJobs[job.job_code] = job;
  const businessWa = (typeof JOBINFO_CONFIG !== "undefined" && JOBINFO_CONFIG.BUSINESS_WA) ? JOBINFO_CONFIG.BUSINESS_WA : "919847178170";
  const applyUrl = `https://wa.me/${businessWa}?text=Apply%20${encodeURIComponent(job.job_code)}`;
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

  const expMap = {
    "no_experience": "No Experience Required",
    "fresher_or_exp": "Fresher or Experienced",
    "1_2_years": "1-2 Years",
    "3_5_years": "3-5 Years",
    "5_plus_years": "5+ Years"
  };

  const fmtSalary = job.salary_range ? (salaryMap[job.salary_range] || job.salary_range) : null;
  const fmtExp = job.experience_required ? (expMap[job.experience_required] || job.experience_required) : null;

  const salary = fmtSalary && fmtSalary !== "Not Mentioned" ? `<span class="badge-salary me-1"><i class="bi bi-currency-rupee"></i>${fmtSalary}</span>` : "";
  const exp = fmtExp ? `<span class="badge-exp"><i class="bi bi-briefcase me-1"></i>${fmtExp}</span>` : "";

  // Combine exact_location and district_region cleanly
  const locParts = [];
  if (job.exact_location && job.exact_location.trim()) {
    locParts.push(job.exact_location.trim());
  }
  if (job.district_region && job.district_region.trim() && (!job.exact_location || job.district_region.trim().toLowerCase() !== job.exact_location.trim().toLowerCase())) {
    locParts.push(job.district_region.trim());
  }
  const displayLoc = locParts.length > 0 ? locParts.join(", ") : (job.district_region || "—");

  return `
  <div class="col-lg-4 col-md-6 job-card-col" data-aos="fade-up" style="cursor:pointer;" onclick="showJobDetailsModal('${job.job_code}')">
    <div class="job-card h-100 p-4 bg-white rounded-3 shadow-sm d-flex flex-column">
      <div class="job-card-header mb-2">
        <span class="job-code-badge">${job.job_code}</span>
        <h5 class="job-title mt-2 mb-1">${escHtml(job.job_title)}</h5>
        <p class="job-company text-muted mb-1"><i class="bi bi-building me-1"></i>${escHtml(job.company_name || "—")}</p>
        <p class="job-location text-muted mb-1"><i class="bi bi-geo-alt me-1"></i>${escHtml(displayLoc)}</p>
      </div>
      <div class="job-badges mb-3 d-flex flex-wrap gap-1">${salary}${exp}</div>
      <p class="job-desc text-muted small flex-grow-1">${escHtml((job.job_description || "").substring(0, 150))}</p>
      <div class="d-flex flex-column gap-2 mt-auto pt-2">
        <button type="button" class="btn apply-web-btn w-100" onclick="event.stopPropagation(); window.triggerWebApply('${job.job_code}')">
          <i class="bi bi-send-fill me-1"></i>Apply on Website
        </button>
        <a href="${applyUrl}" target="_blank" rel="noopener" class="apply-wa-btn w-100" onclick="event.stopPropagation()">
          <i class="bi bi-whatsapp me-2"></i>Apply via WhatsApp
        </a>
      </div>
    </div>
  </div>`;
}

function escHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

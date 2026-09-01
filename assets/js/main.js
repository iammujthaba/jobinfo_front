/**
* Template Name: eNno
* Template URL: https://bootstrapmade.com/enno-free-simple-bootstrap-template/
* Updated: Aug 07 2024 with Bootstrap v5.3.3
* Author: BootstrapMade.com
* License: https://bootstrapmade.com/license/
*/

(function() {
  "use strict";

  /**
   * Apply .scrolled class to the body as the page is scrolled down
   */
  function toggleScrolled() {
    const selectBody = document.querySelector('body');
    const selectHeader = document.querySelector('#header');
    if (!selectHeader.classList.contains('scroll-up-sticky') && !selectHeader.classList.contains('sticky-top') && !selectHeader.classList.contains('fixed-top')) return;
    window.scrollY > 100 ? selectBody.classList.add('scrolled') : selectBody.classList.remove('scrolled');
  }

  document.addEventListener('scroll', toggleScrolled);
  window.addEventListener('load', toggleScrolled);

  /**
   * Mobile nav toggle
   */
  const mobileNavToggleBtn = document.querySelector('.mobile-nav-toggle');

  function mobileNavToogle() {
    document.querySelector('body').classList.toggle('mobile-nav-active');
    mobileNavToggleBtn.classList.toggle('bi-list');
    mobileNavToggleBtn.classList.toggle('bi-x');
  }
  mobileNavToggleBtn.addEventListener('click', mobileNavToogle);

  /**
   * Hide mobile nav on same-page/hash links
   */
  document.querySelectorAll('#navmenu a').forEach(navmenu => {
    navmenu.addEventListener('click', () => {
      if (document.querySelector('.mobile-nav-active')) {
        mobileNavToogle();
      }
    });

  });

  /**
   * Toggle mobile nav dropdowns
   */
  document.querySelectorAll('.navmenu .toggle-dropdown').forEach(navmenu => {
    navmenu.addEventListener('click', function(e) {
      e.preventDefault();
      this.parentNode.classList.toggle('active');
      this.parentNode.nextElementSibling.classList.toggle('dropdown-active');
      e.stopImmediatePropagation();
    });
  });

  /**
   * Preloader
   */
  const preloader = document.querySelector('#preloader');
  if (preloader) {
    window.addEventListener('load', () => {
      preloader.remove();
    });
  }

  /**
   * Scroll top button
   */
  let scrollTop = document.querySelector('.scroll-top');

  function toggleScrollTop() {
    if (scrollTop) {
      window.scrollY > 100 ? scrollTop.classList.add('active') : scrollTop.classList.remove('active');
    }
  }
  scrollTop.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });

  window.addEventListener('load', toggleScrollTop);
  document.addEventListener('scroll', toggleScrollTop);

  /**
   * Animation on scroll function and init
   */
  function aosInit() {
    if (typeof AOS !== 'undefined') {
      AOS.init({
        duration: 600,
        easing: 'ease-in-out',
        once: true,
        mirror: false
      });
    }
  }
  window.addEventListener('load', aosInit);

  /**
   * Initiate glightbox
   */
  if (typeof GLightbox !== 'undefined') {
    const glightbox = GLightbox({
      selector: '.glightbox'
    });
  }

  /**
   * Initiate Pure Counter
   */
  if (typeof PureCounter !== 'undefined') {
    new PureCounter();
  }

  /**
   * Init isotope layout and filters
   */
  if (typeof Isotope !== 'undefined' && typeof imagesLoaded !== 'undefined') {
    document.querySelectorAll('.isotope-layout').forEach(function(isotopeItem) {
      let layout = isotopeItem.getAttribute('data-layout') ?? 'masonry';
      let filter = isotopeItem.getAttribute('data-default-filter') ?? '*';
      let sort = isotopeItem.getAttribute('data-sort') ?? 'original-order';

      let initIsotope;
      imagesLoaded(isotopeItem.querySelector('.isotope-container'), function() {
        initIsotope = new Isotope(isotopeItem.querySelector('.isotope-container'), {
          itemSelector: '.isotope-item',
          layoutMode: layout,
          filter: filter,
          sortBy: sort
        });
      });

      isotopeItem.querySelectorAll('.isotope-filters li').forEach(function(filters) {
        filters.addEventListener('click', function() {
          isotopeItem.querySelector('.isotope-filters .filter-active').classList.remove('filter-active');
          this.classList.add('filter-active');
          initIsotope.arrange({
            filter: this.getAttribute('data-filter')
          });
          if (typeof aosInit === 'function') {
            aosInit();
          }
        }, false);
      });

    });
  }

  /**
   * Init swiper sliders
   */
  function initSwiper() {
    if (typeof Swiper !== 'undefined') {
      document.querySelectorAll(".init-swiper").forEach(function(swiperElement) {
        let config = JSON.parse(
          swiperElement.querySelector(".swiper-config").innerHTML.trim()
        );

        if (swiperElement.classList.contains("swiper-tab")) {
          if (typeof initSwiperWithCustomPagination !== 'undefined') {
            initSwiperWithCustomPagination(swiperElement, config);
          }
        } else {
          new Swiper(swiperElement, config);
        }
      });
    }
  }

  window.addEventListener("load", initSwiper);

  /**
   * Correct scrolling position upon page load for URLs containing hash links.
   */
  window.addEventListener('load', function(e) {
    if (window.location.hash) {
      if (document.querySelector(window.location.hash)) {
        setTimeout(() => {
          let section = document.querySelector(window.location.hash);
          let scrollMarginTop = getComputedStyle(section).scrollMarginTop;
          window.scrollTo({
            top: section.offsetTop - parseInt(scrollMarginTop),
            behavior: 'smooth'
          });
        }, 100);
      }
    }
  });

  /**
   * Navmenu Scrollspy
   */
  let navmenulinks = document.querySelectorAll('.navmenu a');

  function navmenuScrollspy() {
    navmenulinks.forEach(navmenulink => {
      if (!navmenulink.hash) return;
      let section = document.querySelector(navmenulink.hash);
      if (!section) return;
      let position = window.scrollY + 200;
      if (position >= section.offsetTop && position <= (section.offsetTop + section.offsetHeight)) {
        document.querySelectorAll('.navmenu a.active').forEach(link => link.classList.remove('active'));
        navmenulink.classList.add('active');
      } else {
        navmenulink.classList.remove('active');
      }
    })
  }
  window.addEventListener('load', navmenuScrollspy);
  document.addEventListener('scroll', navmenuScrollspy);

})();


document.addEventListener('DOMContentLoaded', () => {
  const counters = document.querySelectorAll('.purecounter');

  counters.forEach(counter => {
    const observer = new MutationObserver(() => {
      if (!counter.textContent.endsWith('+')) {
        counter.textContent += '+';
      }
    });

    observer.observe(counter, { childList: true, subtree: true });
  });
});

// FAQ Accordion
document.addEventListener('DOMContentLoaded', () => {
  const accordionItems = document.querySelectorAll('.accordion-item');

  accordionItems.forEach(item => {
    const header = item.querySelector('.accordion-header');

    header.addEventListener('click', () => {
      // Close all others
      accordionItems.forEach(i => {
        if (i !== item) i.classList.remove('active');
      });

      // Toggle current
      item.classList.toggle('active');
    });
  });
});

// Job Details Modal Logic
window.loadedJobs = window.loadedJobs || {};

window.showJobDetailsModal = function(jobCode) {
  const job = window.loadedJobs[jobCode];
  if (!job) return;

  // Populate fields
  document.getElementById('jd-code').textContent = job.job_code || '';
  document.getElementById('jd-title').textContent = job.job_title || 'Job Title';
  document.getElementById('jd-company').querySelector('span').textContent = job.company_name || '—';
  const locParts = [];
  if (job.exact_location && job.exact_location.trim()) {
    locParts.push(job.exact_location.trim());
  }
  if (job.district_region && job.district_region.trim() && (!job.exact_location || job.district_region.trim().toLowerCase() !== job.exact_location.trim().toLowerCase())) {
    locParts.push(job.district_region.trim());
  }
  document.getElementById('jd-location').textContent = locParts.length > 0 ? locParts.join(", ") : (job.district_region || '—');
  
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

  const salaryText = job.salary_range ? (salaryMap[job.salary_range] || job.salary_range) : 'Not specified';
  document.getElementById('jd-salary').textContent = salaryText;
  
  const expText = job.experience_required ? (expMap[job.experience_required] || job.experience_required) : 'Any';
  document.getElementById('jd-experience').textContent = expText;

  const jobModeMap = {
    'full_time': 'Full-Time',
    'part_time': 'Part-Time',
    'remote':    'Remote',
    'hybrid':    'Hybrid'
  };
  const modeText = job.job_mode ? (jobModeMap[job.job_mode] || job.job_mode) : 'Not specified';
  document.getElementById('jd-mode').textContent = modeText;
  
  document.getElementById('jd-description').textContent = job.job_description || 'No detailed description available.';

  // Apply button URL
  const applyUrl = `https://wa.me/${JOBINFO_CONFIG.BUSINESS_WA}?text=Apply%20${encodeURIComponent(job.job_code)}`;
  const waBtn = document.getElementById('jd-apply-btn');
  if (waBtn) waBtn.href = applyUrl;

  // Wire Web Apply button
  const webApplyBtn = document.getElementById('jd-web-apply-btn');
  if (webApplyBtn) {
    webApplyBtn.onclick = function() {
      const modalEl = document.getElementById('jobDetailsModal');
      if (modalEl && typeof bootstrap !== "undefined") {
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
      }
      if (window.triggerWebApply) {
        window.triggerWebApply(jobCode);
      }
    };
  }

  // Show Modal
  const modalEl = document.getElementById('jobDetailsModal');
  if (modalEl) {
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }
};

window.escHtml = function(str) {
  return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
};

window.buildJobCard = function(job) {
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
        <h5 class="job-title mt-2 mb-1">${window.escHtml(job.job_title)}</h5>
        <p class="job-company text-muted mb-1"><i class="bi bi-building me-1"></i>${window.escHtml(job.company_name || "—")}</p>
        <p class="job-location text-muted mb-1"><i class="bi bi-geo-alt me-1"></i>${window.escHtml(displayLoc)}</p>
      </div>
      <div class="job-badges mb-3 d-flex flex-wrap gap-1">${salary}${exp}</div>
      <p class="job-desc text-muted small flex-grow-1">${window.escHtml((job.job_description || "").substring(0, 150))}</p>
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
};


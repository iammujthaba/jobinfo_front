/**
 * JobInfo – Frontend Configuration
 * Change JOBINFO_API_URL to your deployed backend URL before going live.
 * During local development use: http://localhost:8080
 */
const _hostname = window.location.hostname || "";
const isLocal = (
  _hostname === "127.0.0.1" ||
  _hostname === "localhost" ||
  _hostname === "::1" ||
  _hostname === "[::1]" ||
  _hostname === "" ||
  window.location.protocol === "file:" ||
  _hostname.startsWith("192.168.") ||
  _hostname.startsWith("10.") ||
  _hostname.endsWith(".ngrok-free.app") ||
  _hostname.endsWith(".ngrok.io") ||
  window.location.port === "5500" ||
  window.location.port === "5501" ||
  window.location.port === "3000"
);

const JOBINFO_CONFIG = {
  // Local testing URL (Don't forget to change back before pushing to GitHub!)
  API_URL: isLocal ? "http://127.0.0.1:8080" : "https://api.jobinfo.pro",

  // Your Meta Dev Test Number (with country code, no +)
  BUSINESS_WA: isLocal ? "15556392992" : "917025962176",

  WA_CHANNEL: "https://whatsapp.com/channel/0029VawvIr34yltJoSTKit3Z",
  WA_COMMUNITY: "https://chat.whatsapp.com/LB8rI0BPgBTIMIhJAWAeMd",

  BUSINESS_TYPES: {
    "company": "Company / Pvt Ltd",
    "shop_retail": "Shop / Supermarket / Textiles",
    "hotel_bakery": "Hotel / Restaurant / Bakery",
    "healthcare": "Hospital / Clinic / Pharmacy",
    "education": "School / College / Coaching",
    "salon_spa": "Salon / Beauty Parlour / Spa",
    "finance_bank": "Finance / Co-operative Bank",
    "it_media": "IT / Media / Printing Studio",
    "contractor": "Contractor / Builder",
    "transport": "Travels / Transport / Logistics",
    "workshop_garage": "Workshop / Garage",
    "petrol_pump": "Petrol Pump / Gas Station",
    "agency": "HR / Recruitment / Consultancy",
    "individual": "Individual / Household",
    "other": "Other"
  },

  REGISTRANT_ROLES: {
    "founder": "Founder / Owner",
    "hr": "HR / Recruiter",
    "manager": "Manager",
    "employee": "Employee",
    "other": "Other"
  }
};

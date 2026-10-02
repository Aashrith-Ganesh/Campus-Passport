import { APIError } from "./api.js";

const ICONS = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/><path d="M9 21v-6h6v6"/>',
  passport: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h5M8 15h8"/><circle cx="16" cy="17" r="1"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22z"/><path d="M4 5.5v14A2.5 2.5 0 0 1 6.5 17H20M8 7h8M8 10h7"/>',
  pulse: '<path d="M3 12h4l3-8 4 16 3-8h4"/><path d="M21 5v14"/>',
  leaf: '<path d="M20.8 3.2C12.4 2.7 6 5.4 5 11.1c-.6 3.6 2.2 6.1 5.6 5.5C16.1 15.7 18.7 9.3 20.8 3.2Z"/><path d="M3 21c3.2-5.6 7.3-8.5 12.3-10.5"/>',
  wallet: '<rect x="3" y="6" width="18" height="15" rx="2"/><path d="M3 9V6a2 2 0 0 1 2-2h13M16 14h5"/><circle cx="16" cy="14" r=".7"/>',
  spark: '<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
  refresh: '<path d="M20 7v5h-5"/><path d="M4 17v-5h5"/><path d="M5.6 9a7 7 0 0 1 11.8-2L20 12M4 12l2.6 5a7 7 0 0 0 11.8-2"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  "chevron-down": '<path d="m6 9 6 6 6-6"/>',
  "chevron-left": '<path d="m15 18-6-6 6-6"/>',
  "chevron-right": '<path d="m9 18 6-6-6-6"/>',
  "arrow-right": '<path d="M5 12h14M13 6l6 6-6 6"/>',
  "arrow-up-right": '<path d="M7 17 17 7M8 7h9v9"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  "check-circle": '<circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  pin: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  upload: '<path d="M12 16V4m0 0L7 9m5-5 5 5"/><path d="M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
  camera: '<path d="M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13" r="4"/>',
  bookopen: '<path d="M12 7v14M3 5.5A2.5 2.5 0 0 1 5.5 3H12v18H5.5A2.5 2.5 0 0 0 3 23zM21 5.5A2.5 2.5 0 0 0 18.5 3H12v18h6.5a2.5 2.5 0 0 1 2.5 2z"/>',
  award: '<circle cx="12" cy="8" r="5"/><path d="m8.5 12-1 9 4.5-2.5 4.5 2.5-1-9"/>',
  shield: '<path d="M12 3 20 6v5c0 5-3.4 8-8 10-4.6-2-8-5-8-10V6z"/><path d="m8.5 12 2.2 2.2 4.8-5"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>',
  water: '<path d="M12 3s7 7.1 7 12a7 7 0 0 1-14 0c0-4.9 7-12 7-12Z"/><path d="M9 16a3 3 0 0 0 3 2"/>',
  chart: '<path d="M4 19V5M4 19h17"/><path d="m7 15 4-4 3 2 6-7"/>',
  file: '<path d="M6 3h8l5 5v13H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M14 3v5h5M8 13h8M8 17h6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  "log-out": '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  "alert-triangle": '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  sliders: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
};

/** @param {string} name @param {number} [size] */
export function icon(name, size = 18) {
  const path = ICONS[name] || ICONS.info;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}

/** @param {unknown} value */
export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

/** @param {unknown} value */
export function formatNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(number) : "—";
}

/** @param {unknown} value @param {Intl.DateTimeFormatOptions} [options] */
export function formatDate(value, options = {}) {
  if (!value) return "Date not recorded";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "Date not recorded";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric", month: "short", year: "numeric", ...options,
  }).format(date);
}

/** Count-aware noun so a single record never reads as "1 records". */
export function pluralize(count, singular, pluralForm) {
  const n = Number(count);
  const noun = Number.isFinite(n) && Math.abs(n) === 1 ? singular : (pluralForm || `${singular}s`);
  return `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number.isFinite(n) ? n : 0)} ${noun}`;
}

/** @param {unknown} value */
export function statusLabel(value) {
  const key = String(value || "").toUpperCase();
  const known = {
    SUBMITTED: "Reported", UNDER_REVIEW: "Under review", VERIFIED: "Verified",
    IN_PROGRESS: "In progress", RESOLVED: "Resolved", ACTIVE: "Active",
    DEACTIVATED: "Deactivated", SIMULATED_APPROVED: "Simulation approved",
    COMPLETED: "Completed", REJECTED: "Rejected", REVOKED: "Revoked",
  };
  return known[key] || key.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Status unavailable";
}

/** @param {unknown} value @param {string} [label] */
export function statusBadge(value, label) {
  const key = String(value || "").toUpperCase();
  const tone = key === "REVOKED"
    ? "critical"
    : ["VERIFIED", "RESOLVED", "ACTIVE", "COMPLETED", "SIMULATED_APPROVED"].includes(key)
    ? "positive"
    : ["UNDER_REVIEW", "IN_PROGRESS"].includes(key) ? "progress" : ["REJECTED", "DEACTIVATED"].includes(key) ? "muted" : "neutral";
  return `<span class="status-badge status-${tone}">${escapeHtml(label || statusLabel(value))}</span>`;
}

/** @param {unknown} error @param {string} fallback */
export function friendlyError(error, fallback) {
  if (!(error instanceof APIError)) return fallback;
  const messages = {
    NETWORK_ERROR: "The Campus Passport service could not be reached. Check the connection and try again.",
    INVALID_IMAGE: "Choose a non-empty JPG, PNG, or WEBP image.",
    IMAGE_TOO_LARGE: "Choose an image no larger than 10 MB.",
    AI_ANALYSIS_FAILED: "Campus Lens could not analyze this image. Check the photo or try again later.",
    INVALID_AI_RESPONSE: "Campus Lens could not verify the analysis response. Please try again.",
    QUIZ_GENERATION_FAILED: "A quiz could not be generated right now. Please try again.",
    QUIZ_NO_MATERIAL: "There is no analyzed material to build a quiz from. Choose a clearer page and analyze it again.",
    QUIZ_SUBMISSION_FAILED: "The quiz result could not be saved. Your answers are still here; try again.",
  };
  if (error.code && messages[error.code]) return messages[error.code];
  if (error.status === 404) return "This record is not available in the current Campus Passport API.";
  if (error.status >= 500) return fallback;
  return error.message || fallback;
}

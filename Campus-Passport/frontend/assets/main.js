/**
 * Campus Passport — Main Application Orchestrator
 * Integrates reference visual editorial design with strict role guards and auth boundary.
 */

import { api } from "./api.js";
import { store } from "./store.js";
import { recentActivity, profileFrom } from "./data.js";
import { escapeHtml, formatDate, icon } from "./ui.js";

const PAGES = {
  login: { title: "Sign In", roles: ["*"], isPublic: true, load: () => import("./pages/login.js") },
  dashboard: { title: "Overview", roles: ["STUDENT"], isPublic: false, load: () => import("./pages/dashboard.js") },
  passport: { title: "Campus Passport", roles: ["STUDENT"], isPublic: false, load: () => import("./pages/passport.js") },
  "campus-lens": { title: "Campus Lens", roles: ["STUDENT"], isPublic: false, load: () => import("./pages/campus-lens.js") },
  "campus-pulse": { title: "Campus Pulse", roles: ["STUDENT", "TEACHER", "ADMIN"], isPublic: false, load: () => import("./pages/campus-pulse.js") },
  "opportunity-wallet": { title: "Opportunity Wallet", roles: ["STUDENT"], isPublic: false, load: () => import("./pages/opportunity-wallet.js") },
  "student-pocket": { title: "Student Pocket", roles: ["STUDENT", "TEACHER", "ADMIN"], isPublic: false, load: () => import("./pages/student-pocket.js") },
  "teacher-dashboard": { title: "Educator Portal", roles: ["TEACHER", "ADMIN"], isPublic: false, load: () => import("./pages/teacher-dashboard.js") },
  "teacher-reports": { title: "Diagnostic Reports", roles: ["TEACHER", "ADMIN"], isPublic: false, load: () => import("./pages/teacher-reports.js") },
  "teacher-evidence": { title: "Student Evidence Audit", roles: ["TEACHER", "ADMIN"], isPublic: false, load: () => import("./pages/teacher-evidence.js") },
  "teacher-pulse-review": { title: "Pulse Review Queue", roles: ["TEACHER", "ADMIN"], isPublic: false, load: () => import("./pages/teacher-pulse-review.js") },
  "teacher-rewards": { title: "Point Authority", roles: ["TEACHER", "ADMIN"], isPublic: false, load: () => import("./pages/teacher-rewards.js") },
  admin: { title: "School Administration", roles: ["ADMIN"], isPublic: false, load: () => import("./pages/admin.js") },
  merchant: { title: "Merchant Terminal", roles: ["MERCHANT", "ADMIN"], isPublic: false, load: () => import("./pages/merchant.js") },
  unauthorized: { title: "Access Restricted", roles: ["*"], isPublic: true, load: () => import("./pages/unauthorized.js") },
};

const state = {
  studentId: store.getStudentId(),
  student: null,
  passport: null,
  balance: null,
  transactions: null,
  cards: null,
  opportunities: null,
  applications: null,
  issues: null,
  allStudents: [],
  campusLensStatus: null,
  resourceErrors: {},
  health: "loading",
  loading: true,
};

const pageRoot = document.getElementById("page-root");
const sidebar = document.getElementById("sidebar");
const mobileShade = document.getElementById("mobile-nav-shade");
let activeCleanup = null;
let renderSequence = 0;
let toastTimer = 0;

function defaultRouteForUser() {
  if (!store.isAuthenticated()) return "login";
  if (store.isAdmin()) return "admin";
  if (store.isMerchant()) return "merchant";
  if (store.isTeacher()) return "teacher-dashboard";
  return "dashboard";
}

function currentRoute() {
  const hash = window.location.hash.slice(1);
  const route = hash.split("?")[0];
  if (!route) {
    return defaultRouteForUser();
  }
  return Object.hasOwn(PAGES, route) ? route : defaultRouteForUser();
}

function navigate(route) {
  if (currentRoute() === route) {
    void renderPage();
    return;
  }
  window.location.hash = route;
}

function syncHeader() {
  const route = currentRoute();
  const user = store.currentUser;
  const isAuth = store.isAuthenticated();

  // If login view, hide sidebar and show minimal header
  if (route === "login" || !isAuth) {
    document.body.classList.add("is-auth-screen");
    if (sidebar) sidebar.style.display = "none";
    const greetingEl = document.getElementById("topbar-greeting");
    if (greetingEl) greetingEl.textContent = "Welcome to Campus Passport";
    const profileLink = document.getElementById("profile-link");
    if (profileLink) {
      // Keep the same element ids as the signed-in markup so syncHeader can
      // refill this chip when a persona signs back in without a page reload.
      profileLink.innerHTML = `
        <span class="avatar" id="profile-avatar" aria-hidden="true">—</span>
        <span class="profile-copy"><strong id="profile-name">Not signed in</strong><small id="profile-subtitle">Select Persona</small></span>
      `;
      profileLink.href = "#login";
    }
    document.title = "Sign In · Campus Passport";
    return;
  }

  if (sidebar) sidebar.style.display = "";
  document.body.classList.remove("is-auth-screen");

  let roleTitle = "Student";
  let defaultLink = "#passport";
  if (store.isAdmin()) {
    roleTitle = "School Administrator";
    defaultLink = "#admin";
  } else if (store.isMerchant()) {
    roleTitle = "Campus Merchant";
    defaultLink = "#merchant";
  } else if (store.isTeacher()) {
    roleTitle = "Educator Role";
    defaultLink = "#teacher-dashboard";
  } else {
    roleTitle = user.class_name ? `Class ${user.class_name}` : "Student";
    defaultLink = "#passport";
  }

  const name = user.name || (store.isAdmin() ? "Administrator" : store.isMerchant() ? "Merchant" : store.isTeacher() ? "Educator" : "Student");
  const firstName = name.trim().split(/\s+/)[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const greetingEl = document.getElementById("topbar-greeting");
  if (greetingEl) {
    greetingEl.textContent = `${greeting}, ${firstName}.`;
  }

  // Connection indicator
  const connection = document.getElementById("connection-state");
  const dot = document.getElementById("connection-dot");
  if (connection && dot) {
    if (state.health === "ready") {
      connection.textContent = "API connected";
      dot.className = "connection-dot is-online";
    } else if (state.health === "offline") {
      connection.textContent = "API unavailable";
      dot.className = "connection-dot is-offline";
    } else {
      connection.textContent = "Checking connection";
      dot.className = "connection-dot is-checking";
    }
  }

  // Profile widget
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "—";
  const avatarEl = document.getElementById("profile-avatar");
  const nameEl = document.getElementById("profile-name");
  const subEl = document.getElementById("profile-subtitle");
  const profileLink = document.getElementById("profile-link");

  if (avatarEl) avatarEl.textContent = initials;
  if (nameEl) nameEl.textContent = name;
  if (subEl) subEl.textContent = roleTitle;
  if (profileLink) profileLink.href = defaultLink;

  const pageDef = PAGES[route];
  document.title = `${pageDef ? pageDef.title : "Campus Passport"} · Campus Passport`;

  renderNavigationMenu(route);
  renderActivityPopover();
}

function renderNavigationMenu(currentActiveRoute) {
  const navContainer = document.getElementById("primary-nav");
  if (!navContainer) return;

  const isAdmin = store.isAdmin();
  const isMerchant = store.isMerchant();
  const isTeacher = store.isTeacher();

  if (isAdmin) {
    navContainer.innerHTML = `
      <p class="nav-group-title">Administration</p>
      <a class="nav-link ${currentActiveRoute === "admin" ? "is-active" : ""}" href="#admin" data-route="admin">
        <span class="nav-symbol" data-icon="shield" aria-hidden="true">${icon("shield", 16)}</span>
        <span class="nav-label">Admin Console</span>
        <span class="nav-note">POLICY</span>
      </a>
      <a class="nav-link ${currentActiveRoute === "teacher-dashboard" ? "is-active" : ""}" href="#teacher-dashboard" data-route="teacher-dashboard">
        <span class="nav-symbol" data-icon="chart" aria-hidden="true">${icon("chart", 16)}</span>
        <span class="nav-label">Cohort Overview</span>
      </a>
      <a class="nav-link ${currentActiveRoute === "teacher-pulse-review" ? "is-active" : ""}" href="#teacher-pulse-review" data-route="teacher-pulse-review">
        <span class="nav-symbol" data-icon="pulse" aria-hidden="true">${icon("pulse", 16)}</span>
        <span class="nav-label">Pulse Review Queue</span>
        <span class="nav-note">EVALUATE</span>
      </a>
      <a class="nav-link ${currentActiveRoute === "merchant" ? "is-active" : ""}" href="#merchant" data-route="merchant">
        <span class="nav-symbol" data-icon="credit-card" aria-hidden="true">${icon("credit-card", 16)}</span>
        <span class="nav-label">Merchant Terminal</span>
        <span class="nav-note">POS</span>
      </a>
      <a class="nav-link ${currentActiveRoute === "student-pocket" ? "is-active" : ""}" href="#student-pocket" data-route="student-pocket">
        <span class="nav-symbol" data-icon="wallet" aria-hidden="true">${icon("wallet", 16)}</span>
        <span class="nav-label">Student Pocket</span>
        <span class="nav-note">LEDGER</span>
      </a>
    `;
  } else if (isMerchant) {
    navContainer.innerHTML = `
      <p class="nav-group-title">Merchant Services</p>
      <a class="nav-link ${currentActiveRoute === "merchant" ? "is-active" : ""}" href="#merchant" data-route="merchant">
        <span class="nav-symbol" data-icon="credit-card" aria-hidden="true">${icon("credit-card", 16)}</span>
        <span class="nav-label">Merchant Terminal</span>
        <span class="nav-note">POS TAP</span>
      </a>
    `;
  } else if (isTeacher) {
    navContainer.innerHTML = `
      <p class="nav-group-title">Educator Portal</p>
      <a class="nav-link ${currentActiveRoute === "teacher-dashboard" ? "is-active" : ""}" href="#teacher-dashboard" data-route="teacher-dashboard">
        <span class="nav-symbol" data-icon="home" aria-hidden="true">${icon("home", 16)}</span>
        <span class="nav-label">Cohort Overview</span>
      </a>
      <a class="nav-link ${currentActiveRoute === "teacher-reports" ? "is-active" : ""}" href="#teacher-reports" data-route="teacher-reports">
        <span class="nav-symbol" data-icon="chart" aria-hidden="true">${icon("chart", 16)}</span>
        <span class="nav-label">Diagnostic Reports</span>
        <span class="nav-note">INSIGHTS</span>
      </a>
      <a class="nav-link ${currentActiveRoute === "teacher-evidence" ? "is-active" : ""}" href="#teacher-evidence" data-route="teacher-evidence">
        <span class="nav-symbol" data-icon="shield" aria-hidden="true">${icon("shield", 16)}</span>
        <span class="nav-label">Student Evidence</span>
        <span class="nav-note">AUDIT</span>
      </a>
      <a class="nav-link ${currentActiveRoute === "teacher-pulse-review" ? "is-active" : ""}" href="#teacher-pulse-review" data-route="teacher-pulse-review">
        <span class="nav-symbol" data-icon="pulse" aria-hidden="true">${icon("pulse", 16)}</span>
        <span class="nav-label">Pulse Review Queue</span>
        <span class="nav-note">EVALUATE</span>
      </a>
      <a class="nav-link ${currentActiveRoute === "teacher-rewards" ? "is-active" : ""}" href="#teacher-rewards" data-route="teacher-rewards">
        <span class="nav-symbol" data-icon="award" aria-hidden="true">${icon("award", 16)}</span>
        <span class="nav-label">Point Authority</span>
        <span class="nav-note">CONDUCT</span>
      </a>

      <p class="nav-group-title nav-group-spaced">Campus Records</p>
      <a class="nav-link ${currentActiveRoute === "campus-pulse" ? "is-active" : ""}" href="#campus-pulse" data-route="campus-pulse">
        <span class="nav-symbol" data-icon="pulse" aria-hidden="true">${icon("pulse", 16)}</span>
        <span class="nav-label">Campus Pulse</span>
        <span class="nav-note">COMMUNITY</span>
      </a>
      <a class="nav-link ${currentActiveRoute === "student-pocket" ? "is-active" : ""}" href="#student-pocket" data-route="student-pocket">
        <span class="nav-symbol" data-icon="wallet" aria-hidden="true">${icon("wallet", 16)}</span>
        <span class="nav-label">Student Pocket</span>
        <span class="nav-note">LEDGER</span>
      </a>
    `;
  } else {
    // Student navigation
    navContainer.innerHTML = `
      <p class="nav-group-title">Your Journey</p>
      <a class="nav-link ${currentActiveRoute === "dashboard" ? "is-active" : ""}" href="#dashboard" data-route="dashboard">
        <span class="nav-symbol" data-icon="home" aria-hidden="true">${icon("home", 16)}</span>
        <span class="nav-label">Overview</span>
      </a>
      <a class="nav-link ${currentActiveRoute === "passport" ? "is-active" : ""}" href="#passport" data-route="passport">
        <span class="nav-symbol" data-icon="passport" aria-hidden="true">${icon("passport", 16)}</span>
        <span class="nav-label">Campus Passport</span>
        <span class="nav-note">FOLIO</span>
      </a>

      <p class="nav-group-title nav-group-spaced">Build Your Record</p>
      <a class="nav-link ${currentActiveRoute === "campus-lens" ? "is-active" : ""}" href="#campus-lens" data-route="campus-lens">
        <span class="nav-symbol" data-icon="book" aria-hidden="true">${icon("book", 16)}</span>
        <span class="nav-label">Campus Lens</span>
        <span class="nav-note">LEARN</span>
      </a>
      <a class="nav-link ${currentActiveRoute === "campus-pulse" ? "is-active" : ""}" href="#campus-pulse" data-route="campus-pulse">
        <span class="nav-symbol" data-icon="pulse" aria-hidden="true">${icon("pulse", 16)}</span>
        <span class="nav-label">Campus Pulse</span>
        <span class="nav-note">CONTRIBUTE</span>
      </a>
      <a class="nav-link ${currentActiveRoute === "opportunity-wallet" ? "is-active" : ""}" href="#opportunity-wallet" data-route="opportunity-wallet">
        <span class="nav-symbol" data-icon="wallet" aria-hidden="true">${icon("wallet", 16)}</span>
        <span class="nav-label">Opportunity Wallet</span>
        <span class="nav-note">UNLOCK</span>
      </a>
      <a class="nav-link ${currentActiveRoute === "student-pocket" ? "is-active" : ""}" href="#student-pocket" data-route="student-pocket">
        <span class="nav-symbol" data-icon="wallet" aria-hidden="true">${icon("wallet", 16)}</span>
        <span class="nav-label">Student Pocket</span>
        <span class="nav-note">POCKET</span>
      </a>
    `;
  }

  // Update sidebar footer
  let roleBadge = "STUDENT VIEW";
  let roleFootnote = "Your work adds up &bull; Evidence for every next step.";
  if (isAdmin) {
    roleBadge = "ADMINISTRATOR";
    roleFootnote = "Administrative control over cards and spending policy.";
  } else if (isMerchant) {
    roleBadge = "CAMPUS MERCHANT";
    roleFootnote = "Contactless tap checkout and spending validation.";
  } else if (isTeacher) {
    roleBadge = "TEACHER / FACULTY";
    roleFootnote = "Authoritative access to cohort reports and rewards.";
  }

  const footerEl = document.getElementById("sidebar-footer-content");
  if (footerEl) {
    footerEl.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
        <span class="sidebar-version">ROLE: ${roleBadge}</span>
        <button id="btn-sign-out" class="button button-quiet button-small" style="font-size:9px;padding:2px 6px;" type="button">
          Sign out ${icon("log-out", 11)}
        </button>
      </div>
      <p style="margin:0;font-size:10px;color:var(--muted);line-height:1.5;">
        ${roleFootnote}
      </p>
    `;
    const signOutBtn = document.getElementById("btn-sign-out");
    if (signOutBtn) {
      signOutBtn.onclick = () => {
        store.logout();
        navigate("login");
        notify("Signed out successfully.", "info");
      };
    }
  }
}

function renderActivityPopover() {
  const target = document.getElementById("activity-list");
  if (!target) return;
  const items = recentActivity(state);
  if (!items.length) {
    target.innerHTML = `<div class="popover-empty"><span class="empty-icon">${icon("bell", 20)}</span><p>No recent activity is available in your record yet.</p></div>`;
    return;
  }
  target.innerHTML = `
    <ul class="popover-activity">
      ${items.map((item) => `
        <li>
          <a href="#${escapeHtml(item.route)}" class="popover-activity-link">
            <span class="activity-icon">${icon(item.icon, 16)}</span>
            <span class="activity-copy">
              <small>${escapeHtml(item.kind)}</small>
              <strong>${escapeHtml(item.title)}</strong>
              <span>${escapeHtml(formatDate(item.created_at))}</span>
            </span>
          </a>
        </li>
      `).join("")}
    </ul>
    <p class="popover-footnote">Verified records from the connected Campus Passport database.</p>
  `;
}

async function refreshData(shouldRender = true) {
  const user = store.currentUser;
  state.studentId = store.getStudentId();
  const id = state.studentId ? encodeURIComponent(state.studentId) : null;

  const resources = {
    health: () => api.get("/health"),
    allStudents: () => api.get("/api/students"),
    student: () => (id ? api.get(`/api/students/${id}`) : Promise.resolve(null)),
    passport: () => (id ? api.get(`/api/student/${id}/passport`) : Promise.resolve(null)),
    balance: () => (id ? api.get(`/api/student/${id}/balance`) : Promise.resolve(null)),
    transactions: () => (id ? api.get(`/api/student/${id}/transactions`) : Promise.resolve([])),
    cards: () => (id ? api.get(`/api/student/${id}/cards`) : Promise.resolve([])),
    opportunities: () => api.get("/api/opportunities"),
    applications: () => (id ? api.get(`/api/student/${id}/opportunities/applications`) : Promise.resolve([])),
    issues: () => api.get("/api/campus-pulse/issues"),
    campusLensStatus: () => api.get("/api/campus-lens/status"),
  };

  await Promise.all(
    Object.entries(resources).map(async ([key, load]) => {
      try {
        const value = await load();
        if (key === "health") state.health = value?.status === "ok" ? "ready" : "offline";
        else state[key] = value;
        state.resourceErrors[key] = null;
      } catch (error) {
        if (key === "health") state.health = "offline";
        state.resourceErrors[key] = error;
      }
    })
  );

  state.loading = false;
  syncHeader();
  if (shouldRender) await renderPage();
}

async function renderPage() {
  if (!pageRoot) return;
  const route = currentRoute();
  const sequence = ++renderSequence;

  // 1. Unauthenticated gate
  if (!store.isAuthenticated() && route !== "login") {
    window.location.hash = "login";
    return;
  }

  // 2. Role-aware Frontend Route Guard
  const pageDef = PAGES[route];
  if (pageDef && !pageDef.isPublic) {
    const userRole = store.currentUser?.role || "GUEST";
    const allowed = pageDef.roles.includes("*") || pageDef.roles.includes(userRole);
    if (!allowed) {
      notify(`Access Restricted: ${userRole} role cannot access ${pageDef.title}.`, "error");
      const unauthModule = await PAGES["unauthorized"].load();
      if (sequence !== renderSequence) return;
      if (activeCleanup) activeCleanup();
      pageRoot.innerHTML = unauthModule.render({ role: userRole, route });
      pageRoot.setAttribute("aria-busy", "false");
      syncHeader();
      // The route itself is off-limits, so the tab title must not advertise it.
      document.title = "Access Restricted · Campus Passport";
      return;
    }
  }

  try {
    const page = await pageDef.load();
    if (sequence !== renderSequence) return;
    if (activeCleanup) activeCleanup();

    pageRoot.innerHTML = page.render({ state, navigate, refreshData: () => refreshData(true), api });
    pageRoot.setAttribute("aria-busy", "false");

    activeCleanup = typeof page.mount === "function"
      ? page.mount(pageRoot, {
          state,
          navigate,
          refreshData: () => refreshData(true),
          render: () => renderPage(),
          api,
          notify,
        })
      : null;

    syncHeader();
  } catch (err) {
    if (sequence !== renderSequence) return;
    if (activeCleanup) activeCleanup();
    activeCleanup = null;
    pageRoot.setAttribute("aria-busy", "false");
    pageRoot.innerHTML = `
      <section class="page page-load-error">
        <div class="notice notice-error" role="alert">
          <span>${icon("info", 20)}</span>
          <div>
            <strong>This page could not be opened.</strong>
            <p>${escapeHtml(err.message || "An unexpected error occurred while loading this view.")}</p>
            <a class="text-link" href="#${store.isTeacher() ? "teacher-dashboard" : "dashboard"}">
              Return to overview ${icon("arrow-right", 15)}
            </a>
          </div>
        </div>
      </section>
    `;
  }
}

function notify(message, tone = "success") {
  const region = document.getElementById("toast-region");
  if (!region) return;
  region.innerHTML = `
    <div class="toast toast-${tone}" role="status">
      <span class="toast-mark">${icon(tone === "success" ? "check-circle" : tone === "error" ? "alert-triangle" : "info", 18)}</span>
      <span>${escapeHtml(message)}</span>
    </div>
  `;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { region.innerHTML = ""; }, 4200);
}

function setMobileMenu(open) {
  if (sidebar) sidebar.classList.toggle("is-open", open);
  if (mobileShade) mobileShade.hidden = !open;
  const toggle = document.getElementById("menu-toggle");
  if (toggle) toggle.setAttribute("aria-expanded", String(open));
}

function initEventHandlers() {
  window.addEventListener("hashchange", () => {
    setMobileMenu(false);
    void renderPage();
  });

  document.getElementById("menu-toggle")?.addEventListener("click", () => {
    const isOpen = sidebar?.classList.contains("is-open");
    setMobileMenu(!isOpen);
  });

  document.getElementById("sidebar-close")?.addEventListener("click", () => setMobileMenu(false));
  mobileShade?.addEventListener("click", () => setMobileMenu(false));

  const refreshTrigger = document.getElementById("refresh-trigger");
  refreshTrigger?.addEventListener("click", async () => {
    refreshTrigger.disabled = true;
    refreshTrigger.classList.add("is-spinning");
    notify("Refreshing records from Campus Passport API…", "info");
    await refreshData(true);
    refreshTrigger.classList.remove("is-spinning");
    refreshTrigger.disabled = false;
  });

  const activityTrigger = document.getElementById("activity-trigger");
  const activityPanel = document.getElementById("activity-panel");
  activityTrigger?.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = !activityPanel?.hidden;
    if (activityPanel) activityPanel.hidden = open;
    activityTrigger.setAttribute("aria-expanded", String(!open));
  });

  document.getElementById("activity-close")?.addEventListener("click", () => {
    if (activityPanel) activityPanel.hidden = true;
    activityTrigger?.setAttribute("aria-expanded", "false");
  });

  document.addEventListener("click", (e) => {
    if (activityPanel && !activityPanel.hidden && !activityPanel.contains(e.target) && e.target !== activityTrigger) {
      activityPanel.hidden = true;
      activityTrigger?.setAttribute("aria-expanded", "false");
    }
  });

  store.subscribe("authChanged", () => {
    state.studentId = store.getStudentId();
    refreshData(true);
  });
}

// Global bootstrap
initEventHandlers();
void refreshData(true);

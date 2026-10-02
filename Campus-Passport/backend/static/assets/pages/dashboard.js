import { allAchievements, contributionAchievements, issuesForStudent, learningAchievements, profileFrom, recentActivity } from "../data.js";
import { escapeHtml, formatDate, formatNumber, icon, pluralize, statusBadge } from "../ui.js";

function recordCount(state, key, value) {
  if (state.resourceErrors[key]) return "—";
  if (state.loading) return "…";
  return formatNumber(value);
}

function activityRows(items) {
  if (!items.length) {
    return `<div class="empty-state"><span class="empty-mark">${icon("clock", 18)}</span><h3>Your next chapter starts here</h3><p>New learning evidence, campus reports, and wallet activity will appear here after the backend records them.</p></div>`;
  }
  return `<div class="activity-list">${items.slice(0, 4).map((item) => `
    <a class="activity-row" href="#${escapeHtml(item.route)}">
      <span class="activity-row-icon">${icon(item.icon, 16)}</span>
      <span class="activity-row-copy"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.kind)}${item.detail ? ` · ${escapeHtml(item.detail)}` : ""}</small><time datetime="${escapeHtml(item.created_at)}">${escapeHtml(formatDate(item.created_at))}</time></span>
      <span class="profile-chevron">${icon("arrow-up-right", 14)}</span>
    </a>`).join("")}</div>`;
}

/** @param {{state: Record<string, any>}} context */
export function render({ state }) {
  const profile = profileFrom(state);
  const learned = learningAchievements(state);
  const contributed = contributionAchievements(state);
  const issues = issuesForStudent(state);
  const achievements = allAchievements(state);
  const activity = recentActivity(state);
  const opportunities = Array.isArray(state.opportunities) ? state.opportunities : [];
  const hello = profile?.name ? `, ${escapeHtml(String(profile.name).split(/\s+/)[0])}` : "";
  const profileError = state.resourceErrors.student && !profile;
  const passportError = state.resourceErrors.passport;
  const recordCountValue = passportError ? "—" : state.loading ? "…" : formatNumber(achievements.length);
  const pocketValue = state.resourceErrors.balance ? "—" : state.loading ? "…" : state.balance ? formatNumber(state.balance.total_balance) : "—";
  const availableValue = state.resourceErrors.opportunities ? "—" : state.loading ? "…" : formatNumber(opportunities.length);

  return `<section class="page dashboard-page">
    ${state.health === "offline" ? `<div class="notice notice-error" role="alert"><span>${icon("info", 18)}</span><div><strong>Your record could not be reached.</strong><p>The dashboard is showing only data that has already loaded. Check the connection and refresh to try again.</p></div></div>` : ""}
    ${profileError ? `<div class="notice notice-warning" role="status"><span>${icon("info", 18)}</span><div><strong>Student identity is unavailable.</strong><p>The current student record could not be loaded, so no sample identity is shown.</p></div></div>` : ""}

    <section class="journey-hero" aria-labelledby="dashboard-title">
      <div class="hero-grid">
        <div>
          <p class="hero-kicker"><span class="kicker-dot"></span>YOUR CAMPUS, IN MOTION</p>
          <h1 class="hero-title" id="dashboard-title">Your journey is more than a score.</h1>
          <p class="hero-copy">Learn something new. Make your campus better. Keep the evidence. Let your work open the next opportunity.</p>
          <a class="hero-link" href="#campus-lens">Start with Campus Lens ${icon("arrow-up-right", 16)}</a>
        </div>
        <div class="hero-aside" aria-label="Passport record summary">
          <div class="hero-aside-heading"><span>${profile ? `A closer look${hello}` : "Your passport at a glance"}</span>${profile ? statusBadge("ACTIVE", "STUDENT RECORD") : statusBadge("", "RECORD CHECK")}</div>
          <p class="hero-count">${recordCountValue}</p>
          <p class="hero-count-caption">verified achievements in your Campus Passport</p>
          <div class="hero-divider"></div>
          <div class="hero-mini-grid">
            <div><small>Student Pocket · units</small><strong>${pocketValue}</strong></div>
            <div><small>Opportunities listed</small><strong>${availableValue}</strong></div>
          </div>
          ${state.resourceErrors.passport ? `<p class="form-footnote">Passport summary could not be loaded.</p>` : ""}
        </div>
      </div>
      <div class="journey-rail" aria-label="Campus Passport journey">
        <a class="journey-step is-current" href="#campus-lens"><span class="journey-number">01</span><span><strong>LEARN</strong><small>Make a concept your own</small></span></a>
        <a class="journey-step" href="#campus-pulse"><span class="journey-number">02</span><span><strong>CONTRIBUTE</strong><small>Notice what needs care</small></span></a>
        <a class="journey-step" href="#passport"><span class="journey-number">03</span><span><strong>PROVE</strong><small>Verified folio evidence</small></span></a>
        <a class="journey-step" href="#opportunity-wallet"><span class="journey-number">04</span><span><strong>UNLOCK</strong><small>Explore what fits</small></span></a>
      </div>
    </section>

    <section class="section-block" aria-labelledby="evidence-glance-title">
      <div class="section-heading"><div><h2 id="evidence-glance-title">What your work is adding up to</h2><p>Evidence from the connected Campus Passport record.</p></div><a class="text-link" href="#passport">Open your passport ${icon("arrow-right", 14)}</a></div>
      <div class="evidence-grid">
        <a class="evidence-card" data-kind="learning" href="#passport">
          <div class="evidence-card-top"><span class="evidence-icon">${icon("book", 17)}</span>${state.resourceErrors.passport ? statusBadge("", "UNAVAILABLE") : statusBadge("ACTIVE", "LEARNED")}</div>
          <div class="evidence-label">LEARNING</div><div class="evidence-value"><strong>${recordCount(state, "passport", learned.length)}</strong><span>${learned.length === 1 ? "verified record" : "verified records"}</span></div>
          <p class="evidence-note">Concepts you've practiced become verified evidence.</p>
        </a>
        <a class="evidence-card" data-kind="contribution" href="#campus-pulse">
          <div class="evidence-card-top"><span class="evidence-icon">${icon("pulse", 17)}</span>${state.resourceErrors.issues ? statusBadge("", "PARTIAL DATA") : statusBadge("ACTIVE", "CONTRIBUTE")}</div>
          <div class="evidence-label">CONTRIBUTION</div><div class="evidence-value"><strong>${recordCount(state, "passport", contributed.length)}</strong><span>${contributed.length === 1 ? "verified achievement" : "verified achievements"}</span></div>
          <p class="evidence-note">${state.resourceErrors.issues ? "Issue reports could not be loaded." : `${formatNumber(issues.length)} report${issues.length === 1 ? "" : "s"} from your record.`}</p>
        </a>
        <a class="evidence-card" data-kind="opportunity" href="#opportunity-wallet">
          <div class="evidence-card-top"><span class="evidence-icon">${icon("wallet", 17)}</span>${state.resourceErrors.opportunities ? statusBadge("", "UNAVAILABLE") : statusBadge("ACTIVE", "UNLOCK")}</div>
          <div class="evidence-label">OPPORTUNITIES</div><div class="evidence-value"><strong>${recordCount(state, "opportunities", opportunities.length)}</strong><span>available catalog</span></div>
          <p class="evidence-note">Explore scholarships and opportunities matching your record.</p>
        </a>
      </div>
    </section>

    <section class="section-block" aria-labelledby="quick-actions-title">
      <div class="section-heading"><div><h2 id="quick-actions-title">One small next step</h2><p>Each action connects to the same student record.</p></div></div>
      <div class="quick-actions">
        <a class="quick-action" href="#campus-lens" data-action-kind="learn"><span class="action-icon">${icon("bookopen", 17)}</span><span><strong>Understand a page</strong><small>Snap a textbook page and explore it with Campus Lens.</small></span><span class="action-arrow">${icon("arrow-up-right", 15)}</span></a>
        <a class="quick-action" href="#campus-pulse" data-action-kind="pulse"><span class="action-icon">${icon("pulse", 17)}</span><span><strong>Report a campus issue</strong><small>Share a problem and follow its real status.</small></span><span class="action-arrow">${icon("arrow-up-right", 15)}</span></a>
        <a class="quick-action" href="#opportunity-wallet" data-action-kind="wallet"><span class="action-icon">${icon("wallet", 17)}</span><span><strong>Explore an opportunity</strong><small>See the requirements and current eligibility.</small></span><span class="action-arrow">${icon("arrow-up-right", 15)}</span></a>
      </div>
    </section>

    <section class="section-block" aria-labelledby="evidence-bridge-title">
      <div class="section-heading"><div><h2 id="evidence-bridge-title">Verified achievements → opportunities</h2><p>A record of evidence, not a ranking of students.</p></div><a class="text-link" href="#opportunity-wallet">Explore wallet ${icon("arrow-right", 14)}</a></div>
      <div class="bridge-card" aria-label="Learning and contribution evidence connect to verified achievements and opportunities">
        <div class="bridge-evidence"><small>LEARN</small><strong>${pluralize(learned.length, "verified record", "verified records")}</strong></div>
        <span class="bridge-plus" aria-hidden="true">+</span>
        <div class="bridge-evidence"><small>CONTRIBUTE</small><strong>${pluralize(contributed.length, "contribution achievement", "contribution achievements")}</strong></div>
        <span class="bridge-arrow" aria-hidden="true">${icon("arrow-right", 16)}</span>
        <div class="bridge-destination"><small>EVIDENCE → POSSIBILITY</small><strong>${pluralize(opportunities.length, "opportunity", "opportunities")} in the current catalog</strong></div>
      </div>
    </section>

    <section class="section-block content-grid" aria-label="Recent student activity">
      <div><div class="section-heading"><div><h2>Recent activity</h2><p>Meaningful events from your actual record.</p></div></div>${activityRows(activity)}</div>
      <aside class="card card-pad">
        <div class="card-header"><div><span class="card-label">YOUR IDENTITY</span><h2>${profile ? escapeHtml(profile.name) : "Student profile"}</h2></div><span class="avatar" aria-hidden="true">${profile ? escapeHtml(String(profile.name).split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase()) : "—"}</span></div>
        ${profile ? `<div class="identity-facts"><div class="identity-fact"><small>Class</small><strong>${profile.class_name ? `Class ${escapeHtml(profile.class_name)}` : "Not provided"}</strong></div><div class="identity-fact"><small>Preferred language</small><strong>${escapeHtml(profile.preferred_language || "Not provided")}</strong></div></div><a class="text-link" style="margin-top:17px" href="#passport">View your student record ${icon("arrow-right", 14)}</a>` : `<p class="field-hint">Identity details appear when the student API supplies them.</p>`}
        ${state.resourceErrors.opportunities ? `<p class="form-footnote">Opportunity catalog is temporarily unavailable.</p>` : ""}
      </aside>
    </section>
  </section>`;
}

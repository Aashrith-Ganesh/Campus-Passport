import { allAchievements, contributionAchievements, issuesForStudent, learningAchievements, profileFrom, revokedAchievements } from "../data.js";
import { escapeHtml, formatDate, formatNumber, icon, statusBadge } from "../ui.js";

function achievementCard(item, kind) {
  const description = item.evidence || item.description || item.source || "Evidence details were not returned.";
  const date = item.timestamp || item.created_at;
  const isRevoked = item.status === "REVOKED" || item.is_revoked || String(item.title).includes("[REVOKED]");
  return `<article class="achievement-card ${isRevoked ? "is-revoked" : ""}">
    <span class="achievement-mark">${icon(isRevoked ? "alert-triangle" : kind === "learning" ? "book" : "award", 17)}</span>
    <div class="achievement-copy"><h3>${escapeHtml(item.title || "Achievement")}</h3><p>${escapeHtml(description)}</p><div class="achievement-meta"><span>${icon("calendar", 12)}${escapeHtml(formatDate(date))}</span><span>${escapeHtml(item.category || item.type || (kind === "learning" ? "Learning" : "Contribution"))}</span>${item.source ? `<span>${escapeHtml(item.source)}</span>` : ""}</div></div>
    <span class="achievement-stamp">${isRevoked ? statusBadge("REVOKED", "REVOKED") : statusBadge("VERIFIED", "VERIFIED")}</span>
  </article>`;
}

function achievementGroup(items, kind, loading, failed) {
  if (failed) return `<div class="notice notice-warning" role="status"><span>${icon("info", 18)}</span><div><strong>Evidence could not be loaded.</strong><p>Refresh the passport to retry. No example records are substituted.</p></div></div>`;
  if (loading) return `<div class="skeleton" aria-label="Loading evidence"></div>`;
  if (!items.length) return `<div class="empty-state"><span class="empty-mark">${icon(kind === "learning" ? "book" : "award", 18)}</span><h3>No verified ${kind} evidence yet</h3><p>Records appear here when the backend verifies and adds them to your passport.</p><a class="text-link" href="#${kind === "learning" ? "campus-lens" : "campus-pulse"}">${kind === "learning" ? "Open Campus Lens" : "Open Campus Pulse"} ${icon("arrow-right", 13)}</a></div>`;
  return `<div class="achievement-list">${items.map((item) => achievementCard(item, kind)).join("")}</div>`;
}

function issueCards(issues) {
  if (!issues.length) return `<div class="empty-state"><span class="empty-mark">${icon("pulse", 18)}</span><h3>No reports from this student record yet</h3><p>A report is shown here after Campus Pulse saves it.</p><a class="text-link" href="#campus-pulse">Open Campus Pulse ${icon("arrow-right", 13)}</a></div>`;
  return `<div class="achievement-list">${issues.map((issue) => `<article class="achievement-card"><span class="achievement-mark">${icon("pulse", 17)}</span><div class="achievement-copy"><h3>${escapeHtml(issue.title)}</h3><p>${escapeHtml(issue.description || issue.category || "Campus contribution")}</p><div class="achievement-meta"><span>${icon("calendar", 12)}${escapeHtml(formatDate(issue.created_at))}</span><span>${escapeHtml(issue.category)}</span>${issue.location ? `<span>${icon("pin", 12)}${escapeHtml(issue.location)}</span>` : ""}</div></div><span class="achievement-stamp">${statusBadge(issue.status)}</span></article>`).join("")}</div>`;
}

/** @param {{state: Record<string, any>}} context */
export function render({ state }) {
  const profile = profileFrom(state);
  const achievements = allAchievements(state);
  const learned = learningAchievements(state);
  const contributed = contributionAchievements(state);
  const revoked = revokedAchievements(state);
  const issues = issuesForStudent(state);
  const studentId = profile?.id || profile?.student_id || state.studentId;
  const passportUnavailable = !!state.resourceErrors.passport && !state.passport;
  const points = state.passport?.total_points;

  return `<section class="page passport-page">
    <header class="page-head"><div><p class="page-kicker"><span class="kicker-dot"></span>YOUR STUDENT RECORD</p><h1 class="page-title">A passport made of proof.</h1><p class="page-lead">A living record of what you've learned and contributed. No single number can tell your whole story.</p></div><div class="page-head-action"><a class="button button-primary" href="#opportunity-wallet">See connected opportunities ${icon("arrow-up-right", 15)}</a></div></header>

    ${passportUnavailable ? `<div class="notice notice-error" role="alert"><span>${icon("info", 18)}</span><div><strong>Your Passport API is unavailable.</strong><p>Profile and achievement data could not be loaded. This page does not invent a student record.</p></div></div>` : ""}

    <section class="identity-panel" aria-label="Student identity">
      <div class="identity-main"><span class="identity-avatar" aria-hidden="true">${profile ? escapeHtml(String(profile.name || "").split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase()) : "—"}</span><div><span class="card-label">CAMPUS PASSPORT IDENTITY</span><h2>${profile ? escapeHtml(profile.name || "Student") : "Identity unavailable"}</h2><p>Identity details are supplied by the current student API.</p></div></div>
      <div class="identity-facts"><div class="identity-fact"><small>Student ID</small><strong class="identity-id">${profile ? escapeHtml(studentId) : "Not available"}</strong></div><div class="identity-fact"><small>Class</small><strong>${profile?.class_name ? `Class ${escapeHtml(profile.class_name)}` : "Not provided"}</strong></div><div class="identity-fact"><small>Preferred language</small><strong>${escapeHtml(profile?.preferred_language || "Not provided")}</strong></div>${typeof points === "number" ? `<div class="identity-fact"><small>Earned points</small><strong>${formatNumber(points)}</strong></div>` : ""}</div>
    </section>

    <section class="section-block" aria-labelledby="verified-record-title">
      <div class="section-heading"><div><h2 id="verified-record-title">Verified achievements</h2><p>${passportUnavailable ? "Waiting for the student API." : `${formatNumber(achievements.length)} achievement${achievements.length === 1 ? "" : "s"} returned by your Passport.`}</p></div>${!state.resourceErrors.passport ? statusBadge("VERIFIED", "BACKEND RECORD") : ""}</div>

      <section class="evidence-section" aria-labelledby="learned-title"><div class="evidence-intro"><span class="section-index">01</span><h2 id="learned-title">Learned</h2><p>Verified learning evidence from Campus Lens and other supported sources.</p></div><div>${achievementGroup(learned, "learning", state.loading, passportUnavailable)}</div></section>

      <section class="evidence-section" aria-labelledby="contributed-title"><div class="evidence-intro"><span class="section-index">02</span><h2 id="contributed-title">Contributed</h2><p>Achievement records and campus reports show the work contributed to your community.</p></div><div>${achievementGroup(contributed, "contribution", state.loading, passportUnavailable)}</div></section>

      <section class="evidence-section" aria-labelledby="improved-title"><div class="evidence-intro"><span class="section-index">03</span><h2 id="improved-title">Improved</h2><p>Verified campus improvements from resolved Campus Pulse initiatives.</p></div><div>${issues.filter((i) => String(i.status).toUpperCase() === "RESOLVED").length ? issueCards(issues.filter((i) => String(i.status).toUpperCase() === "RESOLVED")) : `<div class="empty-state"><span class="empty-mark">${icon("check-circle", 18)}</span><h3>No resolved campus improvements yet</h3><p>When reported issues are verified and marked resolved by the school, they appear here as improvement proof.</p><a class="text-link" href="#campus-pulse">Report or track a campus issue ${icon("arrow-right", 13)}</a></div>`}</div></section>

      ${revoked.length ? `
        <section class="evidence-section" aria-labelledby="revoked-title" style="opacity:0.85;">
          <div class="evidence-intro"><span class="section-index" style="color:#991b1b;border-color:#fecaca;">04</span><h2 id="revoked-title" style="color:#991b1b;">Historical / Revoked</h2><p>Contributions or achievements that have been revoked upon faculty review.</p></div>
          <div>${achievementGroup(revoked, "revoked", state.loading, passportUnavailable)}</div>
        </section>
      ` : ""}
    </section>

    <section class="section-block" aria-labelledby="passport-reports-title"><div class="section-heading"><div><h2 id="passport-reports-title">Campus contributions</h2><p>Reports from your student record, with their actual lifecycle status.</p></div><a class="text-link" href="#campus-pulse">Open Campus Pulse ${icon("arrow-right", 14)}</a></div>${state.resourceErrors.issues ? `<div class="notice notice-warning" role="status"><span>${icon("info", 18)}</span><div><strong>Campus reports could not be loaded.</strong><p>Refresh to try again. The Passport achievement record above remains separate.</p></div></div>` : issueCards(issues)}</section>

    <div class="folio-note"><span class="stamp-icon">${icon("shield", 18)}</span><span>Campus Passport records evidence and verified achievements—not an arbitrary “trust score.” Opportunity eligibility is checked against the backend's stated requirements.</span></div>
  </section>`;
}

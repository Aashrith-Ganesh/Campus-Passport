import { allAchievements } from "../data.js";
import { escapeHtml, formatDate, formatNumber, friendlyError, icon, statusBadge } from "../ui.js";

let eligibilityStudentId = "";
let eligibilityById = Object.create(null);
let eligibilityErrors = Object.create(null);
let pendingChecks = new Set();

function syncEligibilityStudent(studentId) {
  if (eligibilityStudentId === studentId) return;
  eligibilityStudentId = studentId;
  eligibilityById = Object.create(null);
  eligibilityErrors = Object.create(null);
  pendingChecks = new Set();
}

function requirements(item) {
  if (!Array.isArray(item)) return `<p class="field-hint">No additional requirements were returned.</p>`;
  if (!item.length) return `<p class="field-hint">No additional requirements were returned.</p>`;
  return `<ul class="requirement-list">${item.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}</ul>`;
}

function applicationFor(opportunity, state) {
  const applications = Array.isArray(state.applications) ? state.applications : [];
  return applications.find((item) => item.opportunity_id === opportunity.id) || null;
}

function walletEvidenceRecords(state) {
  return allAchievements(state).filter((item) => item.type === "LEARNING" || item.type === "CONTRIBUTION");
}

function passportEvidence(state, records) {
  if (state.resourceErrors.passport) return `<div class="notice notice-warning" role="status"><span>${icon("info", 17)}</span><div><strong>Passport evidence is unavailable.</strong><p>Refresh to retry. No sample achievements are substituted.</p></div></div>`;
  if (state.loading && !state.passport) return `<div class="skeleton" aria-label="Loading Passport evidence"></div>`;
  if (!records.length) return `<div class="empty-state"><span class="empty-mark">${icon("book", 18)}</span><h3>No learning or contribution achievements returned</h3><p>Evidence will appear here only after the Passport API returns a record.</p></div>`;
  return `<div class="wallet-evidence-list">${records.slice(0, 6).map((item) => {
    const kind = item.type === "LEARNING" ? "LEARNED" : "CONTRIBUTED";
    const detail = item.evidence || item.description || "Evidence details were not returned.";
    return `<article class="wallet-evidence-record"><div class="wallet-evidence-record-head"><span class="wallet-evidence-type">${escapeHtml(kind)}</span>${statusBadge("ACTIVE", "VERIFIED")}</div><h3>${escapeHtml(item.title || "Achievement")}</h3><p>${escapeHtml(detail)}</p><small>${escapeHtml(formatDate(item.timestamp))}</small></article>`;
  }).join("")}</div>`;
}

function opportunityCard(opportunity, state) {
  const eligibility = eligibilityById[opportunity.id];
  const error = eligibilityErrors[opportunity.id];
  const application = applicationFor(opportunity, state);
  const applicationHistoryAvailable = Array.isArray(state.applications) && !state.resourceErrors.applications;
  const status = eligibility ? (eligibility.eligible ? statusBadge("ACTIVE", "ELIGIBLE") : statusBadge("", "NOT YET ELIGIBLE"))
    : error ? statusBadge("", "CHECK UNAVAILABLE") : statusBadge("", "CHECKING");
  const amount = formatNumber(opportunity.amount);
  const action = application
    ? `<span class="status-badge status-positive">Application ${escapeHtml(application.application_id)} · ${escapeHtml(application.status)}</span>`
    : `<button class="button ${eligibility?.eligible ? "button-primary" : "button-secondary"} button-small" type="button" data-apply="${escapeHtml(opportunity.id)}" ${eligibility?.eligible && !error && applicationHistoryAvailable ? "" : "disabled"}>${eligibility?.eligible ? applicationHistoryAvailable ? "Apply in simulation" : "Application history unavailable" : "Apply unavailable"} ${icon("arrow-up-right", 13)}</button>`;
  return `<article class="opportunity-card" data-opportunity="${escapeHtml(opportunity.id)}">
    <div class="opportunity-card-top"><div><span class="opportunity-category">${escapeHtml(opportunity.category || "OPPORTUNITY")}</span><h3>${escapeHtml(opportunity.title)}</h3></div><div class="opportunity-amount"><small>CATALOG AMOUNT</small><strong>${amount}</strong></div></div>
    <p class="opportunity-description">${escapeHtml(opportunity.description || "No description was returned.")}</p>
    <div class="eligibility-box"><h4>Eligibility from the backend</h4>${status}
      ${eligibility ? `${eligibility.reasons?.length ? `<p><strong>Requirements met</strong></p>${requirements(eligibility.reasons)}` : ""}${eligibility.missing_requirements?.length ? `<p><strong>Still needed</strong></p>${requirements(eligibility.missing_requirements)}` : ""}${eligibility.eligible ? `<p>Eligible for this listed opportunity. You can submit an application to the hackathon simulation.</p>` : ""}` : error ? `<p>${escapeHtml(friendlyError(error, "Eligibility could not be checked. Refresh to try again."))}</p>` : `<p>Checking the existing learning and contribution requirements…</p>`}
    </div>
    <div class="opportunity-card-actions">${action}<span class="field-hint">${application ? `Status: ${escapeHtml(application.status)}` : "Server confirms any application."}</span></div>
  </article>`;
}

function transactionsMarkup(state) {
  if (state.loading && !Array.isArray(state.transactions)) return `<div class="skeleton" aria-label="Loading transactions"></div>`;
  const transactions = Array.isArray(state.transactions) ? state.transactions : [];
  if (state.resourceErrors.transactions) return `<div class="notice notice-warning" role="status"><span>${icon("info", 16)}</span><div><strong>Ledger unavailable.</strong><p>Refresh to try again.</p></div></div>`;
  if (!transactions.length) return `<p class="field-hint">No ledger transactions were returned for this student.</p>`;
  return `<div class="transaction-list">${transactions.slice(0, 6).map((item) => `<div class="transaction-row"><span><strong>${escapeHtml(item.reason || item.transaction_type || "Ledger activity")}</strong><small>${escapeHtml(item.purpose || "Pocket")} · ${escapeHtml(formatDate(item.created_at))}</small><small>${escapeHtml(item.category || item.source_type || "Student Pocket")}</small></span><span class="transaction-amount">${Number(item.amount) > 0 ? "+" : ""}${formatNumber(item.amount)} units<br />${statusBadge(item.status, item.transaction_type || item.status)}</span></div>`).join("")}</div>`;
}

function cardsMarkup(state) {
  if (state.loading && !Array.isArray(state.cards)) return `<div class="skeleton" aria-label="Loading cards"></div>`;
  if (state.resourceErrors.cards) return `<div class="notice notice-warning" role="status"><span>${icon("info", 16)}</span><div><strong>Card records unavailable.</strong><p>Refresh to try again.</p></div></div>`;
  const cards = Array.isArray(state.cards) ? state.cards : [];
  if (!cards.length) return `<p class="field-hint">No cards were returned for this student.</p>`;
  return `<div class="achievement-list">${cards.map((card) => `<div class="simulated-card"><span><strong>${escapeHtml(card.card_id || "Student Pocket card")}</strong><small>Issued ${escapeHtml(formatDate(card.issued_at))}${card.deactivated_at ? ` · Deactivated ${escapeHtml(formatDate(card.deactivated_at))}` : ""}</small></span>${statusBadge(card.status)}</div>`).join("")}</div>`;
}

function applicationsMarkup(state) {
  if (state.loading && !Array.isArray(state.applications)) return `<div class="skeleton" aria-label="Loading applications"></div>`;
  if (state.resourceErrors.applications) return `<div class="notice notice-warning" role="status"><span>${icon("info", 16)}</span><div><strong>Application records unavailable.</strong><p>Refresh to try again.</p></div></div>`;
  const applications = Array.isArray(state.applications) ? state.applications : [];
  if (!applications.length) return `<p class="field-hint">No applications have been returned for this student.</p>`;
  const titles = new Map((Array.isArray(state.opportunities) ? state.opportunities : []).map((item) => [item.id, item.title]));
  return `<div class="achievement-list">${applications.map((application) => `<div class="simulated-card"><span><strong>${escapeHtml(titles.get(application.opportunity_id) || application.opportunity_id)}</strong><small>Application ${escapeHtml(application.application_id)} · listed amount ${formatNumber(application.amount)} (unit not specified)</small></span>${statusBadge(application.status)}</div>`).join("")}</div>`;
}

/** @param {{state: Record<string, any>}} context */
export function render({ state }) {
  const balance = state.balance;
  const opportunities = Array.isArray(state.opportunities) ? state.opportunities : [];
  const evidenceRecords = walletEvidenceRecords(state);
  const learningEvidence = evidenceRecords.filter((item) => item.type === "LEARNING");
  const contributionEvidence = evidenceRecords.filter((item) => item.type === "CONTRIBUTION");
  const passportUnavailable = !!state.resourceErrors.passport;
  const learningCount = state.loading && !state.passport ? "…" : passportUnavailable ? "—" : formatNumber(learningEvidence.length);
  const contributionCount = state.loading && !state.passport ? "…" : passportUnavailable ? "—" : formatNumber(contributionEvidence.length);
  const verifiedCount = state.loading && !state.passport ? "…" : passportUnavailable ? "—" : formatNumber(evidenceRecords.length);
  const applied = Array.isArray(state.applications) ? state.applications.length : 0;
  const balanceError = !!state.resourceErrors.balance;
  const opportunitiesLoading = state.loading && !Array.isArray(state.opportunities);
  return `<section class="page wallet-page">
    <header class="page-head"><div><p class="page-kicker"><span class="kicker-dot"></span>UNLOCK · OPPORTUNITY WALLET</p><h1 class="page-title">A next step, grounded in your work.</h1><p class="page-lead">See the real Student Pocket ledger, explore the current opportunity catalog, and check eligibility against verified achievements.</p></div></header>

    <div class="notice notice-warning" role="note"><span>${icon("info", 17)}</span><div><strong>Hackathon simulation — not real lending or credit.</strong><p>Student Pocket balances are point-like units from the existing demo ledger. Opportunity application amounts are returned by the catalog; the API does not specify a currency or unit.</p></div></div>

    <section class="section-block" aria-labelledby="wallet-balance-title"><div class="section-heading"><div><h2 id="wallet-balance-title">Student Pocket</h2><p>Values are fetched from the existing student balance endpoint.</p></div>${balanceError ? statusBadge("", "UNAVAILABLE") : statusBadge("ACTIVE", "SIMULATED BALANCE")}</div>
      ${state.loading && !balance && !balanceError ? `<div class="skeleton" aria-label="Loading balance"></div>` : balanceError ? `<div class="notice notice-error" role="status"><span>${icon("info", 17)}</span><div><strong>Balance could not be loaded.</strong><p>No sample balance is substituted.</p></div></div>` : balance ? `<div class="wallet-summary"><div class="balance-main"><small>TOTAL BALANCE · POCKET UNITS</small><strong>${formatNumber(balance.total_balance)}</strong><p>Student Pocket demonstration record</p></div><div class="balance-breakdown"><small>Academic balance</small><strong>${formatNumber(balance.academic_balance)}</strong><span>point-like units</span></div><div class="balance-breakdown"><small>Campus balance</small><strong>${formatNumber(balance.campus_balance)}</strong><span>${formatNumber(balance.available_campus_spending_balance)} units available to spend</span></div></div><p class="simulation-note"><span>${icon("shield", 15)}</span><span>The backend also returns a negative limit of ${formatNumber(balance.effective_negative_limit)} units. These values are demo-ledger balances—not money, credit, or a credit score.</span></p>` : `<div class="empty-state"><h3>Balance not available</h3><p>Refresh to load the Student Pocket balance from the API.</p></div>`}
    </section>

    <section class="section-block" aria-labelledby="opportunity-list-title"><div class="section-heading"><div><h2 id="opportunity-list-title">Opportunities to explore</h2><p>Eligibility and missing requirements come from the existing API.</p></div>${state.resourceErrors.opportunities ? statusBadge("", "CATALOG UNAVAILABLE") : statusBadge("ACTIVE", `${formatNumber(opportunities.length)} LISTED`)}</div>
      <div class="simulation-note"><span>${icon("info", 15)}</span><span>The current eligibility service checks verified learning and contribution evidence. Campus impact metrics are not part of its requirements today.</span></div>
      ${state.resourceErrors.opportunities ? `<div class="notice notice-error" role="status" style="margin-top:12px"><span>${icon("info", 17)}</span><div><strong>Opportunity catalog could not be loaded.</strong><p>No placeholder opportunities are shown.</p></div></div>` : opportunitiesLoading ? `<div class="skeleton" style="margin-top:12px" aria-label="Loading opportunity catalog"></div>` : opportunities.length ? `<div class="opportunity-grid" style="margin-top:12px">${opportunities.map((item) => opportunityCard(item, state)).join("")}</div>` : `<div class="empty-state center" style="margin-top:12px"><span class="empty-mark">${icon("wallet", 18)}</span><h3>No opportunities returned</h3><p>The API did not return any catalog items. No opportunities have been invented.</p></div>`}
    </section>

    <section class="section-block" aria-labelledby="evidence-eligibility-title"><div class="section-heading"><div><h2 id="evidence-eligibility-title">What makes an opportunity possible</h2><p>Eligibility stays explainable and tied to returned evidence.</p></div></div>
      <div class="wallet-evidence-flow" aria-label="Learning and contribution evidence, unconnected impact evidence, verified Passport achievements, and opportunity eligibility">
        <div class="wallet-evidence-inputs">
          <div class="wallet-evidence-source"><span class="node-mark">${icon("book", 14)}</span><span><small>LEARNING</small><strong>${learningCount} verified records</strong></span></div>
          <div class="wallet-evidence-source"><span class="node-mark">${icon("pulse", 14)}</span><span><small>CONTRIBUTION</small><strong>${contributionCount} verified records</strong></span></div>
          <div class="wallet-evidence-source wallet-evidence-source-unavailable"><span class="node-mark">${icon("leaf", 14)}</span><span><small>IMPACT</small><strong>Not connected</strong></span></div>
        </div>
        <div class="wallet-evidence-result"><div><small>VERIFIED ACHIEVEMENTS IN YOUR PASSPORT</small><strong>${verifiedCount} returned records</strong></div><span class="connection-operator" aria-hidden="true">→</span><div><small>OPPORTUNITY ELIGIBILITY</small><strong>Live backend requirements</strong></div></div>
        <p class="wallet-impact-note">The current eligibility API evaluates verified learning and contribution evidence. Impact metrics are not connected and are not part of today's eligibility check.</p>
      </div>
      <div class="wallet-passport-evidence"><div class="section-heading"><div><h3>Evidence in your Passport</h3><p>Actual learning and contribution achievements returned by the backend.</p></div><a class="text-link" href="#passport">Open Passport ${icon("arrow-right", 14)}</a></div>${passportEvidence(state, evidenceRecords)}</div>
    </section>

    <section class="section-block content-grid" aria-label="Student Pocket activity and cards">
      <div><div class="section-heading"><div><h2>Recent transactions</h2><p>Actual ledger rows, shown as units.</p></div></div><div class="card card-pad">${transactionsMarkup(state)}</div></div>
      <div><div class="section-heading"><div><h2>Cards and applications</h2><p>${formatNumber(applied)} application${applied === 1 ? "" : "s"} returned.</p></div></div><div class="card card-pad"><span class="card-label">STUDENT POCKET CARDS</span>${cardsMarkup(state)}<div class="hero-divider" style="margin:14px 0"></div><span class="card-label">OPPORTUNITY APPLICATIONS</span>${applicationsMarkup(state)}</div></div>
    </section>
    <p class="form-footnote">For privacy, card UID and token fields returned by the backend are never displayed. Applications are simulated records only; no real money moves.</p>
  </section>`;
}

export function mount(root, context) {
  const studentId = context.state.studentId;
  syncEligibilityStudent(studentId);
  let active = true;
  const opportunities = Array.isArray(context.state.opportunities) ? context.state.opportunities : [];
  for (const opportunity of opportunities) {
    if (!opportunity?.id || eligibilityById[opportunity.id] || pendingChecks.has(opportunity.id)) continue;
    pendingChecks.add(opportunity.id);
    const path = `/api/student/${encodeURIComponent(studentId)}/opportunities/${encodeURIComponent(opportunity.id)}/eligibility`;
    context.api.get(path).then((result) => {
      eligibilityById[opportunity.id] = result;
      delete eligibilityErrors[opportunity.id];
    }).catch((error) => {
      eligibilityErrors[opportunity.id] = error;
    }).finally(() => {
      pendingChecks.delete(opportunity.id);
      if (active) context.render();
    });
  }

  root.querySelectorAll("[data-apply]").forEach((button) => {
    button.addEventListener("click", async () => {
      const opportunityId = button.dataset.apply;
      const eligibility = eligibilityById[opportunityId];
      if (!eligibility?.eligible) return;
      button.disabled = true;
      button.textContent = "Saving application…";
      try {
        const path = `/api/student/${encodeURIComponent(studentId)}/opportunities/${encodeURIComponent(opportunityId)}/apply`;
        const response = await context.api.post(path);
        if (!response?.application_id || !response?.opportunity_id) throw new Error("The application service did not return a saved application.");
        context.notify(`Application ${response.application_id} was saved in the simulation.`, "success");
        await context.refreshData();
      } catch (error) {
        context.notify(friendlyError(error, "The simulated application was not confirmed. Check eligibility and try again."), "error");
        button.disabled = false;
        button.innerHTML = `Apply in simulation ${icon("arrow-up-right", 13)}`;
      }
    });
  });
  return () => { active = false; };
}

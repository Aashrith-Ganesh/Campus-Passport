import { escapeHtml, formatNumber, formatDate, icon, statusBadge, friendlyError, pluralize } from "../ui.js";
import { store } from "../store.js";

/**
 * Campus Pulse — Teacher Review Queue, Evidence Audit & Revocation Desk
 * Allows teachers and admins to inspect student issues and evidence, receive AI suggestions,
 * decide final point awards, and revoke approvals with compensating ledger reversals.
 * Role Guard: TEACHER, ADMIN.
 */

let reviewState = {
  filter: "PENDING", // PENDING | VERIFIED | REVOKED | ALL
  selectedIssueId: null,
  activeIssue: null,
  aiRecommendation: null,
  aiLoading: false,
  submitting: false,
  showRevokeModal: false,
  revokeSubmitting: false,
  error: null,
};

export function render({ state }) {
  const allIssues = Array.isArray(state.issues) ? state.issues : [];
  const pendingIssues = allIssues.filter((i) => ["SUBMITTED", "UNDER_REVIEW"].includes(String(i.status || "").toUpperCase()));
  const verifiedIssues = allIssues.filter((i) => ["VERIFIED", "RESOLVED"].includes(String(i.status || "").toUpperCase()));
  const revokedIssues = allIssues.filter((i) => String(i.status || "").toUpperCase() === "REVOKED");

  let displayedIssues = allIssues;
  if (reviewState.filter === "PENDING") displayedIssues = pendingIssues;
  else if (reviewState.filter === "VERIFIED") displayedIssues = verifiedIssues;
  else if (reviewState.filter === "REVOKED") displayedIssues = revokedIssues;

  const activeIssue = reviewState.activeIssue;
  const ai = reviewState.aiRecommendation;

  const evidenceItems = activeIssue && Array.isArray(activeIssue.evidence_items) ? activeIssue.evidence_items : [];
  const photos = evidenceItems.filter((e) => e.evidence_type === "PHOTO");
  const notes = evidenceItems.filter((e) => e.evidence_type !== "PHOTO");
  const interviews = activeIssue && Array.isArray(activeIssue.interviews) ? activeIssue.interviews : [];
  const reviews = activeIssue && Array.isArray(activeIssue.reviews) ? activeIssue.reviews : [];

  const isRevoked = activeIssue && String(activeIssue.status || "").toUpperCase() === "REVOKED";
  const isVerified = activeIssue && ["VERIFIED", "RESOLVED"].includes(String(activeIssue.status || "").toUpperCase());

  return `
    <section class="page teacher-pulse-page">
      <header class="page-head">
        <div>
          <p class="page-kicker"><span class="kicker-dot"></span>CAMPUS PULSE &bull; TEACHER AUDIT &amp; REVIEW</p>
          <h1 class="page-title">Campus Pulse Review Queue</h1>
          <p class="page-lead">Inspect student-submitted problem reports and actual evidence. AI provides advisory point recommendations; the educator decides the final reward or revokes approval if warranted.</p>
        </div>
        <div class="page-head-action">
          <span class="status-badge status-progress">
            ${icon("shield", 14)} ${pendingIssues.length} Pending Review
          </span>
        </div>
      </header>

      <!-- Review Filter Bar -->
      <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:20px;flex-wrap:wrap;">
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="button ${reviewState.filter === "PENDING" ? "button-primary" : "button-quiet"} button-small pulse-filter-btn" type="button" data-filter="PENDING">
            Pending Review (${pendingIssues.length})
          </button>
          <button class="button ${reviewState.filter === "VERIFIED" ? "button-primary" : "button-quiet"} button-small pulse-filter-btn" type="button" data-filter="VERIFIED">
            Verified &amp; Resolved (${verifiedIssues.length})
          </button>
          <button class="button ${reviewState.filter === "REVOKED" ? "button-primary" : "button-quiet"} button-small pulse-filter-btn" type="button" data-filter="REVOKED">
            Revoked Archive (${revokedIssues.length})
          </button>
          <button class="button ${reviewState.filter === "ALL" ? "button-primary" : "button-quiet"} button-small pulse-filter-btn" type="button" data-filter="ALL">
            All Submissions (${allIssues.length})
          </button>
        </div>
        <span class="field-hint">Showing ${displayedIssues.length} of ${pluralize(allIssues.length, "report")}</span>
      </div>

      <div class="pulse-review-layout" style="display:grid;grid-template-columns:1fr;gap:24px;">
        
        <!-- Issue Queue Table -->
        <section class="card card-pad" aria-labelledby="queue-table-title">
          <div class="card-header">
            <div>
              <span class="card-label">SUBMISSION QUEUE</span>
              <h2 id="queue-table-title">Student Campus Reports</h2>
              <p>Select any issue to inspect attached evidence and assign authoritative points.</p>
            </div>
          </div>

          ${displayedIssues.length ? `
            <div class="table-wrap" style="margin-top:16px;">
              <table class="data-table" aria-label="Campus Pulse Review Queue">
                <thead>
                  <tr>
                    <th>Reported</th>
                    <th>Issue Title</th>
                    <th>Student</th>
                    <th>Category</th>
                    <th>Evidence Items</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${displayedIssues.map((issue) => {
                    const intvs = Array.isArray(issue.interviews) ? issue.interviews.length : 0;
                    const evs = Array.isArray(issue.evidence_items) ? issue.evidence_items.length : 0;
                    const isSelected = activeIssue && activeIssue.id === issue.id;
                    return `
                      <tr style="${isSelected ? "background:rgba(36,77,229,0.05);" : ""}">
                        <td><small>${escapeHtml(formatDate(issue.created_at))}</small></td>
                        <td>
                          <strong>${escapeHtml(issue.title)}</strong>
                          ${issue.location ? `<div style="font-size:11px;color:var(--muted);">${icon("pin", 11)} ${escapeHtml(issue.location)}</div>` : ""}
                        </td>
                        <td><code>${escapeHtml(issue.student_id)}</code></td>
                        <td>${escapeHtml(issue.category || "General")}</td>
                        <td>
                          <span class="sp-chip" style="font-size:11px;">
                            ${evs} file/note${evs === 1 ? "" : "s"} &bull; ${intvs} intv${intvs === 1 ? "" : "s"}
                          </span>
                        </td>
                        <td>${statusBadge(issue.status)}</td>
                        <td>
                          <button class="button ${isSelected ? "button-primary" : "button-secondary"} button-small btn-inspect-issue" type="button" data-id="${escapeHtml(issue.id)}">
                            ${isSelected ? "Inspecting" : "Inspect &amp; Review"} ${icon("arrow-right", 12)}
                          </button>
                        </td>
                      </tr>
                    `;
                  }).join("")}
                </tbody>
              </table>
            </div>
          ` : `
            <div class="empty-state">
              <span class="empty-mark">${icon("check-circle", 20)}</span>
              <h3>No reports in this category</h3>
              <p>There are no student issues matching the selected review filter.</p>
            </div>
          `}
        </section>

        <!-- Inspection & Decision Drawer (When issue is selected) -->
        ${activeIssue ? `
          <section class="card card-pad" id="review-inspector" aria-labelledby="inspector-detail-title" style="border:2px solid ${isRevoked ? "#ef4444" : "var(--cobalt);"}">
            <div class="card-header">
              <div>
                <span class="card-label">EDUCATOR EVIDENCE AUDIT &bull; DECISION DESK</span>
                <h2 id="inspector-detail-title">${escapeHtml(activeIssue.title)}</h2>
                <p>Reported by <code>${escapeHtml(activeIssue.student_id)}</code> &bull; Location: ${escapeHtml(activeIssue.location || "Not specified")} &bull; Status: ${statusBadge(activeIssue.status)}</p>
              </div>
              <button class="button button-quiet button-small" id="btn-close-inspector" type="button">Close Inspection &times;</button>
            </div>

            <!-- Problem Description -->
            <div style="margin:16px 0;padding:14px;background:var(--paper-light);border-radius:8px;">
              <span style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;">Problem Description</span>
              <p style="margin:4px 0 0;font-size:14px;color:var(--ink);line-height:1.6;">
                ${escapeHtml(activeIssue.description || "No description provided.")}
              </p>
            </div>

            <!-- SECTION A: STUDENT-PROVIDED EVIDENCE -->
            <div style="margin-bottom:24px;border:1px solid var(--border);border-radius:10px;padding:16px;background:#ffffff;">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;border-bottom:1px solid var(--border);padding-bottom:8px;">
                <h3 style="font-size:14px;font-weight:800;margin:0;color:var(--ink);display:flex;align-items:center;gap:6px;">
                  ${icon("file", 15)} Student-Provided Evidence
                </h3>
                <span class="field-hint" style="font-size:11px;">Authoritative attachments from student</span>
              </div>

              ${!photos.length && !notes.length && !interviews.length ? `
                <div class="empty-state" style="padding:16px;">
                  <p style="margin:0;font-size:13px;color:var(--muted);font-style:italic;">No evidence provided yet.</p>
                </div>
              ` : `
                <!-- Photos -->
                ${photos.length ? `
                  <div style="margin-bottom:14px;">
                    <strong style="font-size:12px;color:var(--ink-light);display:block;margin-bottom:6px;">Attached Photographs:</strong>
                    <div style="display:flex;gap:12px;flex-wrap:wrap;">
                      ${photos.map((p) => `
                        <div style="border:1px solid var(--border);border-radius:6px;padding:8px;background:var(--paper-light);display:flex;align-items:center;gap:10px;">
                          <a href="${escapeHtml(p.file_path)}" target="_blank" rel="noopener" style="font-size:12px;font-weight:700;color:var(--cobalt);text-decoration:none;display:flex;align-items:center;gap:6px;">
                            ${icon("camera", 14)} ${escapeHtml(p.file_name || p.title || "Evidence Photo")}
                          </a>
                          <span style="font-size:10px;color:var(--muted);">${p.file_size ? `${Math.round(p.file_size / 1024)} KB` : ""}</span>
                        </div>
                      `).join("")}
                    </div>
                  </div>
                ` : ""}

                <!-- Observation Notes -->
                ${notes.length ? `
                  <div style="margin-bottom:14px;">
                    <strong style="font-size:12px;color:var(--ink-light);display:block;margin-bottom:6px;">Observation Notes:</strong>
                    <div style="display:flex;flex-direction:column;gap:6px;">
                      ${notes.map((n) => `
                        <div style="border:1px solid var(--border);border-radius:6px;padding:10px;background:var(--paper-light);font-size:13px;">
                          ${n.title ? `<strong style="font-size:11px;color:var(--muted);display:block;margin-bottom:2px;">${escapeHtml(n.title)}</strong>` : ""}
                          ${escapeHtml(n.content)}
                        </div>
                      `).join("")}
                    </div>
                  </div>
                ` : ""}

                <!-- Stakeholder Interviews -->
                ${interviews.length ? `
                  <div>
                    <strong style="font-size:12px;color:var(--ink-light);display:block;margin-bottom:6px;">Stakeholder Research Interviews (${interviews.length}):</strong>
                    <div style="display:flex;flex-direction:column;gap:8px;">
                      ${interviews.map((intv) => `
                        <div style="border:1px solid var(--border);border-radius:6px;padding:10px;background:var(--paper-light);">
                          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
                            <strong style="font-size:12px;">${escapeHtml(intv.participant_name)}</strong>
                            <span class="status-badge" style="font-size:10px;">${escapeHtml(intv.participant_type)}</span>
                          </div>
                          <p style="margin:0;font-size:13px;color:var(--ink-light);line-height:1.5;">
                            &ldquo;${escapeHtml(intv.response)}&rdquo;
                          </p>
                        </div>
                      `).join("")}
                    </div>
                  </div>
                ` : ""}
              `}
            </div>

            <!-- SECTION B: PREVIOUS REVIEW DECISIONS / AUDIT HISTORY -->
            ${reviews.length ? `
              <div style="margin-bottom:24px;border:1px solid var(--border);border-radius:10px;padding:16px;background:var(--paper-light);">
                <h3 style="font-size:13px;font-weight:800;margin:0 0 10px;color:var(--muted);text-transform:uppercase;">Review Audit History</h3>
                <div style="display:flex;flex-direction:column;gap:8px;">
                  ${reviews.map((rev) => `
                    <div style="border:1px solid var(--border);border-radius:6px;padding:10px;background:#ffffff;font-size:12px;">
                      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
                        <div>
                          <strong>${escapeHtml(rev.decision)}</strong> by <span>${escapeHtml(rev.reviewer_name)} (${escapeHtml(rev.reviewer_role)})</span>
                        </div>
                        <span style="color:var(--muted);">${escapeHtml(formatDate(rev.created_at))}</span>
                      </div>
                      <p style="margin:2px 0 0;color:var(--ink);"><em>Notes:</em> ${escapeHtml(rev.notes)}</p>
                      ${rev.points_awarded !== 0 ? `<div style="margin-top:4px;font-weight:700;color:${rev.points_awarded > 0 ? "var(--green)" : "#b91c1c"};">${rev.points_awarded > 0 ? `+${rev.points_awarded}` : rev.points_awarded} points recorded in ledger</div>` : ""}
                    </div>
                  `).join("")}
                </div>
              </div>
            ` : ""}

            ${isRevoked ? `
              <!-- Revoked Banner -->
              <div style="margin-bottom:24px;border:1px solid #fecaca;background:#fee2e2;border-radius:10px;padding:16px;color:#991b1b;">
                <div style="display:flex;align-items:center;gap:8px;">
                  ${icon("alert-triangle", 18)} <strong style="font-size:15px;">Approval Revoked</strong>
                </div>
                <p style="margin:8px 0 0;font-size:13px;line-height:1.5;">
                  This contribution was previously verified and has been revoked upon educator review. Any awarded merit points were reversed in the central ledger. AI evaluation and re-award are deactivated.
                </p>
              </div>
            ` : `
              <!-- AI Recommendation Assistant Section -->
              <div style="margin-bottom:24px;border:1px solid rgba(36,77,229,0.2);background:rgba(36,77,229,0.03);border-radius:12px;padding:18px;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                  <div style="display:flex;align-items:center;gap:8px;">
                    <span class="status-badge status-progress" style="font-size:11px;">AI ADVISORY ONLY</span>
                    <strong style="font-size:14px;color:var(--cobalt);">Evidence Evaluation Assistant</strong>
                  </div>
                  <button class="button button-secondary button-small" id="btn-fetch-ai-rec" type="button" ${reviewState.aiLoading ? "disabled" : ""}>
                    ${reviewState.aiLoading ? "Analyzing Evidence…" : `${icon("refresh", 12)} Re-analyze Evidence with AI`}
                  </button>
                </div>

                ${reviewState.aiLoading ? `
                  <div class="skeleton" style="height:60px;" aria-label="AI analyzing evidence"></div>
                ` : ai && ai.available ? `
                  <div>
                    <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:6px;">
                      <span style="font-size:13px;color:var(--muted);">Recommended Point Reward:</span>
                      <strong style="font-size:22px;color:var(--cobalt);">+${formatNumber(ai.suggested_points)} points</strong>
                      <span class="status-badge status-positive" style="font-size:10px;">CONFIDENCE: ${escapeHtml(ai.confidence || "MEDIUM")}</span>
                    </div>
                    <p style="font-size:13px;color:var(--ink);line-height:1.5;margin-bottom:12px;">
                      <em>Rationale:</em> ${escapeHtml(ai.reasoning)}
                    </p>
                    <button class="button button-quiet button-small" id="btn-apply-ai-points" type="button" data-points="${ai.suggested_points}">
                      Apply AI Suggested Value (${ai.suggested_points} pts) &darr;
                    </button>
                  </div>
                ` : ai && !ai.available ? `
                  <div style="font-size:13px;color:var(--muted);line-height:1.5;">
                    <span>${icon("info", 14)}</span>
                    ${escapeHtml(ai.reasoning || "AI recommendation assistant is offline. Please evaluate evidence manually.")}
                  </div>
                ` : `
                  <p style="font-size:13px;color:var(--muted);margin:0;">
                    Click &ldquo;Re-analyze Evidence with AI&rdquo; to query the advisory assistant.
                  </p>
                `}
              </div>

              <!-- Teacher Determination & Point Allocation Form -->
              <form id="teacher-decision-form" novalidate style="border:1px solid var(--border);border-radius:10px;padding:18px;background:#ffffff;">
                <h3 style="font-size:15px;font-weight:800;margin:0 0 14px;color:var(--ink);">Educator Determination &amp; Point Allocation</h3>
                
                <div class="form-grid">
                  <div class="field">
                    <label for="decision-points">Final Points Awarded <span aria-hidden="true">*</span></label>
                    <input class="input" id="decision-points" name="points" type="number" min="0" max="100" value="${ai && ai.suggested_points ? ai.suggested_points : "20"}" required />
                    <span class="field-hint">Campus Problem Report guideline: 10–30 points.</span>
                  </div>

                  <div class="field">
                    <label for="decision-status">Review Outcome <span aria-hidden="true">*</span></label>
                    <select class="select" id="decision-status" name="status">
                      <option value="VERIFIED" selected>Verify Issue (Evidence Verified, Under Active Remedy)</option>
                      <option value="RESOLVED">Resolve Issue (Remedy Completed &amp; Documented)</option>
                    </select>
                    <span class="field-hint">Updates the status badge on the student's passport.</span>
                  </div>

                  <div class="field field-full">
                    <label for="decision-notes">Teacher Evaluation Notes &amp; Justification <span aria-hidden="true">*</span></label>
                    <textarea class="textarea" id="decision-notes" name="notes" rows="3" required placeholder="Describe your evaluation of the student's evidence (e.g. Verified with facility caretaker; photo evidence authentic; maintenance notified)."></textarea>
                  </div>
                </div>

                <div id="teacher-decision-error" class="field-error" style="margin-top:8px;" role="alert"></div>

                <div class="form-actions" style="margin-top:16px;">
                  <button class="button button-primary" id="btn-commit-decision" type="submit" ${reviewState.submitting ? "disabled" : ""}>
                    ${reviewState.submitting ? "Recording Decision…" : `Commit Teacher Decision &amp; Award Points ${icon("arrow-right", 14)}`}
                  </button>
                </div>
              </form>

              <!-- Revocation Action Panel (Separate & Distinct from Approval) -->
              ${isVerified ? `
                <div style="margin-top:28px;padding:16px;border:1px solid #fecaca;border-radius:10px;background:rgba(239,68,68,0.03);">
                  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
                    <div>
                      <h4 style="margin:0;color:#b91c1c;font-size:14px;font-weight:700;">Revoke Approval &amp; Reverse Reward</h4>
                      <p style="margin:4px 0 0;font-size:12px;color:var(--muted);">If newly discovered facts invalidate this report, faculty may revoke the approval and reverse awarded points.</p>
                    </div>
                    <button class="button button-small" id="btn-open-revoke-modal" type="button" style="background:#dc2626;color:#ffffff;border:none;">
                      Revoke Approval…
                    </button>
                  </div>
                </div>
              ` : ""}
            `}
          </section>
        ` : ""}
      </div>

      <!-- Revocation Confirmation Modal (Section 10 Requirement) -->
      ${reviewState.showRevokeModal && activeIssue ? `
        <div class="modal-overlay" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px;">
          <div class="modal-card" style="background:#ffffff;border-radius:12px;max-width:480px;width:100%;padding:24px;border:1px solid var(--border);box-shadow:0 12px 36px rgba(0,0,0,0.18);">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
              <span style="display:grid;place-items:center;width:32px;height:32px;border-radius:50%;background:#fee2e2;color:#dc2626;">
                ${icon("alert-triangle", 18)}
              </span>
              <h3 style="margin:0;font-size:17px;font-weight:800;color:var(--ink);">Revoke approval?</h3>
            </div>
            
            <p style="margin:0 0 16px;font-size:13px;color:var(--ink-light);line-height:1.5;">
              This will mark the contribution as <strong>REVOKED</strong> and reverse any reward associated with this approval in the central ledger.
            </p>

            <form id="revoke-confirm-form" novalidate>
              <div class="field" style="margin-bottom:16px;">
                <label for="revoke-reason-input" style="font-size:12px;font-weight:700;">Reason for Revocation <span aria-hidden="true">*</span></label>
                <textarea class="textarea" id="revoke-reason-input" name="revoke_reason" rows="3" required placeholder="Describe why this approval is being revoked (e.g. Evidence could not be verified on site inspection)."></textarea>
                <span class="field-hint">A reason must be recorded for audit trail purposes.</span>
              </div>

              <div id="revoke-modal-error" class="field-error" style="margin-bottom:12px;" role="alert"></div>

              <div style="display:flex;justify-content:flex-end;gap:10px;">
                <button class="button button-quiet button-small" id="btn-cancel-revoke" type="button" ${reviewState.revokeSubmitting ? "disabled" : ""}>
                  Cancel
                </button>
                <button class="button button-small" id="btn-confirm-revoke" type="submit" style="background:#dc2626;color:#ffffff;border:none;" ${reviewState.revokeSubmitting ? "disabled" : ""}>
                  ${reviewState.revokeSubmitting ? "Revoking…" : "Revoke Approval"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ` : ""}
    </section>
  `;
}

async function loadIssueDetails(issueId, context) {
  try {
    const issue = await context.api.get(`/api/campus-pulse/issues/${encodeURIComponent(issueId)}`);
    reviewState.activeIssue = issue;
    reviewState.selectedIssueId = issueId;
    reviewState.aiRecommendation = null;
    reviewState.showRevokeModal = false;
    context.render();

    // Scroll to inspector
    setTimeout(() => {
      document.getElementById("review-inspector")?.scrollIntoView({ behavior: "smooth" });
    }, 50);

    // Auto-fetch AI recommendation if not revoked
    if (String(issue.status || "").toUpperCase() !== "REVOKED") {
      await fetchAIRecommendation(issueId, context);
    }
  } catch (err) {
    context.notify(err.message || "Failed to load issue details", "error");
  }
}

async function fetchAIRecommendation(issueId, context) {
  reviewState.aiLoading = true;
  context.render();
  try {
    const rec = await context.api.get(`/api/campus-pulse/issues/${encodeURIComponent(issueId)}/ai-recommendation`);
    reviewState.aiRecommendation = rec;
  } catch {
    reviewState.aiRecommendation = {
      available: false,
      reasoning: "AI advisory assistant could not be reached. You may assign points manually.",
    };
  } finally {
    reviewState.aiLoading = false;
    context.render();
  }
}

export function mount(root, context) {
  const controller = new AbortController();
  const { signal } = controller;

  // Filter buttons
  root.querySelectorAll(".pulse-filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      reviewState.filter = btn.dataset.filter;
      context.render();
    }, { signal });
  });

  // Inspect buttons
  root.querySelectorAll(".btn-inspect-issue").forEach((btn) => {
    btn.addEventListener("click", () => {
      loadIssueDetails(btn.dataset.id, context);
    }, { signal });
  });

  // Close inspector
  root.querySelector("#btn-close-inspector")?.addEventListener("click", () => {
    reviewState.activeIssue = null;
    reviewState.selectedIssueId = null;
    reviewState.showRevokeModal = false;
    context.render();
  }, { signal });

  // AI refresh
  root.querySelector("#btn-fetch-ai-rec")?.addEventListener("click", () => {
    if (reviewState.selectedIssueId) {
      fetchAIRecommendation(reviewState.selectedIssueId, context);
    }
  }, { signal });

  // Apply AI points button
  root.querySelector("#btn-apply-ai-points")?.addEventListener("click", (e) => {
    const points = e.currentTarget.dataset.points;
    const input = root.querySelector("#decision-points");
    if (input && points) {
      input.value = points;
      context.notify(`Applied AI recommendation: ${points} points`, "info");
    }
  }, { signal });

  // Decision Form submit
  const form = root.querySelector("#teacher-decision-form");
  const errorTarget = root.querySelector("#teacher-decision-error");
  const commitBtn = root.querySelector("#btn-commit-decision");

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (errorTarget) errorTarget.textContent = "";

    const formData = new FormData(form);
    const points = parseInt(formData.get("points"), 10);
    const status = formData.get("status") || "VERIFIED";
    const notes = String(formData.get("notes") || "").trim();

    if (isNaN(points) || points < 0) {
      if (errorTarget) errorTarget.textContent = "Please enter a valid points value (0 or greater).";
      return;
    }

    if (!notes) {
      if (errorTarget) errorTarget.textContent = "Please write review notes documenting your determination.";
      return;
    }

    reviewState.submitting = true;
    if (commitBtn) commitBtn.disabled = true;

    try {
      const teacherName = store.currentUser?.name || "Priya Sharma (Faculty)";
      await context.api.postJSON(`/api/campus-pulse/issues/${encodeURIComponent(reviewState.selectedIssueId)}/review`, {
        points,
        status,
        notes,
        teacher_name: teacherName,
      });

      context.notify(`Decision recorded! +${points} points allocated to student ${reviewState.activeIssue.student_id}.`, "success");
      reviewState.activeIssue = null;
      reviewState.selectedIssueId = null;
      await context.refreshData();
    } catch (err) {
      if (errorTarget) errorTarget.textContent = friendlyError(err, "Failed to record teacher decision.");
    } finally {
      reviewState.submitting = false;
      context.render();
    }
  }, { signal });

  // Open Revocation Modal Button
  root.querySelector("#btn-open-revoke-modal")?.addEventListener("click", () => {
    reviewState.showRevokeModal = true;
    context.render();
  }, { signal });

  // Cancel Revocation
  root.querySelector("#btn-cancel-revoke")?.addEventListener("click", () => {
    reviewState.showRevokeModal = false;
    context.render();
  }, { signal });

  // Confirm Revocation Form Submit
  const revokeForm = root.querySelector("#revoke-confirm-form");
  const revokeError = root.querySelector("#revoke-modal-error");
  const confirmRevokeBtn = root.querySelector("#btn-confirm-revoke");

  revokeForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (revokeError) revokeError.textContent = "";

    const formData = new FormData(revokeForm);
    const reason = String(formData.get("revoke_reason") || "").trim();

    if (!reason) {
      if (revokeError) revokeError.textContent = "Please enter a reason for revoking approval.";
      return;
    }

    reviewState.revokeSubmitting = true;
    if (confirmRevokeBtn) confirmRevokeBtn.disabled = true;

    try {
      const teacherName = store.currentUser?.name || "Priya Sharma (Faculty)";
      const res = await context.api.postJSON(`/api/campus-pulse/issues/${encodeURIComponent(reviewState.selectedIssueId)}/revoke`, {
        reason,
        revoked_by: teacherName,
      });

      context.notify(`Approval revoked! -${res.points_reversed || 0} points reversed in student pocket.`, "success");
      reviewState.showRevokeModal = false;
      reviewState.activeIssue = null;
      reviewState.selectedIssueId = null;
      await context.refreshData();
    } catch (err) {
      if (revokeError) revokeError.textContent = friendlyError(err, "Failed to revoke approval.");
    } finally {
      reviewState.revokeSubmitting = false;
      context.render();
    }
  }, { signal });

  return () => controller.abort();
}

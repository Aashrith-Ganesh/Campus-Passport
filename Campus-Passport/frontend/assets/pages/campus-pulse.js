import { issuesForStudent } from "../data.js";
import { escapeHtml, formatDate, icon, friendlyError, pluralize, statusBadge } from "../ui.js";

function lifecycle(issue) {
  const status = String(issue.status || "").toUpperCase();
  if (status === "REVOKED") {
    return `<div class="issue-timeline" aria-label="Issue lifecycle: reported, revoked">
      <span class="timeline-step is-done">Reported (Queue)</span>
      <span class="timeline-step is-done" style="background:#fee2e2;border-color:#fecaca;color:#991b1b;">Approval Revoked</span>
    </div>`;
  }
  const verified = ["VERIFIED", "IN_PROGRESS", "RESOLVED"].includes(status);
  const resolved = status === "RESOLVED";
  const review = status === "UNDER_REVIEW";
  return `<div class="issue-timeline" aria-label="Issue lifecycle: reported, verified, resolved">
    <span class="timeline-step is-done">Reported (Queue)</span>
    <span class="timeline-step ${verified ? "is-done" : review ? "is-current" : ""}">${review ? "Under review" : "Verified by Teacher"}</span>
    <span class="timeline-step ${resolved ? "is-done" : verified && !resolved ? "is-current" : ""}">Resolved</span>
  </div>`;
}

function issueCard(issue) {
  const interviewCount = Array.isArray(issue.interviews) ? issue.interviews.length : 0;
  const evidenceItems = Array.isArray(issue.evidence_items) ? issue.evidence_items : [];
  const photos = evidenceItems.filter((e) => e.evidence_type === "PHOTO");
  const notes = evidenceItems.filter((e) => e.evidence_type !== "PHOTO");
  const reviews = Array.isArray(issue.reviews) ? issue.reviews : [];
  const revocationLog = reviews.find((r) => r.decision === "REVOKED");

  const status = String(issue.status || "").toUpperCase();
  const isRevoked = status === "REVOKED";
  const isPending = status === "SUBMITTED";
  const isVerified = status === "VERIFIED" || status === "RESOLVED";

  const hasAnyEvidence = photos.length > 0 || notes.length > 0 || interviewCount > 0;

  return `<article class="issue-card ${isRevoked ? "is-revoked" : ""}" data-issue-id="${escapeHtml(issue.id)}">
    <div class="issue-card-header">
      <div>
        <h3>${escapeHtml(issue.title)}</h3>
        <div class="issue-meta">
          <span>${escapeHtml(issue.category || "Campus issue")}</span>
          ${issue.location ? `<span>${icon("pin", 12)} ${escapeHtml(issue.location)}</span>` : ""}
          <span><code>${escapeHtml(issue.id)}</code></span>
        </div>
      </div>
      ${statusBadge(issue.status)}
    </div>
    <p class="issue-description">${escapeHtml(issue.description || "No description was returned.")}</p>
    ${lifecycle(issue)}
    
    <!-- Status / Lifecycle Explanation Banner -->
    ${isRevoked ? `
      <div style="margin:10px 0;padding:12px 14px;border-radius:6px;font-size:12px;background:#fee2e2;border:1px solid #fecaca;color:#991b1b;">
        <div style="display:flex;align-items:center;gap:6px;">
          ${icon("alert-triangle", 15)} <strong>Approval Revoked</strong>
        </div>
        ${revocationLog ? `
          <p style="margin:6px 0 2px;line-height:1.5;"><strong>Reason:</strong> ${escapeHtml(revocationLog.notes)}</p>
          <div style="font-size:11px;color:#7f1d1d;margin-top:2px;">Revoked by ${escapeHtml(revocationLog.reviewer_name)} (${escapeHtml(revocationLog.reviewer_role)}) on ${escapeHtml(formatDate(revocationLog.created_at))}. Any points awarded have been reversed.</div>
        ` : `
          <p style="margin:4px 0 0;">Merits associated with this approval have been reversed in the ledger.</p>
        `}
      </div>
    ` : `
      <div style="margin:10px 0;padding:8px 12px;border-radius:6px;font-size:12px;background:${isVerified ? "rgba(2,122,72,0.06)" : isPending ? "rgba(245,158,11,0.08)" : "var(--paper-light)"};color:${isVerified ? "var(--green)" : isPending ? "#b45309" : "var(--ink)"};">
        ${isVerified ? `<strong>✓ Verified by Educator</strong> &bull; Merits evaluated and recorded in ledger.` : isPending ? `<strong>Awaiting Educator Review</strong> &bull; Points are awarded only after teacher review.` : `<strong>Under Review</strong> &bull; Corroborating evidence attached.`}
      </div>
    `}

    <!-- Evidence Section -->
    <div style="margin:12px 0;padding:12px;background:var(--paper-light);border:1px solid var(--border);border-radius:8px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
        <strong style="color:var(--muted);text-transform:uppercase;font-size:10px;letter-spacing:0.04em;">Submitted Evidence:</strong>
        <span class="field-hint" style="font-size:11px;">${photos.length} photo${photos.length === 1 ? "" : "s"} &bull; ${notes.length} note${notes.length === 1 ? "" : "s"} &bull; ${interviewCount} interview${interviewCount === 1 ? "" : "s"}</span>
      </div>

      ${!hasAnyEvidence ? `
        <p style="font-size:12px;color:var(--muted);margin:6px 0;font-style:italic;">No evidence provided yet.</p>
      ` : `
        <!-- Photo Evidence -->
        ${photos.length ? `
          <div style="margin-top:8px;">
            <span style="font-size:11px;font-weight:700;color:var(--ink-light);">Photos:</span>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;">
              ${photos.map((p) => `
                <a href="${escapeHtml(p.file_path)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;background:#ffffff;border:1px solid var(--border);border-radius:4px;text-decoration:none;color:var(--cobalt);font-size:11px;font-weight:600;">
                  ${icon("camera", 12)} ${escapeHtml(p.file_name || p.title || "Photo")}
                </a>
              `).join("")}
            </div>
          </div>
        ` : ""}

        <!-- Observation Notes -->
        ${notes.length ? `
          <div style="margin-top:8px;">
            <span style="font-size:11px;font-weight:700;color:var(--ink-light);">Observation Notes:</span>
            <div style="display:flex;flex-direction:column;gap:4px;margin-top:4px;">
              ${notes.map((n) => `
                <div style="background:#ffffff;border:1px solid var(--border);border-radius:4px;padding:6px 10px;font-size:12px;">
                  ${n.title ? `<strong style="font-size:11px;color:var(--muted);">${escapeHtml(n.title)}:</strong> ` : ""}${escapeHtml(n.content)}
                </div>
              `).join("")}
            </div>
          </div>
        ` : ""}

        <!-- Corroborating Research Interviews -->
        ${issue.interviews && issue.interviews.length ? `
          <div style="margin-top:8px;">
            <span style="font-size:11px;font-weight:700;color:var(--ink-light);">Stakeholder Interviews:</span>
            <div style="display:flex;flex-direction:column;gap:4px;margin-top:4px;">
              ${issue.interviews.slice(0, 3).map((intv) => `
                <div style="background:#fff;border:1px solid var(--border);border-radius:4px;padding:6px 10px;font-size:12px;">
                  <strong>${escapeHtml(intv.participant_name)}</strong> (${escapeHtml(intv.participant_type)}): &ldquo;${escapeHtml(intv.response)}&rdquo;
                </div>
              `).join("")}
            </div>
          </div>
        ` : ""}
      `}
    </div>

    <!-- Card Actions Footer -->
    <div class="issue-card-foot" style="align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
      <div>
        <span>Reported ${escapeHtml(formatDate(issue.created_at))}</span> &bull; 
        <span>${hasAnyEvidence ? "Evidence attached" : "Awaiting evidence"}</span>
      </div>
      ${!isRevoked && !isVerified ? `
        <div style="display:flex;gap:8px;">
          <button class="button button-quiet button-small btn-add-evidence-toggle" type="button" data-issue-id="${escapeHtml(issue.id)}">
            ${icon("upload", 12)} Attach Evidence
          </button>
          <button class="button button-quiet button-small btn-add-interview-toggle" type="button" data-issue-id="${escapeHtml(issue.id)}">
            ${icon("plus", 12)} Add Interview
          </button>
        </div>
      ` : ""}
    </div>

    <!-- Inline Add Evidence Drawer (Photo / Note) -->
    <div class="evidence-form-drawer" id="ev-drawer-${escapeHtml(issue.id)}" style="display:none;margin-top:12px;padding:12px;background:var(--paper-light);border:1px dashed var(--border);border-radius:8px;">
      <h4 style="margin:0 0 8px;font-size:13px;font-weight:700;">Attach Additional Evidence</h4>
      <form class="evidence-inline-form" data-issue-id="${escapeHtml(issue.id)}">
        <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:8px;">
          <div class="field">
            <label style="font-size:11px;">Upload Photo (JPG, PNG, WEBP)</label>
            <input class="input" name="evidence_file" type="file" accept="image/jpeg,image/png,image/webp" style="background:#fff;padding:4px;font-size:11px;" />
          </div>
          <div class="field">
            <label style="font-size:11px;">Or Add Written Note</label>
            <input class="input" name="evidence_note" type="text" placeholder="Observation note detail" />
          </div>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px;">
          <button class="button button-quiet button-small btn-cancel-evidence" type="button" data-issue-id="${escapeHtml(issue.id)}">Cancel</button>
          <button class="button button-dark button-small" type="submit">Save Evidence</button>
        </div>
      </form>
    </div>

    <!-- Inline Add Interview Evidence Form -->
    <div class="interview-form-drawer" id="drawer-${escapeHtml(issue.id)}" style="display:none;margin-top:12px;padding:12px;background:var(--paper-light);border:1px dashed var(--border);border-radius:8px;">
      <h4 style="margin:0 0 8px;font-size:13px;font-weight:700;">Record Stakeholder Research Interview</h4>
      <form class="interview-inline-form" data-issue-id="${escapeHtml(issue.id)}">
        <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:8px;">
          <div class="field">
            <label style="font-size:11px;">Participant Role</label>
            <select class="select" name="participant_type" required>
              <option value="Student">Student Peer</option>
              <option value="Teacher">Faculty / Teacher</option>
              <option value="Staff">Campus Maintenance / Staff</option>
            </select>
          </div>
          <div class="field">
            <label style="font-size:11px;">Participant Name</label>
            <input class="input" name="participant_name" type="text" placeholder="e.g. Ramesh (Caretaker)" required />
          </div>
          <div class="field field-full" style="grid-column:1 / -1;">
            <label style="font-size:11px;">Interview Statement / Evidence</label>
            <textarea class="textarea" name="response" rows="2" placeholder="What did they observe regarding this issue?" required></textarea>
          </div>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px;">
          <button class="button button-quiet button-small btn-cancel-interview" type="button" data-issue-id="${escapeHtml(issue.id)}">Cancel</button>
          <button class="button button-dark button-small" type="submit">Save Evidence Interview</button>
        </div>
      </form>
    </div>
  </article>`;
}

const PAGE_SIZE = 6;
let showAllReports = false;
let reportStatusFilter = "ALL";

function allIssuesFor(state) {
  return issuesForStudent(state)
    .slice()
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

function matchingIssues(allIssues) {
  if (reportStatusFilter === "ALL") return allIssues;
  return allIssues.filter((issue) => String(issue.status || "").toUpperCase() === reportStatusFilter);
}

function filterControlMarkup() {
  const statusOptions = [
    ["ALL", "All statuses"],
    ["SUBMITTED", "Reported (Queue)"],
    ["UNDER_REVIEW", "Under review"],
    ["VERIFIED", "Verified"],
    ["RESOLVED", "Resolved"],
    ["REVOKED", "Revoked Archive"],
  ]
    .map(([value, label]) => `<option value="${value}" ${reportStatusFilter === value ? "selected" : ""}>${label}</option>`)
    .join("");
  return `<label class="issue-filter" for="pulse-status-filter"><span>Status</span><select class="select" id="pulse-status-filter">${statusOptions}</select></label>`;
}

function listMarkup(state) {
  if (state.resourceErrors.issues) return `<div class="notice notice-warning" role="status"><span>${icon("info", 18)}</span><div><strong>Reports could not be loaded.</strong><p>Refresh to try again. Reports remain tied to their returned student ID and status.</p></div></div>`;
  const allIssues = allIssuesFor(state);
  const issues = matchingIssues(allIssues);
  if (state.loading && !Array.isArray(state.issues)) return `<div class="skeleton" aria-label="Loading reports"></div>`;
  if (!issues.length) {
    const controls = allIssues.length
      ? `<div class="issue-list-controls"><span class="field-hint">Showing 0 of ${pluralize(allIssues.length, "report")} returned for this student</span>${filterControlMarkup()}</div>`
      : "";
    const empty = reportStatusFilter === "ALL"
      ? `<div class="empty-state"><span class="empty-mark">${icon("pulse", 18)}</span><h3>No reports on this Passport yet</h3><p>When a report is saved for this student, its date, evidence, and lifecycle will appear here.</p></div>`
      : `<div class="empty-state"><span class="empty-mark">${icon("pulse", 18)}</span><h3>No reports match this filter</h3><p>Every report returned for this student is still stored — choose All to see them.</p></div>`;
    return controls + empty;
  }

  const visible = showAllReports ? issues : issues.slice(0, PAGE_SIZE);

  const controls = `<div class="issue-list-controls">
    <span class="field-hint">Showing ${visible.length} of ${pluralize(issues.length, "report")} returned for this student</span>
    ${filterControlMarkup()}
    ${issues.length > PAGE_SIZE ? `<button class="button button-quiet button-small" id="pulse-toggle-reports" type="button">${showAllReports ? "Show fewer" : `Show all ${issues.length} reports`}</button>` : ""}
  </div>`;

  return `${controls}<div class="issue-list">${visible.map(issueCard).join("")}</div>`;
}

/** @param {{state: Record<string, any>}} context */
export function render({ state }) {
  return `<section class="page pulse-page">
    <header class="page-head"><div><p class="page-kicker"><span class="kicker-dot"></span>CONTRIBUTE · CAMPUS PULSE</p><h1 class="page-title">Notice something? Give it a voice.</h1><p class="page-lead">A campus gets better when people can surface a problem, provide tangible evidence, and follow what happens next.</p></div><div class="page-head-action">${statusBadge("", "EVIDENCE → VERIFIED → RESOLVED")}</div></header>

    <div class="pulse-layout">
      <section class="card card-pad" aria-labelledby="issue-form-title">
        <div class="card-header">
          <div>
            <span class="card-label">START A CONTRIBUTION</span>
            <h2 id="issue-form-title">Report a problem</h2>
            <p>Provide description and real evidence for faculty review.</p>
          </div>
          <span class="evidence-icon">${icon("plus", 17)}</span>
        </div>

        <form id="issue-form" novalidate>
          <div class="form-grid">
            <div class="field field-full">
              <label for="issue-title">Title <span aria-hidden="true">*</span></label>
              <input class="input" id="issue-title" name="title" type="text" required autocomplete="off" placeholder="e.g. Broken Laboratory Water Tap" />
              <span class="field-hint">Give the problem a clear, concise title.</span>
            </div>
            <div class="field">
              <label for="issue-category">Category <span aria-hidden="true">*</span></label>
              <input class="input" id="issue-category" name="category" type="text" list="issue-categories" required autocomplete="off" placeholder="Choose or enter category" />
              <datalist id="issue-categories">
                <option value="Infrastructure"></option>
                <option value="Equipment"></option>
                <option value="Safety"></option>
                <option value="Water & Sanitation"></option>
                <option value="Classroom"></option>
                <option value="Transport"></option>
              </datalist>
            </div>
            <div class="field">
              <label for="issue-location">Location <span class="field-hint">(optional)</span></label>
              <input class="input" id="issue-location" name="location" type="text" autocomplete="off" placeholder="e.g. Science Block, Lab 2" />
            </div>
            <div class="field field-full">
              <label for="issue-description">Description <span aria-hidden="true">*</span></label>
              <textarea class="textarea" id="issue-description" name="description" rows="3" required placeholder="What happened? Share sufficient detail so faculty and caretakers can verify it."></textarea>
            </div>
          </div>

          <!-- Explicit Evidence Section (Section 4 Product Requirement) -->
          <div style="margin:18px 0;padding:16px;background:var(--paper-light);border:1px solid var(--border);border-radius:8px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;border-bottom:1px solid var(--border);padding-bottom:8px;">
              <strong style="font-size:13px;font-weight:700;color:var(--ink);">Evidence</strong>
              <span class="field-hint" style="font-size:11px;">Corroborate with photo or observation</span>
            </div>

            <div class="form-grid" style="gap:12px;">
              <div class="field field-full">
                <label for="issue-photo-input" style="font-size:12px;display:flex;align-items:center;gap:6px;">
                  ${icon("camera", 13)} Add photo / image evidence <span class="field-hint">(JPG, PNG, WEBP &bull; Max 10MB)</span>
                </label>
                <input class="input" id="issue-photo-input" name="photo_file" type="file" accept="image/jpeg,image/png,image/webp" style="background:#fff;padding:6px 8px;font-size:12px;" />
              </div>

              <div class="field field-full">
                <label for="issue-note-input" style="font-size:12px;display:flex;align-items:center;gap:6px;">
                  ${icon("file", 13)} Add evidence observation note <span class="field-hint">(optional)</span>
                </label>
                <textarea class="textarea" id="issue-note-input" name="evidence_note" rows="2" placeholder="Student observation note or context details."></textarea>
              </div>
            </div>

            <!-- Dynamic Live Evidence Attached Summary -->
            <div style="margin-top:12px;padding-top:10px;border-top:1px dashed var(--border);display:flex;align-items:center;gap:8px;font-size:12px;">
              <span style="font-weight:700;color:var(--muted);text-transform:uppercase;font-size:11px;">Evidence attached:</span>
              <div id="attached-evidence-pills" style="display:flex;gap:6px;flex-wrap:wrap;">
                <span class="field-hint" id="no-evidence-hint">No evidence attached yet.</span>
              </div>
            </div>
          </div>

          <div id="issue-form-error" class="field-error" role="alert" aria-live="polite"></div>

          <div class="form-actions" style="margin-top:16px;">
            <button class="button button-primary" id="issue-submit" type="submit">
              Submit Problem ${icon("arrow-right", 15)}
            </button>
            <span class="field-hint">Initial submission awards 0 points. Merits are assigned by educators after evidence review.</span>
          </div>
        </form>
      </section>

      <section aria-labelledby="my-contributions-title">
        <div class="section-heading">
          <div>
            <span class="card-label">YOUR CONTRIBUTION RECORD</span>
            <h2 id="my-contributions-title">My contributions</h2>
            <p>Only issues returned for the current student are shown.</p>
          </div>
        </div>
        ${listMarkup(state)}
      </section>
    </div>
  </section>`;
}

export function mount(root, context) {
  const form = root.querySelector("#issue-form");
  const submit = root.querySelector("#issue-submit");
  const errorTarget = root.querySelector("#issue-form-error");
  const photoInput = root.querySelector("#issue-photo-input");
  const noteInput = root.querySelector("#issue-note-input");
  const pillsTarget = root.querySelector("#attached-evidence-pills");
  const controller = new AbortController();
  const { signal } = controller;

  // Live Evidence Pills updater
  function updateEvidencePills() {
    if (!pillsTarget) return;
    const hasPhoto = photoInput?.files && photoInput.files.length > 0;
    const noteText = String(noteInput?.value || "").trim();

    if (!hasPhoto && !noteText) {
      pillsTarget.innerHTML = `<span class="field-hint">No evidence attached yet.</span>`;
      return;
    }

    const pills = [];
    if (hasPhoto) {
      const fileName = photoInput.files[0].name;
      pills.push(`<span class="sp-chip" style="font-size:11px;color:var(--green);border-color:#bbf7d0;background:#f0fdf4;">✓ 1 photo (${escapeHtml(fileName)})</span>`);
    }
    if (noteText) {
      pills.push(`<span class="sp-chip" style="font-size:11px;color:var(--green);border-color:#bbf7d0;background:#f0fdf4;">✓ Student observation note</span>`);
    }
    pillsTarget.innerHTML = pills.join("");
  }

  photoInput?.addEventListener("change", updateEvidencePills, { signal });
  noteInput?.addEventListener("input", updateEvidencePills, { signal });

  root.querySelector("#pulse-toggle-reports")?.addEventListener("click", () => {
    showAllReports = !showAllReports;
    context.render();
  }, { signal });

  root.querySelector("#pulse-status-filter")?.addEventListener("change", (event) => {
    reportStatusFilter = event.target.value;
    showAllReports = false;
    context.render();
  }, { signal });

  // Main Issue Submission
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const title = String(formData.get("title") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const category = String(formData.get("category") || "").trim();
    const location = String(formData.get("location") || "").trim();
    const evidenceNote = String(formData.get("evidence_note") || "").trim();
    const photoFile = photoInput?.files?.[0] || null;

    errorTarget.textContent = "";
    if (!title || !description || !category) {
      errorTarget.textContent = "Please add a title, category, and description before submitting.";
      return;
    }

    submit.disabled = true;
    submit.textContent = "Submitting problem…";

    try {
      // 1. Create issue with optional observation note
      const created = await context.api.postJSON("/api/campus-pulse/issues", {
        title,
        description,
        category,
        location: location || null,
        student_id: context.state.studentId || "STU001",
        evidence_note: evidenceNote || null,
        evidence_title: evidenceNote ? "Initial Student Observation" : null,
      });

      if (!created || !created.id) throw new Error("The issue response did not contain a saved report.");

      // 2. If photo was selected, upload it immediately
      if (photoFile) {
        submit.textContent = "Uploading photo evidence…";
        const photoData = new FormData();
        photoData.append("file", photoFile);
        photoData.append("title", "Site Photo Evidence");

        try {
          await context.api.postForm(`/api/campus-pulse/issues/${encodeURIComponent(created.id)}/evidence/upload`, photoData);
        } catch (uploadErr) {
          context.notify(`Issue created, but photo upload failed: ${friendlyError(uploadErr, "Could not upload image.")}`, "warning");
        }
      }

      form.reset();
      updateEvidencePills();
      context.notify("Problem submitted with evidence! Status: SUBMITTED (0 pts awaiting teacher review).", "success");
      await context.refreshData();
    } catch (error) {
      errorTarget.textContent = friendlyError(error, "Your report was not saved. Check the form and try again.");
      submit.disabled = false;
      submit.innerHTML = `Submit Problem ${icon("arrow-right", 15)}`;
    }
  }, { signal });

  // Toggle Add Evidence Drawer
  root.querySelectorAll(".btn-add-evidence-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const issueId = btn.dataset.issueId;
      const drawer = root.querySelector(`#ev-drawer-${issueId}`);
      if (drawer) {
        drawer.style.display = drawer.style.display === "none" ? "block" : "none";
      }
    }, { signal });
  });

  // Cancel Evidence Button
  root.querySelectorAll(".btn-cancel-evidence").forEach((btn) => {
    btn.addEventListener("click", () => {
      const issueId = btn.dataset.issueId;
      const drawer = root.querySelector(`#ev-drawer-${issueId}`);
      if (drawer) drawer.style.display = "none";
    }, { signal });
  });

  // Inline Evidence Form Submit
  root.querySelectorAll(".evidence-inline-form").forEach((evForm) => {
    evForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const issueId = evForm.dataset.issueId;
      const fileInput = evForm.querySelector('input[type="file"]');
      const noteInputInline = evForm.querySelector('input[name="evidence_note"]');
      const file = fileInput?.files?.[0];
      const noteText = String(noteInputInline?.value || "").trim();

      if (!file && !noteText) {
        context.notify("Please choose a photo or write an observation note.", "error");
        return;
      }

      const submitBtn = evForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      try {
        if (file) {
          const photoData = new FormData();
          photoData.append("file", file);
          await context.api.postForm(`/api/campus-pulse/issues/${encodeURIComponent(issueId)}/evidence/upload`, photoData);
        }
        if (noteText) {
          await context.api.postJSON(`/api/campus-pulse/issues/${encodeURIComponent(issueId)}/evidence`, {
            content: noteText,
            evidence_type: "NOTE",
            title: "Student Observation Note",
          });
        }
        context.notify("Evidence attached successfully!", "success");
        await context.refreshData();
      } catch (err) {
        context.notify(friendlyError(err, "Failed to attach evidence."), "error");
        if (submitBtn) submitBtn.disabled = false;
      }
    }, { signal });
  });

  // Toggle Add Interview Drawer
  root.querySelectorAll(".btn-add-interview-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const issueId = btn.dataset.issueId;
      const drawer = root.querySelector(`#drawer-${issueId}`);
      if (drawer) {
        drawer.style.display = drawer.style.display === "none" ? "block" : "none";
      }
    }, { signal });
  });

  // Cancel Interview Button
  root.querySelectorAll(".btn-cancel-interview").forEach((btn) => {
    btn.addEventListener("click", () => {
      const issueId = btn.dataset.issueId;
      const drawer = root.querySelector(`#drawer-${issueId}`);
      if (drawer) drawer.style.display = "none";
    }, { signal });
  });

  // Submit Interview Form
  root.querySelectorAll(".interview-inline-form").forEach((iForm) => {
    iForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const issueId = iForm.dataset.issueId;
      const formData = new FormData(iForm);
      const participant_type = formData.get("participant_type");
      const participant_name = String(formData.get("participant_name") || "").trim();
      const response = String(formData.get("response") || "").trim();

      if (!participant_name || !response) {
        context.notify("Please fill in the participant name and statement.", "error");
        return;
      }

      const submitBtn = iForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      try {
        await context.api.postJSON(`/api/campus-pulse/issues/${encodeURIComponent(issueId)}/interviews`, {
          participant_type,
          participant_name,
          response,
        });

        context.notify("Research evidence interview recorded!", "success");
        await context.refreshData();
      } catch (err) {
        context.notify(friendlyError(err, "Failed to record interview evidence."), "error");
        if (submitBtn) submitBtn.disabled = false;
      }
    }, { signal });
  });

  return () => controller.abort();
}

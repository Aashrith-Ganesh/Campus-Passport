import { formatNumber, formatDate, escapeHtml, icon, statusBadge } from "../ui.js";

/**
 * Teacher Student Evidence Audit View
 * Inspects any student's verified achievements, learning folio, and contributions.
 */
export function render({ state }) {
  const students = Array.isArray(state.allStudents) ? state.allStudents : [];
  const hashParams = typeof window !== "undefined" && window.location?.hash ? window.location.hash.split("?")[1] : "";
  const currentParamId = new URLSearchParams(hashParams || "").get("id");
  const selectedId = currentParamId || students[0]?.id || "STU001";

  return `
    <section class="page teacher-evidence-page">
      <header class="page-head">
        <div>
          <p class="page-kicker"><span class="kicker-dot"></span>FIELD JOURNAL AUDIT &bull; PROOF VERIFICATION</p>
          <h1 class="page-title">Student Evidence Audit</h1>
          <p class="page-lead">Inspect real student folios, verified learning achievements, and reported civic contributions.</p>
        </div>
      </header>

      <section class="card card-pad" style="margin-bottom:24px;">
        <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
          <div class="field" style="min-width:280px;flex:1;">
            <label for="audit-student-select">Select Student Record to Audit</label>
            <select class="select" id="audit-student-select">
              ${students.map((s) => `<option value="${escapeHtml(s.id)}" ${s.id === selectedId ? "selected" : ""}>${escapeHtml(s.name)} (${escapeHtml(s.id)}) &bull; Class ${escapeHtml(s.class_name || "10")}</option>`).join("")}
            </select>
          </div>
          <button class="button button-primary" id="btn-load-audit" type="button" style="align-self:flex-end;">
            Load Student Evidence ${icon("arrow-right", 14)}
          </button>
        </div>
      </section>

      <div id="audit-results-area">
        <div class="initial-loading">
          <span class="loader-ring" aria-hidden="true"></span>
          <p>Fetching verified student folio records...</p>
        </div>
      </div>
    </section>
  `;
}

export function mount(root, context) {
  const controller = new AbortController();
  const select = root.querySelector("#audit-student-select");
  const loadBtn = root.querySelector("#btn-load-audit");
  const resultsArea = root.querySelector("#audit-results-area");

  async function loadStudentData(studentId) {
    if (!resultsArea) return;
    resultsArea.innerHTML = `
      <div class="initial-loading">
        <span class="loader-ring" aria-hidden="true"></span>
        <p>Loading records for ${escapeHtml(studentId)}...</p>
      </div>
    `;

    try {
      const [passport, student, issues] = await Promise.all([
        context.api.get(`/api/student/${encodeURIComponent(studentId)}/passport`).catch(() => null),
        context.api.get(`/api/students/${encodeURIComponent(studentId)}`).catch(() => null),
        context.api.get("/api/campus-pulse/issues").catch(() => []),
      ]);

      const studentIssues = Array.isArray(issues) ? issues.filter((i) => i.student_id === studentId) : [];
      const achievements = Array.isArray(passport?.achievements?.all) ? passport.achievements.all : [];
      const totalPoints = typeof passport?.total_points === "number" ? passport.total_points : 0;

      resultsArea.innerHTML = `
        <section class="identity-panel" style="margin-bottom:24px;">
          <div class="identity-main">
            <span class="identity-avatar" aria-hidden="true">${escapeHtml((student?.name || "Student").slice(0, 2).toUpperCase())}</span>
            <div>
              <span class="card-label">AUDITED STUDENT RECORD</span>
              <h2>${escapeHtml(student?.name || "Student")}</h2>
              <p>ID: <code>${escapeHtml(studentId)}</code> &bull; Class ${escapeHtml(student?.class_name || "10")} &bull; Language: ${escapeHtml(student?.preferred_language || "English")}</p>
            </div>
          </div>
          <div class="identity-facts">
            <div class="identity-fact">
              <small>Verified Achievements</small>
              <strong>${formatNumber(achievements.length)}</strong>
            </div>
            <div class="identity-fact">
              <small>Passport Points</small>
              <strong>${formatNumber(totalPoints)} pts</strong>
            </div>
            <div class="identity-fact">
              <small>Issues Reported</small>
              <strong>${formatNumber(studentIssues.length)}</strong>
            </div>
          </div>
        </section>

        <section class="section-block">
          <div class="section-heading">
            <div>
              <h2>Verified Achievements (${achievements.length})</h2>
              <p>Deterministic learning and civic achievements stored in this student's folio.</p>
            </div>
          </div>
          ${achievements.length ? `
            <div class="achievement-list">
              ${achievements.map((item) => `
                <article class="achievement-card">
                  <span class="achievement-mark">${icon(item.type === "LEARNING" ? "book" : "award", 17)}</span>
                  <div class="achievement-copy">
                    <h3>${escapeHtml(item.title)}</h3>
                    <p>${escapeHtml(item.description || item.evidence || "Verified evidence record.")}</p>
                    <div class="achievement-meta">
                      <span>${icon("calendar", 12)} ${escapeHtml(formatDate(item.timestamp))}</span>
                      <span>${escapeHtml(item.type || "Achievement")}</span>
                      ${item.source ? `<span>Source: ${escapeHtml(item.source)}</span>` : ""}
                    </div>
                  </div>
                  <div class="achievement-stamp">
                    ${statusBadge("VERIFIED", "VERIFIED PROOF")}
                  </div>
                </article>
              `).join("")}
            </div>
          ` : `
            <div class="empty-state">
              <span class="empty-mark">${icon("book", 18)}</span>
              <h3>No achievements recorded yet</h3>
              <p>This student has not yet earned verified learning or contribution achievements.</p>
            </div>
          `}
        </section>

        <section class="section-block" style="margin-top:24px;">
          <div class="section-heading">
            <div>
              <h2>Campus Contributions (${studentIssues.length})</h2>
              <p>Field research and civic problem reports submitted by this student.</p>
            </div>
          </div>
          ${studentIssues.length ? `
            <div class="issue-list">
              ${studentIssues.map((issue) => `
                <article class="issue-card">
                  <div class="issue-card-header">
                    <div>
                      <h3>${escapeHtml(issue.title)}</h3>
                      <div class="issue-meta">
                        <span>Category: ${escapeHtml(issue.category)}</span>
                        ${issue.location ? `<span>${icon("pin", 12)} ${escapeHtml(issue.location)}</span>` : ""}
                      </div>
                    </div>
                    ${statusBadge(issue.status)}
                  </div>
                  <p class="issue-description">${escapeHtml(issue.description)}</p>
                  <div class="issue-card-foot">
                    <span>Submitted ${escapeHtml(formatDate(issue.created_at))}</span>
                    ${issue.interviews ? `<span>${issue.interviews.length} research interviews</span>` : ""}
                  </div>
                </article>
              `).join("")}
            </div>
          ` : `
            <div class="empty-state">
              <span class="empty-mark">${icon("pulse", 18)}</span>
              <h3>No issues reported</h3>
              <p>No Campus Pulse issue submissions have been registered by this student.</p>
            </div>
          `}
        </section>
      `;
    } catch (err) {
      resultsArea.innerHTML = `
        <div class="notice notice-error" role="alert">
          <span>${icon("info", 17)}</span>
          <div>
            <strong>Failed to Load Student Evidence</strong>
            <p>${escapeHtml(err.message || "Could not retrieve records for this student.")}</p>
          </div>
        </div>
      `;
    }
  }

  loadBtn?.addEventListener("click", () => {
    if (select) loadStudentData(select.value);
  }, { signal: controller.signal });

  select?.addEventListener("change", () => {
    loadStudentData(select.value);
  }, { signal: controller.signal });

  // Initial load
  if (select) loadStudentData(select.value);

  return () => controller.abort();
}

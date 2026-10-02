import { formatNumber, escapeHtml, icon, statusBadge } from "../ui.js";

/**
 * Teacher & Educator Dashboard
 * Cohort overview, student roster, pedagogical shortcuts.
 */
export function render({ state }) {
  const students = Array.isArray(state.allStudents) ? state.allStudents : [];
  const issues = Array.isArray(state.issues) ? state.issues : [];
  const opportunities = Array.isArray(state.opportunities) ? state.opportunities : [];

  return `
    <section class="page teacher-page">
      <div class="teacher-hero">
        <p class="hero-kicker" style="color:var(--lime);"><span class="kicker-dot"></span>EDUCATOR COMMAND PORTAL</p>
        <h1>Cohort Pedagogical Overview</h1>
        <p>Monitor real-time cohort performance, review student evidence, and award verified points for academic and civic merit.</p>
      </div>

      <div class="stat-grid-4">
        <div class="stat-card">
          <small>Enrolled Students</small>
          <strong>${formatNumber(students.length)}</strong>
          <p>Active student records</p>
        </div>
        <div class="stat-card">
          <small>Campus Issues</small>
          <strong>${formatNumber(issues.length)}</strong>
          <p>Reported by cohort</p>
        </div>
        <div class="stat-card">
          <small>Opportunities</small>
          <strong>${formatNumber(opportunities.length)}</strong>
          <p>Listed in catalog</p>
        </div>
        <div class="stat-card">
          <small>Auth Level</small>
          <strong style="color:var(--amber);">FACULTY</strong>
          <p>Teacher role verified</p>
        </div>
      </div>

      <section class="section-block" aria-labelledby="quick-educator-actions">
        <div class="section-heading">
          <div>
            <h2 id="quick-educator-actions">Educator Tools</h2>
            <p>Direct access to cohort analysis and student record verification.</p>
          </div>
        </div>
        <div class="quick-actions">
          <a class="quick-action" href="#teacher-reports">
            <span class="action-icon">${icon("chart", 17)}</span>
            <span>
              <strong>Diagnostic Reports</strong>
              <small>Analyze concept mastery and review struggling topics.</small>
            </span>
            <span class="action-arrow">${icon("arrow-up-right", 15)}</span>
          </a>
          <a class="quick-action" href="#teacher-evidence">
            <span class="action-icon">${icon("shield", 17)}</span>
            <span>
              <strong>Student Evidence Audit</strong>
              <small>Inspect individual student achievements and field reports.</small>
            </span>
            <span class="action-arrow">${icon("arrow-up-right", 15)}</span>
          </a>
          <a class="quick-action" href="#teacher-rewards">
            <span class="action-icon">${icon("award", 17)}</span>
            <span>
              <strong>Point Authority &amp; Conduct</strong>
              <small>Award verified points or adjust pocket conduct balances.</small>
            </span>
            <span class="action-arrow">${icon("arrow-up-right", 15)}</span>
          </a>
        </div>
      </section>

      <section class="section-block" aria-labelledby="roster-heading" style="margin-top:28px;">
        <div class="section-heading">
          <div>
            <h2 id="roster-heading">Student Cohort Roster</h2>
            <p>Directly inspect student folios and verify learning achievements.</p>
          </div>
          ${statusBadge("ACTIVE", `${students.length} REGISTERED`)}
        </div>

        ${students.length ? `
          <div class="table-wrap">
            <table class="data-table" aria-label="Student Cohort Roster">
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Student Name</th>
                  <th>Grade / Class</th>
                  <th>Language</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${students.map((stu) => `
                  <tr>
                    <td><code>${escapeHtml(stu.id)}</code></td>
                    <td><strong>${escapeHtml(stu.name)}</strong></td>
                    <td>Class ${escapeHtml(stu.class_name || "10")}</td>
                    <td>${escapeHtml(stu.preferred_language || "English")}</td>
                    <td>
                      <a class="button button-secondary button-small" href="#teacher-evidence?id=${encodeURIComponent(stu.id)}">
                        Audit Evidence ${icon("arrow-right", 12)}
                      </a>
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        ` : `
          <div class="empty-state">
            <p>Loading cohort roster...</p>
          </div>
        `}
      </section>
    </section>
  `;
}

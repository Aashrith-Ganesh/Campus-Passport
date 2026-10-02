import { icon } from "../ui.js";

/**
 * Access Restricted View (Route Guard Boundary)
 *
 * The same boundary serves both directions, so the copy is derived from the
 * role that was actually refused instead of always assuming a student is
 * trying to reach educator-only pages.
 *
 * @param {{ role?: string, route?: string }} [context]
 */
export function render(context = {}) {
  const role = String(context?.role || "").toUpperCase();
  const isEducator = role === "TEACHER" || role === "ADMIN";

  if (isEducator) {
    return `
    <section class="page">
      <div class="unauthorized-card" role="alert">
        <span class="unauthorized-icon" aria-hidden="true">${icon("lock", 28)}</span>
        <h2>Student Record Restricted</h2>
        <p>
          This section is part of the individual student field journal. Educator accounts are routed to the Educator Portal, where cohort reports, evidence audits, and point authority live.
        </p>
        <div style="display:flex;justify-content:center;gap:12px;">
          <a class="button button-primary" href="#teacher-dashboard">
            Return to Educator Portal ${icon("arrow-right", 14)}
          </a>
          <a class="button button-secondary" href="#login">
            Switch Persona / Sign In
          </a>
        </div>
      </div>
    </section>
  `;
  }

  return `
    <section class="page">
      <div class="unauthorized-card" role="alert">
        <span class="unauthorized-icon" aria-hidden="true">${icon("lock", 28)}</span>
        <h2>Educator Authorization Required</h2>
        <p>
          This section contains teacher diagnostics, student roster management, or point authority controls. As a registered student, your role does not permit access to educator-only areas.
        </p>
        <div style="display:flex;justify-content:center;gap:12px;">
          <a class="button button-primary" href="#dashboard">
            Return to Student Dashboard ${icon("arrow-right", 14)}
          </a>
          <a class="button button-secondary" href="#login">
            Switch Persona / Sign In
          </a>
        </div>
      </div>
    </section>
  `;
}

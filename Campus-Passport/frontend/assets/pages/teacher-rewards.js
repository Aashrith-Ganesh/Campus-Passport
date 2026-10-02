import { formatNumber, formatDate, escapeHtml, icon, statusBadge } from "../ui.js";

/**
 * Teacher Point Authority & Conduct Management View
 * Official teacher capability to award verified points or manage conduct adjustments.
 */
export function render({ state }) {
  const students = Array.isArray(state.allStudents) ? state.allStudents : [];

  return `
    <section class="page teacher-rewards-page">
      <header class="page-head">
        <div>
          <p class="page-kicker"><span class="kicker-dot"></span>TEACHER POINT AUTHORITY &bull; MERIT SYSTEM</p>
          <h1 class="page-title">Award Points &amp; Conduct Ledger</h1>
          <p class="page-lead">Authorize verified points for academic diligence, peer mentoring, and school stewardship. All awards are saved to the student ledger.</p>
        </div>
      </header>

      <div class="content-grid">
        <!-- Award Points Form -->
        <section class="card card-pad" aria-labelledby="award-form-title">
          <div class="card-header">
            <div>
              <span class="card-label">MERIT AWARD</span>
              <h2 id="award-form-title">Allocate Student Reward</h2>
              <p>Creates a verified ledger entry with teacher audit attribution.</p>
            </div>
            <span class="evidence-icon">${icon("award", 18)}</span>
          </div>

          <form id="teacher-award-form" novalidate>
            <div class="field" style="margin-bottom:12px;">
              <label for="award-student">Student Recipient <span aria-hidden="true">*</span></label>
              <select class="select" id="award-student" name="student_id" required>
                ${students.map((s) => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)} (${escapeHtml(s.id)})</option>`).join("")}
              </select>
            </div>

            <div class="field" style="margin-bottom:12px;">
              <label for="award-category">Reward Category <span aria-hidden="true">*</span></label>
              <select class="select" id="award-category" name="category" required>
                <option value="ACADEMIC_EXCELLENCE" selected>Academic Excellence</option>
                <option value="ACADEMIC_EFFORT">Academic Effort &amp; Diligence</option>
                <option value="HELPING_CLASSMATES">Helping Classmates</option>
                <option value="COMMUNITY_CONTRIBUTION">Community Contribution</option>
                <option value="RESPONSIBILITY_POSITIVE_CONDUCT">Responsibility &amp; Positive Conduct</option>
                <option value="VOLUNTEERING">School Volunteering</option>
              </select>
            </div>

            <div class="form-grid" style="margin-bottom:12px;">
              <div class="field">
                <label for="award-amount">Points Amount <span aria-hidden="true">*</span></label>
                <input class="input" id="award-amount" name="amount" type="number" min="1" max="100" value="25" required />
              </div>
              <div class="field">
                <label for="award-purpose">Pocket Purpose</label>
                <select class="select" id="award-purpose" name="purpose">
                  <option value="ACADEMIC" selected>Academic Balance</option>
                  <option value="CAMPUS">Campus Spending Balance</option>
                </select>
              </div>
            </div>

            <div class="field" style="margin-bottom:14px;">
              <label for="award-reason">Pedagogical Citation / Reason <span aria-hidden="true">*</span></label>
              <textarea class="textarea" id="award-reason" name="reason" rows="3" placeholder="Provide specific reason for this award..." required></textarea>
            </div>

            <div id="award-error" class="field-error" role="alert" style="margin-bottom:10px;"></div>

            <button class="button button-primary button-full" id="btn-submit-award" type="submit">
              Authorize Points Award ${icon("check", 14)}
            </button>
          </form>
        </section>

        <!-- Disciplinary / Conduct Deduction Form -->
        <section class="card card-pad" aria-labelledby="deduction-form-title">
          <div class="card-header">
            <div>
              <span class="card-label">CONDUCT BALANCE MANAGEMENT</span>
              <h2 id="deduction-form-title">Conduct Deduction</h2>
              <p>Apply disciplinary adjustments in accordance with campus conduct rules.</p>
            </div>
            <span class="evidence-icon" style="background:var(--red-soft);color:var(--red);">${icon("alert-triangle", 18)}</span>
          </div>

          <form id="teacher-deduction-form" novalidate>
            <div class="field" style="margin-bottom:12px;">
              <label for="deduct-student">Student Account <span aria-hidden="true">*</span></label>
              <select class="select" id="deduct-student" name="student_id" required>
                ${students.map((s) => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)} (${escapeHtml(s.id)})</option>`).join("")}
              </select>
            </div>

            <div class="field" style="margin-bottom:12px;">
              <label for="deduct-amount">Deduction Units (Debit) <span aria-hidden="true">*</span></label>
              <input class="input" id="deduct-amount" name="amount" type="number" min="1" max="100" value="10" required />
            </div>

            <div class="field" style="margin-bottom:14px;">
              <label for="deduct-reason">Conduct Violation Reason <span aria-hidden="true">*</span></label>
              <textarea class="textarea" id="deduct-reason" name="reason" rows="3" placeholder="Describe the policy violation..." required></textarea>
            </div>

            <div id="deduct-error" class="field-error" role="alert" style="margin-bottom:10px;"></div>

            <button class="button button-secondary button-full" id="btn-submit-deduct" type="submit">
              Apply Conduct Deduction ${icon("arrow-right", 14)}
            </button>
          </form>
        </section>
      </div>

      <div id="award-success-banner" style="margin-top:24px;"></div>
    </section>
  `;
}

export function mount(root, context) {
  const controller = new AbortController();
  const awardForm = root.querySelector("#teacher-award-form");
  const deductForm = root.querySelector("#teacher-deduction-form");
  const bannerTarget = root.querySelector("#award-success-banner");
  const categorySelect = root.querySelector("#award-category");
  const amountInput = root.querySelector("#award-amount");
  const purposeSelect = root.querySelector("#award-purpose");

  // Reward categories belong to the backend (/api/teacher/rewards/categories).
  // The static options above are only a fallback for when that call fails.
  const applyCategoryRange = () => {
    const option = categorySelect?.selectedOptions?.[0];
    if (!option || !amountInput) return;
    const min = Number(option.dataset.min);
    const max = Number(option.dataset.max);
    if (Number.isFinite(min)) amountInput.min = String(min);
    if (Number.isFinite(max)) amountInput.max = String(max);
    const value = Number(amountInput.value);
    if (Number.isFinite(value) && Number.isFinite(min) && value < min) amountInput.value = String(min);
    if (Number.isFinite(value) && Number.isFinite(max) && value > max) amountInput.value = String(max);
  };

  categorySelect?.addEventListener("change", () => {
    applyCategoryRange();
    const purpose = categorySelect.selectedOptions?.[0]?.dataset?.purpose;
    if (purposeSelect && purpose && [...purposeSelect.options].some((o) => o.value === purpose)) {
      purposeSelect.value = purpose;
    }
  }, { signal: controller.signal });

  if (categorySelect) {
    context.api.get("/api/teacher/rewards/categories")
      .then((categories) => {
        if (!Array.isArray(categories) || !categories.length) return;
        const selected = categorySelect.value;
        categorySelect.innerHTML = categories.map((item) => {
          const min = Number(item.recommended_min_points);
          const max = Number(item.recommended_max_points);
          const range = Number.isFinite(min) && Number.isFinite(max) ? ` · ${min}\u2013${max} pts` : "";
          return `<option value="${escapeHtml(item.category)}" data-min="${escapeHtml(String(item.recommended_min_points ?? ""))}" data-max="${escapeHtml(String(item.recommended_max_points ?? ""))}" data-purpose="${escapeHtml(item.default_purpose || "")}">${escapeHtml(item.title || item.category)}${range}</option>`;
        }).join("");
        if ([...categorySelect.options].some((option) => option.value === selected)) {
          categorySelect.value = selected;
        }
        applyCategoryRange();
      })
      .catch(() => {
        // Keep the static fallback list; awarding still works with it.
      });
  }

  awardForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const studentId = awardForm.student_id.value;
    const category = awardForm.category.value;
    const amount = parseInt(awardForm.amount.value, 10);
    const purpose = awardForm.purpose.value;
    const reason = awardForm.reason.value.trim();
    const errorEl = root.querySelector("#award-error");

    if (!reason || !amount || amount <= 0) {
      if (errorEl) errorEl.textContent = "Please provide a valid amount and citation reason.";
      return;
    }
    if (errorEl) errorEl.textContent = "";

    const submitBtn = root.querySelector("#btn-submit-award");
    submitBtn.disabled = true;
    submitBtn.textContent = "Authorizing award...";

    try {
      const response = await context.api.postJSON("/api/rewards", {
        student_id: studentId,
        category: category,
        amount: amount,
        purpose: purpose,
        reason: reason,
        actor_role: "TEACHER",
      });

      awardForm.reset();
      context.notify(`Successfully awarded ${amount} points to ${studentId}.`, "success");

      bannerTarget.innerHTML = `
        <div class="notice notice-success" role="status">
          <span>${icon("check-circle", 20)}</span>
          <div>
            <strong>Point Award Recorded on Ledger</strong>
            <p>
              Awarded <strong>${amount} points</strong> (${purpose}) to student <code>${escapeHtml(studentId)}</code>.
              Transaction ID: <code>${escapeHtml(response?.id || "TX-CONFIRMED")}</code>.
            </p>
          </div>
        </div>
      `;
      await context.refreshData();
    } catch (err) {
      if (errorEl) errorEl.textContent = err.message || "Failed to award points.";
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `Authorize Points Award ${icon("check", 14)}`;
    }
  }, { signal: controller.signal });

  deductForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const studentId = deductForm.student_id.value;
    const amount = parseInt(deductForm.amount.value, 10);
    const reason = deductForm.reason.value.trim();
    const errorEl = root.querySelector("#deduct-error");

    if (!reason || !amount || amount <= 0) {
      if (errorEl) errorEl.textContent = "Please provide a valid deduction amount and reason.";
      return;
    }
    if (errorEl) errorEl.textContent = "";

    const submitBtn = root.querySelector("#btn-submit-deduct");
    submitBtn.disabled = true;
    submitBtn.textContent = "Applying deduction...";

    try {
      const response = await context.api.postJSON("/api/deductions", {
        student_id: studentId,
        amount: amount,
        reason: reason,
        actor_role: "TEACHER",
      });

      deductForm.reset();
      context.notify(`Applied deduction of ${amount} units to ${studentId}.`, "info");

      bannerTarget.innerHTML = `
        <div class="notice notice-warning" role="status">
          <span>${icon("alert-triangle", 20)}</span>
          <div>
            <strong>Conduct Deduction Recorded</strong>
            <p>
              Debited <strong>${amount} units</strong> from student <code>${escapeHtml(studentId)}</code>.
              Transaction ID: <code>${escapeHtml(response?.id || "TX-DEDUCTED")}</code>.
            </p>
          </div>
        </div>
      `;
      await context.refreshData();
    } catch (err) {
      if (errorEl) errorEl.textContent = err.message || "Failed to apply deduction.";
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `Apply Conduct Deduction ${icon("arrow-right", 14)}`;
    }
  }, { signal: controller.signal });

  return () => controller.abort();
}

import { escapeHtml, formatNumber, formatDate, icon, statusBadge, friendlyError } from "../ui.js";

/**
 * School Administrator Console View
 * Allows provisioning NFC cards, configuring student pocket negative balance limits,
 * and inspecting student ledgers and card credentials.
 * Role Guard: ADMIN.
 */

let viewState = {
  selectedStudentId: "STU001",
  studentData: null,
  balance: null,
  cards: [],
  transactions: [],
  effectiveLimit: -500,
  loading: false,
  error: null,
};

export function render({ state }) {
  const students = Array.isArray(state.allStudents) ? state.allStudents : [];
  const selectedStudent = students.find((s) => s.id === viewState.selectedStudentId) || students[0];

  return `
    <section class="page admin-page">
      <header class="page-head">
        <div>
          <p class="page-kicker"><span class="kicker-dot"></span>CAMPUS ADMINISTRATION &bull; CREDENTIAL CONTROL</p>
          <h1 class="page-title">School Administration Console</h1>
          <p class="page-lead">Provision physical and virtual NFC cards, configure student pocket limits, and audit the campus digital ledger.</p>
        </div>
        <div class="page-head-action">
          <span class="status-badge" style="background:rgba(28,36,51,0.08);color:#1c2433;font-weight:700;">
            ${icon("shield", 14)} ADMIN ROLE
          </span>
        </div>
      </header>

      <div class="notice notice-info" role="note" style="margin-bottom:24px;">
        <span>${icon("info", 18)}</span>
        <div>
          <strong>Administrator Policy Authority</strong>
          <p>Actions performed here attach the authoritative <code>X-Actor-Role: ADMIN</code> header and record directly into the backend database.</p>
        </div>
      </div>

      <div class="admin-grid" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(360px, 1fr));gap:24px;margin-bottom:28px;">
        
        <!-- Section 1: NFC Smart Card Provisioning -->
        <section class="card card-pad" aria-labelledby="admin-card-provision-title">
          <div class="card-header">
            <div>
              <span class="card-label">CREDENTIAL PROVISIONING</span>
              <h2 id="admin-card-provision-title">Issue Smart NFC Card</h2>
              <p>Map an NFC physical UID and token to an enrolled student record.</p>
            </div>
            <span class="evidence-icon">${icon("credit-card", 18)}</span>
          </div>

          <form id="admin-nfc-form" novalidate style="margin-top:16px;">
            <div class="form-grid">
              <div class="field field-full">
                <label for="nfc-student-select">Student Account <span aria-hidden="true">*</span></label>
                <select class="select" id="nfc-student-select" name="student_id" required>
                  ${students.map((s) => `
                    <option value="${escapeHtml(s.id)}" ${s.id === viewState.selectedStudentId ? "selected" : ""}>
                      ${escapeHtml(s.name)} (${escapeHtml(s.id)}) &bull; Class ${escapeHtml(s.class_name)}
                    </option>
                  `).join("")}
                </select>
              </div>

              <div class="field">
                <label for="nfc-card-id">Card Identifier <span aria-hidden="true">*</span></label>
                <input class="input" id="nfc-card-id" name="card_id" type="text" placeholder="e.g. CARD_STU004_01" required autocomplete="off" />
                <span class="field-hint">Unique badge tag ID.</span>
              </div>

              <div class="field">
                <label for="nfc-card-uid">Card Physical UID <span aria-hidden="true">*</span></label>
                <input class="input" id="nfc-card-uid" name="card_uid" type="text" placeholder="e.g. 04:A1:B2:C3:04" required autocomplete="off" />
                <span class="field-hint">Hex serial from contactless reader.</span>
              </div>

              <div class="field field-full">
                <label for="nfc-token">NFC Tap Token <span class="field-hint">(optional)</span></label>
                <input class="input" id="nfc-token" name="token" type="text" placeholder="e.g. tok_ananya_nfc_004" autocomplete="off" />
                <span class="field-hint">Leave blank to auto-generate a secure token.</span>
              </div>
            </div>

            <div id="admin-nfc-error" class="field-error" style="margin-top:8px;" role="alert"></div>

            <div class="form-actions" style="margin-top:16px;">
              <button class="button button-dark" id="btn-provision-card" type="submit">
                Provision NFC Card ${icon("arrow-right", 14)}
              </button>
            </div>
          </form>
        </section>

        <!-- Section 2: Student Pocket Negative Balance Policy -->
        <section class="card card-pad" aria-labelledby="admin-limit-config-title">
          <div class="card-header">
            <div>
              <span class="card-label">POCKET POLICY CONTROLS</span>
              <h2 id="admin-limit-config-title">Configure Negative Limit</h2>
              <p>Establish school-wide spending safeguards or student-specific overdraft limits.</p>
            </div>
            <span class="evidence-icon">${icon("shield", 18)}</span>
          </div>

          <form id="admin-limit-form" novalidate style="margin-top:16px;">
            <div class="form-grid">
              <div class="field field-full">
                <label for="limit-target-select">Policy Scope <span aria-hidden="true">*</span></label>
                <select class="select" id="limit-target-select" name="scope">
                  <option value="__ALL__">School-Wide Default (All Students)</option>
                  <optgroup label="Individual Student Override">
                    ${students.map((s) => `
                      <option value="${escapeHtml(s.id)}" ${s.id === viewState.selectedStudentId ? "selected" : ""}>
                        ${escapeHtml(s.name)} (${escapeHtml(s.id)})
                      </option>
                    `).join("")}
                  </optgroup>
                </select>
                <span class="field-hint">Select a student or the campus default.</span>
              </div>

              <div class="field field-full">
                <label for="limit-amount">Negative Balance Limit (Units) <span aria-hidden="true">*</span></label>
                <input class="input" id="limit-amount" name="negative_limit" type="number" step="25" max="0" value="-500" required />
                <span class="field-hint">Must be 0 or a negative integer (e.g. -500 units allows up to 500 units overdraft).</span>
              </div>
            </div>

            <div id="admin-limit-error" class="field-error" style="margin-top:8px;" role="alert"></div>

            <div class="form-actions" style="margin-top:16px;">
              <button class="button button-dark" id="btn-save-limit" type="submit">
                Update Policy Limit ${icon("check-circle", 14)}
              </button>
            </div>
          </form>
        </section>

      </div>

      <!-- Section 3: Student Pocket & Credential Inspector -->
      <section class="section-block" aria-labelledby="admin-inspector-title">
        <div class="section-heading">
          <div>
            <span class="card-label">AUDIT &amp; INSPECTOR</span>
            <h2 id="admin-inspector-title">Student Account Inspector</h2>
            <p>Real-time audit of balances, active credentials, and ledger entries for any student.</p>
          </div>
          <div style="display:flex;align-items:center;gap:12px;">
            <label for="inspector-student-select" class="visually-hidden">Choose Student</label>
            <select class="select" id="inspector-student-select" style="min-width:240px;">
              ${students.map((s) => `
                <option value="${escapeHtml(s.id)}" ${s.id === viewState.selectedStudentId ? "selected" : ""}>
                  ${escapeHtml(s.name)} (${escapeHtml(s.id)})
                </option>
              `).join("")}
            </select>
            <button class="button button-secondary button-small" id="btn-inspector-refresh" type="button">
              ${icon("refresh", 14)} Refresh
            </button>
          </div>
        </div>

        ${viewState.loading ? `
          <div class="skeleton" style="height:200px;margin-bottom:20px;" aria-label="Loading student audit data"></div>
        ` : viewState.balance ? `
          <!-- Balances Summary -->
          <div class="wallet-summary" style="margin-bottom:24px;">
            <div class="balance-main">
              <small>TOTAL COMBINED POCKET</small>
              <strong>${formatNumber(viewState.balance.total_balance)}</strong>
              <p>${escapeHtml(selectedStudent?.name || "Student")} &bull; ID: ${escapeHtml(viewState.selectedStudentId)}</p>
            </div>
            <div class="balance-breakdown">
              <small>Academic Balance</small>
              <strong>${formatNumber(viewState.balance.academic_balance)}</strong>
              <span>Protected merit units</span>
            </div>
            <div class="balance-breakdown">
              <small>Campus Spending Balance</small>
              <strong>${formatNumber(viewState.balance.campus_balance)}</strong>
              <span>${formatNumber(viewState.balance.available_campus_spending_balance)} units spendable</span>
            </div>
          </div>

          <p class="simulation-note" style="margin-bottom:24px;">
            <span>${icon("shield", 15)}</span>
            <span>
              Configured Negative Limit: <strong>${formatNumber(viewState.balance.effective_negative_limit)} units</strong>.
            </span>
          </p>

          <!-- Cards List -->
          <div style="margin-bottom:28px;">
            <h3 style="font-size:16px;font-weight:700;margin-bottom:12px;">Issued NFC Smart Cards (${viewState.cards.length})</h3>
            ${viewState.cards.length ? `
              <div class="achievement-list">
                ${viewState.cards.map((c) => `
                  <div class="simulated-card">
                    <div>
                      <strong>Card ID: ${escapeHtml(c.card_id)}</strong>
                      <small>UID: <code>${escapeHtml(c.card_uid)}</code> &bull; Issued: ${escapeHtml(formatDate(c.issued_at))}</small>
                    </div>
                    ${statusBadge(c.status)}
                  </div>
                `).join("")}
              </div>
            ` : `
              <div class="empty-state">
                <span class="empty-mark">${icon("credit-card", 18)}</span>
                <h3>No NFC cards provisioned</h3>
                <p>Use the provisioning form above to issue a card to this student.</p>
              </div>
            `}
          </div>

          <!-- Transaction Ledger -->
          <div>
            <h3 style="font-size:16px;font-weight:700;margin-bottom:12px;">Recent Ledger Transactions (${viewState.transactions.length})</h3>
            ${viewState.transactions.length ? `
              <div class="table-wrap">
                <table class="data-table" aria-label="Transaction Ledger Audit">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Reason / Note</th>
                      <th>Category</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${viewState.transactions.slice(0, 10).map((tx) => `
                      <tr>
                        <td><small>${escapeHtml(formatDate(tx.created_at))}</small></td>
                        <td><strong>${escapeHtml(tx.reason || "Ledger entry")}</strong></td>
                        <td>${escapeHtml(tx.category || tx.purpose || "—")}</td>
                        <td>${statusBadge("", tx.transaction_type || "TX")}</td>
                        <td>
                          <strong style="color:${Number(tx.amount) >= 0 ? "var(--green)" : "var(--red)"}">
                            ${Number(tx.amount) >= 0 ? "+" : ""}${formatNumber(tx.amount)} units
                          </strong>
                        </td>
                        <td>${statusBadge(tx.status)}</td>
                      </tr>
                    `).join("")}
                  </tbody>
                </table>
              </div>
            ` : `
              <div class="empty-state">
                <p>No transaction history found on this student's pocket ledger.</p>
              </div>
            `}
          </div>
        ` : `
          <div class="empty-state">
            <span class="empty-mark">${icon("users", 20)}</span>
            <h3>Select a student</h3>
            <p>Choose an enrolled student to inspect their live balances and credentials.</p>
          </div>
        `}
      </section>
    </section>
  `;
}

async function loadStudentAudit(studentId, context) {
  if (!studentId) return;
  viewState.loading = true;
  viewState.selectedStudentId = studentId;
  context.render();

  try {
    const [balance, cards, transactions] = await Promise.all([
      context.api.get(`/api/student/${encodeURIComponent(studentId)}/balance`),
      context.api.get(`/api/student/${encodeURIComponent(studentId)}/cards`),
      context.api.get(`/api/student/${encodeURIComponent(studentId)}/transactions`),
    ]);
    viewState.balance = balance;
    viewState.cards = Array.isArray(cards) ? cards : [];
    viewState.transactions = Array.isArray(transactions) ? transactions : [];
    viewState.error = null;
  } catch (err) {
    viewState.error = err.message || "Failed to load student details";
  } finally {
    viewState.loading = false;
    context.render();
  }
}

export function mount(root, context) {
  const controller = new AbortController();
  const { signal } = controller;

  // Initial load of selected student
  if (viewState.selectedStudentId && !viewState.balance) {
    loadStudentAudit(viewState.selectedStudentId, context);
  }

  // Inspector student selector
  const inspectorSelect = root.querySelector("#inspector-student-select");
  inspectorSelect?.addEventListener("change", (e) => {
    loadStudentAudit(e.target.value, context);
  }, { signal });

  root.querySelector("#btn-inspector-refresh")?.addEventListener("click", () => {
    loadStudentAudit(viewState.selectedStudentId, context);
  }, { signal });

  // NFC Provisioning Form
  const nfcForm = root.querySelector("#admin-nfc-form");
  const nfcError = root.querySelector("#admin-nfc-error");
  const provisionBtn = root.querySelector("#btn-provision-card");

  nfcForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (nfcError) nfcError.textContent = "";

    const formData = new FormData(nfcForm);
    const student_id = formData.get("student_id");
    const card_id = String(formData.get("card_id") || "").trim();
    const card_uid = String(formData.get("card_uid") || "").trim();
    const token = String(formData.get("token") || "").trim() || null;

    if (!student_id || !card_id || !card_uid) {
      if (nfcError) nfcError.textContent = "Please fill in student, card ID, and card UID.";
      return;
    }

    if (provisionBtn) provisionBtn.disabled = true;

    try {
      await context.api.postJSON("/api/nfc/cards", {
        student_id,
        card_id,
        card_uid,
        token,
      });

      context.notify(`NFC Card ${card_id} successfully provisioned!`, "success");
      nfcForm.reset();
      await loadStudentAudit(student_id, context);
    } catch (err) {
      if (nfcError) nfcError.textContent = friendlyError(err, "Could not provision card. Verify unique card ID and UID.");
    } finally {
      if (provisionBtn) provisionBtn.disabled = false;
    }
  }, { signal });

  // Negative Limit Policy Form
  const limitForm = root.querySelector("#admin-limit-form");
  const limitError = root.querySelector("#admin-limit-error");
  const saveLimitBtn = root.querySelector("#btn-save-limit");

  limitForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (limitError) limitError.textContent = "";

    const formData = new FormData(limitForm);
    const scope = formData.get("scope");
    const negative_limit = parseInt(formData.get("negative_limit"), 10);

    if (isNaN(negative_limit) || negative_limit > 0) {
      if (limitError) limitError.textContent = "Negative limit must be 0 or a negative number (e.g. -500).";
      return;
    }

    const student_id = scope === "__ALL__" ? null : scope;

    if (saveLimitBtn) saveLimitBtn.disabled = true;

    try {
      await context.api.postJSON("/api/admin/configs/student-pocket", {
        student_id,
        negative_limit,
      });

      const scopeName = student_id ? `student ${student_id}` : "all students (school-wide)";
      context.notify(`Negative limit of ${negative_limit} units saved for ${scopeName}.`, "success");
      if (student_id) {
        await loadStudentAudit(student_id, context);
      } else if (viewState.selectedStudentId) {
        await loadStudentAudit(viewState.selectedStudentId, context);
      }
    } catch (err) {
      if (limitError) limitError.textContent = friendlyError(err, "Failed to update negative balance policy.");
    } finally {
      if (saveLimitBtn) saveLimitBtn.disabled = false;
    }
  }, { signal });

  return () => controller.abort();
}

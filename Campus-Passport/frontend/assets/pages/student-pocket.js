import { formatNumber, formatDate, icon, statusBadge, escapeHtml } from "../ui.js";
import { store } from "../store.js";

/**
 * Dedicated Student Pocket View
 * Displays ledger, academic/campus balance breakdown, and dynamic negative limit.
 * If user is TEACHER or ADMIN:
 *   Requires selecting a student from the roster first. Does NOT default to STU001.
 * If user is STUDENT:
 *   Loads the logged-in student's pocket directly.
 */

let teacherSelectedStudentId = null;
let teacherStudentData = null;
let teacherBalance = null;
let teacherCards = [];
let teacherTransactions = [];
let teacherLoading = false;

export function render({ state }) {
  const isEducator = store.isTeacher() || store.isAdmin();
  const students = Array.isArray(state.allStudents) ? state.allStudents : [];

  let balance = state.balance;
  let transactions = Array.isArray(state.transactions) ? state.transactions : [];
  let cards = Array.isArray(state.cards) ? state.cards : [];
  let activeStudent = state.student;

  if (isEducator) {
    if (!teacherSelectedStudentId) {
      // Educator hasn't selected a student yet: do NOT show STU001 or any data!
      balance = null;
      transactions = [];
      cards = [];
      activeStudent = null;
    } else {
      balance = teacherBalance;
      transactions = teacherTransactions;
      cards = teacherCards;
      activeStudent = teacherStudentData || students.find((s) => s.id === teacherSelectedStudentId);
    }
  }

  return `
    <section class="page pocket-page">
      <header class="page-head">
        <div>
          <p class="page-kicker"><span class="kicker-dot"></span>CAMPUS POCKET &bull; DIGITAL LEDGER</p>
          <h1 class="page-title">${isEducator ? "Student Pocket Inspection" : "Student Pocket Account"}</h1>
          <p class="page-lead">A dual-balance campus ledger tracking academic achievements and community participation.</p>
        </div>
        ${isEducator ? `
          <div class="page-head-action">
            <span class="status-badge" style="background:rgba(28,36,51,0.08);color:#1c2433;font-weight:700;">
              ${icon("shield", 14)} EDUCATOR VIEW
            </span>
          </div>
        ` : ""}
      </header>

      ${isEducator ? `
        <!-- Educator Student Selector Roster -->
        <section class="card card-pad" style="margin-bottom:24px;border:1px solid var(--cobalt);">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px;">
            <div>
              <span class="card-label">COHORT ROSTER LOOKUP</span>
              <h2 style="font-size:16px;margin:2px 0 0;">Select Student to Inspect</h2>
              <p style="margin:2px 0 0;font-size:13px;color:var(--muted);">Choose a student to load their live pocket balances, smart cards, and ledger entries.</p>
            </div>
            <div style="min-width:280px;">
              <label for="teacher-pocket-student-select" class="visually-hidden">Choose Student</label>
              <select class="select" id="teacher-pocket-student-select" style="width:100%;font-weight:600;">
                <option value="" ${!teacherSelectedStudentId ? "selected" : ""}>— Choose student from roster —</option>
                ${students.map((s) => `
                  <option value="${escapeHtml(s.id)}" ${s.id === teacherSelectedStudentId ? "selected" : ""}>
                    ${escapeHtml(s.name)} (${escapeHtml(s.id)}) &bull; Class ${escapeHtml(s.class_name)}
                  </option>
                `).join("")}
              </select>
            </div>
          </div>
        </section>
      ` : `
        <div class="notice notice-warning" role="note" style="margin-bottom:20px;">
          <span>${icon("info", 17)}</span>
          <div>
            <strong>Hackathon Prototype Notice &bull; Simulated Ledger</strong>
            <p>Student Pocket balances represent demonstration ledger units. Values are fetched directly from the backend database.</p>
          </div>
        </div>
      `}

      ${isEducator && !teacherSelectedStudentId ? `
        <!-- Empty Selection State for Educator -->
        <div class="empty-state" style="padding:48px 24px;background:#ffffff;border:1px dashed var(--border);border-radius:12px;">
          <span class="empty-mark" style="font-size:28px;">${icon("users", 32)}</span>
          <h2 style="font-size:18px;font-weight:800;margin-top:12px;">No Student Selected</h2>
          <p style="max-width:440px;margin:8px auto 0;color:var(--muted);line-height:1.5;">
            Select an enrolled student from the cohort dropdown above to inspect their universal balances, active NFC card credentials, and ledger audit history.
          </p>
        </div>
      ` : teacherLoading ? `
        <div class="skeleton" style="height:260px;" aria-label="Loading student pocket data"></div>
      ` : `
        <!-- Account Summary -->
        <section class="section-block" aria-labelledby="pocket-summary-title">
          <div class="section-heading">
            <div>
              <h2 id="pocket-summary-title">Account Balances ${activeStudent ? `&bull; ${escapeHtml(activeStudent.name)} (${escapeHtml(activeStudent.id)})` : ""}</h2>
              <p>Real-time balances from the backend student balance endpoint.</p>
            </div>
            ${balance ? statusBadge("ACTIVE", "LEDGER SYNCHRONIZED") : statusBadge("", "CHECKING")}
          </div>

          ${balance ? `
            <div class="wallet-summary">
              <div class="balance-main">
                <small>TOTAL COMBINED POCKET</small>
                <strong>${formatNumber(balance.total_balance)}</strong>
                <p>Total units across academic and campus balances</p>
              </div>
              <div class="balance-breakdown">
                <small>Academic Balance</small>
                <strong>${formatNumber(balance.academic_balance)}</strong>
                <span>Merit &amp; learning units</span>
              </div>
              <div class="balance-breakdown">
                <small>Campus Spending Balance</small>
                <strong>${formatNumber(balance.campus_balance)}</strong>
                <span>${formatNumber(balance.available_campus_spending_balance)} units spendable</span>
              </div>
            </div>
            <p class="simulation-note" style="margin-top:12px;">
              <span>${icon("shield", 15)}</span>
              <span>
                Dynamic Negative Limit: <strong>${formatNumber(balance.effective_negative_limit)} units</strong> as configured by backend rules.
              </span>
            </p>
          ` : `
            <div class="empty-state">
              <p>No balance records available.</p>
            </div>
          `}
        </section>

        <!-- Cards -->
        <section class="section-block" aria-labelledby="pocket-cards-title">
          <div class="section-heading">
            <div>
              <h2 id="pocket-cards-title">Issued Cards &amp; Credentials</h2>
              <p>Physical and virtual NFC credentials attached to this student record.</p>
            </div>
          </div>

          ${cards.length ? `
            <div class="achievement-list">
              ${cards.map((card) => `
                <div class="simulated-card">
                  <div>
                    <strong>Card ID: ${escapeHtml(card.card_id || "Active Credential")}</strong>
                    <small>Issued: ${escapeHtml(formatDate(card.issued_at))}${card.deactivated_at ? ` &bull; Deactivated: ${escapeHtml(formatDate(card.deactivated_at))}` : ""}</small>
                  </div>
                  ${statusBadge(card.status)}
                </div>
              `).join("")}
            </div>
          ` : `
            <div class="empty-state">
              <span class="empty-mark">${icon("wallet", 18)}</span>
              <h3>No cards registered</h3>
              <p>No active smart cards or physical credentials have been issued for this student ID.</p>
            </div>
          `}
        </section>

        <!-- Ledger Transactions -->
        <section class="section-block" aria-labelledby="pocket-ledger-title">
          <div class="section-heading">
            <div>
              <h2 id="pocket-ledger-title">Ledger Transaction Audit Trail</h2>
              <p>Detailed append-only transaction history.</p>
            </div>
          </div>

          ${transactions.length ? `
            <div class="table-wrap">
              <table class="data-table" aria-label="Transaction Ledger Table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Transaction Reason</th>
                    <th>Category</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${transactions.map((tx) => `
                    <tr>
                      <td><small>${escapeHtml(formatDate(tx.created_at))}</small></td>
                      <td><strong>${escapeHtml(tx.reason || "Ledger Entry")}</strong></td>
                      <td>${escapeHtml(tx.category || tx.purpose || "General")}</td>
                      <td>${statusBadge("", tx.transaction_type || tx.purpose || "TRANSFER")}</td>
                      <td><strong style="color:${Number(tx.amount) >= 0 ? "var(--green)" : "var(--red)"}">${Number(tx.amount) >= 0 ? "+" : ""}${formatNumber(tx.amount)} units</strong></td>
                      <td>${statusBadge(tx.status)}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          ` : `
            <div class="empty-state">
              <span class="empty-mark">${icon("clock", 18)}</span>
              <h3>No ledger records</h3>
              <p>No transactions have been logged on this student's pocket ledger yet.</p>
            </div>
          `}
        </section>
      `}
    </section>
  `;
}

async function loadTeacherStudentPocket(studentId, context) {
  if (!studentId) {
    teacherSelectedStudentId = null;
    teacherStudentData = null;
    teacherBalance = null;
    teacherCards = [];
    teacherTransactions = [];
    context.render();
    return;
  }

  teacherLoading = true;
  teacherSelectedStudentId = studentId;
  context.render();

  try {
    const id = encodeURIComponent(studentId);
    const [student, balance, txs, cards] = await Promise.all([
      context.api.get(`/api/students/${id}`),
      context.api.get(`/api/student/${id}/balance`),
      context.api.get(`/api/student/${id}/transactions`),
      context.api.get(`/api/student/${id}/cards`),
    ]);
    teacherStudentData = student;
    teacherBalance = balance;
    teacherTransactions = Array.isArray(txs) ? txs : [];
    teacherCards = Array.isArray(cards) ? cards : [];
  } catch (err) {
    context.notify(err.message || "Failed to load student pocket records", "error");
  } finally {
    teacherLoading = false;
    context.render();
  }
}

export function mount(root, context) {
  const controller = new AbortController();
  const { signal } = controller;

  const isEducator = store.isTeacher() || store.isAdmin();

  if (isEducator) {
    const selectEl = root.querySelector("#teacher-pocket-student-select");
    selectEl?.addEventListener("change", (e) => {
      const sid = e.target.value;
      loadTeacherStudentPocket(sid, context);
    }, { signal });
  }

  return () => controller.abort();
}

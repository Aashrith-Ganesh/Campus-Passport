import { escapeHtml, formatNumber, formatDate, icon, statusBadge, friendlyError } from "../ui.js";

/**
 * Merchant POS Terminal View
 * Simulates contactless NFC card tap checkout and student pocket purchase processing.
 * Role Guard: MERCHANT, ADMIN.
 */

let merchantState = {
  lastResult: null,
  lastError: null,
  processing: false,
};

export function render() {
  const result = merchantState.lastResult;
  const err = merchantState.lastError;

  return `
    <section class="page merchant-page">
      <header class="page-head">
        <div>
          <p class="page-kicker"><span class="kicker-dot"></span>POINT-OF-SALE &bull; CAMPUS CANTEEN</p>
          <h1 class="page-title">Merchant Terminal</h1>
          <p class="page-lead">Contactless one-tap NFC card checkout and student pocket campus spending verification.</p>
        </div>
        <div class="page-head-action">
          <span class="status-badge status-positive">
            ${icon("credit-card", 14)} MERCHANT001 &bull; CANTEEN
          </span>
        </div>
      </header>

      <div class="notice notice-info" role="note" style="margin-bottom:24px;">
        <span>${icon("info", 18)}</span>
        <div>
          <strong>Campus Spending Separation Safeguard</strong>
          <p>Purchases deduct strictly from the student's <strong>Campus Spending Balance</strong>. Academic merit points are protected and cannot be spent on retail items.</p>
        </div>
      </div>

      <div class="merchant-layout" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(360px, 1fr));gap:24px;margin-bottom:28px;">
        
        <!-- Section 1: NFC One-Tap Checkout Terminal -->
        <section class="card card-pad" aria-labelledby="nfc-terminal-title">
          <div class="card-header">
            <div>
              <span class="card-label">CONTACTLESS CHECKOUT</span>
              <h2 id="nfc-terminal-title">NFC One-Tap Terminal</h2>
              <p>Simulate an NFC tap event or select an active demo credential token.</p>
            </div>
            <span class="evidence-icon">${icon("credit-card", 18)}</span>
          </div>

          <!-- Quick Token Selector Chips -->
          <div style="margin-top:14px;">
            <span style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.04em;">Demo Student Cards:</span>
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px;">
              <button class="button button-quiet button-small demo-token-chip" type="button" data-token="tok_aarav_nfc_001" data-name="Aarav (STU001)">
                Aarav &bull; <code>tok_aarav_...</code>
              </button>
              <button class="button button-quiet button-small demo-token-chip" type="button" data-token="tok_diya_nfc_002" data-name="Diya (STU002)">
                Diya &bull; <code>tok_diya_...</code>
              </button>
              <button class="button button-quiet button-small demo-token-chip" type="button" data-token="tok_rohan_nfc_003" data-name="Rohan (STU003 - Deactivated)">
                Rohan (Deactivated) &bull; <code>tok_rohan_...</code>
              </button>
            </div>
          </div>

          <form id="merchant-tap-form" novalidate style="margin-top:18px;">
            <div class="form-grid">
              <div class="field field-full">
                <label for="merchant-token">NFC Card Token <span aria-hidden="true">*</span></label>
                <input class="input" id="merchant-token" name="token" type="text" value="tok_aarav_nfc_001" placeholder="e.g. tok_aarav_nfc_001" required autocomplete="off" />
                <span class="field-hint">Token transmitted by student card upon contactless tap.</span>
              </div>

              <div class="field">
                <label for="merchant-amount">Purchase Amount (Units) <span aria-hidden="true">*</span></label>
                <input class="input" id="merchant-amount" name="amount" type="number" min="1" max="500" value="30" required />
                <span class="field-hint">Campus points charged.</span>
              </div>

              <div class="field">
                <label for="merchant-desc">Description</label>
                <input class="input" id="merchant-desc" name="description" type="text" value="Campus Canteen Meal" placeholder="e.g. Lunch Thali" />
                <span class="field-hint">Receipt line item note.</span>
              </div>
            </div>

            <div id="merchant-tap-error" class="field-error" style="margin-top:8px;" role="alert"></div>

            <div class="form-actions" style="margin-top:16px;">
              <button class="button button-primary" id="btn-merchant-tap" type="submit" ${merchantState.processing ? "disabled" : ""}>
                ${merchantState.processing ? "Processing Tap…" : `Tap Card &amp; Charge ${icon("arrow-right", 14)}`}
              </button>
            </div>
          </form>
        </section>

        <!-- Section 2: Live Transaction Receipt / Authorization Result -->
        <section class="card card-pad" aria-labelledby="receipt-title">
          <div class="card-header">
            <div>
              <span class="card-label">TERMINAL DISPLAY</span>
              <h2 id="receipt-title">Authorization Receipt</h2>
              <p>Real-time terminal response from backend ledger validation.</p>
            </div>
            <span class="evidence-icon">${icon("shield", 18)}</span>
          </div>

          <div id="receipt-container" style="margin-top:18px;">
            ${result ? `
              <div class="receipt-card" style="border:1px solid rgba(0,0,0,0.08);border-radius:12px;padding:20px;background:var(--paper-light);">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
                  <span class="status-badge status-positive" style="font-size:12px;padding:4px 10px;">
                    ${icon("check-circle", 14)} APPROVED
                  </span>
                  <span style="font-size:11px;color:var(--muted);">${escapeHtml(formatDate(result.timestamp || new Date().toISOString()))}</span>
                </div>

                <div style="font-size:22px;font-weight:900;color:var(--ink);">${escapeHtml(result.student_name)}</div>
                <div style="font-size:12px;color:var(--muted);margin-top:2px;">
                  Student ID: <code>${escapeHtml(result.student_id)}</code> &bull; Card: <code>${escapeHtml(result.card_id || "NFC")}</code>
                </div>

                <hr style="border:0;border-top:1px dashed var(--border);margin:16px 0;" />

                <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                  <span style="color:var(--muted);">Item Description:</span>
                  <strong>${escapeHtml(result.description || "Campus Purchase")}</strong>
                </div>
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                  <span style="color:var(--muted);">Amount Charged:</span>
                  <strong style="color:var(--red);font-size:16px;">-${formatNumber(result.purchase_amount)} units</strong>
                </div>
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                  <span style="color:var(--muted);">Campus Balance Remaining:</span>
                  <strong>${formatNumber(result.new_balance)} units</strong>
                </div>
                <div style="display:flex;justify-content:space-between;">
                  <span style="color:var(--muted);">Total Universal Balance:</span>
                  <strong>${formatNumber(result.total_balance)} units</strong>
                </div>
              </div>
            ` : err ? `
              <div class="receipt-card" style="border:1px solid rgba(220,53,69,0.2);border-radius:12px;padding:20px;background:#fff5f5;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
                  <span class="status-badge" style="background:#fee2e2;color:#dc2626;font-size:12px;padding:4px 10px;">
                    ${icon("alert-triangle", 14)} REJECTED
                  </span>
                </div>
                <h3 style="font-size:16px;font-weight:800;color:#991b1b;margin-bottom:8px;">Transaction Declined</h3>
                <p style="font-size:13px;color:#7f1d1d;line-height:1.5;">${escapeHtml(err)}</p>
                <div style="margin-top:14px;font-size:11px;color:var(--muted);">
                  Safeguard Rule: Contactless purchase declined by backend ledger rules.
                </div>
              </div>
            ` : `
              <div class="empty-state">
                <span class="empty-mark">${icon("credit-card", 20)}</span>
                <h3>Awaiting Card Tap</h3>
                <p>Present student NFC token and submit to execute a live purchase.</p>
              </div>
            `}
          </div>
        </section>

      </div>
    </section>
  `;
}

export function mount(root, context) {
  const controller = new AbortController();
  const { signal } = controller;

  // Demo token chips
  root.querySelectorAll(".demo-token-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      const token = btn.dataset.token;
      const input = root.querySelector("#merchant-token");
      if (input && token) {
        input.value = token;
        context.notify(`Selected ${btn.dataset.name}`, "info");
      }
    }, { signal });
  });

  // Tap form
  const tapForm = root.querySelector("#merchant-tap-form");
  const tapError = root.querySelector("#merchant-tap-error");
  const tapBtn = root.querySelector("#btn-merchant-tap");

  tapForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (tapError) tapError.textContent = "";

    const formData = new FormData(tapForm);
    const token = String(formData.get("token") || "").trim();
    const amount = parseInt(formData.get("amount"), 10);
    const description = String(formData.get("description") || "Campus Canteen").trim();

    if (!token || isNaN(amount) || amount <= 0) {
      if (tapError) tapError.textContent = "Please provide an NFC token and an amount greater than 0.";
      return;
    }

    merchantState.processing = true;
    merchantState.lastResult = null;
    merchantState.lastError = null;
    if (tapBtn) tapBtn.disabled = true;

    try {
      const res = await context.api.postJSON("/api/nfc/tap", {
        token,
        merchant_id: "MERCHANT001",
        amount,
        description,
        idempotency_key: `pos_tap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      });

      const purchase = res.purchase_result || {};
      merchantState.lastResult = {
        student_id: res.student_id,
        student_name: res.student_name,
        card_id: res.card_id,
        purchase_amount: purchase.purchase_amount || amount,
        new_balance: purchase.new_balance ?? res.campus_balance,
        total_balance: purchase.total_balance ?? res.total_balance,
        description: purchase.description || description,
        timestamp: purchase.timestamp || new Date().toISOString(),
      };
      merchantState.lastError = null;
      context.notify(`Purchase of ${amount} units approved for ${res.student_name}!`, "success");
    } catch (err) {
      merchantState.lastResult = null;
      merchantState.lastError = err.message || "Purchase was rejected by backend ledger.";
      if (tapError) tapError.textContent = friendlyError(err, "Purchase rejected.");
      context.notify("Purchase declined by ledger policy.", "error");
    } finally {
      merchantState.processing = false;
      context.render();
    }
  }, { signal });

  return () => controller.abort();
}

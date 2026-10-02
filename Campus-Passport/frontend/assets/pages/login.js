import { store } from "../store.js";
import { api } from "../api.js";
import { icon } from "../ui.js";

/**
 * Full-page Welcome & Role-Entry View.
 * Deep Ink on warm paper, centered brand lockup, balanced role cards.
 * The shell hides the app chrome on this route (see main.js syncHeader),
 * so the login owns the whole viewport.
 */
export function render() {
  return `
    <div class="login-shell">
      <div class="login-stage">
        <header class="login-brand">
          <img src="/assets/passport-mark.svg" alt="" width="56" height="56" />
          <p class="login-eyebrow">DIGITAL FIELD JOURNAL &bull; VERIFICATION BOUNDARY</p>
          <h1 class="login-title" id="login-main-title">Campus Passport</h1>
          <p class="login-tagline">Your work. Your evidence. Your journey.</p>
          <p class="login-subtitle">
            Connect what you learn, what you contribute, and what you improve. The digital passport turns your daily school journey into evidence for your next opportunity.
          </p>
        </header>

        <section class="login-card" role="main" aria-labelledby="login-role-title">
          <div class="persona-section-title" id="login-role-title">Choose your role</div>

          <div class="persona-grid">
            <!-- Student Persona Card -->
            <div class="persona-card" id="persona-student" data-persona="student">
              <div>
                <div class="persona-top">
                  <span class="persona-avatar student" aria-hidden="true">AS</span>
                  <div class="persona-meta">
                    <h3>Aarav Sharma</h3>
                    <p>Class 10-A &bull; ID: <code>STU001</code></p>
                  </div>
                </div>
                <span class="status-badge status-positive">STUDENT ROLE</span>
                <p class="persona-note">
                  Access your passport folio, practise with Campus Lens, report issues with Campus Pulse, and check opportunity eligibility.
                </p>
              </div>
              <button class="button button-primary" type="button" id="continue-student">
                Continue as Student ${icon("arrow-right", 14)}
              </button>
            </div>

            <!-- Teacher Persona Card -->
            <div class="persona-card" id="persona-teacher" data-persona="teacher">
              <div>
                <div class="persona-top">
                  <span class="persona-avatar teacher" aria-hidden="true">PS</span>
                  <div class="persona-meta">
                    <h3>Priya Sharma</h3>
                    <p>Faculty &bull; ID: <code>TEA001</code></p>
                  </div>
                </div>
                <span class="status-badge status-progress">TEACHER ROLE</span>
                <p class="persona-note">
                  Review cohort diagnostics, audit student evidence, evaluate Campus Pulse submissions, and award points.
                </p>
              </div>
              <button class="button button-secondary" type="button" id="continue-teacher">
                Continue as Teacher ${icon("arrow-right", 14)}
              </button>
            </div>

            <!-- Admin Persona Card -->
            <div class="persona-card" id="persona-admin" data-persona="admin">
              <div>
                <div class="persona-top">
                  <span class="persona-avatar admin" style="background:#1c2433;color:#d2f369;" aria-hidden="true">AR</span>
                  <div class="persona-meta">
                    <h3>Dr. Arvind Rao</h3>
                    <p>School Admin &bull; ID: <code>ADM001</code></p>
                  </div>
                </div>
                <span class="status-badge" style="background:rgba(28,36,51,0.08);color:#1c2433;">ADMIN ROLE</span>
                <p class="persona-note">
                  Provision NFC smart cards, configure school pocket negative limits, and inspect student ledgers.
                </p>
              </div>
              <button class="button button-dark" type="button" id="continue-admin">
                Continue as Admin ${icon("arrow-right", 14)}
              </button>
            </div>

            <!-- Merchant Persona Card -->
            <div class="persona-card" id="persona-merchant" data-persona="merchant">
              <div>
                <div class="persona-top">
                  <span class="persona-avatar merchant" style="background:#027a48;color:#ffffff;" aria-hidden="true">CC</span>
                  <div class="persona-meta">
                    <h3>Campus Canteen</h3>
                    <p>POS Operator &bull; ID: <code>MERCHANT001</code></p>
                  </div>
                </div>
                <span class="status-badge status-positive">MERCHANT ROLE</span>
                <p class="persona-note">
                  Simulate contactless NFC card tap checkouts and process campus spending transactions.
                </p>
              </div>
              <button class="button button-primary" type="button" id="continue-merchant">
                Continue as Merchant ${icon("arrow-right", 14)}
              </button>
            </div>
          </div>

          <div class="login-divider">Or enter credentials</div>

          <form id="custom-login-form" class="custom-id-form" novalidate>
            <div class="field">
              <label for="custom-role" class="visually-hidden">Role</label>
              <select class="select" id="custom-role" name="role" aria-label="Select role">
                <option value="STUDENT" selected>Student</option>
                <option value="TEACHER">Teacher</option>
                <option value="ADMIN">School Administrator</option>
                <option value="MERCHANT">Campus Merchant</option>
              </select>
            </div>
            <div class="field">
              <label for="custom-id" class="visually-hidden">Identifier</label>
              <input class="input" id="custom-id" name="id" type="text" placeholder="Identifier (e.g. STU001, TEA001, ADM001, MERCHANT001)" autocomplete="off" required />
            </div>
            <button class="button button-dark" type="submit">
              Sign In ${icon("arrow-right", 14)}
            </button>
          </form>
          <div id="login-error" class="field-error" style="margin-top:8px;" role="alert"></div>

          <div class="folio-note">
            <span class="stamp-icon">${icon("shield", 16)}</span>
            <span>
              Roles determine frontend navigation and attach authoritative <code>X-Actor-Role</code> headers to backend API requests.
            </span>
          </div>
        </section>
      </div>
    </div>
  `;
}

export function mount(root, context) {
  const controller = new AbortController();
  const { signal } = controller;

  const customForm = root.querySelector("#custom-login-form");
  const errorTarget = root.querySelector("#login-error");

  const doStudentLogin = () => {
    store.login({
      id: "STU001",
      role: "STUDENT",
      name: "Aarav Sharma",
      class_name: "10-A",
      preferred_language: "Kannada",
    });
    context.navigate("dashboard");
    context.notify("Signed in as Aarav Sharma (Student)", "success");
  };

  const doTeacherLogin = () => {
    store.login({
      id: "TEA001",
      role: "TEACHER",
      name: "Priya Sharma",
      class_name: "Faculty",
      preferred_language: "English",
    });
    context.navigate("teacher-dashboard");
    context.notify("Signed in as Priya Sharma (Teacher)", "success");
  };

  const doAdminLogin = () => {
    store.login({
      id: "ADM001",
      role: "ADMIN",
      name: "Dr. Arvind Rao",
      class_name: "Administration",
      preferred_language: "English",
    });
    context.navigate("admin");
    context.notify("Signed in as Dr. Arvind Rao (School Admin)", "success");
  };

  const doMerchantLogin = () => {
    store.login({
      id: "MERCHANT001",
      role: "MERCHANT",
      name: "Campus Canteen",
      class_name: "Canteen Operator",
      preferred_language: "English",
    });
    context.navigate("merchant");
    context.notify("Signed in as Campus Canteen (Merchant)", "success");
  };

  // Persona card quick clicks
  root.querySelector("#persona-student")?.addEventListener("click", doStudentLogin, { signal });
  root.querySelector("#persona-teacher")?.addEventListener("click", doTeacherLogin, { signal });
  root.querySelector("#persona-admin")?.addEventListener("click", doAdminLogin, { signal });
  root.querySelector("#persona-merchant")?.addEventListener("click", doMerchantLogin, { signal });

  customForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const role = root.querySelector("#custom-role").value;
    const idInput = root.querySelector("#custom-id").value.trim();
    const submitButton = customForm.querySelector('button[type="submit"]');

    if (!idInput) {
      if (errorTarget) errorTarget.textContent = "Please enter an identifier.";
      return;
    }

    if (errorTarget) errorTarget.textContent = "";
    if (submitButton) submitButton.disabled = true;

    try {
      if (role === "STUDENT") {
        const student = await api.get(`/api/students/${encodeURIComponent(idInput)}`);
        store.login({
          id: student.id,
          role: "STUDENT",
          name: student.name,
          class_name: student.class_name,
          preferred_language: student.preferred_language,
        });
        context.navigate("dashboard");
        context.notify(`Signed in as ${student.name} (Student)`, "success");
        return;
      }

      if (role === "TEACHER") {
        store.login({
          id: idInput,
          role: "TEACHER",
          name: idInput.toUpperCase() === "TEA001" ? "Priya Sharma" : `Faculty (${idInput})`,
          class_name: "Faculty",
          preferred_language: "English",
        });
        context.navigate("teacher-dashboard");
        context.notify(`Signed in as Teacher (${idInput})`, "success");
        return;
      }

      if (role === "ADMIN") {
        store.login({
          id: idInput,
          role: "ADMIN",
          name: idInput.toUpperCase() === "ADM001" ? "Dr. Arvind Rao" : `Administrator (${idInput})`,
          class_name: "Administration",
          preferred_language: "English",
        });
        context.navigate("admin");
        context.notify(`Signed in as School Admin (${idInput})`, "success");
        return;
      }

      if (role === "MERCHANT") {
        store.login({
          id: idInput,
          role: "MERCHANT",
          name: idInput.toUpperCase() === "MERCHANT001" ? "Campus Canteen" : `Merchant (${idInput})`,
          class_name: "Merchant Terminal",
          preferred_language: "English",
        });
        context.navigate("merchant");
        context.notify(`Signed in as Merchant (${idInput})`, "success");
        return;
      }
    } catch (err) {
      if (errorTarget) {
        errorTarget.textContent = err && err.status === 404
          ? `No student record found for "${idInput}".`
          : (err && err.message) || "We could not verify that identifier. Please try again.";
      }
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  }, { signal });

  return () => controller.abort();
}

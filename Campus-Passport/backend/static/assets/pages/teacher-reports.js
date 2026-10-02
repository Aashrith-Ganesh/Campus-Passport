import { escapeHtml, icon, statusBadge, formatNumber } from "../ui.js";

/**
 * Teacher Diagnostic Reports View
 * Visualizes pedagogical insights, concept mastery, and intervention recommendations.
 */
export function render({ state }) {
  const students = Array.isArray(state.allStudents) ? state.allStudents : [];

  return `
    <section class="page teacher-reports-page">
      <header class="page-head">
        <div>
          <p class="page-kicker"><span class="kicker-dot"></span>PEDAGOGICAL INSIGHTS &bull; CAMPUS LENS</p>
          <h1 class="page-title">Diagnostic Learning Reports</h1>
          <p class="page-lead">Deterministic concept evaluation and actionable recommendations to support targeted classroom interventions. Reports are produced from a sample concept check you run here, not from stored student submissions.</p>
        </div>
      </header>

      <section class="card card-pad" aria-labelledby="report-generator-title">
        <div class="card-header">
          <div>
            <span class="card-label">ASSESSMENT SELECTION</span>
            <h2 id="report-generator-title">Select Student Cohort Assessment</h2>
            <p>Runs a sample concept check through the deterministic report API. The questions and answers are illustrative inputs used to demonstrate the diagnostic &mdash; they are not a record of this student's submitted work.</p>
          </div>
        </div>

        <form id="teacher-report-form" class="form-grid" novalidate>
          <div class="field">
            <label for="report-student">Student</label>
            <select class="select" id="report-student" name="student_id">
              ${students.map((s) => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)} (${escapeHtml(s.id)}) &bull; Class ${escapeHtml(s.class_name || "10")}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label for="report-topic">Assessment Topic</label>
            <input class="input" id="report-topic" name="topic" type="text" value="Photosynthesis and Cellular Respiration" required />
          </div>
          <div class="field">
            <label for="report-difficulty">Assessed Difficulty</label>
            <select class="select" id="report-difficulty" name="difficulty">
              <option value="easy">Easy</option>
              <option value="medium" selected>Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div class="field">
            <label for="report-language">Instruction Language</label>
            <select class="select" id="report-language" name="language">
              <option value="Kannada" selected>Kannada</option>
              <option value="Hindi">Hindi</option>
              <option value="English">English</option>
            </select>
          </div>
          <div class="field field-full" style="margin-top:8px;">
            <button class="button button-primary" id="btn-generate-report" type="submit">
              Generate Diagnostic Report ${icon("arrow-right", 14)}
            </button>
          </div>
        </form>
      </section>

      <div id="report-result-container" style="margin-top:24px;"></div>
    </section>
  `;
}

export function mount(root, context) {
  const form = root.querySelector("#teacher-report-form");
  const resultContainer = root.querySelector("#report-result-container");
  const submitBtn = root.querySelector("#btn-generate-report");
  const controller = new AbortController();

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const studentId = form.student_id.value;
    const topic = form.topic.value.trim() || "Science Topic";
    const difficulty = form.difficulty.value;
    const language = form.language.value;

    submitBtn.disabled = true;
    submitBtn.textContent = "Analyzing concept performance...";

    try {
      // Create representative submission for diagnostic report
      const payload = {
        student_id: studentId,
        topic: topic,
        difficulty: difficulty,
        language: language,
        questions: [
          {
            id: "1",
            question: `Which organelle is primarily responsible for ${topic}?`,
            options: ["Chloroplast", "Mitochondria", "Ribosome", "Nucleus"],
            correct_answer: "Chloroplast",
            concept: "Organelle Function",
            explanation: "Chloroplasts contain chlorophyll for capturing solar energy.",
          },
          {
            id: "2",
            question: "What is the primary chemical product of the light reactions?",
            options: ["ATP and NADPH", "Glucose", "Carbon dioxide", "Lactic acid"],
            correct_answer: "ATP and NADPH",
            concept: "Energy Transformation",
            explanation: "Light reactions convert solar energy to ATP and NADPH.",
          },
          {
            id: "3",
            question: "Where do the light-independent Calvin cycle reactions take place?",
            options: ["Stroma", "Thylakoid lumen", "Outer membrane", "Cytosol"],
            correct_answer: "Stroma",
            concept: "Calvin Cycle",
            explanation: "The stroma contains enzymes required for carbon fixation.",
          },
        ],
        answers: [
          { question_id: "1", selected_answer: "Chloroplast" },
          { question_id: "2", selected_answer: "Glucose" }, // deliberate error to demonstrate diagnostic
          { question_id: "3", selected_answer: "Stroma" },
        ],
      };

      const response = await context.api.postJSON("/api/campus-lens/teacher-report", payload);
      const report = response?.report;

      if (!report) throw new Error("No report returned by teacher-report endpoint.");

      const insights = report.learning_insights || {};
      const strengths = Array.isArray(insights.strengths) ? insights.strengths : (Array.isArray(report.strengths) ? report.strengths : []);
      const improvements = Array.isArray(insights.areas_for_improvement) ? insights.areas_for_improvement : (Array.isArray(report.areas_for_improvement) ? report.areas_for_improvement : []);
      const summary = insights.summary || report.learning_summary || "Concept evaluation complete.";
      const recommendedAction = report.recommended_teacher_action || report.recommended_action || "Continue with planned activities.";

      resultContainer.innerHTML = `
        <article class="card card-pad" aria-labelledby="diagnostic-report-title">
          <div class="card-header">
            <div>
              <span class="card-label">DIAGNOSTIC OUTCOME &bull; SAMPLE ASSESSMENT</span>
              <h2 id="diagnostic-report-title">Sample report for ${escapeHtml(report.student?.name || "Student")} (${escapeHtml(report.student?.id)})</h2>
              <p>Topic: <strong>${escapeHtml(report.learning_activity?.topic)}</strong> &bull; Class ${escapeHtml(report.student?.class)} &bull; ${escapeHtml(report.student?.language)}</p>
            </div>
            ${statusBadge("ACTIVE", `${report.performance?.score}/${report.performance?.total_questions} CORRECT (${report.performance?.percentage}%)`)}
          </div>

          <div class="notice notice-warning" style="margin-top:14px;" role="note">
            <span>${icon("info", 17)}</span>
            <div>
              <strong>Sample assessment, not a stored record</strong>
              <p>The score, mastered concepts, and gaps below are computed from illustrative questions and answers sent to the report API just now. This student has not necessarily attempted this topic.</p>
            </div>
          </div>

          <div class="notice notice-info" style="margin-top:14px;">
            <span>${icon("info", 17)}</span>
            <div>
              <strong>Pedagogical Summary</strong>
              <p>${escapeHtml(summary)}</p>
            </div>
          </div>

          <div class="content-grid" style="margin-top:20px;">
            <div class="stat-card" style="border-left: 4px solid var(--green);">
              <small style="color:var(--green);">Mastered Concepts (Strengths)</small>
              ${strengths.length ? `
                <div class="concept-list" style="margin-top:10px;">
                  ${strengths.map((s) => `<span class="status-badge status-positive">${escapeHtml(s)}</span>`).join(" ")}
                </div>
              ` : `<p class="field-hint">No concepts fully demonstrated yet.</p>`}
            </div>

            <div class="stat-card" style="border-left: 4px solid var(--amber);">
              <small style="color:var(--amber);">Concepts Needing Reinforcement</small>
              ${improvements.length ? `
                <div class="concept-list" style="margin-top:10px;">
                  ${improvements.map((s) => `<span class="status-badge status-progress">${escapeHtml(s)}</span>`).join(" ")}
                </div>
              ` : `<p class="field-hint">All assessed concepts answered correctly.</p>`}
            </div>
          </div>

          <div class="card-pad" style="margin-top:20px;background:#fafaf7;border-radius:12px;border:1px solid var(--line);">
            <h3 style="margin:0 0 6px;font-size:13px;font-weight:760;">Recommended Pedagogical Action</h3>
            <p style="margin:0;font-size:12px;line-height:1.6;color:var(--ink);">
              ${escapeHtml(recommendedAction)}
            </p>
          </div>
        </article>
      `;
      context.notify("Teacher diagnostic report generated successfully.", "success");
    } catch (err) {
      resultContainer.innerHTML = `
        <div class="notice notice-error" role="alert">
          <span>${icon("info", 17)}</span>
          <div>
            <strong>Report Generation Error</strong>
            <p>${escapeHtml(err.message || "Failed to generate teacher diagnostic report.")}</p>
          </div>
        </div>
      `;
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `Generate Diagnostic Report ${icon("arrow-right", 14)}`;
    }
  }, { signal: controller.signal });

  return () => controller.abort();
}

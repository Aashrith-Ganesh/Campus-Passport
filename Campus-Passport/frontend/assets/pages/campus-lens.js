import { allAchievements, profileFrom } from "../data.js";
import { escapeHtml, formatDate, formatNumber, friendlyError, icon, statusBadge } from "../ui.js";

const session = {
  file: null,
  previewUrl: null,
  analysis: null,
  questions: null,
  answers: {},
  index: 0,
  result: null,
  preSubmitAchievementKeys: null,
  difficulty: "medium",
  error: "",
  errorTone: "error",
  busy: "",
};
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function resetSession() {
  if (session.previewUrl) URL.revokeObjectURL(session.previewUrl);
  session.file = null;
  session.previewUrl = null;
  session.analysis = null;
  session.questions = null;
  session.answers = {};
  session.index = 0;
  session.result = null;
  session.preSubmitAchievementKeys = null;
  session.error = "";
  session.errorTone = "error";
  session.busy = "";
}

function activeStep() {
  if (session.result) return 3;
  if (session.questions) return 2;
  if (session.analysis) return 1;
  return 0;
}

function stepper() {
  const steps = [
    ["SNAP", "Choose a page"], ["UNDERSTAND", "Read the ideas"], ["PRACTICE", "Try a quiz"], ["PROVE", "See your result"],
  ];
  const current = activeStep();
  return `<div class="stepper" aria-label="Campus Lens learning flow">${steps.map(([title, sub], index) => `<div class="stepper-item ${index < current ? "is-done" : index === current ? "is-active" : ""}" ${index === current ? 'aria-current="step"' : ""}><span class="stepper-number">${index < current ? icon("check", 13) : index + 1}</span><span><strong>${title}</strong><small>${sub}</small></span></div>`).join("")}</div>`;
}

function fileInputPanel() {
  const preview = session.file && session.previewUrl
    ? `<div class="preview-panel"><img class="preview-image" src="${escapeHtml(session.previewUrl)}" alt="Preview of ${escapeHtml(session.file.name)}" /><span class="preview-label">${escapeHtml(session.file.name)}</span><button class="button button-quiet button-small preview-remove" id="lens-remove-photo" type="button">Choose a different photo</button></div>`
    : `<label class="drop-zone" id="lens-drop-zone" for="lens-image"><span class="drop-icon">${icon("camera", 22)}</span><strong>Choose or capture a page photo</strong><span>JPG, PNG, or WEBP · under 10 MB · drag and drop also works</span><span class="button button-secondary button-small">Choose image</span></label>`;
  return `<div class="capture-layout"><div>
    ${preview}
    <input class="visually-hidden" id="lens-image" name="image" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" aria-label="Choose or capture a textbook page image" />
  </div>
  <div class="form-grid" style="align-content:start">
    <div class="field field-full"><label for="lens-language">Explanation language</label><select class="select" id="lens-language" name="language"><option value="Kannada">Kannada</option><option value="Hindi">Hindi</option><option value="English">English</option></select><span class="field-hint">Only languages supported by the current Campus Lens API are listed.</span></div>
    <div class="field field-full"><label for="lens-grade">Grade</label><input class="input" id="lens-grade" name="grade" type="text" maxlength="20" autocomplete="off" placeholder="e.g. 10" /><span class="field-hint">Used as context for the existing analysis and quiz endpoints.</span></div>
    <div class="field field-full"><label for="lens-difficulty">Quiz difficulty</label><select class="select" id="lens-difficulty" name="difficulty"><option value="easy">Easy</option><option value="medium" selected>Medium</option><option value="hard">Hard</option></select><span class="field-hint">The quiz API accepts easy, medium, or hard.</span></div>
    <div class="field field-full"><button class="button button-primary button-full" id="lens-analyze" type="button" ${session.file && !session.busy ? "" : "disabled"}>${session.busy === "analysis" ? "Analyzing page…" : `Analyze this page ${icon("arrow-right", 15)}`}</button></div>
  </div></div>`;
}

/** True only when the analysis returned something a quiz could honestly be built from. */
function hasMaterial(data) {
  const explanation = String(data?.translated_explanation || data?.simple_explanation || "").trim();
  const concepts = Array.isArray(data?.key_concepts)
    ? data.key_concepts.filter((item) => String(item).trim())
    : [];
  return Boolean(explanation || concepts.length);
}

function qualityNotice(analysis) {
  if (analysis.image_quality === "unreadable") return `<div class="notice notice-warning" role="status"><span>${icon("info", 18)}</span><div><strong>This page was marked unreadable.</strong><p>Review the returned analysis carefully, or choose a clearer photo before continuing.</p></div></div>`;
  if (analysis.image_quality === "partially_readable") return `<div class="notice notice-warning" role="status"><span>${icon("info", 18)}</span><div><strong>Some of the page may be hard to read.</strong><p>The analysis returned partial readability; check the extracted text before starting a quiz.</p></div></div>`;
  return "";
}

function analysisPanel() {
  const data = session.analysis;
  const concepts = Array.isArray(data.key_concepts) ? data.key_concepts : [];
  const subtopics = Array.isArray(data.subtopics) ? data.subtopics : [];
  return `<section class="card card-pad" aria-labelledby="lens-analysis-title">
    <div class="card-header"><div><span class="card-label">UNDERSTAND · ANALYSIS RETURNED BY CAMPUS LENS</span><h2 id="lens-analysis-title">${escapeHtml(data.topic || "Your page")}</h2><p>${subtopics.length ? escapeHtml(subtopics.join(" · ")) : "The current analysis returned no subtopics."}</p></div>${statusBadge(data.image_quality, data.image_quality === "good" ? "PAGE READABLE" : data.image_quality)}</div>
    ${qualityNotice(data)}
    ${session.error ? `<div class="notice notice-error" role="alert" style="margin-top:12px"><span>${icon("info", 17)}</span><div><strong>Campus Lens could not build the quiz.</strong><p>${escapeHtml(session.error)}</p></div></div>` : ""}
    <div class="analysis-block" style="margin-top:14px"><h3>In simple terms</h3><p>${escapeHtml(data.simple_explanation || "No simple explanation was returned.")}</p></div>
    <div class="analysis-grid" style="margin-top:14px">
      <div class="analysis-panel"><h4>Extracted text</h4><div class="extracted-text">${escapeHtml(data.extracted_text || "No text was returned.")}</div></div>
      <div class="analysis-panel"><h4>${escapeHtml(data.language || "Language")} explanation</h4><div class="extracted-text">${escapeHtml(data.translated_explanation || "No translated explanation was returned.")}</div></div>
    </div>
    <div class="analysis-block" style="margin-top:15px"><h3>Key concepts</h3>${concepts.length ? `<div class="concept-list">${concepts.map((item) => `<span class="concept-chip">${escapeHtml(item)}</span>`).join("")}</div>` : `<p>No key concepts were returned by the analysis.</p>`}</div>
    <div class="field" style="max-width:220px;margin-top:15px"><label for="lens-difficulty">Quiz difficulty</label><select class="select" id="lens-difficulty" name="difficulty"><option value="easy" ${session.difficulty === "easy" ? "selected" : ""}>Easy</option><option value="medium" ${session.difficulty === "medium" ? "selected" : ""}>Medium</option><option value="hard" ${session.difficulty === "hard" ? "selected" : ""}>Hard</option></select></div>
    <div class="form-actions">${hasMaterial(data)
      ? `<button class="button button-primary" id="lens-generate-quiz" type="button" ${session.busy ? "disabled" : ""}>${session.busy === "quiz" ? "Building quiz…" : `Practice with 3 questions ${icon("arrow-right", 15)}`}</button>`
      : `<div class="notice notice-warning" role="status" style="flex:1;margin:0"><span>${icon("info", 17)}</span><div><strong>No material to practice from.</strong><p>Campus Lens returned no explanation and no key concepts for this photo, so a quiz cannot be built from it. Choose a clearer photo and analyze it again.</p></div></div>`}<button class="button button-secondary" id="lens-new-photo" type="button">Choose a different page</button></div>
  </section>`;
}

function quizPanel(state) {
  const question = session.questions?.[session.index];
  if (!question) return `<div class="notice notice-error" role="alert"><span>${icon("info", 18)}</span><div><strong>The returned quiz is unavailable.</strong><p>Generate a new quiz from the page analysis.</p><button class="button button-secondary button-small" id="lens-new-photo" type="button">Start again</button></div></div>`;
  const chosen = session.answers[question.id];
  const total = session.questions.length;
  const percent = Math.round(((session.index + 1) / total) * 100);
  const language = document.getElementById("lens-language")?.value || profileFrom(state)?.preferred_language || "Kannada";
  return `<section class="card card-pad" aria-labelledby="quiz-title">
    <div class="quiz-header"><div><span class="card-label">PRACTICE · ${escapeHtml(String(session.difficulty).toUpperCase())} DIFFICULTY</span><h2 id="quiz-title">${escapeHtml(session.analysis.topic || "Your learning check")}</h2></div><span class="quiz-progress-copy">Question ${session.index + 1} of ${total}</span></div>
    <div class="progress-track" role="progressbar" aria-label="Quiz question progress" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${session.index + 1}" style="margin-top:13px"><div class="progress-fill" style="width:${percent}%"></div></div>
    <p class="quiz-question">${escapeHtml(question.question)}</p>
    <div class="quiz-options" role="group" aria-label="Choose one answer">${question.options.map((option, index) => `<button class="quiz-option" type="button" data-option="${index}" aria-pressed="${chosen === option}"><span class="option-letter">${String.fromCharCode(65 + index)}</span><span>${escapeHtml(option)}</span></button>`).join("")}</div>
    <div id="lens-quiz-error" class="field-error" role="alert" aria-live="polite">${escapeHtml(session.error)}</div>
    <div class="quiz-controls"><button class="button button-quiet" id="lens-exit-quiz" type="button">${icon("chevron-left", 15)} Back to analysis</button><div class="quiz-control-group">${session.index > 0 ? `<button class="button button-secondary" id="lens-previous" type="button">${icon("chevron-left", 15)} Previous</button>` : ""}${session.index < total - 1 ? `<button class="button button-primary" id="lens-next" type="button" ${chosen ? "" : "disabled"}>Next ${icon("chevron-right", 15)}</button>` : `<button class="button button-primary" id="lens-submit-quiz" type="button" ${total && Object.keys(session.answers).length === total && !session.busy ? "" : "disabled"}>${session.busy === "submit" ? "Checking answers…" : `Submit answers ${icon("check", 15)}`}</button>`}</div></div>
    <p class="form-footnote">The backend returns the quiz questions and determines your score. Correct answers and explanations stay hidden until the score is returned.</p>
  </section>`;
}

function achievementKey(item) {
  if (item.id !== undefined && item.id !== null) return `id:${String(item.id)}`;
  return [item.type, item.source, item.title, item.timestamp, item.evidence]
    .map((value) => String(value ?? ""))
    .join("|");
}

function learningEvidencePanel(state) {
  if (state.resourceErrors?.passport) {
    return `<div class="notice notice-warning" role="status"><span>${icon("info", 17)}</span><div><strong>Passport evidence could not be confirmed.</strong><p>Your quiz score is shown above. Use the refresh control or open your Passport to retry; this view will not guess whether an achievement was added.</p><a class="text-link" href="#passport">Open your Passport ${icon("arrow-right", 13)}</a></div></div>`;
  }

  const topic = String(session.result?.topic || session.analysis?.topic || "Textbook page");
  const title = `${topic} Concept Mastery`;
  const achievement = allAchievements(state).find((item) => item.type === "LEARNING" && item.source === "CAMPUS_LENS" && item.title === title);
  if (achievement) {
    const wasPresent = session.preSubmitAchievementKeys?.has(achievementKey(achievement));
    const label = session.preSubmitAchievementKeys == null
      ? "RETURNED BY PASSPORT"
      : wasPresent ? "ALREADY ON YOUR PASSPORT" : "ADDED TO YOUR PASSPORT";
    const evidence = achievement.evidence || achievement.description || "Evidence details were not returned.";
    return `<div class="achievement-list"><article class="achievement-card"><span class="achievement-mark">${icon("award", 17)}</span><div class="achievement-copy"><h3>${escapeHtml(achievement.title)}</h3><p>${escapeHtml(achievement.description || "Verified learning evidence returned by your Passport.")}</p><div class="achievement-meta"><span>${icon("calendar", 12)} ${escapeHtml(formatDate(achievement.timestamp))}</span><span>${escapeHtml(evidence)}</span></div></div><div class="achievement-stamp">${statusBadge("VERIFIED", label)}</div></article></div>`;
  }

  const score = Number(session.result?.percentage);
  const thresholdMet = Number.isFinite(score) && score >= 80;
  return `<div class="notice ${thresholdMet ? "notice-warning" : "notice-info"}" role="status"><span>${icon("info", 17)}</span><div><strong>${thresholdMet ? "No matching learning achievement appeared after refresh." : "No learning achievement was returned for this result."}</strong><p>${thresholdMet ? "The backend returned a score at or above its learning-achievement threshold, but the refreshed Passport did not contain matching Campus Lens evidence. The score above remains real; no achievement is being claimed." : "The refreshed Passport did not return a Campus Lens learning achievement for this quiz. The score above remains available, and only backend-confirmed records are shown as evidence."}</p><a class="text-link" href="#passport">Open your Passport ${icon("arrow-right", 13)}</a></div></div>`;
}

function resultPanel(state) {
  const result = session.result;
  const percentage = Number(result?.percentage);
  const percentText = Number.isFinite(percentage) ? `${percentage.toFixed(1)}%` : "—";
  const score = formatNumber(result?.score);
  const total = formatNumber(result?.total_questions);
  const concepts = Array.isArray(result?.concept_results) ? result.concept_results : [];
  return `<section class="card card-pad" aria-labelledby="lens-result-title">
    <div class="quiz-header"><div><span class="card-label">PROVE · RESULT RETURNED BY THE BACKEND</span><h2 id="lens-result-title">Your practice, reflected back.</h2></div>${statusBadge("COMPLETED", "SCORED")}</div>
    <div class="result-score" style="margin-top:15px"><div class="score-ring" aria-label="${escapeHtml(percentText)}">${escapeHtml(percentText)}</div><div><h3>${escapeHtml(score)} of ${escapeHtml(total)} correct</h3><p>${escapeHtml(result?.topic || session.analysis?.topic || "Learning check")} · ${escapeHtml(result?.difficulty || session.difficulty)} difficulty</p><p>Next difficulty suggested by the backend: <strong>${escapeHtml(result?.next_difficulty || "Not returned")}</strong></p></div></div>
    <div class="section-block"><div class="section-heading"><div><h3>Concept check</h3><p>Results returned by deterministic backend scoring.</p></div></div>${concepts.length ? `<div class="answer-review">${concepts.map((item) => `<article class="answer-review-item"><h4>${escapeHtml(item.concept || "Concept")}</h4><p>${item.correct ? "Answered correctly" : "Needs another look"}${item.question_id ? ` · Question ${escapeHtml(item.question_id)}` : ""}</p></article>`).join("")}</div>` : `<p class="field-hint">No concept breakdown was returned.</p>`}</div>
    <div class="section-block" aria-labelledby="lens-evidence-title" style="margin-top:16px"><div class="section-heading"><div><h3 id="lens-evidence-title">Learning evidence</h3><p>Only an achievement returned by the refreshed Passport is shown here.</p></div></div>${learningEvidencePanel(state)}</div>
    <div class="form-actions"><a class="button button-primary" href="#passport">Open your Passport ${icon("arrow-up-right", 15)}</a><button class="button button-secondary" id="lens-new-photo" type="button">Learn from another page</button></div>
  </section>`;
}

function capturePanel(state) {
  const profile = profileFrom(state);
  const grade = profile?.class_name || "10";
  const configured = state.campusLensStatus?.ai_configured;
  return `<section class="card card-pad" aria-labelledby="lens-snap-title"><div class="card-header"><div><span class="card-label">SNAP · START WITH A REAL PAGE</span><h2 id="lens-snap-title">Take a closer look at what you're learning.</h2><p>Campus Lens analyzes your page through the existing image-analysis endpoint.</p></div><span class="evidence-icon">${icon("camera", 17)}</span></div>
    ${configured === false ? `<div class="notice notice-warning" role="status" style="margin-bottom:14px"><span>${icon("info", 17)}</span><div><strong>Campus Lens AI is not configured.</strong><p>The backend status endpoint reports that analysis is unavailable. The photo can still be selected, but no result will be invented; configure the backend AI service and refresh to try again.</p></div></div>` : configured === true ? `<div class="notice notice-success" role="status" style="margin-bottom:14px"><span>${icon("check-circle", 17)}</span><div><strong>Analysis service is configured.</strong><p>Successful results still depend on the actual image-analysis response.</p></div></div>` : ""}
    ${fileInputPanel()}
    ${session.error ? `<div class="notice notice-${session.errorTone}" role="alert" style="margin-top:14px"><span>${icon("info", 17)}</span><div><strong>Campus Lens couldn't continue.</strong><p>${escapeHtml(session.error)}</p><button class="button button-secondary button-small" id="lens-retry-analysis" type="button">Try again</button></div></div>` : ""}
    <p class="form-footnote">Accepted by this backend: JPG, PNG, and WEBP; maximum 10 MB. The camera option appears on devices whose browser supports it. The analysis and quiz require the backend's configured AI service.</p>
  </section>`;
}

/** @param {{state: Record<string, any>}} context */
export function render({ state }) {
  const stage = activeStep();
  const body = session.result ? resultPanel(state) : session.questions ? quizPanel(state) : session.analysis ? analysisPanel() : capturePanel(state);
  return `<section class="page campus-lens-page">
    <header class="page-head"><div><p class="page-kicker"><span class="kicker-dot"></span>LEARN · CAMPUS LENS</p><h1 class="page-title">Make a textbook page make sense.</h1><p class="page-lead">A real page becomes a simpler explanation, a short quiz, and—when the backend verifies it—learning evidence.</p></div></header>
    ${stepper()}
    <div class="lens-layout"><div class="lens-main-column">${session.error && session.questions ? `<div class="notice notice-error" role="alert"><span>${icon("info", 17)}</span><div><strong>Your result was not returned.</strong><p>${escapeHtml(session.error)}</p></div></div>` : ""}${body}</div>
      <aside class="lens-aside" aria-label="How Campus Lens works"><div class="lens-side-card"><span class="lens-side-mark">${icon("bookopen", 17)}</span><h3>Photo → concept</h3><p>Extracted text and explanations come from the actual analysis API.</p></div><div class="lens-side-card"><span class="lens-side-mark">${icon("target", 17)}</span><h3>Practice → evidence</h3><p>The backend scores submitted answers. Correct answers stay hidden until that response arrives.</p></div><div class="lens-side-card"><span class="lens-side-mark">${icon("shield", 17)}</span><h3>No pretend results</h3><p>If image analysis or quiz generation fails, this page tells you and keeps your work available to retry.</p></div></aside>
    </div>
  </section>`;
}

export function mount(root, context) {
  const controller = new AbortController();
  const { signal } = controller;
  const imageInput = root.querySelector("#lens-image");
  const zone = root.querySelector("#lens-drop-zone");
  const setError = (message, tone = "error") => { session.error = message; session.errorTone = tone; };
  const setFile = (file) => {
    session.error = "";
    if (!file) return;
    if (!ALLOWED_TYPES.has(file.type)) {
      setError("Please choose a JPG, PNG, or WEBP image.");
      context.render();
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("This image is larger than the backend's 10 MB limit. Choose a smaller image.");
      context.render();
      return;
    }
    if (!file.size) {
      setError("This image file is empty. Choose a readable page photo.");
      context.render();
      return;
    }
    if (session.previewUrl) URL.revokeObjectURL(session.previewUrl);
    session.file = file;
    session.previewUrl = URL.createObjectURL(file);
    session.analysis = null;
    session.questions = null;
    session.answers = {};
    session.index = 0;
    session.result = null;
    context.render();
  };

  if (imageInput) imageInput.addEventListener("change", () => setFile(imageInput.files?.[0]), { signal });
  if (zone) {
    zone.addEventListener("dragover", (event) => { event.preventDefault(); zone.classList.add("is-dragging"); }, { signal });
    zone.addEventListener("dragleave", () => zone.classList.remove("is-dragging"), { signal });
    zone.addEventListener("drop", (event) => {
      event.preventDefault();
      zone.classList.remove("is-dragging");
      setFile(event.dataTransfer?.files?.[0]);
    }, { signal });
  }

  root.querySelector("#lens-remove-photo")?.addEventListener("click", () => {
    if (imageInput) imageInput.click();
  }, { signal });
  root.querySelector("#lens-new-photo")?.addEventListener("click", () => { resetSession(); context.render(); }, { signal });
  root.querySelector("#lens-retry-analysis")?.addEventListener("click", () => { session.error = ""; root.querySelector("#lens-analyze")?.click(); }, { signal });

  root.querySelector("#lens-analyze")?.addEventListener("click", async () => {
    if (!session.file) {
      setError("Choose an image before asking Campus Lens to analyze a page.");
      context.render();
      return;
    }
    const language = root.querySelector("#lens-language")?.value || "Kannada";
    const grade = root.querySelector("#lens-grade")?.value?.trim() || profileFrom(context.state)?.class_name || "10";
    session.difficulty = root.querySelector("#lens-difficulty")?.value || "medium";
    const form = new FormData();
    form.append("image", session.file, session.file.name);
    form.append("language", language);
    form.append("grade", grade);
    session.busy = "analysis";
    session.error = "";
    context.render();
    try {
      const response = await context.api.postForm("/api/campus-lens/analyze", form);
      if (!response?.success || !response?.data || typeof response.data !== "object") throw new Error("The analysis response did not include verified page data.");
      session.analysis = response.data;
      session.analysis.language = language;
      session.analysis.grade = grade;
      session.busy = "";
      context.notify("The page analysis was returned by Campus Lens.", "success");
      context.render();
    } catch (error) {
      session.busy = "";
      setError(friendlyError(error, "Campus Lens could not analyze this page. Your photo is still available to retry."));
      context.render();
    }
  }, { signal });

  root.querySelector("#lens-generate-quiz")?.addEventListener("click", async () => {
    if (!session.analysis) return;
    if (!hasMaterial(session.analysis)) {
      setError("There is no analyzed material to build a quiz from. Choose a clearer page and analyze it again.");
      context.render();
      return;
    }
    const difficulty = root.querySelector("#lens-difficulty")?.value || session.difficulty || "medium";
    const language = session.analysis.language || "Kannada";
    const grade = session.analysis.grade || profileFrom(context.state)?.class_name || "10";
    const form = new FormData();
    form.append("topic", session.analysis.topic || "Textbook page");
    form.append("explanation", session.analysis.translated_explanation || session.analysis.simple_explanation || "");
    form.append("key_concepts", Array.isArray(session.analysis.key_concepts) ? session.analysis.key_concepts.join("|") : "");
    form.append("language", language);
    form.append("grade", grade);
    form.append("difficulty", difficulty);
    session.busy = "quiz";
    session.error = "";
    context.render();
    try {
      const response = await context.api.postForm("/api/campus-lens/quiz", form);
      const questions = response?.quiz;
      if (!response?.success || !Array.isArray(questions) || questions.length !== 3 || questions.some((item) => !Array.isArray(item.options) || item.options.length !== 4)) {
        throw new Error("The quiz service did not return the expected three questions with four choices each.");
      }
      session.questions = questions;
      session.answers = {};
      session.index = 0;
      session.difficulty = difficulty;
      session.busy = "";
      context.render();
    } catch (error) {
      session.busy = "";
      setError(friendlyError(error, "A quiz could not be generated from the returned analysis. Try again when the AI service is available."));
      context.render();
    }
  }, { signal });

  root.querySelector("#lens-exit-quiz")?.addEventListener("click", () => { session.questions = null; session.answers = {}; session.index = 0; session.error = ""; context.render(); }, { signal });
  root.querySelector("#lens-previous")?.addEventListener("click", () => { session.index = Math.max(0, session.index - 1); session.error = ""; context.render(); }, { signal });
  root.querySelector("#lens-next")?.addEventListener("click", () => {
    const question = session.questions?.[session.index];
    if (!question || !session.answers[question.id]) {
      session.error = "Choose an answer before continuing.";
      context.render();
      return;
    }
    session.index = Math.min(session.questions.length - 1, session.index + 1);
    session.error = "";
    context.render();
  }, { signal });
  root.querySelectorAll(".quiz-option").forEach((button) => {
    button.addEventListener("click", () => {
      const question = session.questions?.[session.index];
      const option = question?.options?.[Number(button.dataset.option)];
      if (!question || typeof option !== "string") return;
      session.answers[question.id] = option;
      session.error = "";
      context.render();
    }, { signal });
  });
  root.querySelector("#lens-submit-quiz")?.addEventListener("click", async () => {
    if (!Array.isArray(session.questions) || session.questions.some((question) => !session.answers[question.id])) {
      session.error = "Answer each question before submitting.";
      context.render();
      return;
    }
    const profile = profileFrom(context.state);
    const studentId = profile?.id || profile?.student_id || context.state.studentId;
    const submission = {
      student_id: studentId,
      topic: session.analysis?.topic || "Textbook page",
      language: session.analysis?.language || profile?.preferred_language || "Kannada",
      difficulty: session.difficulty,
      questions: session.questions,
      answers: session.questions.map((question) => ({ question_id: String(question.id), selected_answer: session.answers[question.id] })),
    };
    session.preSubmitAchievementKeys = new Set(allAchievements(context.state).map(achievementKey));
    session.busy = "submit";
    session.error = "";
    context.render();
    try {
      const response = await context.api.postJSON("/api/campus-lens/quiz/submit", submission);
      if (!response?.success || !response?.result || typeof response.result !== "object") throw new Error("The scoring service did not return a result.");
      session.result = response.result;
      session.busy = "";
      context.notify("Campus Lens returned your quiz result.", "success");
      await context.refreshData();
    } catch (error) {
      session.busy = "";
      setError(friendlyError(error, "Your score was not returned. Your answers are still here so you can retry."));
      context.render();
    }
  }, { signal });

  return () => controller.abort();
}

import { statusLabel } from "./ui.js";

/** @param {Record<string, any>} state */
export function profileFrom(state) {
  return state.student || state.passport?.student || null;
}

/** @param {Record<string, any>} state */
export function allAchievements(state) {
  const value = state.passport?.achievements?.all;
  return Array.isArray(value) ? value : [];
}

/** @param {Record<string, any>} state */
export function learningAchievements(state) {
  const value = state.passport?.achievements?.learning;
  return Array.isArray(value)
    ? value
    : allAchievements(state).filter((item) => item.type === "LEARNING" && !item.is_revoked && !String(item.title).includes("[REVOKED]"));
}

/** @param {Record<string, any>} state */
export function contributionAchievements(state) {
  const value = state.passport?.achievements?.contribution;
  return Array.isArray(value)
    ? value
    : allAchievements(state).filter((item) => item.type === "CONTRIBUTION" && !item.is_revoked && !String(item.title).includes("[REVOKED]"));
}

/** @param {Record<string, any>} state */
export function revokedAchievements(state) {
  const value = state.passport?.achievements?.revoked;
  return Array.isArray(value)
    ? value
    : allAchievements(state).filter((item) => item.is_revoked || String(item.title).includes("[REVOKED]") || item.status === "REVOKED");
}

/** @param {Record<string, any>} state */
export function issuesForStudent(state) {
  if (!Array.isArray(state.issues)) return [];
  return state.issues.filter((issue) => issue.student_id === state.studentId);
}

/**
 * A compact activity digest composed only from returned records. It is not a separate
 * notification service and deliberately contains no generated or placeholder events.
 * @param {Record<string, any>} state
 */
export function recentActivity(state) {
  const activities = [];
  for (const item of allAchievements(state)) {
    activities.push({
      kind: item.type === "LEARNING" ? "Learning evidence" : "Contribution evidence",
      title: item.title,
      detail: item.evidence || item.description || item.source || "Achievement recorded",
      created_at: item.timestamp,
      icon: item.type === "LEARNING" ? "book" : "pulse",
      route: "passport",
    });
  }
  for (const item of issuesForStudent(state)) {
    activities.push({
      kind: `Campus Pulse · ${statusLabel(item.status)}`,
      title: item.title,
      detail: [item.category, item.location].filter(Boolean).join(" · ") || "Campus issue",
      created_at: item.created_at,
      icon: "pulse",
      route: "campus-pulse",
    });
  }
  for (const item of Array.isArray(state.transactions) ? state.transactions : []) {
    activities.push({
      kind: `Student Pocket · ${String(item.purpose || "").toLowerCase() || "ledger"}`,
      title: item.reason || "Ledger activity",
      detail: `${Number(item.amount) > 0 ? "+" : ""}${Number(item.amount) || 0} units · ${statusLabel(item.status)}`,
      created_at: item.created_at,
      icon: "wallet",
      route: "opportunity-wallet",
    });
  }
  return activities
    .filter((item) => item.created_at && !Number.isNaN(new Date(item.created_at).getTime()))
    .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
    .slice(0, 6);
}

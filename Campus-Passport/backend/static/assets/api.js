/**
 * Campus Passport — Unified API Client
 * Supports generic HTTP verbs, form uploads, typed errors, and actor role headers.
 */

export class APIError extends Error {
  /**
   * @param {string} message
   * @param {number} status
   * @param {string | undefined} code
   */
  constructor(message, status, code) {
    super(message);
    this.name = "APIError";
    this.status = status;
    this.code = code;
  }
}

function getAuthHeaders() {
  try {
    const raw = localStorage.getItem("cp_user");
    if (raw) {
      const user = JSON.parse(raw);
      return {
        "X-Actor-Role": user.role || "STUDENT",
        "X-Actor-Id": user.id || "STU001",
      };
    }
  } catch {}
  return {};
}

/**
 * Calls an API endpoint on the current origin.
 * @param {string} path
 * @param {RequestInit} [options]
 */
/**
 * Turns a FastAPI/Pydantic `detail` array into one sentence a person can act on.
 * @param {Array<Record<string, unknown>>} detail
 */
function validationMessage(detail) {
  const fields = [];
  for (const item of detail) {
    if (!item || typeof item !== "object") continue;
    const loc = Array.isArray(item.loc) ? item.loc : [];
    const name = String(loc[loc.length - 1] ?? "").trim();
    if (name && name !== "body") fields.push(name.replaceAll("_", " "));
  }
  const unique = [...new Set(fields)];
  if (!unique.length) return "The request was rejected as incomplete.";
  return `The request is missing a value for: ${unique.join(", ")}.`;
}

async function request(path, options = {}) {
  let response;
  const headers = {
    Accept: "application/json",
    ...getAuthHeaders(),
    ...(options.headers || {}),
  };

  try {
    response = await fetch(path, {
      ...options,
      cache: "no-store",
      credentials: "same-origin",
      headers,
    });
  } catch {
    throw new APIError("The Campus Passport service could not be reached.", 0, "NETWORK_ERROR");
  }

  let payload = null;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      payload = await response.json();
    } catch {
      throw new APIError("The service returned an unreadable response.", response.status, "INVALID_RESPONSE");
    }
  }

  if (!response.ok) {
    const detail = payload && typeof payload === "object" ? payload.detail : undefined;
    const code = detail && !Array.isArray(detail) && typeof detail === "object" ? detail.code : undefined;
    const message = Array.isArray(detail)
      ? validationMessage(detail)
      : detail && typeof detail === "object"
        ? detail.message
        : typeof detail === "string"
          ? detail
          : undefined;
    throw new APIError(message || "The request could not be completed.", response.status, code);
  }

  return payload;
}

export const api = {
  /** @param {string} path */
  get(path) {
    return request(path, { method: "GET" });
  },

  /** @param {string} path */
  post(path) {
    return request(path, { method: "POST" });
  },

  /** @param {string} path @param {unknown} body */
  postJSON(path, body) {
    return request(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  },

  /** @param {string} path @param {FormData} body */
  postForm(path, body) {
    return request(path, { method: "POST", body });
  },
};

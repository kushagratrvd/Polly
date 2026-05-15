export function cleanErrorMessage(message) {
  if (!message) return "Unexpected response from server";

  const withoutTags = message
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

  if (!withoutTags) return "Unexpected response from server";
  if (withoutTags.includes("CastError") || withoutTags.includes("DOCTYPE html")) {
    return "We could not complete that request. Please refresh and try again.";
  }

  return withoutTags.length > 180
    ? `${withoutTags.slice(0, 177)}...`
    : withoutTags;
}

export async function readApiResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (response.status === 204) return null;

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  throw new Error(cleanErrorMessage(text));
}

const API_BASE = import.meta.env.VITE_API_URL || (typeof window !== "undefined" ? window.location.origin : "http://localhost:4000");

function getAccessToken() {
  return localStorage.getItem("accessToken");
}

function setAccessToken(token) {
  if (token) {
    localStorage.setItem("accessToken", token);
  }
}

function clearAuthTokens() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
}

async function refreshAccessToken() {
  const response = await fetch(`${API_BASE}/api/auth/refresh-token`, {
    method: "POST",
    credentials: "include",
  });
  const payload = await readApiResponse(response);

  if (!response.ok) {
    clearAuthTokens();
    throw new Error(payload?.message || "Session expired. Please sign in again.");
  }

  const accessToken = payload?.data?.accessToken;
  setAccessToken(accessToken);
  return accessToken;
}

export async function apiRequest(path, options = {}) {
  const {
    auth = false,
    retryOnUnauthorized = true,
    ...fetchOptions
  } = options;

  const request = async (accessToken) => {
    const response = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      ...fetchOptions,
      headers: {
        ...(fetchOptions.headers || {}),
        ...(auth && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    });
    const payload = await readApiResponse(response);
    return { response, payload };
  };

  let { response, payload } = await request(getAccessToken());

  if (auth && response.status === 401 && retryOnUnauthorized) {
    const refreshedToken = await refreshAccessToken();
    ({ response, payload } = await request(refreshedToken));
  }

  if (!response.ok) {
    throw new Error(payload?.message || "Request failed");
  }

  return payload?.data || payload;
}

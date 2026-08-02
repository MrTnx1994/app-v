// Thin wrapper around fetch() that automatically attaches the session token
// issued at login (Authorization: Bearer <token>) to every request, and
// clears the local session if the server ever says the token is invalid.
//
// Usage is identical to fetch(): apiFetch(url, options) -> Promise<Response>

const TOKEN_KEY = "app_auth_token";

export const getAuthToken = (): string | null => localStorage.getItem(TOKEN_KEY);

export const setAuthToken = (token: string | null) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
};

// Fired whenever a request comes back 401 so the app can log the user out.
type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;
export const setUnauthorizedHandler = (handler: UnauthorizedHandler | null) => {
  onUnauthorized = handler;
};

export const apiFetch = async (input: string, init: RequestInit = {}): Promise<Response> => {
  const token = getAuthToken();
  const headers = new Headers(init.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // ✅ استفاده از آدرس کامل برای جلوگیری از خطاهای پورت
  const baseUrl = window.location.origin;
  const url = input.startsWith('/') ? `${baseUrl}${input}` : input;

  const response = await fetch(url, { ...init, headers });

  if (response.status === 401 && onUnauthorized) {
    onUnauthorized();
  }

  return response;
};
/**
 * NutriTrack — Backend API Configuration
 * ─────────────────────────────────────────────────────────────
 * This is the SINGLE source of truth for all API calls.
 *
 * HOW TO USE:
 *   Load this script BEFORE any other auth scripts in your HTML:
 *   <script src="./assest/js/auth-backend-config.js"></script>
 *
 * Empty API_BASE_URL uses the page origin, so the same build works after upload.
 */

(function () {

  /* ─── API Base URL ──────────────────────────────────────────── */
  var API_BASE_URL = "";

  window.NutriAuthConfig = {

    /** Full backend URL — no trailing slash */
    API_BASE_URL: API_BASE_URL,

    /**
     * true  = all register/login calls go to Laravel API
     * false = use localStorage-only (offline/demo mode)
     */
    USE_BACKEND: true,

    /** REST endpoint paths — must match routes/api.php exactly */
    ENDPOINTS: {
      register: "/api/register",
      login:    "/api/login",
      logout:   "/api/logout",
      user:     "/api/user",
      sendOtp:  "/api/password/send-otp",
      resetPw:  "/api/password/reset"
    },

    /** localStorage key for the Sanctum Bearer token */
    TOKEN_STORAGE_KEY: "nutri_auth_access_token",

    /**
     * Set to true if backend uses cookie-based sessions
     * and frontend+backend share the same domain.
     */
    WITH_CREDENTIALS: false
  };

  /* ─── URL builder ───────────────────────────────────────────── */
  function buildUrl(path) {
    var base = String(window.NutriAuthConfig.API_BASE_URL || "").replace(/\/+$/, "");
    var p    = String(path || "").replace(/^\/+/, "/");
    if (!base) return p;
    return base + (p.charAt(0) === "/" ? p : "/" + p);
  }

  /* ─── Token helpers ─────────────────────────────────────────── */
  function getStoredToken() {
    try {
      return localStorage.getItem(window.NutriAuthConfig.TOKEN_STORAGE_KEY) || "";
    } catch (e) {
      return "";
    }
  }

  function setStoredToken(token) {
    if (!token) return;
    try {
      localStorage.setItem(window.NutriAuthConfig.TOKEN_STORAGE_KEY, String(token));
    } catch (e) {}
  }

  function clearStoredToken() {
    try {
      localStorage.removeItem(window.NutriAuthConfig.TOKEN_STORAGE_KEY);
    } catch (e) {}
  }

  /* ─── Universal JSON fetch wrapper ─────────────────────────── */
  /**
   * Makes a JSON API request and returns a Promise resolving to
   * the parsed response body, or rejects with { message, status }.
   *
   * @param {string} method   - "GET" | "POST" | "PUT" | "DELETE"
   * @param {string} path     - e.g. "/api/login"  (will be prefixed with API_BASE_URL)
   * @param {object} [body]   - request payload (auto-serialised to JSON)
   * @returns {Promise<object>}
   */
  function requestJson(method, path, body) {
    var cfg     = window.NutriAuthConfig;
    var headers = { "Accept": "application/json" };
    var init    = {
      method:      method,
      headers:     headers,
      credentials: cfg.WITH_CREDENTIALS ? "include" : "same-origin"
    };

    if (body !== undefined && body !== null) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }

    var tok = getStoredToken();
    if (tok) headers["Authorization"] = "Bearer " + tok;

    return fetch(buildUrl(path), init).then(function (res) {
      var ct     = res.headers.get("content-type") || "";
      var isJson = ct.indexOf("application/json") !== -1;

      return (
        isJson
          ? res.json()
          : res.text().then(function (t) { return { _raw: t }; })
      ).then(function (data) {
        if (!res.ok) {
          var msg =
            (data && data.message) ||
            (data && data.error)   ||
            (typeof data === "string" ? data : "") ||
            ("HTTP " + res.status);
          var err    = new Error(msg);
          err.status = res.status;
          err.body   = data;
          throw err;
        }
        return data;
      });
    });
  }

  /* ─── Expose public API ─────────────────────────────────────── */
  window.NutriAuthApi = {
    buildUrl:        buildUrl,
    getStoredToken:  getStoredToken,
    setStoredToken:  setStoredToken,
    clearStoredToken: clearStoredToken,
    requestJson:     requestJson
  };

})();

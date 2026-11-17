/**
 * إعدادات الربط مع الباكند (Auth API)
 *
 * خطوات التشغيل:
 * 1) API_BASE_URL فاضي = نفس دومين الصفحة (ده المناسب بعد الرفع).
 * 2) عدّل المسارات في ENDPOINTS إذا كان الباكند يستخدم أسماء مختلفة.
 * 3) عندما يكون الـ API جاهزاً، اضبط USE_BACKEND على true.
 *
 * ملاحظة أمان: الأفضل أن يضع السيرفر التوكن في cookie بخاصية httpOnly
 * بدلاً من تخزينه في localStorage — عندها يمكنك ترك حفظ التوكن هنا فارغاً
 * والاعتماد على credentials: 'include' فقط.
 */
(function () {
  window.NutriAuthConfig = {
    /**
     * عنوان السيرفر بدون / في النهاية.
     * سلسلة فاضية = نفس الدومين اللي الصفحة متفتوحة عليه (محلي أو بعد الرفع).
     * حط عنوان كامل فقط لو الـ API على دومين مختلف.
     */
    API_BASE_URL: "",

    /**
     * false = التسجيل/الدخول الحالي (localStorage) كما هو.
     * true = استدعاء الباكند عبر NutriAuthSignup / NutriAuthLogin.
     */
    USE_BACKEND: true,

    /** مسارات REST — طابقها مع راوتر الباكند */
    // ENDPOINTS: {
    //   register: "/api/auth/register",
    //   login: "/api/auth/login"
    // },


    

            ENDPOINTS: {
  register: "/api/register",
  login: "/api/login",

  sendOtp: "/api/password/send-otp",
  resetPw: "/api/password/reset"
},







    /** مفتاح تخزين التوكن في المتصفح (إن احتجت Authorization: Bearer) */
    TOKEN_STORAGE_KEY: "nutri_auth_access_token",

    /**
     * أرسل الكوكيز مع الطلب إذا كان السيرفر يستخدم جلسة cookie.
     * ضع true عادةً عندما يكون الفرونت والباك على نفس الدومين أو CORS مهيأ بشكل صحيح.
     */
    WITH_CREDENTIALS: false
  };

  /**
   * يبني URL كاملاً للمسار النسبي.
   */
  function buildUrl(path) {
    var base = String(window.NutriAuthConfig.API_BASE_URL || "").replace(/\/+$/, "");
    var p = String(path || "").replace(/^\/+/, "/");
    if (!base) return p;
    return base + (p.charAt(0) === "/" ? p : "/" + p);
  }

  /**
   * يقرأ التوكن المحفوظ (إن وُجد) لإرساله في الهيدر.
   */
  function getStoredToken() {
    try {
      return localStorage.getItem(window.NutriAuthConfig.TOKEN_STORAGE_KEY) || "";
    } catch (e) {
      return "";
    }
  }

  /**
   * يحفظ التوكن بعد تسجيل الدخول أو التسجيل الناجح.
   */
  function setStoredToken(token) {
    if (!token) return;
    try {
      localStorage.setItem(window.NutriAuthConfig.TOKEN_STORAGE_KEY, String(token));
    } catch (e) {}
  }

  /**
   * يمسح التوكن عند تسجيل الخروج (يمكن استدعاؤها لاحقاً من زر الخروج).
   */
  function clearStoredToken() {
    try {
      localStorage.removeItem(window.NutriAuthConfig.TOKEN_STORAGE_KEY);
    } catch (e) {}
  }

  /**
   * طلب JSON موحّد — يرمي Error برسالة من السيرفر أو نص افتراضي.
   */
  function requestJson(method, path, body) {
    var cfg = window.NutriAuthConfig;
    var headers = { Accept: "application/json" };
    var init = {
      method: method,
      headers: headers,
      credentials: cfg.WITH_CREDENTIALS ? "include" : "same-origin"
    };
    if (body !== undefined && body !== null) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }
    var tok = getStoredToken();
    if (tok) headers["Authorization"] = "Bearer " + tok;

    return fetch(buildUrl(path), init).then(function (res) {
      var ct = res.headers.get("content-type") || "";
      var isJson = ct.indexOf("application/json") !== -1;
      return (isJson ? res.json() : res.text().then(function (t) { return { _raw: t }; })).then(function (data) {
        if (!res.ok) {
          var msg =
            (data && data.message) ||
            (data && data.error) ||
            (typeof data === "string" ? data : "") ||
            ("HTTP " + res.status);
          var err = new Error(msg);
          err.status = res.status;
          err.body = data;
          throw err;
        }
        return data;
      });
    });
  }

  window.NutriAuthApi = {
    buildUrl: buildUrl,
    getStoredToken: getStoredToken,
    setStoredToken: setStoredToken,
    clearStoredToken: clearStoredToken,
    requestJson: requestJson
  };
})();

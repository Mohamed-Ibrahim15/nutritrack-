(function () {
  /* ملف المصادقة بالكامل: تسجيل/دخول/خروج + مزامنة بيانات المستخدم محليا أو عبر الباكند */
  /**
   * تكامل الباكند:
   * - إعداد العنوان والتفعيل: assest/js/auth-backend-config.js (API_BASE_URL + USE_BACKEND).
   * - طلب التسجيل: assest/js/auth-signup.js — POST register والـ body من buildSignupPayload().
   * - طلب الدخول: assest/js/auth-login.js — POST login بـ { email, password }.
   *
   * ملاحظات:
   * - كلمة المرور تُرسل على HTTPS فقط؛ الهاش على السيرفر (bcrypt/argon2). لا تعتمد على localStorage لكلمة المرور مع الباكند.
   * - الاستجابة المتوقعة: { token أو accessToken, user } — التوكن يُحفظ اختيارياً في localStorage؛ الأفضل cookie httpOnly من السيرفر.
   * - نسيت كلمة المرور / جوجل: ما زالا محلياً؛ اربطهما لاحقاً بمسارات الباكند (forgot-password، OAuth).
   * - profile يجب أن يبقى متوافقاً مع Track / My Plan (age, gender, heightCm, …).
   */
  var USERS_KEY = "nutri_auth_users";
  var SESSION_KEY = "nutri_auth_session";
  var PROFILE_KEY = "nutri_user_profile";
  var CALC_PROFILE_KEY = "nutri_profile";

  /* ترجمة مفتاح نصي حسب اللغة الحالية */
  function tr(key) {
    return window.NutriI18n && typeof window.NutriI18n.t === "function" ? window.NutriI18n.t(key) : key;
  }

  /* قراءة JSON من localStorage مع قيمة افتراضية عند الخطأ */
  function readJson(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  /* حفظ كائن JSON داخل localStorage */
  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  /* توحيد صيغة الإيميل للمقارنة (trim + lowercase) */
  function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  /* جلب قائمة المستخدمين المحليين */
  function getUsers() {
    return readJson(USERS_KEY, []);
  }

  /* حفظ قائمة المستخدمين المحليين بعد التعديل */
  function saveUsers(users) {
    writeJson(USERS_KEY, users);
  }

  /* جلب جلسة المستخدم الحالية */
  function getSession() {
    return readJson(SESSION_KEY, null);
  }

  /* إنشاء/تحديث جلسة المستخدم الحالية */
  function setSession(session) {
    writeJson(SESSION_KEY, session);
  }

  /* حذف الجلسة الحالية (تسجيل خروج) */
  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  /* مزامنة profile المخزن مع المستخدم الحالي حتى تقرأه باقي الصفحات بشكل صحيح */
  function syncProfileFromSession() {
    var session = getSession();
    if (!session || !session.email) return;
    var users = getUsers();
    var user = users.find(function (u) {
      return normalizeEmail(u.email) === normalizeEmail(session.email);
    });
    if (user && user.profile) {
      writeJson(PROFILE_KEY, user.profile);
      writeJson(CALC_PROFILE_KEY, user.profile);
      try {
        if (window.NutriAuth) {
          writeJson(window.NutriAuth.scopedKey("nutri_profile"), user.profile);
        }
      } catch (e0) {}
      try {
        if (user.profile && window.NutriAuth) {
          var pk = window.NutriAuth.scopedKey("nutri_plan_condition_ids");
          var pids =
            user.profile.healthConditionsMode === "none"
              ? []
              : Array.isArray(user.profile.healthConditionIds)
              ? user.profile.healthConditionIds
              : [];
          writeJson(pk, pids);
        }
      } catch (e) {}
    }
  }

  /* جلب إيميل المستخدم الحالي من الجلسة */
  function getCurrentUserEmail() {
    var s = getSession();
    return s && s.email ? normalizeEmail(s.email) : "";
  }

  /* إنشاء مفتاح تخزين خاص بكل مستخدم لتفادي تضارب البيانات */
  function scopedKey(baseKey) {
    var email = getCurrentUserEmail();
    if (!email) return baseKey;
    return baseKey + "__" + email;
  }

  /* إضافة مستخدم جديد أو تحديث المستخدم الحالي حسب الإيميل */
  function upsertUser(nextUser) {
    var users = getUsers();
    var email = normalizeEmail(nextUser.email);
    var index = users.findIndex(function (u) {
      return normalizeEmail(u.email) === email;
    });
    if (index >= 0) users[index] = nextUser;
    else users.push(nextUser);
    saveUsers(users);
  }

  /**
   * يقرأ حقول نموذج التسجيل من الـ DOM — جاهز لإرسال نفس البنية للباكند.
   * عند الربط: JSON.stringify(buildSignupPayload()) أو الحقول المنفصلة كما يطلب الـ API.
   */
  function buildSignupPayload() {
    return {
      name: document.getElementById("signup-name").value.trim(),
      email: normalizeEmail(document.getElementById("signup-email").value),
      password: document.getElementById("signup-password").value,
      age: Number(document.getElementById("signup-age").value),
      gender: document.getElementById("signup-gender").value,
      heightCm: Number(document.getElementById("signup-height").value),
      weightKg: Number(document.getElementById("signup-weight").value),
      goalWeightKg: Number(document.getElementById("signup-goal-weight").value),
      activity: Number(document.getElementById("signup-activity").value),
      goal: document.getElementById("signup-goal").value,
      healthConditionsMode: (function () {
        var el = document.getElementById("signup-health-conditions");
        if (el && window.NutriHealthConditions) return NutriHealthConditions.readState(el).mode;
        return "none";
      })(),
      healthConditionIds: (function () {
        var el2 = document.getElementById("signup-health-conditions");
        if (el2 && window.NutriHealthConditions) return NutriHealthConditions.readState(el2).ids;
        return [];
      })()
    };
  }

  /** تحقق واجهة فقط — الباكند يعيد نفس الأخطاء بشكل أدق (مثل email مستخدم، ضعف كلمة المرور). */
  function validateSignupClientSide(p) {
    if (!p.name || !p.email || !p.password) {
      return { ok: false, messageKey: "auth.validate.fillRequired" };
    }
    if (p.password.length < 6) {
      return { ok: false, messageKey: "auth.validate.passMin" };
    }
    return { ok: true };
  }

  /** يبني كائن profile كما تتوقعه باقي الصفحات — أرسله للباك أو احفظه محلياً بعد الاستجابة. */
  function buildProfileFromSignupPayload(p) {
    return {
      name: p.name,
      email: p.email,
      age: Number.isFinite(p.age) ? p.age : null,
      gender: p.gender || "",
      heightCm: Number.isFinite(p.heightCm) ? p.heightCm : null,
      weightKg: Number.isFinite(p.weightKg) ? p.weightKg : null,
      activity: Number.isFinite(p.activity) ? p.activity : 1.2,
      goal: p.goal || "maintain",
      startWeightKg: Number.isFinite(p.weightKg) ? p.weightKg : null,
      currentWeightKg: Number.isFinite(p.weightKg) ? p.weightKg : null,
      goalWeightKg: Number.isFinite(p.goalWeightKg) ? p.goalWeightKg : null,
      avatarDataUrl: "",
      healthConditionsMode: p.healthConditionsMode || "none",
      healthConditionIds: Array.isArray(p.healthConditionIds) ? p.healthConditionIds : []
    };
  }

  /** يبني مستخدم التخزين المحلي — عند الربط بالباك: استبدل هذا بما يرجعه POST register بعد النجاح. */
  function buildLocalUserFromSignup(p) {
    return {
      email: p.email,
      password: p.password,
      provider: "local",
      createdAt: new Date().toISOString(),
      profile: buildProfileFromSignupPayload(p)
    };
  }

  /* بناء بيانات تسجيل الدخول من نموذج الواجهة */
  function buildLoginPayload() {
    return {
      email: normalizeEmail(document.getElementById("login-email").value),
      password: document.getElementById("login-password").value
    };
  }

  /**
   * يدمج الملف الشخصي القادم من السيرفر مع حقول النموذج المحلي
   * حتى تبقى صفحات التتبع والخطة متوافقة حتى لو رجع الباكند حقولاً جزئية فقط.
   */
  function mergeServerUserWithSignupPayload(serverUser, payload) {
    var fullProfile = buildProfileFromSignupPayload(payload);
    if (!serverUser || typeof serverUser !== "object") return serverUser;
    if (!serverUser.profile || typeof serverUser.profile !== "object") {
      serverUser.profile = fullProfile;
    } else {
      serverUser.profile = Object.assign({}, fullProfile, serverUser.profile);
    }
    return serverUser;
  }

  /** هل التسجيل/الدخول يمرّان عبر الباكند؟ يُضبط من auth-backend-config.js */
  function useBackendAuth() {
    return !!(window.NutriAuthConfig && window.NutriAuthConfig.USE_BACKEND);
  }

  /* حماية الصفحات الداخلية: لو مفيش جلسة يرجّع المستخدم للـ landing */
  function setupProtectedPages() {
    var isLanding = /\/index\.html$/i.test(location.pathname) || /project - Copy\/?$/i.test(location.pathname.replace(/\\/g, "/"));
    if (isLanding) return;

    var session = getSession();
    if (!session) {
      location.replace("../index.html");
      return;
    }

    syncProfileFromSession();

    document.querySelectorAll("[data-auth-logout]").forEach(function (link) {
      link.addEventListener("click", function (e) {
        e.preventDefault();
        // Revoke Sanctum token on the server
        var api = window.NutriApi;
        var token = api ? api.getToken() : (localStorage.getItem('nutri_auth_access_token') || '');
        function doLogout() {
          if (api) api.clearAuth();
          clearSession();
          location.href = "../index.html";
        }
        if (token) {
          fetch(((window.NutriAuthConfig && window.NutriAuthConfig.API_BASE_URL) || window.location.origin || '') + '/api/logout', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/json' }
          }).catch(function () {}).finally(doLogout);
        } else {
          doLogout();
        }
      });
    });
  }

  /* تجهيز نافذة المصادقة (فتح/غلق/تبديل تبويبات/إرسال النماذج) */
  function setupLandingPage() {
    var modal = document.getElementById("auth-modal");
    if (!modal) return;

    var signupForm = document.getElementById("signup-form");
    var loginForm = document.getElementById("login-form");
    var forgotForm = document.getElementById("forgot-form");
    var authMessage = document.getElementById("auth-message");
    var googleBtn = document.getElementById("google-signup-btn");
    var showForgotBtn = document.getElementById("show-forgot-btn");
    var backToLoginBtn = document.getElementById("back-to-login-btn");

    /* فتح نافذة المصادقة وتحديد الوضع الافتراضي (تسجيل/دخول) */
    function openModal(mode) {
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
      document.body.classList.add("auth-open");
      setMode(mode || "signup");
    }

    /* غلق نافذة المصادقة */
    function closeModal() {
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("auth-open");
    }

    /* عرض رسالة للمستخدم بنمط نجاح أو خطأ */
    function showMessage(text, ok) {
      if (!authMessage) return;
      authMessage.textContent = text;
      authMessage.style.display = "block";
      authMessage.classList.toggle("is-error", !ok);
      authMessage.classList.toggle("is-success", !!ok);
    }

    /* تنظيف الرسالة الحالية قبل أي إجراء جديد */
    function clearMessage() {
      if (!authMessage) return;
      authMessage.style.display = "none";
      authMessage.textContent = "";
      authMessage.classList.remove("is-error", "is-success");
    }

    /* التبديل بين نموذج التسجيل ونموذج تسجيل الدخول */
    function setMode(mode) {
      var signupActive = mode !== "login";
      document.querySelectorAll("[data-auth-tab]").forEach(function (btn) {
        btn.classList.toggle("is-active", btn.getAttribute("data-auth-tab") === (signupActive ? "signup" : "login"));
      });
      signupForm.classList.toggle("auth-form--hidden", !signupActive);
      loginForm.classList.toggle("auth-form--hidden", signupActive);
      if (forgotForm) forgotForm.classList.add("auth-form--hidden");
      clearMessage();
    }

    /* إظهار نموذج نسيت كلمة المرور بدل النماذج الأخرى */
    function setForgotMode() {
      document.querySelectorAll("[data-auth-tab]").forEach(function (btn) {
        btn.classList.remove("is-active");
      });
      signupForm.classList.add("auth-form--hidden");
      loginForm.classList.add("auth-form--hidden");
      if (forgotForm) forgotForm.classList.remove("auth-form--hidden");
      clearMessage();
      /* Reset the OTP flow to step 1 whenever the forgot form is opened */
      if (window.NutriForgot && typeof window.NutriForgot.reset === "function") {
        window.NutriForgot.reset();
      }
    }

    /* إنهاء عملية الدخول: حفظ الجلسة والملف الشخصي ثم الانتقال للصفحة المناسبة */
    function completeLogin(user, provider) {
      var profile = user.profile || {};
      var role    = user.role || (profile && profile.role) || 'user';

      // Write session (with role)
      setSession({
        email:      user.email,
        name:       profile.name || user.email || '',
        role:       role,
        provider:   provider || user.provider || 'local',
        loggedInAt: new Date().toISOString()
      });

      // Store role so page guard and admin checks work on next load
      try { localStorage.setItem('nutri_user_role', role); } catch (e) {}

      // Write full profile to all keys other pages read
      if (profile && Object.keys(profile).length > 0) {
        writeJson(PROFILE_KEY, profile);
        writeJson(CALC_PROFILE_KEY, profile);
        try {
          if (window.NutriAuth) {
            writeJson(window.NutriAuth.scopedKey('nutri_profile'), profile);
            var planIds = profile.healthConditionsMode === 'none'
              ? []
              : Array.isArray(profile.healthConditionIds) ? profile.healthConditionIds : [];
            writeJson(window.NutriAuth.scopedKey('nutri_plan_condition_ids'), planIds);
          }
        } catch (e0) {}
      }

      // Role-based redirect: admin → admin panel, user → home
      if (role === 'admin') {
        // Admin panel is at pages/admin/index.html — redirect there if it exists
        // We use a HEAD check and fall back to home.html gracefully
        fetch('./pages/admin/index.html', { method: 'HEAD' })
          .then(function (r) {
            location.href = r.ok ? './pages/admin/index.html' : './pages/home.html';
          })
          .catch(function () {
            location.href = './pages/home.html';
          });
      } else {
        location.href = './pages/home.html';
      }
    }

    document.querySelectorAll(".js-open-auth").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        openModal(btn.getAttribute("data-auth-mode") || "signup");
      });
    });

    document.querySelectorAll("[data-auth-close]").forEach(function (btn) {
      btn.addEventListener("click", closeModal);
    });

    document.querySelectorAll("[data-auth-tab]").forEach(function (tab) {
      tab.addEventListener("click", function () {
        setMode(tab.getAttribute("data-auth-tab"));
      });
    });

    window.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeModal();
    });

    signupForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var payload = buildSignupPayload();
      var check = validateSignupClientSide(payload);
      if (!check.ok) {
        showMessage(tr(check.messageKey), false);
        return;
      }

      /* مسار الباكند: منطق الطلب في assest/js/auth-signup.js — فعّل USE_BACKEND في auth-backend-config.js */
      if (useBackendAuth() && window.NutriAuthSignup) {
        showMessage("جاري إنشاء الحساب...", true);
        window.NutriAuthSignup.register(payload)
          .then(function (result) {
            var user = mergeServerUserWithSignupPayload(result.user, payload);
            showMessage(tr("auth.msg.created"), true);
            completeLogin(user, "local");
          })
          .catch(function (err) {
            var msg = (err && err.message) || "تعذّر التسجيل. تحقق من السيرفر أو البيانات.";
            if (err && err.status === 409) {
              showMessage(tr("auth.msg.emailExists"), false);
              setMode("login");
              return;
            }
            showMessage(msg, false);
          });
        return;
      }

      var users = getUsers();
      var exists = users.some(function (u) {
        return normalizeEmail(u.email) === payload.email;
      });
      if (exists) {
        showMessage(tr("auth.msg.emailExists"), false);
        setMode("login");
        return;
      }

      var user = buildLocalUserFromSignup(payload);
      users.push(user);
      saveUsers(users);
      showMessage(tr("auth.msg.created"), true);
      completeLogin(user, "local");
    });

    loginForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var lp = buildLoginPayload();

      /* مسار الباكند: تفاصيل الطلب في assest/js/auth-login.js */
      if (useBackendAuth() && window.NutriAuthLogin) {
        showMessage("جاري تسجيل الدخول...", true);
        window.NutriAuthLogin.login(lp)
          .then(function (result) {
            completeLogin(result.user, "local");
          })
          .catch(function (err) {
            var status = err && err.status;
            var msg = (err && err.message) || "تعذّر تسجيل الدخول.";
            if (status === 401 || status === 403) {
              showMessage(tr("auth.msg.wrongPassword"), false);
              return;
            }
            if (status === 404) {
              showMessage(tr("auth.msg.notFoundSignup"), false);
              return;
            }
            showMessage(msg, false);
          });
        return;
      }

      var users = getUsers();
      var user = users.find(function (u) {
        return normalizeEmail(u.email) === lp.email;
      });

      if (!user) {
        showMessage(tr("auth.msg.notFoundSignup"), false);
        return;
      }
      if (user.provider === "google") {
        showMessage(tr("auth.msg.googleUseLogin"), false);
        return;
      }
      if (user.password !== lp.password) {
        showMessage(tr("auth.msg.wrongPassword"), false);
        return;
      }

      completeLogin(user, "local");
    });

    if (showForgotBtn) {
      showForgotBtn.addEventListener("click", function () {
        setForgotMode();
      });
    }

    if (backToLoginBtn) {
      backToLoginBtn.addEventListener("click", function () {
        setMode("login");
      });
    }

    if (forgotForm) {
      /* OTP flow is fully handled by auth-forgot.js (button click listeners).
         This submit listener only prevents default browser form submission. */
      forgotForm.addEventListener("submit", function (e) {
        e.preventDefault();
      });
    }

    googleBtn.addEventListener("click", function () {
      if (window.NutriAuthApi) {
        location.href = window.NutriAuthApi.buildUrl("/auth/google/redirect");
        return;
      }

      var googleRedirect = (window.NutriAuthConfig && window.NutriAuthConfig.API_BASE_URL)
        ? window.NutriAuthConfig.API_BASE_URL.replace(/\/+$/, '') + '/api/auth/google/redirect'
        : '/api/auth/google/redirect';
      location.href = googleRedirect;
      return;
      /* TODO: استبدل الـ prompt بتدفق OAuth (redirect أو GIS) والسيرفر يتحقق من التوكن ويعيد المستخدم. */
      var email = normalizeEmail(window.prompt("Google email:"));
      if (!email) return;

      var displayName = String(window.prompt("Display name:") || "").trim();
      if (!displayName) {
        showMessage(tr("auth.msg.displayName"), false);
        return;
      }

      var users = getUsers();
      var existing = users.find(function (u) {
        return normalizeEmail(u.email) === email;
      });

      if (existing && existing.provider !== "google") {
        showMessage(tr("auth.msg.emailConflict"), false);
        return;
      }

      var user = existing || {
        email: email,
        password: "",
        provider: "google",
        createdAt: new Date().toISOString(),
        profile: {
          name: displayName,
          email: email,
          age: null,
          gender: "",
          heightCm: null,
          activity: 1.2,
          goal: "maintain",
          startWeightKg: null,
          currentWeightKg: null,
          goalWeightKg: null,
          avatarDataUrl: "",
          healthConditionsMode: "none",
          healthConditionIds: []
        }
      };

      if (!existing) {
        users.push(user);
        saveUsers(users);
      } else {
        existing.profile.name = existing.profile.name || displayName;
        upsertUser(existing);
        user = existing;
      }

      completeLogin(user, "google");
    });

    var signupHealthEl = document.getElementById("signup-health-conditions");
    if (signupHealthEl && window.NutriHealthConditions) {
      NutriHealthConditions.render(signupHealthEl, [], "signup-hc", { mode: "none" });
    }

    // Keep auth closed initially; user opens it from header/CTA buttons.
  }

  setupProtectedPages();
  setupLandingPage();

  window.NutriAuth = {
    getSession: getSession,
    getCurrentUserEmail: getCurrentUserEmail,
    scopedKey: scopedKey
  };
})();

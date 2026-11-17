/**
 * auth-forgot.js — OTP-based password reset (2-step flow)
 *
 * Step 1 ► User enters email  → POST /api/password/send-otp
 * Step 2 ► User enters OTP + new password → POST /api/password/reset
 *
 * Depends on:
 *   - window.NutriAuthApi  (from auth-backend-config.js) — provides requestJson()
 *   - window.NutriAuthConfig.API_BASE_URL
 *
 * HTML IDs required (already in index.html):
 *   #forgot-form           — the wrapper <form>
 *   #forgot-step-email     — Step 1 container
 *   #forgot-step-otp       — Step 2 container
 *   #forgot-email          — email input
 *   #forgot-otp            — OTP input
 *   #forgot-password       — new password input
 *   #forgot-password-confirm — confirm password input
 *   #forgot-send-otp-btn   — "Send OTP" button
 *   #forgot-reset-btn      — "Reset Password" button
 *   #forgot-back-to-email-btn — "← Change email" button
 *   #auth-message          — shared message element (managed by auth.js)
 */
(function () {
  "use strict";

  /* ─── API base ──────────────────────────────────────────────── */
  var BASE_URL = (window.NutriAuthConfig && window.NutriAuthConfig.API_BASE_URL)
    ? String(window.NutriAuthConfig.API_BASE_URL).replace(/\/+$/, "")
    : ((window.location && window.location.origin) || "");
      // USE_BACKEND = true;

  /* ─── Internal state ────────────────────────────────────────── */
  var _currentEmail = "";   // retained between step 1 → step 2

  function tr(key, fallback) {
    return (window.NutriI18n && typeof window.NutriI18n.t === "function")
      ? window.NutriI18n.t(key)
      : fallback;
  }

  /* ─── DOM helpers ───────────────────────────────────────────── */
  function el(id) { return document.getElementById(id); }

  /**
   * Show / hide message via the shared #auth-message element.
   * Falls back to the shared showMessage from auth.js if available
   * through a custom event, otherwise manipulates the element directly.
   */
  function showMessage(text, isSuccess) {
    var msg = el("auth-message");
    if (!msg) return;
    msg.textContent = text;
    msg.style.display = "block";
    msg.classList.toggle("is-error",   !isSuccess);
    msg.classList.toggle("is-success", !!isSuccess);
  }

  function clearMessage() {
    var msg = el("auth-message");
    if (!msg) return;
    msg.style.display = "none";
    msg.textContent = "";
    msg.classList.remove("is-error", "is-success");
  }

  function setLoading(btn, loading) {
    if (!btn) return;
    btn.disabled = loading;
    btn.dataset.originalText = btn.dataset.originalText || btn.textContent;
    btn.textContent = loading ? "Please wait…" : btn.dataset.originalText;
  }

  /* ─── Step switching ────────────────────────────────────────── */
  function showStep(step) {
    var emailStep = el("forgot-step-email");
    var otpStep   = el("forgot-step-otp");
    if (!emailStep || !otpStep) return;

    if (step === 1) {
      emailStep.style.display = "";
      otpStep.style.display   = "none";
    } else {
      emailStep.style.display = "none";
      otpStep.style.display   = "";
      // Focus the OTP field for convenience
      var otpInput = el("forgot-otp");
      if (otpInput) setTimeout(function () { otpInput.focus(); }, 50);
    }
  }

  /* ─── API call: Send OTP ────────────────────────────────────── */
  function sendOtp() {
    var emailInput = el("forgot-email");
    if (!emailInput) return;

    var email = emailInput.value.trim().toLowerCase();

    // Basic client-side validation
    if (!email) {
      showMessage(tr("auth.forgot.emailRequired", "Please enter your email address."), false);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showMessage(tr("auth.forgot.emailInvalid", "Please enter a valid email address."), false);
      return;
    }

    var btn = el("forgot-send-otp-btn");
    setLoading(btn, true);
    clearMessage();

    fetch(BASE_URL + "/api/password/send-otp", {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept":        "application/json"
      },
      body: JSON.stringify({ email: email })
    })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        setLoading(btn, false);

        if (!result.ok) {
          var msg = (result.data && result.data.message) || "Failed to send OTP. Please try again.";
          showMessage(msg, false);
          return;
        }

        // Save email for step 2
        _currentEmail = email;

        showMessage(tr("auth.forgot.otpSent", "OTP sent! Check your email and enter the 6-digit code."), true);
        showStep(2);
      })
      .catch(function (err) {
        setLoading(btn, false);
        showMessage(tr("auth.forgot.networkErr", "Network error. Is the backend running?"), false);
        console.error("[auth-forgot] sendOtp error:", err);
      });
  }

  /* ─── API call: Reset Password ──────────────────────────────── */
  function resetPassword() {
    var otp      = (el("forgot-otp")              && el("forgot-otp").value.trim())              || "";
    var password = (el("forgot-password")         && el("forgot-password").value)                || "";
    var confirm  = (el("forgot-password-confirm") && el("forgot-password-confirm").value)        || "";

    // Client-side validation
    if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      showMessage(tr("auth.forgot.otpRequired", "Please enter the 6-digit OTP code."), false);
      return;
    }
    if (password.length < 8) {
      showMessage(tr("auth.forgot.pwdLen", "New password must be at least 8 characters."), false);
      return;
    }
    if (password !== confirm) {
      showMessage(tr("auth.forgot.pwdMatch", "Passwords do not match."), false);
      return;
    }

    var btn = el("forgot-reset-btn");
    setLoading(btn, true);
    clearMessage();

    fetch(BASE_URL + "/api/password/reset", {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept":        "application/json"
      },
      body: JSON.stringify({
        email:                 _currentEmail,
        otp:                   otp,
        password:              password,
        password_confirmation: confirm
      })
    })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, status: res.status, data: data }; }); })
      .then(function (result) {
        setLoading(btn, false);

        if (!result.ok) {
          var serverMsg = (result.data && result.data.message) || "Password reset failed.";

          if (result.status === 422) {
            // Could be wrong OTP or expired
            showMessage(serverMsg, false);
          } else {
            showMessage(serverMsg, false);
          }
          return;
        }

        // ── Success ──
        showMessage(tr("auth.forgot.success", "Password reset successfully! Redirecting to login…"), true);
        _currentEmail = "";

        // Clear inputs
        ["forgot-otp", "forgot-password", "forgot-password-confirm"].forEach(function (id) {
          var input = el(id);
          if (input) input.value = "";
        });

        // Return to login after 1.8 s
        setTimeout(function () {
          // Trigger auth.js back-to-login flow via the existing button
          var backBtn = el("back-to-login-btn");
          if (backBtn) {
            backBtn.click();
          } else {
            // Fallback: dispatch a custom event that auth.js can listen to
            document.dispatchEvent(new CustomEvent("nutri:forgot:done"));
          }
        }, 1800);
      })
      .catch(function (err) {
        setLoading(btn, false);
        showMessage("Network error. Is the backend running?", false);
        console.error("[auth-forgot] resetPassword error:", err);
      });
  }

  /* ─── Public reset (called by auth.js when forgot-form opens) ── */
  function reset() {
    _currentEmail = "";
    showStep(1);
    clearMessage();
    ["forgot-email", "forgot-otp", "forgot-password", "forgot-password-confirm"].forEach(function (id) {
      var input = el(id);
      if (input) input.value = "";
    });
  }

  /* ─── Wire up event listeners (runs once DOM is ready) ─────── */
  function init() {
    var sendBtn     = el("forgot-send-otp-btn");
    var resetBtn    = el("forgot-reset-btn");
    var backEmailBtn = el("forgot-back-to-email-btn");

    if (sendBtn) {
      sendBtn.addEventListener("click", function (e) {
        e.preventDefault();
        sendOtp();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener("click", function (e) {
        e.preventDefault();
        resetPassword();
      });
    }

    if (backEmailBtn) {
      backEmailBtn.addEventListener("click", function () {
        clearMessage();
        showStep(1);
      });
    }

    // Prevent the outer <form> from doing a native submit on Enter
    var form = el("forgot-form");
    if (form) {
      form.addEventListener("submit", function (e) { e.preventDefault(); });
    }

    // Start on step 1
    showStep(1);
  }

  // Wait for DOM
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  /* ─── Public API ────────────────────────────────────────────── */
  window.NutriForgot = {
    sendOtp:        sendOtp,
    resetPassword:  resetPassword,
    reset:          reset,     // call this whenever forgot-form is shown
    showStep:       showStep
  };

})();





















// (function () {
//   "use strict";

//   if (window.NutriForgot && window.NutriForgot.initialized) {
//     console.log("[auth-forgot] already initialized, skipping duplicate load");
//     return;
//   }

//   console.log("[auth-forgot] script loaded");

//   /* ─── Internal state ───────────────────────── */
//   var _currentEmail = "";

//   function el(id) {
//     return document.getElementById(id);
//   }

//   function showMessage(text, isSuccess) {
//     var msg = el("auth-message");
//     if (!msg) return;
//     msg.textContent = text;
//     msg.style.display = "block";
//     msg.classList.toggle("is-error", !isSuccess);
//     msg.classList.toggle("is-success", !!isSuccess);
//   }

//   function clearMessage() {
//     var msg = el("auth-message");
//     if (!msg) return;
//     msg.style.display = "none";
//     msg.textContent = "";
//     msg.classList.remove("is-error", "is-success");
//   }

//   function setLoading(btn, loading) {
//     if (!btn) return;
//     btn.disabled = loading;
//     btn.dataset.originalText = btn.dataset.originalText || btn.textContent;
//     btn.textContent = loading ? "Please wait..." : btn.dataset.originalText;
//   }

//   function showStep(step) {
//     var emailStep = el("forgot-step-email");
//     var otpStep = el("forgot-step-otp");

//     if (step === 1) {
//       emailStep.style.display = "";
//       otpStep.style.display = "none";
//     } else {
//       emailStep.style.display = "none";
//       otpStep.style.display = "";
//     }
//   }

//   /* ─── ✅ Send OTP (FIXED) ─────────────────── */
//   function sendOtp() {
//     console.log("[auth-forgot] sendOtp called");

//     var emailInput = el("forgot-email");
//     if (!emailInput) {
//       console.error("[auth-forgot] #forgot-email not found");
//       return;
//     }

//     if (!window.NutriAuthApi || !window.NutriAuthConfig) {
//       console.error("[auth-forgot] NutriAuthApi / NutriAuthConfig not loaded");
//       showMessage("Auth API config is not loaded", false);
//       return;
//     }

//     var email = emailInput.value.trim().toLowerCase();

//     if (!email) {
//       showMessage("Enter email", false);
//       return;
//     }

//     var btn = el("forgot-send-otp-btn");
//     setLoading(btn, true);
//     clearMessage();

//     fetch(NutriAuthApi.buildUrl(NutriAuthConfig.ENDPOINTS.sendOtp), {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         "Accept": "application/json"
//       },
//       body: JSON.stringify({ email: email })
//     })
//       .then(function (response) {
//         return response.json()
//           .catch(function () {
//             return {};
//           })
//           .then(function (data) {
//             console.log("[auth-forgot] OTP response", {
//               status: response.status,
//               ok: response.ok,
//               body: data
//             });

//             if (response.status !== 200 || (data && data.error)) {
//               throw new Error((data && data.message) || (data && data.error) || "Error sending OTP");
//             }

//             return data;
//           });
//       })
//       .then(function () {
//         setLoading(btn, false);
//         _currentEmail = email;

//         showMessage("OTP sent successfully", true);
//         showStep(2);
//       })
//       .catch(function (err) {
//         console.error("[auth-forgot] OTP request failed", err);
//         setLoading(btn, false);
//         showMessage(err.message || "Error sending OTP", false);
//       });
//   }

//   /* ─── ✅ Reset Password (FIXED) ───────────── */
//   function resetPassword() {
//     var otp = el("forgot-otp").value;
//     var password = el("forgot-password").value;
//     var confirm = el("forgot-password-confirm").value;

//     var btn = el("forgot-reset-btn");
//     setLoading(btn, true);
//     clearMessage();

//     NutriAuthApi.requestJson(
//       "POST",
//       NutriAuthConfig.ENDPOINTS.resetPw,
//       {
//         email: _currentEmail,
//         otp: otp,
//         password: password,
//         password_confirmation: confirm
//       }
//     )
//       .then(function () {
//         setLoading(btn, false);
//         showMessage("Password reset success ✅", true);
//       })
//       .catch(function (err) {
//         setLoading(btn, false);
//         showMessage(err.message || "Reset failed", false);
//         console.error(err);
//       });
//   }

//   function init() {
//     console.log("[auth-forgot] init");

//     var sendBtn = el("forgot-send-otp-btn");
//     var resetBtn = el("forgot-reset-btn");
//     var backEmailBtn = el("forgot-back-to-email-btn");
//     var form = el("forgot-form");

//     if (!sendBtn) {
//       console.error("[auth-forgot] #forgot-send-otp-btn not found");
//     } else {
//       sendBtn.addEventListener("click", function (e) {
//         console.log("[auth-forgot] send OTP button clicked");
//         e.preventDefault();
//         sendOtp();
//       });
//       console.log("[auth-forgot] bound send OTP button");
//     }

//     if (form) {
//       form.addEventListener("submit", function (e) {
//         console.log("[auth-forgot] forgot form submitted");
//         e.preventDefault();

//         if (el("forgot-step-email") && el("forgot-step-email").style.display !== "none") {
//           sendOtp();
//         }
//       });
//       console.log("[auth-forgot] bound forgot form submit");
//     } else {
//       console.error("[auth-forgot] #forgot-form not found");
//     }

//     if (resetBtn) {
//       resetBtn.addEventListener("click", function (e) {
//         console.log("[auth-forgot] reset password button clicked");
//         e.preventDefault();
//         resetPassword();
//       });
//       console.log("[auth-forgot] bound reset button");
//     }

//     if (backEmailBtn) {
//       backEmailBtn.addEventListener("click", function () {
//         console.log("[auth-forgot] back to email clicked");
//         showStep(1);
//         clearMessage();
//       });
//     }

//     showStep(1);
//   }

//   function reset() {
//     _currentEmail = "";
//     ["forgot-email", "forgot-otp", "forgot-password", "forgot-password-confirm"].forEach(function (id) {
//       var input = el(id);
//       if (input) input.value = "";
//     });
//     clearMessage();
//     showStep(1);
//   }

//   if (document.readyState === "loading") {
//     document.addEventListener("DOMContentLoaded", init);
//   } else {
//     init();
//   }

//   window.NutriForgot = {
//     initialized: true,
//     sendOtp: sendOtp,
//     resetPassword: resetPassword,
//     reset: reset
//   };

// })();

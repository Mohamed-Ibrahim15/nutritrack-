/**
 * settings.js — API-connected profile & security settings.
 *
 * Fixed bugs:
 *  1. Profile saved via PUT /api/profile instead of only localStorage.
 *  2. Password change via PATCH /api/profile/password (server-side bcrypt check)
 *     instead of plain-text comparison.
 *  3. Account deletion via DELETE /api/user.
 *  4. Logout revokes Sanctum token via POST /api/logout.
 *  5. Profile loaded from GET /api/profile on page boot.
 *
 * localStorage is still updated after every successful API call so that
 * track-calories, myplan, and plan-sport pages keep working offline-first.
 */
(function () {
  /* ─── Helpers ─────────────────────────────────────────────────────────── */

  function tr(key) {
    return window.NutriI18n && typeof window.NutriI18n.t === 'function'
      ? window.NutriI18n.t(key) : key;
  }

  function api() { return window.NutriApi || null; }

  function loadLocalProfile() {
    try {
      var key = (window.NutriAuth && window.NutriAuth.scopedKey('nutri_profile')) || 'nutri_profile';
      var raw = localStorage.getItem(key) || localStorage.getItem('nutri_profile');
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function saveLocalProfile(p) {
    try {
      var key = (window.NutriAuth && window.NutriAuth.scopedKey('nutri_profile')) || 'nutri_profile';
      var j = JSON.stringify(p);
      localStorage.setItem(key,              j);
      localStorage.setItem('nutri_profile',  j);
      localStorage.setItem('nutri_user_profile', j);
    } catch (e) {}
  }

  /* ─── Activity level mapping (used for display only) ──────────────────── */

  var ACTIVITY_LABELS = {
    '1.2': tr('auth.act.sed')   || 'Sedentary',
    '1.375': tr('auth.act.light') || 'Light',
    '1.55': tr('auth.act.mod')  || 'Moderate',
    '1.725': tr('auth.act.act')  || 'Active',
    '1.9': tr('auth.act.very') || 'Very active'
  };

  /* ─── DOM helpers ─────────────────────────────────────────────────────── */

  function $id(id) { return document.getElementById(id); }

  function setField(id, val) {
    var el = $id(id);
    if (el && val != null) el.value = String(val);
  }

  function fieldVal(id) {
    var el = $id(id);
    return el ? el.value.trim() : '';
  }

  function showNote(id, msg, ok) {
    var el = $id(id);
    if (!el) return;
    el.textContent = msg;
    el.style.display = msg ? '' : 'none';
    el.style.color = ok ? '#0e904f' : '#c93030';
  }

  /* ─── Avatar ──────────────────────────────────────────────────────────── */

  var avatarDataUrl = '';

  function setupAvatarEdit() {
    var avatarImg   = $id('profile-avatar');
    var fileInput   = $id('profile-photo');
    if (!avatarImg || !fileInput) return;

    var p = loadLocalProfile();
    if (p && p.avatarDataUrl) {
      avatarImg.src = p.avatarDataUrl;
      avatarDataUrl = p.avatarDataUrl;
    }

    fileInput.addEventListener('change', function () {
      var file = fileInput.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (ev) {
        avatarDataUrl = ev.target.result;
        avatarImg.src = avatarDataUrl;
      };
      reader.readAsDataURL(file);
    });
  }

  /* ─── Preview strip ───────────────────────────────────────────────────── */

  function updatePreview(p) {
    var nameEl   = $id('profile-name-preview');
    var emailEl  = $id('profile-email-preview');
    var ageEl    = $id('profile-age-preview');
    var genderEl = $id('profile-gender-preview');
    var heightEl = $id('profile-height-preview');

    var agePrefix = tr('settings.preview.age') || 'Age: ';
    var genderPrefix = tr('settings.preview.gender') || 'Gender: ';
    var heightPrefix = tr('settings.preview.height') || 'Height: ';
    var genderStr = p && p.gender ? (tr('settings.gender.' + p.gender) || p.gender) : '—';

    if (nameEl)   nameEl.textContent   = (p && p.name)   || tr('settings.preview.yourName') || '—';
    if (emailEl)  emailEl.textContent  = (p && p.email)  || '—';
    if (ageEl)    ageEl.textContent    = agePrefix + ((p && p.age)    || '—');
    if (genderEl) genderEl.textContent = genderPrefix + genderStr;
    if (heightEl) heightEl.textContent = heightPrefix + ((p && p.heightCm) ? (p.heightCm + ' ' + (tr('track.unit.cm') || 'cm')) : '—');
  }

  /* ─── Prefill form from profile ───────────────────────────────────────── */

  function prefillForm(p) {
    if (!p) return;
    setField('profile-name',        p.name       || '');
    setField('profile-email',       p.email      || '');
    setField('profile-age',         p.age        || '');
    setField('profile-gender',      p.gender     || '');
    setField('profile-height',      p.heightCm   || '');
    setField('profile-weight',      p.weightKg   || '');
    setField('profile-activity',    p.activity   != null ? String(p.activity) : '');
    setField('profile-goal-weight', p.goalWeightKg || '');
    if (p.avatarDataUrl) {
      var avatarImg = $id('profile-avatar');
      if (avatarImg) avatarImg.src = p.avatarDataUrl;
      avatarDataUrl = p.avatarDataUrl;
    }
    updatePreview(p);
  }

  /* ─── Weight metrics section (message.html reuse) ─────────────────────── */

  function bmrFor(wKg, p) {
    if (!p || !p.heightCm || !p.age || !p.gender) return null;
    var s = p.gender === 'male' ? 5 : -161;
    return 10 * wKg + 6.25 * p.heightCm - 5 * p.age + s;
  }

  function goalTarget(tdee, goalWkg, currentWkg) {
    if (!goalWkg || !currentWkg) return Math.round(tdee);
    var diff = currentWkg - goalWkg;
    if (diff > 1)  return Math.round(tdee - 500);
    if (diff < -1) return Math.round(tdee + 300);
    return Math.round(tdee);
  }

  function renderMetricCard(wKg, tdeeId, targetId, p) {
    if (!wKg || !p) return;
    var act   = Number(p.activity || 1.55);
    var bmr   = bmrFor(wKg, p);
    if (!bmr)  return;
    var tdee   = bmr * act;
    var target = goalTarget(tdee, Number(p.goalWeightKg), wKg);
    var suffix = ' kcal';
    var t = $id(tdeeId);   if (t) t.textContent = Math.round(tdee)   + suffix;
    var tg = $id(targetId); if (tg) tg.textContent = Math.round(target) + suffix;
  }

  function setupWeightMetrics(p) {
    if (!p) return;
    var startEl   = $id('weight-start');
    var currentEl = $id('weight-current');
    var goalEl    = $id('weight-goal');
    if (!startEl && !currentEl) return;

    var start   = Number(p.startWeightKg   || p.weightKg  || 0);
    var current = Number(p.currentWeightKg || p.weightKg  || 0);
    var goal    = Number(p.goalWeightKg    || 0);

    if (startEl   && start)   startEl.value   = String(start);
    if (currentEl && current) currentEl.value = String(current);
    if (goalEl    && goal)    goalEl.value    = String(goal);

    function refresh() {
      renderMetricCard(Number(startEl   && startEl.value   || start),   'kcal-start-tdee',   'kcal-start-target',   p);
      renderMetricCard(Number(currentEl && currentEl.value || current), 'kcal-current-tdee', 'kcal-current-target', p);
      renderMetricCard(Number(goalEl    && goalEl.value    || goal),    'kcal-goal-tdee',    'kcal-goal-target',    p);
    }
    refresh();
    if (startEl)   startEl.addEventListener('input',   refresh);
    if (currentEl) currentEl.addEventListener('input', refresh);
    if (goalEl)    goalEl.addEventListener('input',    refresh);
  }

  /* ─── Boot: fetch profile from API then prefill ───────────────────────── */

  function bootProfile() {
    var localP = loadLocalProfile();
    if (localP) {
      prefillForm(localP);
      setupWeightMetrics(localP);
    }

    var a = api();
    if (!a) return;

    a.get('/api/profile').then(function (res) {
      var serverUser = res && res.user ? res.user : res;
      var profile = a.serverUserToProfile(serverUser);
      if (!profile) return;

      // Merge with any local-only fields (goalWeightKg, exerciseBurnLog)
      var merged = Object.assign({}, localP || {}, profile);
      saveLocalProfile(merged);
      prefillForm(merged);
      setupWeightMetrics(merged);
    }).catch(function () {
      // No internet or token expired — local data already shown
    });
  }

  /* ─── Profile form — PUT /api/profile ─────────────────────────────────── */

  function setupProfileForm() {
    var form = $id('profile-form');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var name        = fieldVal('profile-name');
      var email       = fieldVal('profile-email');
      var age         = parseInt(fieldVal('profile-age'), 10)  || null;
      var gender      = fieldVal('profile-gender')      || null;
      var heightCm    = parseFloat(fieldVal('profile-height'))  || null;
      var weightKg    = parseFloat(fieldVal('profile-weight'))  || null;
      var activityStr = fieldVal('profile-activity');
      var goalWkg     = parseFloat(fieldVal('profile-goal-weight')) || null;
      var activity    = activityStr ? parseFloat(activityStr) : null;

      // Update preview immediately
      updatePreview({ name: name, email: email, age: age, gender: gender, heightCm: heightCm });

      var a = api();
      var apiPayload = {};
      if (name)       apiPayload.name        = name;
      if (gender)     apiPayload.gender       = gender;
      if (age)        apiPayload.age          = age;
      if (heightCm)   apiPayload.height_cm    = heightCm;
      if (weightKg)   apiPayload.weight_kg    = weightKg;
      if (a && activity) apiPayload.activity_level = a.activityToBackend(activity);

      function afterSave(serverUser) {
        var localP = loadLocalProfile() || {};
        var merged = Object.assign({}, localP, {
          name:         name        || localP.name,
          email:        email       || localP.email,
          age:          age         || localP.age,
          gender:       gender      || localP.gender,
          heightCm:     heightCm    || localP.heightCm,
          weightKg:     weightKg    || localP.weightKg,
          activity:     activity    || localP.activity,
          goalWeightKg: goalWkg     || localP.goalWeightKg,
          avatarDataUrl: avatarDataUrl || localP.avatarDataUrl,
          updatedAt:    new Date().toISOString()
        });
        if (serverUser && a) {
          var fromServer = a.serverUserToProfile(serverUser);
          merged = Object.assign({}, merged, fromServer, {
            goalWeightKg: goalWkg || merged.goalWeightKg,
            avatarDataUrl: avatarDataUrl || merged.avatarDataUrl
          });
        }
        saveLocalProfile(merged);
        updatePreview(merged);
        showNote('profile-saved', tr('settings.saved') || 'Saved.', true);
        setTimeout(function () { showNote('profile-saved', '', true); }, 3000);
      }

      if (a && Object.keys(apiPayload).length > 0) {
        a.put('/api/profile', apiPayload)
          .then(function (res) { afterSave(res && res.user); })
          .catch(function (err) {
            // Still save locally so UX is not broken
            afterSave(null);
            console.warn('[settings] PUT /api/profile failed:', err && err.message);
          });
      } else {
        afterSave(null);
      }
    });
  }

  /* ─── Password form — PATCH /api/profile/password ──────────────────────── */

  function setupPasswordForm() {
    var form    = $id('password-form');
    var noteEl  = $id('password-note');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var currentPwd = fieldVal('current-password');
      var newPwd     = fieldVal('new-password');

      if (!currentPwd || !newPwd) {
        showNote('password-note', 'Please fill in both fields.', false);
        return;
      }
      if (newPwd.length < 6) {
        showNote('password-note', 'New password must be at least 6 characters.', false);
        return;
      }

      var a = api();
      if (!a) {
        showNote('password-note', 'API not available.', false);
        return;
      }

      showNote('password-note', 'Changing password…', true);

      a.patch('/api/profile/password', {
        current_password: currentPwd,
        new_password:     newPwd
      }).then(function () {
        showNote('password-note', tr('settings.pwd.success') || 'Password changed successfully.', true);
        form.reset();
      }).catch(function (err) {
        var msg = (err && err.data && err.data.message) || (err && err.message) || 'Error changing password.';
        showNote('password-note', msg, false);
      });
    });
  }

  /* ─── Logout ──────────────────────────────────────────────────────────── */

  function setupLogout() {
    var btn = $id('logout-btn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var a = api();
      var token = a ? a.getToken() : '';

      function doLogout() {
        if (a) a.clearAuth();
        try {
          localStorage.removeItem('nutri_auth_session');
          localStorage.removeItem('nutri_profile');
          localStorage.removeItem('nutri_user_profile');
        } catch (e) {}
        location.href = '../index.html';
      }

      if (token) {
        var baseUrl = (window.NutriAuthConfig && window.NutriAuthConfig.API_BASE_URL) || window.location.origin || '';
        fetch(baseUrl + '/api/logout', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/json' }
        }).catch(function () {}).finally(doLogout);
      } else {
        doLogout();
      }
    });
  }

  /* ─── Delete account — DELETE /api/user ───────────────────────────────── */

  function setupDeleteAccount() {
    var btn    = $id('delete-account-btn');
    var noteEl = $id('delete-note');
    if (!btn) return;

    btn.addEventListener('click', function () {
      var a = api();
      if (!a) {
        showNote('delete-note', 'API not available.', false);
        return;
      }

      if (!window.confirm('Are you sure you want to permanently delete your account? This cannot be undone.')) {
        return;
      }

      showNote('delete-note', 'Deleting account…', true);

      a.del('/api/user').then(function () {
        a.clearAuth();
        try { localStorage.clear(); } catch (e) {}
        location.href = '../index.html';
      }).catch(function (err) {
        var msg = (err && err.data && err.data.message) || (err && err.message) || 'Error deleting account.';
        showNote('delete-note', msg, false);
      });
    });
  }

  /* ─── Init ────────────────────────────────────────────────────────────── */

  setupAvatarEdit();
  bootProfile();
  setupProfileForm();
  setupPasswordForm();
  setupLogout();
  setupDeleteAccount();

  // Re-apply when language switches
  window.addEventListener('nutri-i18n-applied', function () {
    var p = loadLocalProfile() || {};
    setupWeightMetrics(p);
    updatePreview(p);
  });
})();

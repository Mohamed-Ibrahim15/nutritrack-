/**
 * NutriTrack API Client — Shared authenticated fetch helper.
 * All pages must include auth-backend-config.js BEFORE this file.
 *
 * Usage:
 *   NutriApi.get('/profile')
 *   NutriApi.post('/profile/health-info', payload)
 *   NutriApi.put('/profile', payload)
 *   NutriApi.patch('/profile/password', payload)
 *   NutriApi.del('/user')
 */
(function (global) {
  'use strict';

  /* ─── Data mapping helpers ──────────────────────────────────────────────── */

  /** Map frontend activity float → backend enum string */
  var ACTIVITY_MAP = {
    '1.2':   'sedentary',
    '1.375': 'lightly_active',
    '1.55':  'moderately_active',
    '1.725': 'very_active',
    '1.9':   'extra_active'
  };

  /** Map backend enum string → frontend float */
  var ACTIVITY_REVERSE = {
    'sedentary':          1.2,
    'lightly_active':     1.375,
    'moderately_active':  1.55,
    'very_active':        1.725,
    'extra_active':       1.9
  };

  /** Map frontend goal short → backend enum */
  var GOAL_MAP = {
    'lose':     'lose_weight',
    'gain':     'gain_weight',
    'maintain': 'maintain'
  };

  /** Map backend goal enum → frontend short */
  var GOAL_REVERSE = {
    'lose_weight': 'lose',
    'gain_weight': 'gain',
    'maintain':    'maintain'
  };

  function activityToBackend(val) {
    return ACTIVITY_MAP[String(val)] || 'moderately_active';
  }

  function activityToFrontend(str) {
    return ACTIVITY_REVERSE[String(str)] != null ? ACTIVITY_REVERSE[String(str)] : 1.55;
  }

  function goalToBackend(val) {
    return GOAL_MAP[String(val)] || 'maintain';
  }

  function goalToFrontend(str) {
    return GOAL_REVERSE[String(str)] || 'maintain';
  }

  /* ─── Token helpers ─────────────────────────────────────────────────────── */

  var ROLE_KEY = 'nutri_user_role';

  function getToken() {
    // Delegate to NutriAuthApi if available (same storage key)
    try {
      if (window.NutriAuthApi) return window.NutriAuthApi.getStoredToken() || '';
      return localStorage.getItem('nutri_auth_access_token') || '';
    } catch (e) { return ''; }
  }

  function setToken(t) {
    try {
      if (window.NutriAuthApi && t) { window.NutriAuthApi.setStoredToken(t); return; }
      if (t) localStorage.setItem('nutri_auth_access_token', t);
    } catch (e) {}
  }

  function getRole() {
    try { return localStorage.getItem(ROLE_KEY) || 'user'; } catch (e) { return 'user'; }
  }

  function setRole(r) {
    try { localStorage.setItem(ROLE_KEY, r || 'user'); } catch (e) {}
  }

  function clearAuth() {
    try {
      if (window.NutriAuthApi) window.NutriAuthApi.clearStoredToken();
      else localStorage.removeItem('nutri_auth_access_token');
      localStorage.removeItem(ROLE_KEY);
    } catch (e) {}
  }

  /* ─── Base URL ──────────────────────────────────────────────────────────── */

  function baseUrl() {
    var cfg = global.NutriAuthConfig;
    if (cfg && cfg.API_BASE_URL) return String(cfg.API_BASE_URL).replace(/\/+$/, '');
    return (global.location && global.location.origin && global.location.origin !== 'null')
      ? global.location.origin
      : '';
  }

  /* ─── Core fetch ─────────────────────────────────────────────────────────── */

  function request(method, path, body) {
    var url = baseUrl() + path;
    var headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
    var token = getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;

    var opts = { method: method, headers: headers };
    if (body != null) opts.body = JSON.stringify(body);

    return fetch(url, opts).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) {
          var err = new Error(
            (data && data.message) || ('HTTP ' + res.status)
          );
          err.status = res.status;
          err.data   = data;
          throw err;
        }
        return data;
      });
    });
  }

  /* ─── Convenience methods ────────────────────────────────────────────────── */

  function get(path)          { return request('GET',    path, null); }
  function post(path, body)   { return request('POST',   path, body); }
  function put(path, body)    { return request('PUT',    path, body); }
  function patch(path, body)  { return request('PATCH',  path, body); }
  function del(path)          { return request('DELETE', path, null); }

  /* ─── Profile normalisation ─────────────────────────────────────────────── */

  /**
   * Convert a backend User object into the localStorage profile shape
   * that track-calories, myplan, plan-sport, and settings expect.
   */
  function serverUserToProfile(u) {
    if (!u) return null;
    return {
      name:               u.name  || '',
      email:              u.email || '',
      age:                u.age   != null ? Number(u.age)       : null,
      gender:             u.gender || '',
      heightCm:           u.height_cm  != null ? Number(u.height_cm)  : null,
      weightKg:           u.weight_kg  != null ? Number(u.weight_kg)  : null,
      currentWeightKg:    u.weight_kg  != null ? Number(u.weight_kg)  : null,
      startWeightKg:      u.weight_kg  != null ? Number(u.weight_kg)  : null,
      goalWeightKg:       null,
      activity:           activityToFrontend(u.activity_level),
      activityLabel:      u.activity_level || 'moderately_active',
      goal:               goalToFrontend(u.goal),
      bmr:                u.bmr            != null ? Number(u.bmr)            : null,
      tdee:               u.daily_calories != null ? Number(u.daily_calories) : null,
      targetCalories:     u.daily_calories != null ? Number(u.daily_calories) : null,
      role:               u.role || 'user',
      avatarDataUrl:      u.avatar || '',
      healthConditionsMode: (u.health_condition_ids && u.health_condition_ids.length > 0) ? 'conditions' : 'none',
      healthConditionIds: u.health_condition_ids ? u.health_condition_ids.map(String) : [],
      updatedAt:          u.updated_at || new Date().toISOString()
    };
  }

  /**
   * Write profile + session to localStorage so all pages work.
   */
  function persistSession(serverUser, token) {
    try {
      var profile = serverUserToProfile(serverUser);
      if (!profile) return;

      // Store token + role
      if (token) setToken(token);
      setRole(serverUser.role || 'user');

      var profileJson = JSON.stringify(profile);

      // Standard keys used by all pages
      localStorage.setItem('nutri_profile', profileJson);
      localStorage.setItem('nutri_user_profile', profileJson);

      // Scoped key (per-user isolation)
      if (global.NutriAuth && typeof global.NutriAuth.scopedKey === 'function') {
        localStorage.setItem(global.NutriAuth.scopedKey('nutri_profile'), profileJson);
        // Health condition IDs
        var planIds = profile.healthConditionsMode === 'none' ? [] : profile.healthConditionIds;
        localStorage.setItem(
          global.NutriAuth.scopedKey('nutri_plan_condition_ids'),
          JSON.stringify(planIds)
        );
      }

      // Auth session (for page guard)
      var session = {
        email:     profile.email,
        name:      profile.name,
        role:      profile.role,
        provider:  serverUser.provider || 'local',
        loggedInAt: new Date().toISOString()
      };
      localStorage.setItem('nutri_auth_session', JSON.stringify(session));
    } catch (e) { console.warn('[NutriApi] persistSession error', e); }
  }

  /* ─── Public API ─────────────────────────────────────────────────────────── */

  global.NutriApi = {
    /* HTTP helpers */
    get:   get,
    post:  post,
    put:   put,
    patch: patch,
    del:   del,

    /* Token helpers */
    getToken:  getToken,
    setToken:  setToken,
    getRole:   getRole,
    setRole:   setRole,
    clearAuth: clearAuth,

    /* Mapping helpers */
    activityToBackend:  activityToBackend,
    activityToFrontend: activityToFrontend,
    goalToBackend:      goalToBackend,
    goalToFrontend:     goalToFrontend,

    /* Profile helpers */
    serverUserToProfile: serverUserToProfile,
    persistSession:      persistSession
  };

})(window);

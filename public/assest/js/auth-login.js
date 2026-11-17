/**
 * تسجيل الدخول عبر الباكند (Login → API)
 * Fixed: after login, fetches full user profile from GET /api/user
 * so that completeLogin() receives a complete user object.
 */
(function () {
  function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
  }

  function extractToken(data) {
    if (!data || typeof data !== 'object') return '';
    return (
      data.token ||
      data.accessToken ||
      data.access_token ||
      (data.data && (data.data.token || data.data.accessToken)) ||
      ''
    );
  }

  /**
   * Build the full user object compatible with auth.js completeLogin()
   * using the server response + NutriApi.serverUserToProfile() for the profile.
   */
  function buildFullUser(serverUser, token) {
    if (!serverUser) return null;
    var api = window.NutriApi;
    var profile = api ? api.serverUserToProfile(serverUser) : serverUser;
    return {
      email:    normalizeEmail(serverUser.email || ''),
      provider: serverUser.provider || 'local',
      role:     serverUser.role || 'user',
      profile:  profile
    };
  }

  /**
   * Login, save token, then fetch the full profile from GET /api/user.
   * @param {{ email: string, password: string }} payload
   * @returns {Promise<{ user: object, token: string }>}
   */
  function login(payload) {
    var api = window.NutriAuthApi;
    var cfg = window.NutriAuthConfig;
    var nutriApi = window.NutriApi;

    if (!api || !cfg) {
      return Promise.reject(new Error('NutriAuthApi / NutriAuthConfig not loaded'));
    }

    var path = cfg.ENDPOINTS.login || '/api/auth/login';
    var body = {
      email:    normalizeEmail(payload && payload.email),
      password: (payload && payload.password) || ''
    };

    return api.requestJson('POST', path, body).then(function (data) {
      var token = extractToken(data);
      if (token) {
        api.setStoredToken(token);
        // Also store in NutriApi TOKEN_KEY so api-client.js works immediately
        if (nutriApi) nutriApi.setToken(token);
      }

      // data.user has minimal info from login response — fetch full profile
      var minimalUser = data.user || data.data && data.data.user || data;
      if (nutriApi && token) {
        // Persist role immediately so persistSession can read it
        nutriApi.setRole((minimalUser && minimalUser.role) || 'user');

        // Fetch full profile
        return nutriApi.get('/api/user').then(function (profileData) {
          var serverUser = profileData && profileData.user ? profileData.user : profileData;
          // Merge role from login response (sometimes not in /api/user)
          if (minimalUser && minimalUser.role && serverUser) serverUser.role = minimalUser.role;
          nutriApi.persistSession(serverUser, token);
          var fullUser = buildFullUser(serverUser, token);
          if (!fullUser) throw new Error('Invalid user data from server');
          return { user: fullUser, token: token, raw: data };
        }).catch(function () {
          // Fallback: use minimal data from login response
          var fullUser = buildFullUser(minimalUser, token);
          if (!fullUser) throw new Error('Invalid user data from server');
          return { user: fullUser, token: token, raw: data };
        });
      }

      var fullUser = buildFullUser(minimalUser, token);
      if (!fullUser) throw new Error('Invalid user data from server');
      return { user: fullUser, token: token, raw: data };
    });
  }

  window.NutriAuthLogin = {
    login: login
  };
})();

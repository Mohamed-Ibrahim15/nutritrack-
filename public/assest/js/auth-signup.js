/**
 * تسجيل مستخدم جديد عبر الباكند (Sign up → API)
 * Fixed: maps payload to backend snake_case fields and fetches full profile after register.
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
   * Map camelCase frontend payload → snake_case backend fields.
   */
  function mapPayload(payload) {
    var api = window.NutriApi;
    return {
      name:                  payload.name || '',
      email:                 normalizeEmail(payload.email),
      password:              payload.password || '',
      password_confirmation: payload.password || '',
      age:                   payload.age  ? Number(payload.age)      : undefined,
      gender:                payload.gender || undefined,
      height_cm:             payload.heightCm  ? Number(payload.heightCm)  : undefined,
      weight_kg:             payload.weightKg  ? Number(payload.weightKg)  : undefined,
      activity_level:        api ? api.activityToBackend(payload.activity) : undefined,
      goal:                  api ? api.goalToBackend(payload.goal)         : undefined,
    };
  }

  function register(payload) {
    var api = window.NutriAuthApi;
    var cfg = window.NutriAuthConfig;
    var nutriApi = window.NutriApi;

    if (!api || !cfg) {
      return Promise.reject(new Error('NutriAuthApi / NutriAuthConfig not loaded'));
    }

    var mapped = mapPayload(payload);
    var path   = cfg.ENDPOINTS.register || '/api/auth/register';

    return api.requestJson('POST', path, mapped).then(function (data) {
      var token = extractToken(data);
      if (token) {
        api.setStoredToken(token);
        if (nutriApi) nutriApi.setToken(token);
      }

      var minimalUser = data.user || (data.data && data.data.user) || data;

      if (nutriApi && token) {
        nutriApi.setRole((minimalUser && minimalUser.role) || 'user');

        // After register, optionally submit health info if profile fields were in form
        var healthPayload = {
          gender:         mapped.gender,
          age:            mapped.age,
          height_cm:      mapped.height_cm,
          weight_kg:      mapped.weight_kg,
          activity_level: mapped.activity_level,
          goal:           mapped.goal,
        };
        // Only submit if all required fields are present
        var canSubmitHealth = healthPayload.gender && healthPayload.age &&
                              healthPayload.height_cm && healthPayload.weight_kg &&
                              healthPayload.activity_level && healthPayload.goal;

        var afterRegister = canSubmitHealth
          ? nutriApi.post('/api/profile/health-info', healthPayload).catch(function () {})
          : Promise.resolve();

        return afterRegister.then(function () {
          return nutriApi.get('/api/user').then(function (profileData) {
            var serverUser = profileData && profileData.user ? profileData.user : profileData;
            if (minimalUser && minimalUser.role && serverUser) serverUser.role = minimalUser.role;
            nutriApi.persistSession(serverUser, token);
            var fullUser = buildFullUser(serverUser, token);
            if (!fullUser) throw new Error('Invalid user data');
            return { user: fullUser, token: token, raw: data };
          });
        }).catch(function () {
          var fullUser = buildFullUser(minimalUser, token);
          if (!fullUser) throw new Error('Invalid user data');
          return { user: fullUser, token: token, raw: data };
        });
      }

      var fullUser = buildFullUser(minimalUser, token);
      if (!fullUser) throw new Error('Invalid user data');
      return { user: fullUser, token: token, raw: data };
    });
  }

  window.NutriAuthSignup = { register: register };
})();

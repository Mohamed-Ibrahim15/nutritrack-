/* حساب السعرات والاحتياجات اليومية وعرض النتائج في صفحة التتبع */
(function () {
  var ACTIVITY_LABELS = { '1.2': 'Sedentary', '1.375': 'Light', '1.55': 'Moderate', '1.725': 'Active', '1.9': 'Very active' };
  var PROFILE_KEY = (window.NutriAuth && window.NutriAuth.scopedKey('nutri_profile')) || 'nutri_profile';

  /* ترجمة النصوص حسب اللغة الحالية */
  function tr(key) {
    return window.NutriI18n && typeof window.NutriI18n.t === "function" ? window.NutriI18n.t(key) : key;
  }

  /* تحويل قيمة النشاط إلى وصف مختصر للمستخدم */
  function activityLabelForActivity(act) {
    var k = "track.actShort." + String(act);
    var s = tr(k);
    return s !== k ? s : ACTIVITY_LABELS[String(act)] || "Custom";
  }

  var BACKEND_ASSISTANT_URL = '/api/assistant';

  
  var ALLOW_DIRECT_OPENAI_IN_BROWSER = false;

  /* حساب BMR بمعادلة Mifflin-St Jeor */
  function bmrMifflin(weightKg, heightCm, age, gender) {
    var s = gender === 'male' ? 5 : -161;
    return 10 * weightKg + 6.25 * heightCm - 5 * age + s;
  }

  /* قراءة بيانات الحساب الغذائي من النموذج */
  function readProfileFromForm() {
    var age = parseInt(document.getElementById('age').value, 10);
    var gender = document.getElementById('gender').value;
    var height = parseFloat(document.getElementById('height').value);
    var weight = parseFloat(document.getElementById('weight').value);
    var act = parseFloat(document.getElementById('activity').value);
    var goal = document.getElementById('goal').value;
    return { age: age, gender: gender, heightCm: height, weightKg: weight, activity: act, goal: goal };
  }

  function setField(id, value) {
    var el = document.getElementById(id);
    if (!el) return;
    if (value == null || value === '') return;
    el.value = String(value);
  }

  /* تحديد سعرات الهدف حسب نوع الهدف (تنشيف/زيادة/ثبات) */
  function goalTargetCalories(tdee, goal) {
    if (goal === 'lose') return Math.round(tdee - 500);
    if (goal === 'gain') return Math.round(tdee + 300);
    return Math.round(tdee);
  }

  /* حفظ الملف الغذائي ومزامنته مع مفاتيح التخزين الأخرى */
  function persistProfile(data) {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(data));
      localStorage.setItem('nutri_profile', JSON.stringify(data));
      localStorage.setItem('nutri_user_profile', JSON.stringify(data));
      var sessionRaw = localStorage.getItem('nutri_auth_session');
      var usersRaw = localStorage.getItem('nutri_auth_users');
      if (sessionRaw && usersRaw) {
        var session = JSON.parse(sessionRaw);
        var users = JSON.parse(usersRaw);
        var email = String((session && session.email) || '').trim().toLowerCase();
        if (Array.isArray(users) && email) {
          var idx = users.findIndex(function (u) {
            return String((u && u.email) || '').trim().toLowerCase() === email;
          });
          if (idx >= 0) {
            users[idx].profile = Object.assign({}, users[idx].profile || {}, data, {
              email: users[idx].email
            });
            localStorage.setItem('nutri_auth_users', JSON.stringify(users));
          }
        }
      }
      try {
        var planKey =
          (window.NutriAuth && window.NutriAuth.scopedKey('nutri_plan_condition_ids')) || 'nutri_plan_condition_ids';
        var planIds =
          data.healthConditionsMode === 'none'
            ? []
            : Array.isArray(data.healthConditionIds)
            ? data.healthConditionIds
            : [];
        localStorage.setItem(planKey, JSON.stringify(planIds));
      } catch (e2) {}
    } catch (e) {}
  }

  /* تحميل بيانات المستخدم المخزنة سابقا */
  function loadSavedProfile() {
    try {
      var raw = localStorage.getItem(PROFILE_KEY) || localStorage.getItem('nutri_profile');
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  /* عرض إحصاءات الحرق من سجل التمارين (24 ساعة + 7 أيام) */
  function renderExerciseBurnStats() {
    var wrap = document.getElementById('track-exercise-burn-stats');
    var summaryEl = document.getElementById('track-exercise-burn-summary');
    var listEl = document.getElementById('track-exercise-burn-list');
    if (!wrap || !summaryEl || !listEl) return;

    var p = loadSavedProfile();
    var log = p && Array.isArray(p.exerciseBurnLog) ? p.exerciseBurnLog : [];
    if (!log.length) {
      wrap.hidden = true;
      listEl.innerHTML = '';
      summaryEl.textContent = '';
      return;
    }

    wrap.hidden = false;
    var dayMs = 24 * 60 * 60 * 1000;
    var weekMs = 7 * dayMs;
    var now = Date.now();
    var sum24h = 0;
    var sumWeek = 0;
    for (var i = 0; i < log.length; i++) {
      var e = log[i];
      var k = Number(e && e.kcal) || 0;
      var t = e && e.at ? Date.parse(e.at) : NaN;
      if (Number.isFinite(t) && now - t >= 0 && now - t <= dayMs) sum24h += k;
      if (Number.isFinite(t) && now - t >= 0 && now - t <= weekMs) sumWeek += k;
    }

    summaryEl.textContent = tr("track.burn.summary")
      .replace("{0}", String(Math.round(sum24h)))
      .replace("{1}", String(Math.round(sumWeek)));

    var sorted = log
      .slice()
      .sort(function (a, b) {
        return String(b.at || '').localeCompare(String(a.at || ''));
      });
    var show = sorted.slice(0, 12);
    listEl.innerHTML = '';
    for (var j = 0; j < show.length; j++) {
      var row = show[j];
      var li = document.createElement('li');
      var dist =
        row.distanceKm != null && Number(row.distanceKm) > 0
          ? " · " + row.distanceKm + " " + tr("track.burn.km")
          : "";
      var minPart = row.minutes != null ? String(row.minutes) + " " + tr("track.burn.min") : "";
      li.textContent = tr("track.burn.row")
        .replace("{0}", row.label || tr("track.burn.activity"))
        .replace("{1}", minPart)
        .replace("{2}", dist)
        .replace("{3}", row.kcal != null ? String(row.kcal) : "—");
      listEl.appendChild(li);
    }
  }

  /** Save health UI immediately (not only when pressing Calculate) so Track / My Plan stay in sync */
  /* حفظ حالة الأمراض المختارة مباشرة لتتزامن مع الصفحات الأخرى */
  function mergeHealthIntoStoredProfile(st) {
    if (!st) return;
    var p = loadSavedProfile() || {};
    p.healthConditionsMode = st.mode === 'conditions' ? 'conditions' : 'none';
    p.healthConditionIds =
      p.healthConditionsMode === 'none' ? [] : Array.isArray(st.ids) ? st.ids.map(String) : [];
    persistProfile(p);
  }

  /* تعبئة الحقول بقيم محفوظة لتسهيل التعديل وإعادة الحساب */
  function prefillFromSavedProfile() {
    var p = loadSavedProfile();
    if (!p) return;
    setField('age', p.age);
    setField('gender', p.gender);
    setField('height', p.heightCm);
    setField('weight', p.weightKg);
    setField('activity', p.activity);
    setField('goal', p.goal);
  }

  function getApiKey() {
    try {
      return localStorage.getItem('nutri_openai_key') || '';
    } catch (e) {
      return '';
    }
  }

  document.getElementById('btn-calc').addEventListener('click', function () {
    var errEl = document.getElementById('calc-form-error');
    var resultsEl = document.getElementById('results');
    function showCalcErr(msg) {
      if (errEl) { errEl.textContent = msg; errEl.hidden = false; }
      if (resultsEl) resultsEl.hidden = true;
    }
    function clearCalcErr() {
      if (errEl) { errEl.textContent = ''; errEl.hidden = true; }
    }

    var f = readProfileFromForm();
    var bmr = bmrMifflin(f.weightKg, f.heightCm, f.age, f.gender);
    var tdee = bmr * f.activity;
    var target = goalTargetCalories(tdee, f.goal);

    if (!isFinite(bmr) || !isFinite(tdee) || !isFinite(target) || bmr <= 0 || tdee <= 0) {
      showCalcErr(tr('track.calc.invalid'));
      return;
    }

    clearCalcErr();
    document.getElementById('out-bmr').textContent  = Math.round(bmr);
    document.getElementById('out-tdee').textContent = Math.round(tdee);
    document.getElementById('out-target').textContent = target;
    var note = '';
    if (f.goal === 'lose')     note = tr('track.goal.note.lose');
    else if (f.goal === 'gain') note = tr('track.goal.note.gain');
    else                       note = tr('track.goal.note.maintain');
    document.getElementById('out-target-note').textContent = note;
    if (resultsEl) {
      resultsEl.hidden = false;
      try { resultsEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (eScroll) {}
    }

    var hcEl = document.getElementById('track-health-conditions');
    var hcState = window.NutriHealthConditions && hcEl
      ? NutriHealthConditions.readState(hcEl)
      : { mode: 'none', ids: [] };

    var prev = loadSavedProfile() || {};
    var profile = {
      bmr:                Math.round(bmr),
      tdee:               Math.round(tdee),
      targetCalories:     target,
      goal:               f.goal,
      weightKg:           f.weightKg,
      heightCm:           f.heightCm,
      age:                f.age,
      gender:             f.gender,
      activity:           f.activity,
      activityLabel:      activityLabelForActivity(f.activity),
      updatedAt:          new Date().toISOString(),
      healthConditionsMode: hcState.mode,
      healthConditionIds:   hcState.ids
    };
    if (prev.name)                          profile.name             = prev.name;
    if (prev.email)                         profile.email            = prev.email;
    if (Array.isArray(prev.exerciseBurnLog)) profile.exerciseBurnLog = prev.exerciseBurnLog;
    persistProfile(profile);
    appendChat('bot', tr('track.chat.afterCalc'));

    // ── API: submit health info to backend ──────────────────────────────────
    var nutriApi = window.NutriApi;
    if (nutriApi) {
      var slugs = hcState.mode === 'conditions'
        ? (hcState.ids || []).map(String).filter(Boolean)
        : [];

      // Use slugsToApiIds to convert local string slugs → backend integer IDs (Bug #3 fix)
      var doApiSubmit = function (condIds) {
        var apiPayload = {
          gender:               f.gender,
          age:                  f.age,
          height_cm:            f.heightCm,
          weight_kg:            f.weightKg,
          activity_level:       nutriApi.activityToBackend(f.activity),
          goal:                 nutriApi.goalToBackend(f.goal),
          health_condition_ids: condIds
        };
        nutriApi.post('/api/profile/health-info', apiPayload)
          .then(function (res) {
            if (res && res.bmr) {
              profile.bmr = Math.round(res.bmr);
              document.getElementById('out-bmr').textContent = profile.bmr;
            }
            if (res && res.daily_calories) {
              profile.tdee = Math.round(res.daily_calories);
              profile.targetCalories = Math.round(res.daily_calories);
              document.getElementById('out-tdee').textContent   = profile.tdee;
              document.getElementById('out-target').textContent = profile.targetCalories;
            }
            persistProfile(profile);
            if (res && res.user && nutriApi.persistSession) {
              nutriApi.persistSession(res.user, nutriApi.getToken());
            }
          })
          .catch(function (err) {
            console.warn('[track-calories] /api/profile/health-info failed:', err && err.message);
          });
      };

      if (window.NutriHealthConditions && typeof window.NutriHealthConditions.slugsToApiIds === 'function') {
        NutriHealthConditions.slugsToApiIds(slugs, doApiSubmit);
      } else {
        doApiSubmit(slugs.map(Number).filter(Boolean));
      }
    }
  });

  var messagesEl = document.getElementById('chat-messages');
  var inputEl    = document.getElementById('chat-input');
  var statusEl   = document.getElementById('chat-status');

  function appendChat(role, text) {
    if (!messagesEl) return; // chat section may be on chatbot.html, not this page
    var div = document.createElement('div');
    div.className = 'msg ' + (role === 'user' ? 'user' : 'bot');
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function buildContextBlock() {
    try {
      var p = loadSavedProfile();
      if (!p) return 'No calculation saved yet. Ask the user to fill the form and press Calculate first.';
      return 'Client metrics: BMR ' + p.bmr + ' kcal, TDEE ' + p.tdee + ' kcal, suggested target ' + p.targetCalories + ' kcal, goal ' + p.goal + ', weight ' + p.weightKg + ' kg, height ' + p.heightCm + ' cm, age ' + p.age + ', activity ' + p.activityLabel + '.';
    } catch (e) {
      return 'Profile unavailable.';
    }
  }

  function withTimeout(ms) {
    // Tiny helper for fetch timeouts using AbortController.
    var controller = new AbortController();
    var id = setTimeout(function () {
      controller.abort();
    }, ms);
    return { signal: controller.signal, cancel: function () { clearTimeout(id); } };
  }

  async function postJson(url, payload, extraHeaders) {
    var t = withTimeout(20000);
    try {
      var res = await fetch(url, {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, extraHeaders || {}),
        body: JSON.stringify(payload),
        signal: t.signal
      });

      // Try JSON first; if server returns text/html on errors, fall back gracefully.
      var data = null;
      try {
        data = await res.json();
      } catch (e) {}

      if (!res.ok) {
        var msg =
          (data && data.error && data.error.message) ||
          (data && data.message) ||
          ('Request failed (' + res.status + ').');
        var err = new Error(msg);
        err.status = res.status;
        err.data = data;
        throw err;
      }

      return data;
    } finally {
      t.cancel();
    }
  }

  function fallbackReply() {
    var key = getApiKey();
    if (!ALLOW_DIRECT_OPENAI_IN_BROWSER || !key) return null;
    return null;
  }

  async function sendToBackend(userText) {
    // Backend gets structured context + authenticated user
    var nutriApi = window.NutriApi;
    var profile = loadSavedProfile();
    var payload = {
      message: userText,
      context: { profile: profile }
    };
    var headers = {};
    var token = nutriApi ? nutriApi.getToken() : '';
    if (token) headers['Authorization'] = 'Bearer ' + token;
    var baseUrl = (window.NutriAuthConfig && window.NutriAuthConfig.API_BASE_URL) || window.location.origin || '';
    var data = await postJson(baseUrl + BACKEND_ASSISTANT_URL, payload, headers);
    return (data && (data.reply || data.message)) || '';
  }

  async function sendDirectToOpenAI(userText) {
    // Dev-only path. Keep secrets on the backend in production.
    var key = getApiKey();
    var system =
      'You are a supportive nutrition and health coach. Use the CONTEXT for numbers. Ask gently about chronic diseases, medications, allergies, pregnancy, or eating disorders when relevant. Never diagnose or replace medical care; encourage professional advice. Keep replies concise and practical.';
    var userPayload = buildContextBlock() + '\n\nUser message: ' + userText;

    var data = await postJson(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userPayload }
        ],
        temperature: 0.6,
        max_tokens: 500
      },
      { Authorization: 'Bearer ' + key }
    );

    return (
      data &&
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content
    ) || '';
  }

  async function sendChat() {
    var text = (inputEl.value || '').trim();
    if (!text) return;
    inputEl.value = '';
    appendChat('user', text);
    statusEl.textContent = tr('track.chat.thinking');
    try {
      var reply = '';

      // Preferred path: backend integration.
      // If backend is not available yet, you can temporarily enable direct OpenAI calls.
      try {
        reply = await sendToBackend(text);
      } catch (backendErr) {
        // If backend is down/unwired, optionally fall back to dev-only direct OpenAI.
        if (ALLOW_DIRECT_OPENAI_IN_BROWSER && getApiKey()) {
          reply = await sendDirectToOpenAI(text);
        } else {
          throw backendErr;
        }
      }

      appendChat('bot', reply || tr('track.chat.noReply'));
    } catch (err) {
      var msg = tr('track.chat.unreachable');
      if (err && err.name === 'AbortError') msg += tr('track.chat.timeout');
      else if (err && err.message) msg += err.message;
      else msg += tr('track.chat.tryAgain');
      appendChat('bot', msg);
    } finally {
      statusEl.textContent = '';
    }
  }

  if (document.getElementById('btn-send')) {
    document.getElementById('btn-send').addEventListener('click', sendChat);
  }
  if (inputEl) {
    inputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') sendChat();
    });
  }

  function resetChatMessages() {
    if (!messagesEl) return; // chat not present on this page
    messagesEl.innerHTML = '';
    appendChat('bot', tr('track.chat.welcome'));
    var p = loadSavedProfile();
    if (p && p.bmr) {
      appendChat('bot', tr('track.chat.afterCalc'));
    }
  }

  resetChatMessages();

  // Make Sign up data appear in Track Calories form automatically.
  prefillFromSavedProfile();
  renderExerciseBurnStats();
  window.addEventListener('nutri-exercise-log-updated', renderExerciseBurnStats);

  window.addEventListener('nutri-i18n-applied', function () {
    renderExerciseBurnStats();
    resetChatMessages();
    var noteEl = document.getElementById('out-target-note');
    var goalEl = document.getElementById('goal');
    var resEl = document.getElementById('results');
    if (noteEl && goalEl && resEl && !resEl.hidden) {
      var g = goalEl.value;
      if (g === 'lose') noteEl.textContent = tr('track.goal.note.lose');
      else if (g === 'gain') noteEl.textContent = tr('track.goal.note.gain');
      else noteEl.textContent = tr('track.goal.note.maintain');
    }
  });

  var trackHc = document.getElementById('track-health-conditions');
  if (trackHc && window.NutriHealthConditions) {
    var savedHc = loadSavedProfile();
    NutriHealthConditions.render(trackHc, (savedHc && savedHc.healthConditionIds) || [], 'track-hc', {
      mode: savedHc && savedHc.healthConditionsMode,
      profile: savedHc,
      onChange: function (st) {
        mergeHealthIntoStoredProfile(st);
      }
    });
  }
})();

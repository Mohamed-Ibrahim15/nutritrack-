/* =====================================================================
   chatbot.js — NutriTrack Health Assistant (standalone chatbot page)
   Reuses the same API integration as track-calories.js.
   Reads the saved nutri_profile for context — no BMR form needed.
   ===================================================================== */
(function () {
  'use strict';

  var BACKEND_ASSISTANT_URL = '/api/assistant';
  var ALLOW_DIRECT_OPENAI_IN_BROWSER = false;

  /* ── i18n helper ─────────────────────────────────────────────── */
  function tr(key) {
    return window.NutriI18n && typeof window.NutriI18n.t === 'function'
      ? window.NutriI18n.t(key) : key;
  }

  /* ── Load saved profile ──────────────────────────────────────── */
  function loadSavedProfile() {
    try {
      var PROFILE_KEY = (window.NutriAuth && window.NutriAuth.scopedKey
        ? window.NutriAuth.scopedKey('nutri_profile')
        : null) || 'nutri_profile';
      var raw = localStorage.getItem(PROFILE_KEY) || localStorage.getItem('nutri_profile');
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  /* ── OpenAI key ──────────────────────────────────────────────── */
  function getApiKey() {
    try { return localStorage.getItem('nutri_openai_key') || ''; } catch (e) { return ''; }
  }

  /* ── Fetch helper ────────────────────────────────────────────── */
  function withTimeout(ms) {
    var ctrl = new AbortController();
    var id = setTimeout(function () { ctrl.abort(); }, ms);
    return { signal: ctrl.signal, cancel: function () { clearTimeout(id); } };
  }

  async function postJson(url, payload, extraHeaders) {
    var t = withTimeout(20000);
    try {
      var res = await fetch(url, {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json', 'Accept': 'application/json' }, extraHeaders || {}),
        body: JSON.stringify(payload),
        signal: t.signal
      });
      var data = null;
      try { data = await res.json(); } catch (e) {}
      if (!res.ok) {
        var msg = (data && data.error && data.error.message) ||
                  (data && data.message) ||
                  ('Request failed (' + res.status + ').');
        var err = new Error(msg);
        err.status = res.status; err.data = data;
        throw err;
      }
      return data;
    } finally { t.cancel(); }
  }

  /* ── Context block for AI ───────────────────────────────────── */
  function buildContextBlock() {
    try {
      var p = loadSavedProfile();
      if (!p) return 'No calculation saved yet. Ask the user to visit Track Calories and calculate their BMR first.';
      return 'Client metrics: BMR ' + p.bmr + ' kcal, TDEE ' + p.tdee +
             ' kcal, suggested target ' + p.targetCalories +
             ' kcal, goal ' + p.goal +
             ', weight ' + p.weightKg + ' kg' +
             ', height ' + p.heightCm + ' cm' +
             ', age ' + p.age +
             ', activity ' + p.activityLabel + '.';
    } catch (e) { return 'Profile unavailable.'; }
  }

  /* ── Backend send ────────────────────────────────────────────── */
  async function sendToBackend(userText) {
    var nutriApi = window.NutriApi;
    var profile = loadSavedProfile();
    var payload = { message: userText, context: { profile: profile } };
    var headers = {};
    var token = nutriApi ? nutriApi.getToken() : '';
    if (token) headers['Authorization'] = 'Bearer ' + token;
    var baseUrl = (window.NutriAuthConfig && window.NutriAuthConfig.API_BASE_URL) || window.location.origin || '';
    var data = await postJson(baseUrl + BACKEND_ASSISTANT_URL, payload, headers);
    return (data && (data.reply || data.message)) || '';
  }

  async function sendDirectToOpenAI(userText) {
    var key = getApiKey();
    var system = 'You are a supportive nutrition and health coach. Use the CONTEXT for numbers. Ask gently about chronic diseases, medications, allergies, pregnancy, or eating disorders when relevant. Never diagnose or replace medical care; encourage professional advice. Keep replies concise and practical.';
    var userPayload = buildContextBlock() + '\n\nUser message: ' + userText;
    var data = await postJson(
      'https://api.openai.com/v1/chat/completions',
      { model: 'gpt-4o-mini', messages: [{ role: 'system', content: system }, { role: 'user', content: userPayload }], temperature: 0.6, max_tokens: 500 },
      { Authorization: 'Bearer ' + key }
    );
    return (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
  }

  /* ── DOM refs ────────────────────────────────────────────────── */
  var messagesEl = document.getElementById('chat-messages');
  var inputEl    = document.getElementById('chat-input');
  var statusEl   = document.getElementById('chat-status');
  var profileBanner = document.getElementById('chatbot-profile-banner');

  /* ── Render profile summary banner ──────────────────────────── */
  function renderProfileBanner() {
    if (!profileBanner) return;
    var p = loadSavedProfile();
    if (p && p.bmr) {
      profileBanner.innerHTML =
        '<span class="chatbot-stat"><strong>' + p.bmr + '</strong> ' + tr('chatbot.stat.bmr') + '</span>' +
        '<span class="chatbot-stat"><strong>' + p.tdee + '</strong> ' + tr('chatbot.stat.tdee') + '</span>' +
        '<span class="chatbot-stat"><strong>' + p.targetCalories + '</strong> ' + tr('chatbot.stat.target') + '</span>' +
        '<span class="chatbot-stat chatbot-stat--goal">' + (p.goal || '—') + '</span>';
      profileBanner.hidden = false;
    } else {
      profileBanner.innerHTML = '<span class="chatbot-no-profile" data-i18n="chatbot.noProfile">' + tr('chatbot.noProfile') + ' <a href="track-calories.html">' + (tr('chatbot.calcBmrFirst') || 'Calculate your BMR first →') + '</a></span>';
      profileBanner.hidden = false;
    }
  }

  /* ── Append message ──────────────────────────────────────────── */
  function appendChat(role, text) {
    var wrap = document.createElement('div');
    wrap.className = 'msg-wrap msg-wrap--' + (role === 'user' ? 'user' : 'bot');

    var avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.textContent = role === 'user' ? '👤' : '🤖';

    var bubble = document.createElement('div');
    bubble.className = 'msg ' + (role === 'user' ? 'user' : 'bot');
    
    if (role === 'bot') {
      bubble.innerHTML = text.replace(/\n/g, '<br>');
    } else {
      bubble.textContent = text;
    }

    if (role === 'bot') {
      wrap.appendChild(avatar);
      wrap.appendChild(bubble);
    } else {
      wrap.appendChild(bubble);
      wrap.appendChild(avatar);
    }

    messagesEl.appendChild(wrap);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  /* ── Typing indicator ────────────────────────────────────────── */
  var typingEl = null;
  function showTyping() {
    if (typingEl) return;
    typingEl = document.createElement('div');
    typingEl.className = 'msg-wrap msg-wrap--bot typing-indicator-wrap';
    typingEl.innerHTML = '<div class="msg-avatar">🤖</div><div class="typing-indicator"><span></span><span></span><span></span></div>';
    messagesEl.appendChild(typingEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
  function hideTyping() {
    if (typingEl) { typingEl.remove(); typingEl = null; }
  }

  /* ── Send ────────────────────────────────────────────────────── */
  var isSending = false;

  async function sendChat() {
    if (isSending) return;
    var text = (inputEl ? inputEl.value : '').trim();
    if (!text) return;
    isSending = true;
    inputEl.value = '';
    inputEl.disabled = true;
    document.getElementById('btn-send').disabled = true;

    appendChat('user', text);
    showTyping();

    try {
      var reply = '';
      try {
        reply = await sendToBackend(text);
      } catch (backendErr) {
        if (ALLOW_DIRECT_OPENAI_IN_BROWSER && getApiKey()) {
          reply = await sendDirectToOpenAI(text);
        } else {
          throw backendErr;
        }
      }
      hideTyping();
      appendChat('bot', reply || tr('track.chat.noReply'));
    } catch (err) {
      hideTyping();
      var msg = tr('track.chat.unreachable');
      if (err && err.name === 'AbortError') msg += tr('track.chat.timeout');
      else if (err && err.message) msg += err.message;
      else msg += tr('track.chat.tryAgain');
      appendChat('bot', msg);
    } finally {
      isSending = false;
      if (inputEl) inputEl.disabled = false;
      var sendBtn = document.getElementById('btn-send');
      if (sendBtn) sendBtn.disabled = false;
      if (inputEl) inputEl.focus();
    }
  }

  /* ── Load chat history from backend ─────────────────────────── */
  async function loadHistory() {
    var nutriApi = window.NutriApi;
    var token    = nutriApi ? nutriApi.getToken() : '';
    if (!token) return false; // not logged in, skip

    var baseUrl = (window.NutriAuthConfig && window.NutriAuthConfig.API_BASE_URL) || window.location.origin || '';
    try {
      var t = withTimeout(10000);
      var res = await fetch(baseUrl + '/api/chat-history', {
        method:  'GET',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        signal:  t.signal
      });
      t.cancel();
      if (!res.ok) return false;
      var json    = await res.json();
      var history = json.history || [];
      if (history.length === 0) return false;
      history.forEach(function (entry) {
        appendChat(entry.role === 'user' ? 'user' : 'bot', entry.message);
      });
      return true;
    } catch (err) {
      console.warn('[chatbot] Could not load history:', err);
      return false;
    }
  }

  /* ── Clear history (API + UI) ────────────────────────────────── */
  async function clearHistory() {
    var nutriApi = window.NutriApi;
    var token    = nutriApi ? nutriApi.getToken() : '';
    var baseUrl  = (window.NutriAuthConfig && window.NutriAuthConfig.API_BASE_URL) || window.location.origin || '';
    try {
      var headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = 'Bearer ' + token;
      var t = withTimeout(8000);
      await fetch(baseUrl + '/api/chat-history', { method: 'DELETE', headers: headers, signal: t.signal });
      t.cancel();
    } catch (err) {
      console.warn('[chatbot] Could not clear history on server:', err);
    }
    messagesEl.innerHTML = '';
    appendChat('bot', tr('track.chat.welcome'));
  }

  /* ── Init ────────────────────────────────────────────────────── */
  async function init() {
    renderProfileBanner();

    // Load previous history; show welcome messages only if no history exists
    var hadHistory = await loadHistory();
    if (!hadHistory) {
      appendChat('bot', tr('track.chat.welcome'));
      var p = loadSavedProfile();
      if (p && p.bmr) appendChat('bot', tr('track.chat.afterCalc'));
    }

    var sendBtn = document.getElementById('btn-send');
    if (sendBtn) sendBtn.addEventListener('click', sendChat);
    if (inputEl) {
      inputEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
      });
    }

    /* Clear chat button — wipes DB history too */
    var clearBtn = document.getElementById('btn-clear-chat');
    if (clearBtn) {
      clearBtn.addEventListener('click', clearHistory);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* Re-init on language change */
  window.addEventListener('nutri-i18n-applied', function () {
    renderProfileBanner();
  });

})();

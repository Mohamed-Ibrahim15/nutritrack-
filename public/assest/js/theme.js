/* ============================================================
   theme.js — NutriTrack Premium Theme System
   Handles dark/light mode toggle with localStorage persistence.
   Works on ALL pages: landing, user dashboard, admin panel.

   IMPORTANT: This script is loaded in <head> (before <body> exists).
   All body/DOM accesses are guarded accordingly.
   ============================================================ */
(function () {
  'use strict';

  var STORAGE_KEY = 'nutri_theme';

  /* ── Apply theme ─────────────────────────────────────────── */
  function applyTheme(theme) {
    // 1. Set on <html> — works immediately even from <head>
    document.documentElement.setAttribute('data-theme', theme);

    // 2. Legacy .dark-theme-variables on <body> — guard null when in <head>
    function setBodyClass() {
      if (!document.body) return;
      if (theme === 'dark') {
        document.body.classList.add('dark-theme-variables');
      } else {
        document.body.classList.remove('dark-theme-variables');
      }
    }

    if (document.body) {
      setBodyClass();
    } else {
      // Script is in <head>; defer until body is ready
      document.addEventListener('DOMContentLoaded', setBodyClass, { once: true });
    }

    // 3. Persist to localStorage
    try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) {}

    // 4. Sync all toggle-button icons/labels (defer if DOM not ready)
    function syncButtons() {
      var icon  = theme === 'dark' ? 'light_mode' : 'dark_mode';
      var label = theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
      document.querySelectorAll('.theme-toggle-btn').forEach(function (btn) {
        btn.setAttribute('title', label);
        btn.setAttribute('aria-label', label);
        var ic = btn.querySelector('.theme-icon');
        if (ic) ic.textContent = icon;
      });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', syncButtons, { once: true });
    } else {
      syncButtons();
    }

    // 5. Fire custom event so other JS modules can react
    try {
      window.dispatchEvent(new CustomEvent('nutri:themechange', { detail: { theme: theme } }));
    } catch (e) {}
  }

  /* ── Read saved preference (fallback: system preference) ── */
  function getSaved() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') return saved;
    } catch (e) {}
    return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
      ? 'dark' : 'light';
  }

  /* ── Toggle on any .theme-toggle-btn click (event delegation) ── */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.theme-toggle-btn');
    if (!btn) return;
    var current = document.documentElement.getAttribute('data-theme') || getSaved();
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });

  /* ── Initial apply — runs before first paint ── */
  applyTheme(getSaved());

  /* ── Expose globally so other scripts can toggle programmatically ── */
  window.NutriTheme = {
    apply : applyTheme,
    get   : function () { return document.documentElement.getAttribute('data-theme') || 'light'; },
    toggle: function () {
      var c = document.documentElement.getAttribute('data-theme') || getSaved();
      applyTheme(c === 'dark' ? 'light' : 'dark');
    }
  };
})();

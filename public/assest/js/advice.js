/**
 * advice.js — Phase 9: Health Advice
 * Connects to GET /api/advice and renders advice cards on the Follow Up page.
 * Requires: auth-backend-config.js, api-client.js (NutriApi)
 */
(function () {
  'use strict';

  /* ─── Helpers ────────────────────────────────────────────────────────── */

  function tr(key, fallback) {
    return (window.NutriI18n && typeof window.NutriI18n.t === 'function')
      ? window.NutriI18n.t(key)
      : (fallback || key);
  }

  function api() { return window.NutriApi || null; }

  function formatDate(str) {
    if (!str) return '';
    try {
      return new Date(str).toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric'
      });
    } catch (e) { return str; }
  }

  /* ─── Category filter bar ────────────────────────────────────────────── */

  var ALL_CATEGORIES = ['all', 'general', 'nutrition', 'fitness', 'lifestyle'];
  var activeCategory = 'all';
  var cachedArticles  = [];

  function buildFilterBar(containerEl) {
    var existing = document.getElementById('advice-filter-bar');
    if (existing) {
      ALL_CATEGORIES.forEach(function (cat) {
        var b = existing.querySelector('button[data-cat="' + cat + '"]');
        if (b) b.textContent = tr('advice.cat.' + cat);
      });
      return;
    }

    var bar = document.createElement('div');
    bar.id = 'advice-filter-bar';
    bar.className = 'advice-filter-bar';

    ALL_CATEGORIES.forEach(function (cat) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.cat = cat;
      btn.className = 'advice-filter-btn' + (cat === activeCategory ? ' active' : '');
      btn.textContent = tr('advice.cat.' + cat);

      btn.addEventListener('click', function () {
        activeCategory = cat;
        bar.querySelectorAll('.advice-filter-btn').forEach(function (b) {
          b.classList.remove('active');
        });
        btn.classList.add('active');
        renderAdvice(
          cat === 'all'
            ? cachedArticles
            : cachedArticles.filter(function (a) { return a.category === cat; }),
          containerEl
        );
      });

      bar.appendChild(btn);
    });

    containerEl.parentElement.insertBefore(bar, containerEl);
  }

  /* ─── Render advice cards ────────────────────────────────────────────── */

  function renderAdvice(articles, containerEl) {
    if (!containerEl) return;
    containerEl.innerHTML = '';

    if (!articles || articles.length === 0) {
      containerEl.innerHTML =
        '<p class="advice-empty">' +
        tr('advice.empty') +
        '</p>';
      return;
    }

    articles.forEach(function (article) {
      var card = document.createElement('article');
      card.className = 'advice-card page-reveal';

      // Set data-category so CSS colour-variant selectors work
      if (article.category) card.dataset.category = article.category;

      var catLabel = tr('advice.cat.' + article.category) || (article.category.charAt(0).toUpperCase() + article.category.slice(1));
      var categoryBadge = article.category
        ? '<span class="advice-card__category">' + catLabel + '</span>'
        : '';

      var authorLine = (article.author && article.author.name)
        ? '<span class="advice-card__author">' + tr('advice.by') + article.author.name + '</span>'
        : '';

      card.innerHTML =
        '<div class="advice-card__head">' +
          '<h3 class="advice-card__title">' + escapeHtml(article.title || '') + '</h3>' +
          categoryBadge +
        '</div>' +
        '<p class="advice-card__content">' + escapeHtml(article.content || '') + '</p>' +
        '<div class="advice-card__footer">' +
          authorLine +
          '<span class="advice-card__date">' + formatDate(article.created_at) + '</span>' +
        '</div>';

      containerEl.appendChild(card);
    });
  }

  /* Simple XSS guard for user-controlled text */
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ─── Fetch from API ─────────────────────────────────────────────────── */

  function loadAdvice() {
    var containerEl = document.getElementById('advice-container');
    if (!containerEl) return;

    var a = api();
    if (!a) {
      containerEl.innerHTML =
        '<p class="advice-empty">' + tr('advice.loginRequired') + '</p>';
      return;
    }

    containerEl.innerHTML = '<p class="advice-loading">' + tr('advice.loading') + '</p>';

    a.get('/api/advice')
      .then(function (res) {
        // Backend returns { advice: [...] } OR bare array
        cachedArticles = Array.isArray(res)
          ? res
          : (res && Array.isArray(res.advice) ? res.advice : []);

        buildFilterBar(containerEl);

        var toShow = activeCategory === 'all'
          ? cachedArticles
          : cachedArticles.filter(function (x) { return x.category === activeCategory; });

        renderAdvice(toShow, containerEl);
      })
      .catch(function (err) {
        console.error('[advice.js] Failed to load advice:', err);
        containerEl.innerHTML =
          '<p class="advice-empty">' + tr('advice.error') + '</p>';
      });
  }

  /* ─── Init (safe for both sync and async script loading) ────────────── */

  function init() {
    if (!document.getElementById('advice-container')) return;
    loadAdvice();
    // Re-render labels when language changes
    window.addEventListener('nutri-i18n-applied', loadAdvice);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

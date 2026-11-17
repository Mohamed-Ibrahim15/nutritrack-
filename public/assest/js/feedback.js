/**
 * feedback.js — User Feedback (Phase 8)
 * Connects to:
 *   POST /api/feedback   → submit rating + optional comment
 *   GET  /api/feedback   → load the user's own feedback history
 *
 * Used on message.html (#feedback-section).
 */
(function () {
  'use strict';

  /* ─── i18n helper ─────────────────────────────────────────── */
  function tr(key) {
    return window.NutriI18n && typeof window.NutriI18n.t === 'function'
      ? window.NutriI18n.t(key) : key;
  }

  /* ─── API reference ───────────────────────────────────────── */
  function api() { return window.NutriApi || null; }

  /* ─── XSS guard ───────────────────────────────────────────── */
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ─── Date formatting ─────────────────────────────────────── */
  function formatDate(str) {
    if (!str) return '';
    try {
      var d = new Date(str);
      if (isNaN(d.getTime())) return str;
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) { return str; }
  }

  /* ─── Status note helpers ─────────────────────────────────── */
  function showNote(el, msg, type) {
    if (!el) return;
    el.textContent = msg;
    el.style.color =
      type === 'success' ? '#0e904f' :
      type === 'error'   ? '#c93030' :
                           'var(--clr-info-dark)';
  }
  function clearNote(el) { if (el) el.textContent = ''; }

  /* ─── Render feedback history list ───────────────────────── */
  function renderFeedbacks(feedbacks, listEl) {
    if (!listEl) return;
    listEl.innerHTML = '';

    if (!feedbacks || feedbacks.length === 0) {
      var empty = document.createElement('li');
      empty.className = 'feedback-empty';
      empty.textContent = tr('feedback.empty') || 'No feedback submitted yet.';
      listEl.appendChild(empty);
      return;
    }

    feedbacks.slice(0, 10).forEach(function (fb) {
      var li = document.createElement('li');
      li.className = 'feedback-item';

      var rating   = parseInt(fb.rating, 10) || 0;
      var filledStars   = '★'.repeat(Math.min(rating, 5));
      var emptyStars    = '☆'.repeat(Math.max(0, 5 - rating));
      var exerciseName  = fb.exercise && fb.exercise.name ? escapeHtml(fb.exercise.name) : '';
      var comment       = fb.comment ? escapeHtml(fb.comment) : '';

      li.innerHTML =
        '<div class="feedback-item__head">' +
          '<span class="feedback-stars">' + filledStars + '<span style="color:#d1d5db;">' + emptyStars + '</span></span>' +
          '<span class="feedback-date">' + formatDate(fb.created_at) + '</span>' +
        '</div>' +
        (comment ? '<p class="feedback-comment">' + comment + '</p>' : '') +
        (exerciseName ? '<span class="feedback-exercise">' + exerciseName + '</span>' : '');

      listEl.appendChild(li);
    });
  }

  /* ─── Load feedback history from API ─────────────────────── */
  function loadFeedbacks() {
    var listEl = document.getElementById('feedback-list');
    if (!listEl) return;

    var a = api();
    if (!a) return;

    listEl.innerHTML = '<li class="feedback-empty" style="font-style:normal;opacity:0.7;">' + tr('advice.loading') + '</li>';

    a.get('/api/feedback')
      .then(function (res) {
        var feedbacks = (res && Array.isArray(res.feedbacks)) ? res.feedbacks : [];
        renderFeedbacks(feedbacks, listEl);
      })
      .catch(function () {
        renderFeedbacks([], listEl);
      });
  }

  /* ─── Star rating widget ──────────────────────────────────── */
  var selectedRating = 0;

  function updateStarDisplay(stars, count) {
    stars.forEach(function (s, i) {
      var filled = i < count;
      s.textContent = filled ? '★' : '☆';
      s.style.color  = filled ? '#f59e0b' : '#d1d5db';
      s.classList.toggle('active', filled);
    });
  }

  function setupStarRating() {
    var starBtns    = Array.prototype.slice.call(document.querySelectorAll('#feedback-stars .star-btn'));
    var ratingInput = document.getElementById('feedback-rating-input');
    if (!starBtns.length) return;

    // Initialise all stars as empty
    updateStarDisplay(starBtns, 0);

    starBtns.forEach(function (btn, idx) {
      // Hover preview
      btn.addEventListener('mouseenter', function () {
        updateStarDisplay(starBtns, idx + 1);
      });

      // Restore on mouse-leave
      btn.addEventListener('mouseleave', function () {
        updateStarDisplay(starBtns, selectedRating);
      });

      // Click to lock rating
      btn.addEventListener('click', function () {
        selectedRating = idx + 1;
        if (ratingInput) ratingInput.value = String(selectedRating);
        updateStarDisplay(starBtns, selectedRating);
      });
    });
  }

  function resetStars() {
    selectedRating = 0;
    var starBtns    = Array.prototype.slice.call(document.querySelectorAll('#feedback-stars .star-btn'));
    var ratingInput = document.getElementById('feedback-rating-input');
    if (ratingInput) ratingInput.value = '0';
    updateStarDisplay(starBtns, 0);
  }

  /* ─── Feedback form submission ────────────────────────────── */
  function setupFeedbackForm() {
    var form      = document.getElementById('feedback-form');
    var noteEl    = document.getElementById('feedback-note');
    if (!form) return;

    setupStarRating();

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var ratingInput = document.getElementById('feedback-rating-input');
      var commentEl   = document.getElementById('feedback-comment');
      var submitBtn   = form.querySelector('button[type="submit"]');
      var rating      = parseInt(ratingInput && ratingInput.value, 10);
      var comment     = commentEl ? commentEl.value.trim() : '';

      // Validate rating selection
      if (!rating || rating < 1 || rating > 5) {
        showNote(noteEl, tr('feedback.ratingRequired') || 'Please select a star rating before submitting.', 'error');
        return;
      }

      var payload = { rating: rating };
      if (comment) payload.comment = comment;

      var a = api();
      if (!a) return;

      // Disable submit while in-flight
      if (submitBtn) submitBtn.disabled = true;
      showNote(noteEl, tr('feedback.submitting'), 'info');

      a.post('/api/feedback', payload)
        .then(function () {
          form.reset();
          resetStars();
          showNote(noteEl, '✓ ' + (tr('feedback.thanks') || 'Thank you for your feedback!'), 'success');
          setTimeout(function () { clearNote(noteEl); }, 3500);
          loadFeedbacks();   // refresh the history list
        })
        .catch(function (err) {
          var msg = (err && err.data && err.data.message)
            || (err && err.message)
            || tr('feedback.submitError')
            || 'Error submitting feedback. Please try again.';
          showNote(noteEl, msg, 'error');
        })
        .finally(function () {
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  }

  /* ─── Init ────────────────────────────────────────────────── */
  // Guard: only run if the feedback section is present on this page
  if (!document.getElementById('feedback-form') && !document.getElementById('feedback-list')) {
    return;
  }

  loadFeedbacks();
  setupFeedbackForm();

  // Re-load feedback list on language change so translated strings update
  window.addEventListener('nutri-i18n-applied', function () {
    loadFeedbacks();
  });

})();

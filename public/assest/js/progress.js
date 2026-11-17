/**
 * progress.js — Weight Progress Tracking (Phase 7)
 * Connects to:
 *   GET    /api/progress          → list user's weight logs (newest first)
 *   POST   /api/progress          → log a new weight entry
 *   DELETE /api/progress/{id}     → delete a single entry
 *
 * Renders on message.html:
 *   #progress-log-list  — scrollable list of entries
 *   #progress-chart     — Chart.js line chart (2+ entries required)
 *   #progress-log-form  — weight + notes form
 *   #progress-form-note — status/error message
 */
(function () {
  'use strict';

  /* ─── i18n helper ─────────────────────────────────────────────────── */
  function tr(key) {
    return window.NutriI18n && typeof window.NutriI18n.t === 'function'
      ? window.NutriI18n.t(key) : key;
  }

  /* ─── API reference ───────────────────────────────────────────────── */
  function api() { return window.NutriApi || null; }

  /* ─── Date formatting ─────────────────────────────────────────────── */
  function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      // Backend may return "2026-05-12" or "2026-05-12T00:00:00.000000Z"
      var clean = String(dateStr).split('T')[0]; // take date part only
      var parts = clean.split('-');
      var d = new Date(Date.UTC(
        parseInt(parts[0], 10),
        parseInt(parts[1], 10) - 1,
        parseInt(parts[2], 10)
      ));
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) { return dateStr; }
  }

  /* ─── XSS guard ───────────────────────────────────────────────────── */
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ─── Status note helpers ─────────────────────────────────────────── */
  function showNote(el, msg, type) {
    if (!el) return;
    el.textContent = msg;
    el.style.color =
      type === 'success' ? '#0e904f' :
      type === 'error'   ? '#c93030' :
                           'var(--clr-info-dark)';
  }
  function clearNote(el) { if (el) el.textContent = ''; }

  /* ─── Chart management ────────────────────────────────────────────── */
  function destroyChart(chartEl) {
    if (!chartEl || typeof Chart === 'undefined') return;
    var existing = Chart.getChart(chartEl);
    if (existing) existing.destroy();
  }

  function renderChart(logs, chartEl) {
    destroyChart(chartEl);
    if (!chartEl || typeof Chart === 'undefined') return;
    if (!logs || logs.length < 2) return; // need ≥2 points for a meaningful line

    var sorted = logs.slice().reverse(); // API gives newest-first; reverse for left→right
    var labels = sorted.map(function (l) { return formatDate(l.logged_at); });
    var data   = sorted.map(function (l) { return Number(l.weight_kg); });

    new Chart(chartEl, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: tr('progress.chart.label') || 'Weight (kg)',
          data: data,
          borderColor: '#7380ec',
          backgroundColor: 'rgba(115,128,236,0.13)',
          borderWidth: 2.5,
          pointRadius: 5,
          pointHoverRadius: 8,
          pointBackgroundColor: '#fff',
          pointBorderColor: '#7380ec',
          pointBorderWidth: 2,
          tension: 0.38,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                return ' ' + ctx.parsed.y.toFixed(1) + ' kg';
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            grid: { color: 'rgba(132,139,200,0.12)' },
            ticks: {
              callback: function (v) { return v + ' kg'; },
              font: { size: 11 }
            }
          },
          x: {
            grid: { display: false },
            ticks: { maxRotation: 40, font: { size: 10 } }
          }
        }
      }
    });
  }

  /* ─── Render log list ─────────────────────────────────────────────── */
  function renderLogs(logs, listEl, chartEl) {
    if (!listEl) return;
    listEl.innerHTML = '';

    if (!logs || logs.length === 0) {
      var empty = document.createElement('li');
      empty.className = 'progress-log-empty';
      empty.textContent = tr('progress.noLogs');
      listEl.appendChild(empty);
      destroyChart(chartEl);
      return;
    }

    // Render each entry row
    logs.forEach(function (log) {
      var li = document.createElement('li');
      li.className = 'progress-log-item';
      li.innerHTML =
        '<span class="progress-log-date">' + formatDate(log.logged_at) + '</span>' +
        '<span class="progress-log-weight">' + Number(log.weight_kg).toFixed(1) + ' kg</span>' +
        (log.notes
          ? '<span class="progress-log-notes">' + escapeHtml(log.notes) + '</span>'
          : '') +
        '<button class="progress-log-delete" data-id="' + log.id + '" aria-label="Delete weight entry">' +
          '<span class="material-symbols-outlined" aria-hidden="true">delete</span>' +
        '</button>';
      listEl.appendChild(li);
    });

    // Wire delete buttons
    listEl.querySelectorAll('.progress-log-delete').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-id');
        var a = api();
        if (!a) return;
        if (!confirm(tr('progress.deleteConfirm') || 'Delete this weight entry?')) return;
        btn.disabled = true;
        btn.style.opacity = '0.5';
        a.del('/api/progress/' + id)
          .then(function () { loadAndRender(); })
          .catch(function (err) {
            btn.disabled = false;
            btn.style.opacity = '';
            var msg = (err && err.data && err.data.message) || tr('progress.deleteError');
            alert(msg);
          });
      });
    });

    // Draw chart
    renderChart(logs, chartEl);
  }

  /* ─── Load & render ───────────────────────────────────────────────── */
  var cachedLogs = null; // cache last fetched logs for language re-renders

  function loadAndRender() {
    var listEl  = document.getElementById('progress-log-list');
    var chartEl = document.getElementById('progress-chart');
    var a = api();
    if (!a) {
      console.warn('[progress] NutriApi not ready');
      return;
    }

    // Show loading state
    if (listEl) {
      listEl.innerHTML = '<li class="progress-log-empty" style="font-style:normal;opacity:0.7;">' + tr('progress.loading') + '</li>';
    }

    a.get('/api/progress')
      .then(function (res) {
        cachedLogs = (res && Array.isArray(res.progress_logs)) ? res.progress_logs : [];
        renderLogs(cachedLogs, listEl, chartEl);
      })
      .catch(function (err) {
        console.warn('[progress] Failed to fetch progress logs:', err);
        cachedLogs = [];
        renderLogs([], listEl, chartEl);
      });
  }

  function rerenderFromCache() {
    if (cachedLogs === null) return; // not yet loaded
    var listEl  = document.getElementById('progress-log-list');
    var chartEl = document.getElementById('progress-chart');
    renderLogs(cachedLogs, listEl, chartEl);
  }

  /* ─── Log form ────────────────────────────────────────────────────── */
  function setupLogForm() {
    var form      = document.getElementById('progress-log-form');
    var noteEl    = document.getElementById('progress-form-note');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var weightInput = document.getElementById('progress-weight');
      var notesInput  = document.getElementById('progress-notes');
      var submitBtn   = form.querySelector('button[type="submit"]');
      var weight      = parseFloat(weightInput && weightInput.value);

      // Validate
      if (!weight || weight < 1 || weight > 500) {
        showNote(noteEl, tr('progress.validWeight'), 'error');
        return;
      }

      var payload = { weight_kg: weight };
      if (notesInput && notesInput.value.trim()) {
        payload.notes = notesInput.value.trim();
      }

      var a = api();
      if (!a) return;

      // Disable while saving
      if (submitBtn) submitBtn.disabled = true;
      showNote(noteEl, tr('progress.saving'), 'info');

      a.post('/api/progress', payload)
        .then(function () {
          form.reset();
          showNote(noteEl, '✓ ' + tr('progress.saved'), 'success');
          setTimeout(function () { clearNote(noteEl); }, 3500);
          loadAndRender();
        })
        .catch(function (err) {
          var msg = (err && err.data && err.data.message)
            || (err && err.message)
            || 'Error logging weight. Please try again.';
          showNote(noteEl, msg, 'error');
        })
        .finally(function () {
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  }

  /* ─── Init ────────────────────────────────────────────────────────── */
  // Only activate if the progress section exists on this page
  if (!document.getElementById('progress-log-list') && !document.getElementById('progress-log-form')) {
    return;
  }

  loadAndRender();
  setupLogForm();

  // Re-render on language change so translated strings update
  window.addEventListener('nutri-i18n-applied', function () {
    rerenderFromCache(); // re-render cached data with new language (no extra API call)
  });

})();

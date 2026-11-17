/* منطق صفحة الخطة الرياضية: تجهيز التمارين وربطها ببيانات المستخدم */
(function () {
  var PROFILE_KEY = (window.NutriAuth && window.NutriAuth.scopedKey("nutri_profile")) || "nutri_profile";
  var DATASET_URL = "../data/site-dataset.json";

  /* ترجمة أي مفتاح نصي حسب اللغة الحالية */
  function tr(key) {
    return window.NutriI18n && typeof window.NutriI18n.t === "function" ? window.NutriI18n.t(key) : key;
  }

  /* جلب اسم التمرين مترجمًا إن وُجد */
  function exerciseDisplayName(ex) {
    if (!ex || !ex.id) return "";
    var k = "sport.exname." + ex.id;
    var s = tr(k);
    return s !== k ? s : ex.name || ex.id;
  }

  function dayLabel(i) {
    return tr("sport.day." + i);
  }

  /* تجهيز وصف نشاط المستخدم لعرضه في الملخص */
  function activitySummaryLabel(profile) {
    if (profile && profile.activity != null) {
      var k = "track.actShort." + String(profile.activity);
      var s = tr(k);
      return s !== k ? s : String(profile.activity);
    }
    var tier = activityTier(profile);
    var tk = "sport.tier." + tier;
    var t = tr(tk);
    return t !== tk ? t : tier;
  }

  /* إزالة الرسم القديم قبل إعادة الرسم لتفادي التداخل */
  function safeDestroyChart(canvasId) {
    var el = document.getElementById(canvasId);
    if (!el || typeof Chart === "undefined") return;
    var c = Chart.getChart(el);
    if (c) c.destroy();
  }

  function loadPlanDayImagesFromDom() {
    var root = document.getElementById("nutri-plan-day-images");
    var out = [];
    if (!root) return out;
    for (var di = 0; di < 8; di++) {
      var el = root.querySelector('img[data-plan-day-index="' + di + '"]');
      out[di] = el && el.getAttribute("src") ? el.getAttribute("src") : "";
    }
    return out;
  }

  var PLAN_DAY_IMAGES = loadPlanDayImagesFromDom();

  var DEFAULT_SPEED_KMH = {
    e001: 3,
    e002: 5,
    e003: 6.5,
    e004: 14,
    e005: 19,
    e006: 22,
    e007: 2,
    e008: 2.5,
    e009: 0,
    e010: 0,
    e011: 8,
    e012: 10,
    e013: 0,
    e014: 0,
    e015: 0
  };

  /* تحميل ملف المستخدم الغذائي/الرياضي من التخزين */
  function loadProfile() {
    try {
      var raw = localStorage.getItem(PROFILE_KEY) || localStorage.getItem("nutri_profile");
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function getWeightKg(profile) {
    if (profile && Number.isFinite(Number(profile.weightKg))) return Number(profile.weightKg);
    if (profile && Number.isFinite(Number(profile.currentWeightKg))) return Number(profile.currentWeightKg);
    return 75;
  }

  /* حساب السعرات المحروقة اعتمادًا على MET والوزن والزمن */
  function kcalBurned(met, weightKg, minutes) {
    return Math.round(((Number(met) || 0) * (Number(weightKg) || 0) * (Number(minutes) || 0)) / 60);
  }

  /* دمج جزء محدث من الملف الشخصي وحفظه في كل المفاتيح المرتبطة */
  function persistProfilePatch(patch) {
    try {
      var raw = localStorage.getItem(PROFILE_KEY) || localStorage.getItem("nutri_profile");
      var p = raw ? JSON.parse(raw) : {};
      var next = Object.assign({}, p, patch);
      localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
      localStorage.setItem("nutri_profile", JSON.stringify(next));
      localStorage.setItem("nutri_user_profile", JSON.stringify(next));
      var sessionRaw = localStorage.getItem("nutri_auth_session");
      var usersRaw = localStorage.getItem("nutri_auth_users");
      if (sessionRaw && usersRaw) {
        var session = JSON.parse(sessionRaw);
        var users = JSON.parse(usersRaw);
        var email = String((session && session.email) || "")
          .trim()
          .toLowerCase();
        if (Array.isArray(users) && email) {
          var idx = users.findIndex(function (u) {
            return String((u && u.email) || "")
              .trim()
              .toLowerCase() === email;
          });
          if (idx >= 0) {
            users[idx].profile = Object.assign({}, users[idx].profile || {}, next, { email: users[idx].email });
            localStorage.setItem("nutri_auth_users", JSON.stringify(users));
          }
        }
      }
    } catch (e) {}
  }

  function exerciseById(dataset, id) {
    var list = (dataset && dataset.exercisesMet) || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function activityTier(profile) {
    var a = Number(profile && profile.activity);
    if (!Number.isFinite(a)) return "light";
    if (a >= 1.725) return "active";
    if (a >= 1.55) return "moderate";
    return "light";
  }

  /* إنشاء قالب أسبوعي مبدئي للتمارين حسب مستوى نشاط المستخدم */
  function buildTemplate(profile) {
    var tier = activityTier(profile);
    var baseMin = 40;
    var delta = tier === "active" ? 8 : tier === "moderate" ? 4 : 0;

    return [
      { labelKey: "sport.slot.0", ex: ["e003", "e002"], min: baseMin + 5 + delta },
      { labelKey: "sport.slot.1", ex: ["e004", "e005"], min: baseMin + 8 + delta },
      { labelKey: "sport.slot.2", ex: ["e009", "e015"], min: baseMin - 5 + delta },
      { labelKey: "sport.slot.3", ex: ["e013", "e003"], min: baseMin + 6 + delta },
      { labelKey: "sport.slot.4", ex: ["e007", "e005"], min: baseMin + 2 + delta },
      { labelKey: "sport.slot.5", ex: ["e011", "e002"], min: baseMin + 4 + delta },
      { labelKey: "sport.slot.6", ex: ["e002", "e015"], min: Math.max(28, baseMin - 8 + delta) },
      { labelKey: "sport.slot.7", ex: ["e013", "e004"], min: Math.max(30, baseMin - 6 + delta) }
    ];
  }

  /* رسم بطاقات الخطة الرياضية اليومية وحساب إجمالي الحرق الأسبوعي */
  function renderPersonalPlan(plan, dataset, weightKg, profile) {
    var summaryEl = document.getElementById("sport-plan-summary");
    var daysEl = document.getElementById("sport-plan-days");
    if (!summaryEl || !daysEl) return;

    var weeklyBurn = 0;
    daysEl.innerHTML = "";
    for (var i = 0; i < plan.length; i++) {
      var slot = plan[i];
      var exA = exerciseById(dataset, slot.ex[0]);
      var exB = exerciseById(dataset, slot.ex[1] || slot.ex[0]);
      var burn =
        kcalBurned(exA && exA.met, weightKg, slot.min * 0.6) + kcalBurned(exB && exB.met, weightKg, slot.min * 0.4);
      weeklyBurn += burn;

      var imgSrc = PLAN_DAY_IMAGES[i] || PLAN_DAY_IMAGES[0];
      var card = document.createElement("article");
      card.className = "sport-card sport-card--media sport-card--plan-day";
      var slotTitle = tr(slot.labelKey);
      card.innerHTML =
        '<div class="sport-card__img sport-card__img--plan">' +
        '<img src="' +
        imgSrc +
        '" alt="" loading="lazy" width="280" height="140" />' +
        "</div>" +
        '<div class="sport-card__body">' +
        "<h3>" +
        dayLabel(i) +
        " — " +
        slotTitle +
        "</h3>" +
        "<p><strong>" +
        tr("sport.plan.duration") +
        "</strong> " +
        slot.min +
        " " +
        tr("track.burn.min") +
        "</p>" +
        "<p><strong>" +
        tr("sport.plan.main") +
        "</strong> " +
        (exA ? exerciseDisplayName(exA) : tr("sport.plan.exA")) +
        "</p>" +
        "<p><strong>" +
        tr("sport.plan.secondary") +
        "</strong> " +
        (exB ? exerciseDisplayName(exB) : tr("sport.plan.exB")) +
        "</p>" +
        '<p class="hint" style="margin-top:0.45rem;">' +
        tr("sport.plan.estBurn") +
        " ~" +
        burn +
        " " +
        tr("settings.kcal.unitSuffix") +
        "</p>" +
        "</div>";
      daysEl.appendChild(card);
      slot._burn = burn;
    }

    var dailyDeficit = 0;
    if (profile && Number.isFinite(Number(profile.tdee)) && Number.isFinite(Number(profile.targetCalories))) {
      dailyDeficit = Math.max(0, Number(profile.tdee) - Number(profile.targetCalories));
    }
    var base =
      tr("sport.plan.summaryA")
        .replace("{0}", activitySummaryLabel(profile))
        .replace("{1}", String(weightKg))
        .replace("{2}", String(weeklyBurn)) +
      (dailyDeficit ? tr("sport.plan.summaryDeficit").replace("{0}", String(Math.round(dailyDeficit))) : tr("sport.plan.summaryEnd"));
    summaryEl.textContent = base;
  }

  function renderHint(profile) {
    var el = document.getElementById("sport-tdee-hint");
    if (!el) return;
    if (profile && profile.tdee) {
      el.textContent = tr("sport.hint.tdee").replace("{0}", String(profile.tdee));
    } else {
      el.textContent = tr("sport.hint.noProfile");
    }
  }

  /* رسم مقارنة حرق السعرات لتمارين مختلفة خلال 30 دقيقة */
  function renderBurnChart(dataset, weightKg) {
    safeDestroyChart("chart-burn");
    var picks = ["e002", "e005", "e007", "e009", "e011"];
    var labels = [];
    var values = [];
    for (var i = 0; i < picks.length; i++) {
      var ex = exerciseById(dataset, picks[i]);
      if (!ex) continue;
      labels.push(exerciseDisplayName(ex));
      values.push(kcalBurned(ex.met, weightKg, 30));
    }
    new Chart(document.getElementById("chart-burn"), {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: tr("sport.chart.kcal30"),
            data: values,
            backgroundColor: ["#0e904f", "#41f1b6", "#7380ec", "#20c171", "#111e88"],
            borderRadius: 8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: tr("sport.chart.axis.kcal") }
          },
          x: { ticks: { maxRotation: 45, minRotation: 0, font: { size: 10 } } }
        },
        plugins: { legend: { display: false } }
      }
    });
  }

  function renderWeeklyChart(plan, profile) {
    safeDestroyChart("chart-weekly");
    var mins = plan.map(function (d) {
      return d.min;
    });
    var targetPerDay = (profile && profile.goal === "lose" ? 180 : 150) / 8;
    var dlabels = [];
    for (var di = 0; di < 8; di++) dlabels.push(dayLabel(di));

    new Chart(document.getElementById("chart-weekly"), {
      type: "bar",
      data: {
        labels: dlabels,
        datasets: [
          {
            label: tr("sport.chart.plannedMin"),
            data: mins,
            backgroundColor: "rgba(14, 144, 79, 0.55)",
            borderRadius: 6,
            order: 2
          },
          {
            label: tr("sport.chart.guideline"),
            data: dlabels.map(function () {
              return targetPerDay;
            }),
            type: "line",
            borderColor: "#7380ec",
            borderDash: [6, 4],
            borderWidth: 2,
            pointRadius: 0,
            order: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: tr("sport.chart.axis.minutes") }
          },
          x: { grid: { display: false } }
        },
        plugins: { legend: { position: "bottom", labels: { font: { size: 11 } } } }
      }
    });
  }

  function fallbackDataset() {
    return {
      exercisesMet: [
        { id: "e002", name: "Walking 5 km/h", met: 3.5 },
        { id: "e003", name: "Walking brisk 6.5 km/h", met: 4.3 },
        { id: "e005", name: "Cycling moderate ~19 km/h", met: 6 },
        { id: "e007", name: "Swimming light/moderate", met: 6 },
        { id: "e009", name: "Strength training general", met: 5 },
        { id: "e010", name: "Circuit training", met: 8 },
        { id: "e011", name: "Running 8 km/h", met: 9.8 },
        { id: "e013", name: "Elliptical moderate", met: 5 },
        { id: "e014", name: "Rowing moderate", met: 7 },
        { id: "e015", name: "Yoga Hatha", met: 2.5 }
      ],
      heartRateZonesPercent: [
        { label: "Zone 1–2 (easy)", share: 45 },
        { label: "Zone 3 (tempo)", share: 35 },
        { label: "Zone 4–5 (hard)", share: 20 }
      ]
    };
  }

  function hrZoneLabel(z) {
    if (z.label.indexOf("1–2") >= 0 || z.label.indexOf("1-2") >= 0) return tr("sport.hr.z12");
    if (z.label.indexOf("Zone 3") >= 0) return tr("sport.hr.z3");
    if (z.label.indexOf("4–5") >= 0 || z.label.indexOf("4-5") >= 0) return tr("sport.hr.z45");
    return z.label;
  }

  function renderHrChartFixed(dataset) {
    safeDestroyChart("chart-hr");
    var zones = (dataset && dataset.heartRateZonesPercent) || [];
    var labels = zones.map(hrZoneLabel);
    var values = zones.map(function (z) {
      return z.share;
    });
    if (!labels.length) {
      labels = [tr("sport.hr.fallback1"), tr("sport.hr.fallback2"), tr("sport.hr.fallback3")];
      values = [45, 35, 20];
    }
    new Chart(document.getElementById("chart-hr"), {
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [
          {
            data: values,
            backgroundColor: ["#41f1b6", "#7380ec", "#ff7782"],
            borderWidth: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom", labels: { font: { size: 11 }, boxWidth: 12 } }
        }
      }
    });
  }

  function populateBurnExerciseSelect(dataset) {
    var sel = document.getElementById("sport-burn-exercise");
    if (!sel) return;
    var list = (dataset && dataset.exercisesMet) || [];
    sel.innerHTML = "";
    for (var i = 0; i < list.length; i++) {
      var ex = list[i];
      var opt = document.createElement("option");
      opt.value = ex.id;
      opt.textContent = exerciseDisplayName(ex);
      opt.setAttribute("data-met", String(ex.met));
      sel.appendChild(opt);
    }
  }

  function resolveBurnMinutes(exId, minutesIn, distanceKm) {
    var m = Number(minutesIn);
    if (Number.isFinite(m) && m > 0) return m;
    var d = Number(distanceKm);
    var spd = DEFAULT_SPEED_KMH[exId];
    if (Number.isFinite(d) && d > 0 && Number.isFinite(spd) && spd > 0) {
      return (d / spd) * 60;
    }
    return NaN;
  }

  var sportCalcDataset = null;
  var sportCalcClickBound = false;

  function initBurnCalculator(dataset) {
    sportCalcDataset = dataset || fallbackDataset();
    var sel = document.getElementById("sport-burn-exercise");
    var minEl = document.getElementById("sport-burn-minutes");
    var distEl = document.getElementById("sport-burn-distance");
    var outTotal = document.getElementById("sport-burn-out-total");
    var outRate = document.getElementById("sport-burn-out-rate");
    var errEl = document.getElementById("sport-burn-error");
    var btnCalc = document.getElementById("sport-burn-calc");
    if (!sel || !btnCalc) return;

    populateBurnExerciseSelect(sportCalcDataset);

    function clearErr() {
      if (errEl) {
        errEl.textContent = "";
        errEl.hidden = true;
      }
    }

    function showErr(msg) {
      if (errEl) {
        errEl.textContent = msg;
        errEl.hidden = false;
        errEl.classList.remove("sport-burn-msg--ok");
      }
    }

    function appendBurnSessionToProfile(exId, ex, lastKcal, lastMinutes) {
      var raw = localStorage.getItem(PROFILE_KEY) || localStorage.getItem("nutri_profile");
      var p = {};
      try {
        p = raw ? JSON.parse(raw) : {};
      } catch (e1) {}
      var log = Array.isArray(p.exerciseBurnLog) ? p.exerciseBurnLog.slice() : [];
      var distVal = distEl && distEl.value ? parseFloat(distEl.value) : null;
      log.push({
        at: new Date().toISOString(),
        exerciseId: exId,
        label: exerciseDisplayName(ex) || exId,
        minutes: Math.round(lastMinutes * 10) / 10,
        distanceKm: Number.isFinite(distVal) && distVal > 0 ? distVal : null,
        kcal: lastKcal,
        met: ex && ex.met
      });
      persistProfilePatch({ exerciseBurnLog: log });
      window.dispatchEvent(new CustomEvent("nutri-exercise-log-updated"));
    }

    function onBurnCalc() {
      var ds = sportCalcDataset || fallbackDataset();
      clearErr();
      if (outTotal) outTotal.textContent = "—";
      if (outRate) outRate.textContent = "—";
      var profile = loadProfile() || {};
      var w = getWeightKg(profile);
      var exId = sel.value;
      var ex = exerciseById(ds, exId);
      var met = ex && Number(ex.met);
      if (!ex || !Number.isFinite(met)) {
        showErr(tr("sport.burn.err.pick"));
        return;
      }
      var mins = resolveBurnMinutes(exId, minEl && minEl.value, distEl && distEl.value);
      if (!Number.isFinite(mins) || mins <= 0) {
        showErr(tr("sport.burn.err.duration"));
        return;
      }
      var lastKcal = kcalBurned(met, w, mins);
      var lastMinutes = mins;
      if (outTotal) outTotal.textContent = String(lastKcal);
      if (outRate) outRate.textContent = (lastKcal / mins).toFixed(1);
      appendBurnSessionToProfile(exId, ex, lastKcal, lastMinutes);
      if (errEl) {
        errEl.textContent = tr("sport.burn.ok");
        errEl.hidden = false;
        errEl.classList.add("sport-burn-msg--ok");
      }
    }

    if (!sportCalcClickBound) {
      sportCalcClickBound = true;
      btnCalc.addEventListener("click", onBurnCalc);
    }
  }

  function bootPage(dataset) {
    var ds = dataset || fallbackDataset();
    var profile = loadProfile() || {};
    var weightKg = getWeightKg(profile);
    renderHint(profile);
    var plan = buildTemplate(profile);
    renderPersonalPlan(plan, ds, weightKg, profile);
    renderBurnChart(ds, weightKg);
    renderHrChartFixed(ds);
    renderWeeklyChart(plan, profile);
    initBurnCalculator(ds);

    // Generate activity plan on backend if not yet created
    var nutriApi = window.NutriApi;
    if (nutriApi) {
      nutriApi.get('/api/activity-plan').catch(function (err) {
        if (err && err.status === 404) {
          nutriApi.post('/api/activity-plan/generate', {}).catch(function () {});
        }
      });
    }
  }

  // Fetch profile from API, fall back to localStorage, then boot
  var nutriApi = window.NutriApi;
  if (nutriApi) {
    nutriApi.get('/api/user').then(function (res) {
      var serverUser = res && res.user ? res.user : res;
      var profile = nutriApi.serverUserToProfile(serverUser);
      if (profile) {
        nutriApi.persistSession(serverUser, nutriApi.getToken());
      }
      // Now boot with dataset
      fetch(DATASET_URL)
        .then(function (r) { if (!r.ok) throw new Error('dataset'); return r.json(); })
        .then(function (dataset) { bootPage(dataset || fallbackDataset()); })
        .catch(function () { bootPage(fallbackDataset()); });
    }).catch(function () {
      var profile0 = loadProfile() || {};
      renderHint(profile0);
      fetch(DATASET_URL)
        .then(function (r) { if (!r.ok) throw new Error('dataset'); return r.json(); })
        .then(function (dataset) { bootPage(dataset || fallbackDataset()); })
        .catch(function () { bootPage(fallbackDataset()); });
    });
  } else {
    var profile0 = loadProfile() || {};
    renderHint(profile0);
    fetch(DATASET_URL)
      .then(function (res) {
        if (!res.ok) throw new Error("dataset");
        return res.json();
      })
      .then(function (dataset) {
        bootPage(dataset || fallbackDataset());
      })
      .catch(function () {
        bootPage(fallbackDataset());
      });
  }

  window.addEventListener("nutri-i18n-applied", function () {
    fetch(DATASET_URL)
      .then(function (res) {
        if (!res.ok) throw new Error("dataset");
        return res.json();
      })
      .then(function (dataset) {
        bootPage(dataset || fallbackDataset());
      })
      .catch(function () {
        bootPage(fallbackDataset());
      });
  });
})();

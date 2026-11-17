/* منطق صفحة الخطة الغذائية: جلب البيانات، ترشيح الوجبات، وتسجيل الالتزام */
(function () {
  var DATASET_URL = '../data/site-dataset.json';
  var CONDITION_KEY =
    (window.NutriAuth && window.NutriAuth.scopedKey('nutri_plan_condition_ids')) || 'nutri_plan_condition_ids';
  var PLAN_INTAKE_KEY =
    (window.NutriAuth && window.NutriAuth.scopedKey('nutri_plan_meal_intake')) || 'nutri_plan_meal_intake';
  var LOCAL_FOOD_IMG_FALLBACK = '';
  var MEAL_HERO_BY_TITLE = {};
  var FOOD_IMAGES_BY_ID = {};

  /** Same order as logged meals (+ taps); reused by doughnut and dashboard strip. */
  var INTAKE_SEGMENT_COLORS = ['#7380ec', '#41f1b6', '#0e904f', '#20c171', '#111e88', '#ff9780', '#b794f6', '#63b3ed'];

  /* قراءة مصادر صور الوجبات/الأطعمة من عناصر HTML المساعدة */
  function readMyPlanImagesFromDom() {
    var root = document.getElementById('nutri-myplan-image-srcs');
    if (!root) return;
    var fb = document.getElementById('nutri-food-img-fallback');
    if (fb) {
      var fbs = fb.getAttribute('src');
      if (fbs) LOCAL_FOOD_IMG_FALLBACK = fbs;
    }
    var heroes = root.querySelectorAll('img[data-meal-hero]');
    for (var h = 0; h < heroes.length; h++) {
      var he = heroes[h];
      var hk = he.getAttribute('data-meal-hero');
      var hs = he.getAttribute('src');
      if (hk && hs) MEAL_HERO_BY_TITLE[hk] = hs;
    }
    var thumbs = root.querySelectorAll('img[data-food-thumb-id]');
    for (var t = 0; t < thumbs.length; t++) {
      var te = thumbs[t];
      var tid = te.getAttribute('data-food-thumb-id');
      var ts = te.getAttribute('src');
      if (tid && ts) FOOD_IMAGES_BY_ID[tid] = ts;
    }
  }

  readMyPlanImagesFromDom();

  /** When dataset food has no image, use thumbnail id for this category (see myplan.html). */
  var CATEGORY_IMAGE_FALLBACK_ID = {
    protein: 'f001',
    dairy: 'f003',
    legume: 'f007',
    plant: 'f009',
    grain: 'f011',
    veg: 'f014',
    fruit: 'f017',
    fat: 'f021',
    snack: 'f028',
    beverage: 'f031'
  };

  /* تحديد أفضل صورة لعنصر الطعام (مباشرة أو fallback حسب الفئة) */
  function resolveFoodImageUrl(food) {
    if (!food) return LOCAL_FOOD_IMG_FALLBACK;
    if (food.image) return food.image;
    if (food.id && FOOD_IMAGES_BY_ID[food.id]) return FOOD_IMAGES_BY_ID[food.id];
    var catId = food.category && CATEGORY_IMAGE_FALLBACK_ID[food.category];
    if (catId && FOOD_IMAGES_BY_ID[catId]) return FOOD_IMAGES_BY_ID[catId];
    return LOCAL_FOOD_IMG_FALLBACK;
  }

  function upgradeThumbImageUrl(url) {
    if (!url || typeof url !== 'string') return url;
    if (url.indexOf('images.unsplash.com') < 0) return url;
    return url.replace(/w=\d+&h=\d+/, 'w=640&h=640');
  }

  function mealHeroUrl(title) {
    return MEAL_HERO_BY_TITLE[title] || MEAL_HERO_BY_TITLE.Snack || LOCAL_FOOD_IMG_FALLBACK;
  }

  /* إنشاء تاريخ اليوم بصيغة ثابتة YYYY-MM-DD لاستخدامه كمفتاح يومي */
  function todayYmd() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1);
    var day = String(d.getDate());
    if (m.length < 2) m = '0' + m;
    if (day.length < 2) day = '0' + day;
    return y + '-' + m + '-' + day;
  }

  /* تحميل سجل مدخول اليوم الحالي مع إعادة التصفير تلقائيًا عند يوم جديد */
  function loadPlanIntakeState() {
    try {
      var raw = localStorage.getItem(PLAN_INTAKE_KEY);
      var o = raw ? JSON.parse(raw) : null;
      var t = todayYmd();
      if (!o || !Array.isArray(o.items)) return { date: t, items: [] };
      if (o.date !== t) {
        var fresh = { date: t, items: [] };
        savePlanIntakeState(fresh);
        return fresh;
      }
      return o;
    } catch (e) {
      return { date: todayYmd(), items: [] };
    }
  }

  /* حفظ سجل المدخول اليومي */
  function savePlanIntakeState(o) {
    try {
      localStorage.setItem(PLAN_INTAKE_KEY, JSON.stringify(o));
    } catch (e) {}
  }

  function sumPlanIntakeKcal(items) {
    var s = 0;
    (items || []).forEach(function (x) {
      s += Math.round(Number(x.kcal) || 0);
    });
    return s;
  }

  /* ترجمة نصوص صفحة الخطة الغذائية */
  function tr(k) {
    return window.NutriI18n && typeof window.NutriI18n.t === "function" ? window.NutriI18n.t(k) : k;
  }

  function trOr(key, fallback) {
    var s = tr(key);
    return s !== key ? s : fallback;
  }

  function mealSlotKey(enTitle) {
    var map = { Breakfast: "breakfast", Lunch: "lunch", Dinner: "dinner", Snack: "snack" };
    return map[enTitle] || "breakfast";
  }

  /* تحويل اسم وجبة داخلي (en) إلى اسم العرض حسب اللغة */
  function mealSlotLabel(enTitle) {
    var key = "myplan.meal." + mealSlotKey(enTitle);
    var s = tr(key);
    return s !== key ? s : enTitle;
  }

  function goalSummaryLabel(goal) {
    if (goal === "lose") return tr("myplan.goalSummary.lose");
    if (goal === "gain") return tr("myplan.goalSummary.gain");
    return tr("myplan.goalSummary.maintain");
  }

  function foodDisplayName(food) {
    if (!food || !food.id) return "";
    var k = "myplan.food." + String(food.id) + ".name";
    return trOr(k, food.name || "");
  }

  function servingDisplay(food) {
    if (!food || !food.servingLabel) return "";
    var k = "myplan.food." + String(food.id) + ".serving";
    return trOr(k, food.servingLabel);
  }

  /* إضافة عملية أكل جديدة لسجل اليوم لاستخدامها في الإحصاءات والرسوم */
  function appendPlanIntakeEntry(mealTitle, kcal) {
    var k = Math.round(Number(kcal) || 0);
    if (k <= 0) return;
    var o = loadPlanIntakeState();
    if (o.date !== todayYmd()) o = { date: todayYmd(), items: [] };
    o.items.push({ meal: mealTitle, kcal: k });
    savePlanIntakeState(o);
  }

  function clearPlanIntakeForToday() {
    savePlanIntakeState({ date: todayYmd(), items: [] });
  }

  /* تحديث واجهة المتابعة اليومية: الإجمالي، النسبة، القائمة، وشريط التقسيم */
  function refreshPlanIntakeUI(profile) {
    var totalEl = document.getElementById('plan-intake-total-kcal');
    var pctEl = document.getElementById('plan-intake-pct-target');
    var listEl = document.getElementById('plan-intake-entries');
    var emptyEl = document.getElementById('plan-intake-empty');
    var cumEl = document.getElementById('stat-intake-cumulative');
    var breakEl = document.getElementById('stat-intake-breakdown');
    var strip = document.getElementById('plan-kcal-strip');
    var segmentsEl = document.getElementById('plan-kcal-strip-segments');
    var capEl = document.getElementById('plan-kcal-strip-caption');

    var o = loadPlanIntakeState();
    var total = sumPlanIntakeKcal(o.items);
    var T = profile && profile.targetCalories ? Number(profile.targetCalories) : 0;
    var pct = T > 0 ? Math.min(999, Math.round((total / T) * 100)) : 0;
    var items = o.items || [];
    var posParts = [];

    for (var pi = 0; pi < items.length; pi++) {
      var pk = Math.round(Number(items[pi].kcal) || 0);
      if (pk > 0) posParts.push(String(pk));
    }

    if (cumEl) cumEl.textContent = String(total);
    if (breakEl) {
      if (posParts.length === 0) {
        breakEl.textContent = tr("myplan.breakdown.empty");
      } else if (posParts.length === 1) {
        breakEl.textContent = tr("myplan.breakdown.one").replace("{0}", posParts[0]);
      } else {
        breakEl.textContent = tr("myplan.breakdown.multi")
          .replace("{0}", posParts.join(" + "))
          .replace("{1}", String(total));
      }
    }

    if (segmentsEl && strip && capEl) {
      segmentsEl.innerHTML = '';
      if (total > 0 && posParts.length > 0) {
        strip.hidden = false;
        var si = 0;
        for (var sj = 0; sj < items.length; sj++) {
          var kj = Math.round(Number(items[sj].kcal) || 0);
          if (kj <= 0) continue;
          var seg = document.createElement('span');
          seg.className = 'plan-kcal-strip__seg';
          seg.style.flexGrow = String(kj);
          seg.style.flexBasis = '0';
          seg.style.background = INTAKE_SEGMENT_COLORS[si % INTAKE_SEGMENT_COLORS.length];
          seg.title = tr("myplan.strip.segTitle")
            .replace("{0}", mealSlotLabel(items[sj].meal || "Breakfast"))
            .replace("{1}", String(kj));
          segmentsEl.appendChild(seg);
          si++;
        }
        capEl.textContent = tr("myplan.strip.caption");
      } else {
        strip.hidden = true;
        capEl.textContent = '';
      }
    }

    if (!totalEl || !pctEl || !listEl) {
      renderBalanceIntakeChart(profile);
      return;
    }

    totalEl.textContent = String(total);
    pctEl.textContent = String(pct) + '%';

    listEl.innerHTML = '';
    (o.items || []).forEach(function (entry, idx) {
      var li = document.createElement('li');
      var left = document.createElement('span');
      left.textContent = String(idx + 1) + ". " + mealSlotLabel(entry.meal || "Breakfast");
      var right = document.createElement('span');
      right.className = 'meal-plan-intake__list-kcal';
      right.textContent = tr("myplan.positiveKcal").replace("{0}", String(Math.round(Number(entry.kcal) || 0)));
      li.appendChild(left);
      li.appendChild(right);
      listEl.appendChild(li);
    });

    if (emptyEl) {
      emptyEl.hidden = (o.items && o.items.length > 0);
    }

    renderBalanceIntakeChart(profile);
  }

  /**
   * Used when fetch() fails (e.g. opening HTML as file://) or JSON is invalid.
   * Keeps My Plan usable without a local server.
   */
  var FALLBACK_DATASET = {
    __fallback: true,
    foods: [
      { id: 'fb1', name: 'Chicken breast, skinless grilled', category: 'protein', kcal: 165, proteinG: 31, carbsG: 0, fatG: 3.6, tags: [] },
      { id: 'fb2', name: 'Egg, whole boiled', category: 'protein', kcal: 155, proteinG: 13, carbsG: 1.1, fatG: 11, tags: [], servingLabel: '1 large ~50g' },
      { id: 'fb3', name: 'Brown rice, cooked', category: 'grain', kcal: 112, proteinG: 2.3, carbsG: 24, fatG: 0.9, tags: ['highStarchCarb'] },
      { id: 'fb4', name: 'Oats, dry rolled', category: 'grain', kcal: 389, proteinG: 17, carbsG: 66, fatG: 7, tags: ['highStarchCarb'] },
      { id: 'fb5', name: 'Broccoli, steamed', category: 'veg', kcal: 35, proteinG: 2.4, carbsG: 7, fatG: 0.4, tags: [] },
      { id: 'fb6', name: 'Apple, with skin', category: 'fruit', kcal: 52, proteinG: 0.3, carbsG: 14, fatG: 0.2, tags: ['naturalSugar'] },
      { id: 'fb7', name: 'Greek yogurt, plain low-fat', category: 'dairy', kcal: 73, proteinG: 9.9, carbsG: 3.9, fatG: 1.9, tags: [] },
      { id: 'fb8', name: 'Lentils, cooked', category: 'legume', kcal: 116, proteinG: 9, carbsG: 20, fatG: 0.4, tags: ['highStarchCarb'] },
      { id: 'fb9', name: 'Tofu, firm', category: 'plant', kcal: 144, proteinG: 17, carbsG: 3, fatG: 9, tags: [] },
      { id: 'fb10', name: 'Olive oil', category: 'fat', kcal: 884, proteinG: 0, carbsG: 0, fatG: 100, tags: [] },
      { id: 'fb11', name: 'Almonds', category: 'fat', kcal: 579, proteinG: 21, carbsG: 22, fatG: 50, tags: [] },
      {
        id: 'fb12',
        name: 'Chocolate dessert',
        category: 'snack',
        kcal: 520,
        proteinG: 6,
        carbsG: 58,
        fatG: 30,
        tags: ['highSugar', 'concentratedSweet', 'addedSugarProduct']
      }
    ]
  };
  Object.defineProperty(FALLBACK_DATASET, 'dietaryConditions', {
    enumerable: true,
    configurable: true,
    get: function () {
      var N = window.NutriHealthConditions;
      return (N && N.FALLBACK_DIETARY_CONDITIONS) || [];
    }
  });

  function loadProfile() {
    try {
      var key = (window.NutriAuth && window.NutriAuth.scopedKey('nutri_profile')) || 'nutri_profile';
      var raw = localStorage.getItem(key) || localStorage.getItem('nutri_profile');
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  var MS_HOUR = 60 * 60 * 1000;
  var MS_DAY = 24 * MS_HOUR;

  /**
   * Rolling 7×24h window: sums `kcal` from `exerciseBurnLog` (each Plan Sport “Calculate burn”).
   */
  function aggregateExerciseBurn7d(profile) {
    var log = profile && Array.isArray(profile.exerciseBurnLog) ? profile.exerciseBurnLog : [];
    var now = Date.now();
    var windowMs = 7 * MS_DAY;
    var sumK = 0;
    var sumM = 0;
    var sessions = 0;
    for (var i = 0; i < log.length; i++) {
      var e = log[i];
      var t = e && e.at ? Date.parse(e.at) : NaN;
      if (!Number.isFinite(t) || now - t > windowMs || now - t < 0) continue;
      sessions++;
      sumK += Number(e.kcal) || 0;
      var m = Number(e.minutes);
      if (Number.isFinite(m) && m > 0) sumM += m;
    }
    var rate = sumM > 0 ? sumK / sumM : null;
    return { sumK: sumK, sumM: sumM, rate: rate, sessions: sessions };
  }

  /** Rolling last 24 hours from “now” (device clock). */
  function aggregateExerciseBurn24h(profile) {
    var log = profile && Array.isArray(profile.exerciseBurnLog) ? profile.exerciseBurnLog : [];
    var now = Date.now();
    var windowMs = MS_DAY;
    var sumK = 0;
    var sumM = 0;
    var sessions = 0;
    for (var j = 0; j < log.length; j++) {
      var e2 = log[j];
      var t2 = e2 && e2.at ? Date.parse(e2.at) : NaN;
      if (!Number.isFinite(t2) || now - t2 > windowMs || now - t2 < 0) continue;
      sessions++;
      sumK += Number(e2.kcal) || 0;
      var m2 = Number(e2.minutes);
      if (Number.isFinite(m2) && m2 > 0) sumM += m2;
    }
    var rate2 = sumM > 0 ? sumK / sumM : null;
    return { sumK: sumK, sumM: sumM, rate: rate2, sessions: sessions };
  }

  function refreshExerciseBurnStat(profile) {
    var weekEl = document.getElementById('stat-exercise-burn-week');
    var weekMeta = document.getElementById('stat-burn-week-meta');
    var dayEl = document.getElementById('stat-exercise-burn-day');
    var dayMeta = document.getElementById('stat-burn-day-meta');
    if (!weekEl || !dayEl) return;

    var w = aggregateExerciseBurn7d(profile);
    var d = aggregateExerciseBurn24h(profile);

    weekEl.textContent = String(Math.round(w.sumK));
    if (weekMeta) {
      if (w.sessions > 0) {
        var wp = tr("myplan.burn.weekLine")
          .replace("{0}", String(w.sessions))
          .replace("{1}", String(Math.round(w.sumM)));
        if (w.rate != null && Number.isFinite(w.rate)) {
          wp = tr("myplan.burn.weekLineRate").replace("{0}", wp).replace("{1}", w.rate.toFixed(1));
        }
        weekMeta.textContent = wp;
      } else {
        weekMeta.textContent = tr("myplan.burn.weekEmpty");
      }
    }

    dayEl.textContent = String(Math.round(d.sumK));
    if (dayMeta) {
      if (d.sessions > 0) {
        var dp = tr("myplan.burn.dayLine")
          .replace("{0}", String(d.sessions))
          .replace("{1}", String(Math.round(d.sumM)));
        if (d.rate != null && Number.isFinite(d.rate)) {
          dp = tr("myplan.burn.dayLineRate").replace("{0}", dp).replace("{1}", d.rate.toFixed(1));
        }
        dayMeta.textContent = dp;
      } else {
        dayMeta.textContent = tr("myplan.burn.dayEmpty");
      }
    }
  }

  function applyPlanDashboardStats(profile) {
    var t = document.getElementById('stat-target');
    var b = document.getElementById('stat-bmr');
    if (t) t.textContent = profile.targetCalories;
    if (b) b.textContent = profile.bmr;
    refreshExerciseBurnStat(profile);
  }

  function loadUserProfile() {
    try {
      var raw = localStorage.getItem('nutri_user_profile');
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function loadConditionIds() {
    try {
      var raw = localStorage.getItem(CONDITION_KEY);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.map(String) : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * mode 'none' → no disease filter (full food list).
   * mode 'conditions' → filter by healthConditionIds from profile / dataset rules.
   */
  function loadHealthFilterFromProfile() {
    try {
      var key = (window.NutriAuth && window.NutriAuth.scopedKey('nutri_profile')) || 'nutri_profile';
      var raw = localStorage.getItem(key) || localStorage.getItem('nutri_profile');
      if (raw) {
        var p = JSON.parse(raw);
        if (p.healthConditionsMode === 'none') return { mode: 'none', ids: [] };
        if (p.healthConditionsMode === 'conditions') {
          return {
            mode: 'conditions',
            ids: Array.isArray(p.healthConditionIds) ? p.healthConditionIds.map(String) : []
          };
        }
        if (Array.isArray(p.healthConditionIds) && p.healthConditionIds.length > 0) {
          return { mode: 'conditions', ids: p.healthConditionIds.map(String) };
        }
      }
    } catch (e) {}
    var leg = loadConditionIds();
    if (leg.length) return { mode: 'conditions', ids: leg };
    return { mode: 'none', ids: [] };
  }

  function macroRatios(goal) {
    if (goal === 'lose') return { p: 0.34, c: 0.36, f: 0.30 };
    if (goal === 'gain') return { p: 0.28, c: 0.46, f: 0.26 };
    return { p: 0.30, c: 0.40, f: 0.30 };
  }

  function foodExcludedByRule(food, cond) {
    if (!food || !cond) return false;
    if (cond.excludeFoodIds && cond.excludeFoodIds.indexOf(food.id) >= 0) return true;
    if (cond.excludeCategories && cond.excludeCategories.indexOf(food.category) >= 0) return true;
    var tags = food.tags || [];
    var ex = cond.excludeTags || [];
    for (var i = 0; i < ex.length; i++) {
      if (tags.indexOf(ex[i]) >= 0) return true;
    }
    return false;
  }

  function filterFoods(foods, activeConditions) {
    if (!Array.isArray(foods)) return [];
    return foods.filter(function (f) {
      for (var i = 0; i < activeConditions.length; i++) {
        if (foodExcludedByRule(f, activeConditions[i])) return false;
      }
      return true;
    });
  }

  function byCategory(pool, cat) {
    return pool.filter(function (f) {
      return f.category === cat;
    });
  }

  /** Deterministic PRNG: same seed → same sequence. shuffleSalt changes the draw. */
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      var t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function createPlanRng(profile, conditionIds, shuffleSalt) {
    var email = '';
    if (window.NutriAuth && typeof window.NutriAuth.getCurrentUserEmail === 'function') {
      email = String(window.NutriAuth.getCurrentUserEmail() || '');
    }
    var d = new Date();
    var dayKey = d.getFullYear() * 1000 + (d.getMonth() + 1) * 50 + d.getDate();
    var seed = dayKey >>> 0;
    var str =
      email +
      '|' +
      (profile && profile.targetCalories) +
      '|' +
      (profile && profile.goal) +
      '|' +
      (conditionIds || []).slice().sort().join(',');
    for (var i = 0; i < str.length; i++) {
      seed = (Math.imul(31, seed) + str.charCodeAt(i)) >>> 0;
    }
    if (shuffleSalt) {
      seed = (seed ^ (shuffleSalt >>> 0)) >>> 0;
      seed = (seed ^ Math.imul(shuffleSalt & 0xffff, 2654435761)) >>> 0;
    }
    return mulberry32(seed);
  }

  function shuffleInPlace(arr, rng) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
    return arr;
  }

  function pickUnused(pool, used) {
    for (var i = 0; i < pool.length; i++) {
      if (used.indexOf(pool[i].id) < 0) return pool[i];
    }
    return pool[0] || null;
  }

  function markUsed(used, food) {
    if (food && used.indexOf(food.id) < 0) used.push(food.id);
  }

  function estimateGrams(food, targetKcal) {
    if (!food || !food.kcal || food.kcal <= 0) return 100;
    var g = (targetKcal / food.kcal) * 100;
    var denseFat = food.category === 'fat' && food.kcal >= 400;
    var minG = denseFat ? 8 : 40;
    var maxG = denseFat ? 40 : 280;
    return Math.max(minG, Math.min(maxG, Math.round(g / 5) * 5));
  }

  function lineKcal(food, grams) {
    if (!food || !food.kcal) return 0;
    return Math.round((food.kcal * grams) / 100);
  }

  function formatLine(food, grams) {
    var k = lineKcal(food, grams);
    var name = foodDisplayName(food);
    var srv = servingDisplay(food);
    var portion = srv ? tr("myplan.portion.withServing").replace("{0}", name).replace("{1}", srv) : name;
    return tr("myplan.portion.line").replace("{0}", portion).replace("{1}", String(grams)).replace("{2}", String(k));
  }

  /**
   * Build 4 meals with category slots; pools are shuffled so suggestions vary (by day / shuffle button).
   */
  function buildDayMeals(foods, T, goal, rng) {
    rng = rng || Math.random;
    var splits = [
      { key: 'Breakfast', ratio: 0.26, slots: ['protein', 'grain', 'fruit', 'dairy'] },
      { key: 'Lunch', ratio: 0.36, slots: ['protein', 'grain', 'veg', 'legume'] },
      { key: 'Dinner', ratio: 0.28, slots: ['protein', 'veg', 'grain', 'fat'] },
      { key: 'Snack', ratio: 0.1, slots: ['fruit', 'fat', 'dairy', 'plant', 'snack'] }
    ];

    var used = [];
    var mealsOut = [];

    splits.forEach(function (block) {
      var mealK = Math.round(T * block.ratio);
      var perSlot = mealK / Math.max(1, block.slots.length);
      var items = [];
      var actualK = 0;
      var slots = block.slots.slice();
      shuffleInPlace(slots, rng);

      slots.forEach(function (cat) {
        var pool = byCategory(foods, cat).slice();
        if (cat === 'protein' && !pool.length) pool = byCategory(foods, 'plant').slice();
        shuffleInPlace(pool, rng);
        var f = pickUnused(pool, used);
        if (!f) return;
        markUsed(used, f);
        var slotKcal = perSlot * (0.88 + rng() * 0.26);
        var g = estimateGrams(f, slotKcal);
        items.push({ food: f, grams: g, text: formatLine(f, g) });
        actualK += lineKcal(f, g);
      });

      mealsOut.push({
        title: block.key,
        targetKcal: mealK,
        approxKcal: actualK,
        items: items
      });
    });

    return mealsOut;
  }

  function renderMealPlanUI(profile, userExtra, dataset, conditionIds, shuffleSalt) {
    var summaryEl = document.getElementById('meal-plan-summary');
    var mealsEl = document.getElementById('meal-plan-meals');
    var footEl = document.getElementById('meal-plan-footnote');
    var foods = (dataset && dataset.foods) || [];
    var conds = (dataset && dataset.dietaryConditions) || [];
    var idsNorm = (conditionIds || []).map(String);
    var active = conds.filter(function (c) {
      return idsNorm.indexOf(String(c.id)) >= 0;
    });
    var allowed = filterFoods(foods, active);
    var filterBlockedAll = false;
    if (!allowed.length && foods.length) {
      filterBlockedAll = true;
      allowed = foods.slice();
    }

    var name = (userExtra && userExtra.name) || (profile && profile.name) || 'there';
    var goal = (profile && profile.goal) || 'maintain';
    var T = profile.targetCalories;
    var m = macroRatios(goal);

    summaryEl.hidden = false;
    var summaryText = tr("myplan.summary.intro")
      .replace("{0}", name)
      .replace("{1}", String(T))
      .replace("{2}", goalSummaryLabel(goal))
      .replace("{3}", String(Math.round(m.p * 100)))
      .replace("{4}", String(Math.round(m.c * 100)))
      .replace("{5}", String(Math.round(m.f * 100)));
    if (filterBlockedAll) {
      summaryText += " " + tr("myplan.summary.filterBlocked");
    }
    summaryEl.textContent = summaryText;

    mealsEl.innerHTML = '';
    if (!allowed.length) {
      var warn = document.createElement('p');
      warn.style.fontSize = '0.78rem';
      warn.style.color = '#a6273f';
      warn.textContent = tr("myplan.noFoods");
      mealsEl.appendChild(warn);
      footEl.hidden = true;
      return;
    }

    var rng = createPlanRng(profile, conditionIds, shuffleSalt || 0);
    var blocks = buildDayMeals(allowed, T, goal, rng);
    blocks.forEach(function (b) {
      var card = document.createElement('article');
      card.className = 'meal-plan-card';

      var hero = document.createElement('div');
      hero.className = 'meal-plan-card__hero';
      var heroImg = document.createElement('img');
      heroImg.src = mealHeroUrl(b.title);
      heroImg.alt = tr("myplan.hero.alt").replace("{0}", mealSlotLabel(b.title));
      heroImg.loading = 'lazy';
      heroImg.addEventListener('error', function onHeroErr() {
        heroImg.removeEventListener('error', onHeroErr);
        heroImg.src = LOCAL_FOOD_IMG_FALLBACK;
      });
      hero.appendChild(heroImg);

      var body = document.createElement('div');
      body.className = 'meal-plan-card__body';

      var titleRow = document.createElement('div');
      titleRow.className = 'meal-plan-card__title-row';
      var h = document.createElement('h3');
      h.textContent = mealSlotLabel(b.title);
      var addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'meal-plan-add-kcal';
      addBtn.setAttribute(
        'aria-label',
        tr("myplan.meal.addAria")
          .replace("{0}", mealSlotLabel(b.title))
          .replace("{1}", String(Math.round(Number(b.approxKcal) || 0)))
      );
      addBtn.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">add</span>';
      var kcalToLog = Math.round(Number(b.approxKcal) || 0);
      addBtn.addEventListener('click', function () {
        if (kcalToLog <= 0) return;
        appendPlanIntakeEntry(b.title, kcalToLog);
        refreshPlanIntakeUI(profile);
      });
      titleRow.appendChild(h);
      titleRow.appendChild(addBtn);

      var sub = document.createElement('div');
      sub.className = 'meal-kcal';
      sub.textContent = tr("myplan.meal.kcalLine")
        .replace("{0}", String(b.targetKcal))
        .replace("{1}", String(b.approxKcal))
        .replace("{2}", String(kcalToLog));

      var ul = document.createElement('ul');
      ul.className = 'meal-plan-list';
      (b.items || []).forEach(function (item) {
        var li = document.createElement('li');
        li.className = 'meal-plan-item';
        var img = document.createElement('img');
        img.className = 'meal-plan-item__thumb';
        img.src = upgradeThumbImageUrl(resolveFoodImageUrl(item.food));
        img.alt = foodDisplayName(item.food) || '';
        img.loading = 'lazy';
        img.width = 56;
        img.height = 56;
        img.addEventListener('error', function onImgErr() {
          img.removeEventListener('error', onImgErr);
          img.src = LOCAL_FOOD_IMG_FALLBACK;
        });
        var span = document.createElement('span');
        span.className = 'meal-plan-item__text';
        span.textContent = item.text;
        li.appendChild(img);
        li.appendChild(span);
        ul.appendChild(li);
      });
      if (!(b.items && b.items.length)) {
        var liEmpty = document.createElement('li');
        liEmpty.className = 'meal-plan-item';
        liEmpty.textContent = tr("myplan.meal.emptySlot");
        ul.appendChild(liEmpty);
      }

      body.appendChild(titleRow);
      body.appendChild(sub);
      body.appendChild(ul);
      card.appendChild(hero);
      card.appendChild(body);
      mealsEl.appendChild(card);
    });

    var footMsg = String(tr("myplan.foot.thumb") || "").trim();
    footEl.textContent = footMsg;
    footEl.hidden = !footMsg;
  }

  function bindMealPlan(profile, userExtra, dataset) {
    var wrap = document.getElementById('meal-plan-filters-wrap');
    var hf = loadHealthFilterFromProfile();
    var ids = hf.ids;
    var shuffleSalt = 0;

    function refresh(nextIds, forceNewShuffle) {
      if (forceNewShuffle) shuffleSalt = Date.now();
      renderMealPlanUI(profile, userExtra, dataset, nextIds, shuffleSalt);
      window._nutriMyPlanState = {
        profile: profile,
        userExtra: userExtra,
        dataset: dataset,
        conditionIds: nextIds,
        shuffleSalt: shuffleSalt
      };
    }

    wrap.className = '';
    wrap.innerHTML = '';
    refresh(ids, false);

    var shuffleBtn = document.getElementById('meal-plan-shuffle');
    if (shuffleBtn) {
      shuffleBtn.onclick = function () {
        refresh(ids, true);
      };
    }
  }

  var balanceChartInstance = null;
  var macroChartInstance = null;
  var weekChartInstance = null;
  var cachedWeekBars = null;

  function destroyChartSafe(inst) {
    if (inst && typeof inst.destroy === "function") {
      try {
        inst.destroy();
      } catch (e) {}
    }
    return null;
  }

  /**
   * Doughnut: one segment per logged meal (in add order: first logged → first slice, newest → last slice before remainder).
   */
  function renderBalanceIntakeChart(profile) {
    var canvas = document.getElementById('chart-balance');
    if (!canvas || typeof Chart === 'undefined') return;

    var T = profile && profile.targetCalories ? Number(profile.targetCalories) : 0;
    var o = loadPlanIntakeState();
    var items = o.items || [];
    var labels = [];
    var data = [];
    var colors = [];
    var sum = sumPlanIntakeKcal(items);
    var idx = 0;

    (items || []).forEach(function (entry) {
      var k = Math.round(Number(entry.kcal) || 0);
      if (k <= 0) return;
      labels.push(
        tr("myplan.chart.sliceMeal")
          .replace("{0}", mealSlotLabel(entry.meal || "Breakfast"))
          .replace("{1}", String(k))
      );
      data.push(k);
      colors.push(INTAKE_SEGMENT_COLORS[idx % INTAKE_SEGMENT_COLORS.length]);
      idx++;
    });

    if (T > 0) {
      if (sum < T) {
        labels.push(tr("myplan.chart.remain"));
        data.push(Math.max(0, T - sum));
        colors.push('#e8e8ec');
      } else if (sum > T) {
        labels.push(tr("myplan.chart.above").replace("{0}", String(sum - T)));
        data.push(sum - T);
        colors.push('#ff7782');
      }
    }

    if (!data.length) {
      labels.push(tr("myplan.chart.noneLogged"));
      data.push(1);
      colors.push('#e0e0e0');
    }

    if (balanceChartInstance) {
      balanceChartInstance.destroy();
      balanceChartInstance = null;
    }

    balanceChartInstance = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [
          {
            data: data,
            backgroundColor: colors,
            borderWidth: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 10 } },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                var v = Number(ctx.raw != null ? ctx.raw : ctx.parsed) || 0;
                var total = (ctx.dataset.data || []).reduce(function (a, b) {
                  return a + (Number(b) || 0);
                }, 0);
                var pct = total > 0 ? Math.round((v / total) * 100) : 0;
                var unit = tr("sport.chart.axis.kcal");
                return (ctx.label || "") + ": " + v + " " + unit + " (" + pct + "%)";
              }
            }
          }
        }
      }
    });
  }

  function renderMacroWeekCharts(profile) {
    if (typeof Chart === "undefined") return;
    var T = profile.targetCalories;
    var goal = profile.goal || "maintain";
    var ratios = macroRatios(goal);

    var pCal = Math.round(T * ratios.p);
    var cCal = Math.round(T * ratios.c);
    var fCal = Math.round(T * ratios.f);

    macroChartInstance = destroyChartSafe(macroChartInstance);
    weekChartInstance = destroyChartSafe(weekChartInstance);

    var elM = document.getElementById("chart-macros");
    if (elM) {
      macroChartInstance = new Chart(elM, {
        type: "pie",
        data: {
          labels: [tr("myplan.macro.P"), tr("myplan.macro.C"), tr("myplan.macro.F")],
          datasets: [
            {
              data: [pCal, cCal, fCal],
              backgroundColor: ["#0e904f", "#41f1b6", "#7380ec"],
              borderWidth: 0
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: "bottom", labels: { font: { size: 11 } } } }
        }
      });
    }

    var elW = document.getElementById("chart-week");
    if (!elW) return;

    var days = [];
    for (var di = 0; di < 7; di++) {
      days.push(tr("myplan.wd." + di));
    }
    if (!cachedWeekBars || cachedWeekBars.length !== 7) {
      cachedWeekBars = [];
      for (var bi = 0; bi < 7; bi++) {
        cachedWeekBars.push(Math.round(T * (0.85 + Math.random() * 0.2)));
      }
    }
    var bars = cachedWeekBars;

    weekChartInstance = new Chart(elW, {
      type: "bar",
      data: {
        labels: days,
        datasets: [
          {
            label: tr("myplan.chart.estKcal"),
            data: bars,
            backgroundColor: "rgba(14, 144, 79, 0.55)",
            borderRadius: 6,
            order: 2
          },
          {
            label: tr("myplan.chart.dailyTargetLine"),
            data: days.map(function () {
              return T;
            }),
            type: "line",
            borderColor: "#7380ec",
            borderWidth: 2,
            pointRadius: 0,
            fill: false,
            order: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: false, grid: { color: "#eee" } },
          x: { grid: { display: false } }
        },
        plugins: { legend: { position: "bottom", labels: { font: { size: 11 } } } }
      }
    });
  }

  function renderCharts(profile) {
    renderMacroWeekCharts(profile);
  }

  /* ─── API boot: fetch full profile, then render ─────────────────────── */

  function bootWithProfile(profile) {
    if (!profile || !profile.targetCalories) {
      document.getElementById('empty-plan').style.display = 'block';
      return;
    }

    document.getElementById('empty-plan').style.display = 'none';
    document.getElementById('plan-content').style.display = 'block';
    applyPlanDashboardStats(profile);

    window.addEventListener('nutri-exercise-log-updated', function () {
      var p = loadProfile();
      if (p && p.targetCalories) applyPlanDashboardStats(p);
    });

    var userExtra = loadUserProfile();
    renderCharts(profile);

    var planIntakeReset = document.getElementById('plan-intake-reset');
    if (planIntakeReset) {
      planIntakeReset.onclick = function () {
        clearPlanIntakeForToday();
        refreshPlanIntakeUI(profile);
      };
    }
    refreshPlanIntakeUI(profile);

    window.addEventListener('nutri-i18n-applied', function () {
      var p = loadProfile();
      if (!p || !p.targetCalories) return;
      refreshPlanIntakeUI(p);
      refreshExerciseBurnStat(p);
      var st = window._nutriMyPlanState;
      if (st && st.profile && st.dataset) {
        renderMealPlanUI(st.profile, st.userExtra, st.dataset, st.conditionIds || [], st.shuffleSalt || 0);
      }
      renderMacroWeekCharts(p);
    });

    fetch(DATASET_URL)
      .then(function (res) {
        if (!res.ok) throw new Error('dataset');
        return res.json();
      })
      .then(function (dataset) {
        if (!dataset || !Array.isArray(dataset.foods) || dataset.foods.length === 0) {
          throw new Error('empty dataset');
        }
        bindMealPlan(profile, userExtra, dataset);
      })
      .catch(function () {
        bindMealPlan(profile, userExtra, FALLBACK_DATASET);
      });

    // Additionally, trigger diet plan generation on the backend if profile has calories
    var nutriApi = window.NutriApi;
    if (nutriApi) {
      nutriApi.get('/api/diet-plan').catch(function (err) {
        // If 404 (no plan), generate one
        if (err && err.status === 404) {
          nutriApi.post('/api/diet-plan/generate', {}).catch(function () {});
        }
      });
    }
  }

  // Try to fetch full profile from API first; fall back to localStorage
  var nutriApi = window.NutriApi;
  if (nutriApi) {
    nutriApi.get('/api/user').then(function (res) {
      var serverUser = res && res.user ? res.user : res;
      var profile = nutriApi.serverUserToProfile(serverUser);
      if (profile) {
        nutriApi.persistSession(serverUser, nutriApi.getToken());
      }
      bootWithProfile(profile || loadProfile());
    }).catch(function () {
      bootWithProfile(loadProfile());
    });
  } else {
    bootWithProfile(loadProfile());
  }
})();

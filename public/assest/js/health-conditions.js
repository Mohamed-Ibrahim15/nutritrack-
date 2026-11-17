/**
 * منطق الشروط الصحية: إما بدون أمراض (كل الوجبات) أو اختيار أمراض لتصفية الوجبات المناسبة.
 * مسارات البيانات: في index يكون ./data/ وفي pages/* يكون ../data/
 * عند فشل جلب الملف (مثل file://) يتم استخدام FALLBACK_DIETARY_CONDITIONS من الملف المحلي.
 */
(function (global) {
  function tr(key) {
    return global.NutriI18n && typeof global.NutriI18n.t === "function" ? global.NutriI18n.t(key) : key;
  }

  function conditionName(c) {
    if (!c || !c.id) return "";
    var k = "health.cond." + String(c.id) + ".name";
    var s = tr(k);
    return s !== k ? s : c.name || c.id;
  }

  /** When fetch fails (e.g. file://), use embedded copy — keep in sync with data/site-dataset.json */
  var FALLBACK_DIETARY_CONDITIONS = [
    {
      "id": "diabetes_type2",
      "name": "Type 2 diabetes",
      "excludeTags": [
        "highSugar",
        "concentratedSweet",
        "addedSugarProduct",
        "refinedCarb"
      ],
      "excludeCategories": [],
      "excludeFoodIds": [
        "f029",
        "f030"
      ],
      "note": "Removes sweets/chocolate/bars, added-sugar products, and refined bread/pasta. Savory snacks like hummus stay. Whole fruits stay unless you switch to diabetes_type2_strict_carbs."
    },
    {
      "id": "diabetes_type2_strict_carbs",
      "name": "Type 2 diabetes (stricter carbs & fruit)",
      "excludeTags": [
        "highSugar",
        "concentratedSweet",
        "addedSugarProduct",
        "refinedCarb",
        "highStarchCarb",
        "naturalSugar"
      ],
      "excludeCategories": [],
      "excludeFoodIds": [
        "f029",
        "f030"
      ],
      "note": "Also excludes starchy sides (rice, potato, oats, legumes as tagged) and whole fruits in this demo list."
    },
    {
      "id": "hypertension",
      "name": "High blood pressure",
      "excludeTags": [
        "highSodium"
      ],
      "excludeCategories": [],
      "excludeFoodIds": [],
      "note": "Excludes items tagged high-sodium (e.g. canned tuna, cottage cheese, cheddar)."
    },
    {
      "id": "celiac_gluten_free",
      "name": "Celiac disease / gluten sensitivity",
      "excludeTags": [
        "gluten",
        "glutenRiskOats"
      ],
      "excludeCategories": [],
      "excludeFoodIds": [],
      "note": "Excludes gluten grains and non-certified oats in this demo tagging."
    },
    {
      "id": "dyslipidemia",
      "name": "High blood lipids (LDL)",
      "excludeTags": [
        "highSaturatedFat"
      ],
      "excludeCategories": [],
      "excludeFoodIds": [
        "f023",
        "f024"
      ],
      "note": "Excludes items tagged high in saturated fat; explicit IDs cover cheese and ground beef."
    },
    {
      "id": "lactose_intolerance",
      "name": "Lactose intolerance",
      "excludeTags": [
        "lactose"
      ],
      "excludeCategories": [
        "dairy"
      ],
      "excludeFoodIds": [],
      "note": "Excludes dairy and lactose-tagged items."
    },
    {
      "id": "gerd_reflux_caution",
      "name": "Acid reflux (GERD)",
      "excludeTags": [
        "acidic",
        "highSaturatedFat"
      ],
      "excludeCategories": [],
      "excludeFoodIds": [
        "f029",
        "f023"
      ],
      "note": "Demo only: acidic fruit, chocolate, very fatty cheese patterns; real triggers vary."
    },
    {
      "id": "gout_hyperuricemia",
      "name": "Gout",
      "excludeTags": [
        "highPurineModerate"
      ],
      "excludeCategories": [],
      "excludeFoodIds": [
        "f024"
      ],
      "note": "Flags moderate-purine fish/meat and canned tuna in this demo; real limits depend on attacks/meds."
    },
    {
      "id": "ckd_hyperkalemia_caution",
      "name": "Kidney disease (high potassium caution)",
      "excludeTags": [
        "highPotassium"
      ],
      "excludeCategories": [],
      "excludeFoodIds": [],
      "note": "Many CKD diets restrict potassium only at certain stages/labs — this is a teaching filter only."
    },
    {
      "id": "kidney_stones_calcium_oxalate",
      "name": "Kidney stones",
      "excludeTags": [
        "highOxalate"
      ],
      "excludeCategories": [],
      "excludeFoodIds": [],
      "note": "Not all stone formers need the same diet; many factors (fluids, calcium timing) matter."
    },
    {
      "id": "migraine_diet_triggers_demo",
      "name": "Migraine",
      "excludeTags": [
        "migraineTrigger",
        "tyramineRich",
        "histamineRisk"
      ],
      "excludeCategories": [],
      "excludeFoodIds": [
        "f029"
      ],
      "note": "Triggers are highly individual; chocolate/citrus/aged cheese are frequent self-reports."
    },
    {
      "id": "ibs_fodmap_heavy_demo",
      "name": "Irritable bowel (IBS)",
      "excludeTags": [
        "fodmapHeavy"
      ],
      "excludeCategories": [],
      "excludeFoodIds": [],
      "note": "Real low-FODMAP care is phased/reintroduction; this only tags heavier items in the list."
    },
    {
      "id": "histamine_intolerance_demo",
      "name": "Histamine intolerance",
      "excludeTags": [
        "histamineRisk"
      ],
      "excludeCategories": [],
      "excludeFoodIds": [],
      "note": "Aged cheese, canned fish, chocolate flagged; real sensitivity varies a lot."
    },
    {
      "id": "nafld_fatty_liver_demo",
      "name": "Fatty liver (NAFLD)",
      "excludeTags": [
        "highSugar",
        "concentratedSweet",
        "addedSugarProduct",
        "refinedCarb",
        "highSaturatedFat"
      ],
      "excludeCategories": [],
      "excludeFoodIds": [
        "f029",
        "f030"
      ],
      "note": "Broad metabolic pattern demo; clinical plans are individualized."
    },
    {
      "id": "pcos_insulin_resistance_demo",
      "name": "PCOS",
      "excludeTags": [
        "highSugar",
        "concentratedSweet",
        "addedSugarProduct",
        "refinedCarb"
      ],
      "excludeCategories": [],
      "excludeFoodIds": [
        "f029",
        "f030"
      ],
      "note": "Similar to limiting high-GI added sugars/refined starches in many counseling approaches."
    },
    {
      "id": "heart_failure_sodium_demo",
      "name": "Heart failure",
      "excludeTags": [
        "highSodium"
      ],
      "excludeCategories": [],
      "excludeFoodIds": [],
      "note": "Often overlaps with hypertension salt limits; fluid limits are separate in real care."
    },
    {
      "id": "iron_deficiency_absorption_demo",
      "name": "Iron deficiency anemia",
      "excludeTags": [
        "tanninPolyphenol"
      ],
      "excludeCategories": [],
      "excludeFoodIds": [
        "f031"
      ],
      "note": "Tea/polyphenols can reduce non-heme iron absorption if taken with iron-rich meals. Calcium-rich dairy can too when paired — counsel timing separately; not all dairy is excluded here."
    },
    {
      "id": "hypothyroid_goitrogen_demo",
      "name": "Hypothyroidism",
      "excludeTags": [
        "goitrogenLight"
      ],
      "excludeCategories": [],
      "excludeFoodIds": [],
      "note": "Crucifers are usually fine in normal cooked portions; iodine/meds dominate real management."
    }
  ];

  function datasetPath() {
    var path = String(location.pathname || '').replace(/\\/g, '/');
    return path.indexOf('/pages/') !== -1 ? '../data/site-dataset.json' : './data/site-dataset.json';
  }

  function fetchConditions(cb) {
    fetch(datasetPath())
      .then(function (res) {
        if (!res.ok) throw new Error('bad');
        return res.json();
      })
      .then(function (d) {
        var list = (d && d.dietaryConditions) || [];
        cb(list.length ? list : FALLBACK_DIETARY_CONDITIONS);
      })
      .catch(function () {
        cb(FALLBACK_DIETARY_CONDITIONS);
      });
  }

  function inferModeFromProfile(p, selectedIds) {
    if (p && p.healthConditionsMode === 'none') return 'none';
    if (p && p.healthConditionsMode === 'conditions') return 'conditions';
    if (selectedIds && selectedIds.length) return 'conditions';
    return 'none';
  }

  /**
   * @param {HTMLElement} container
   * @param {string[]} selectedIds - used when mode is conditions
   * @param {string} namePrefix - signup-hc | track-hc | settings-hc
   * @param {{ mode?: 'none'|'conditions', profile?: object }} options
   */
  function render(container, selectedIds, namePrefix, options) {
    if (!container) return;
    options = options || {};
    selectedIds = (selectedIds || []).map(String);
    namePrefix = namePrefix || 'hc';
    var initialMode =
      options.mode === 'conditions' ? 'conditions' : options.mode === 'none' ? 'none' : inferModeFromProfile(options.profile, selectedIds);

    var groupName = namePrefix + '-health-mode';

    if (typeof options.onChange === 'function' && !container._nutriHealthChangeBound) {
      container._nutriHealthChangeBound = true;
      container.addEventListener('change', function () {
        options.onChange(readState(container));
      });
    }

    function paintUI(conds, mode, ids) {
      ids = (ids || []).map(String);
      if (!conds || !conds.length) {
        container.innerHTML =
          '<p class="hint" style="font-size:0.72rem;">' + tr("health.loadError") + "</p>";
        return;
      }

      container.setAttribute("data-nutri-health-root", "1");
      container._nutriHealthLastConds = conds;

      container.innerHTML = '';

      var modeRow = document.createElement('div');
      modeRow.className = 'health-mode-row';

      var labelNone = document.createElement('label');
      labelNone.className = 'health-mode-label';
      var rNone = document.createElement('input');
      rNone.type = 'radio';
      rNone.name = groupName;
      rNone.value = 'none';
      rNone.className = 'health-mode-radio';
      rNone.checked = mode === 'none';
      labelNone.appendChild(rNone);
      var sNone = document.createElement('span');
      sNone.textContent = tr("health.mode.none");
      labelNone.appendChild(sNone);

      var labelCond = document.createElement('label');
      labelCond.className = 'health-mode-label';
      var rCond = document.createElement('input');
      rCond.type = 'radio';
      rCond.name = groupName;
      rCond.value = 'conditions';
      rCond.className = 'health-mode-radio';
      rCond.checked = mode === 'conditions';
      labelCond.appendChild(rCond);
      var sCond = document.createElement('span');
      sCond.textContent = tr("health.mode.conditions");
      labelCond.appendChild(sCond);

      modeRow.appendChild(labelNone);
      modeRow.appendChild(labelCond);
      container.appendChild(modeRow);

      var listWrap = document.createElement('div');
      listWrap.className = 'health-cond-list-wrap';

      var hint = document.createElement('p');
      hint.className = 'hint';
      hint.style.fontSize = '0.72rem';
      hint.style.marginBottom = '0.5rem';
      hint.textContent = tr("health.demoHint");
      listWrap.appendChild(hint);

      conds.forEach(function (c) {
        var cid = String(c.id);
        var id = namePrefix + '-' + cid;
        var label = document.createElement('label');
        label.className = 'health-cond-label';
        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = cid;
        cb.id = id;
        cb.className = 'health-cond-cb';
        cb.checked = mode === 'conditions' && ids.indexOf(cid) >= 0;
        var span = document.createElement('span');
        span.textContent = conditionName(c);
        label.appendChild(cb);
        label.appendChild(span);
        listWrap.appendChild(label);
      });

      container.appendChild(listWrap);

      function syncListVisibility() {
        var picked = container.querySelector('input.health-mode-radio:checked');
        var m = picked && picked.value === 'conditions' ? 'conditions' : 'none';
        listWrap.style.display = m === 'conditions' ? 'block' : 'none';
        if (m === 'none') {
          listWrap.querySelectorAll('.health-cond-cb').forEach(function (el) {
            el.checked = false;
          });
        }
      }

      rNone.addEventListener('change', syncListVisibility);
      rCond.addEventListener('change', syncListVisibility);
      syncListVisibility();

      container._nutriReRender = function () {
        var c = container._nutriHealthLastConds;
        if (!c || !c.length) return;
        var st = readState(container);
        paintUI(c, st.mode, st.ids);
      };
    }

    paintUI(FALLBACK_DIETARY_CONDITIONS, initialMode, selectedIds);

    fetchConditions(function (conds) {
      if (!container.isConnected) return;
      var list = conds && conds.length ? conds : FALLBACK_DIETARY_CONDITIONS;
      var prev = readState(container);
      paintUI(list, prev.mode, prev.ids);
    });
  }

  function readState(container) {
    if (!container) return { mode: 'none', ids: [] };
    var modeEl = container.querySelector('input.health-mode-radio:checked');
    var mode = modeEl && modeEl.value === 'conditions' ? 'conditions' : 'none';
    var ids = [];
    if (mode === 'conditions') {
      container.querySelectorAll('.health-cond-list-wrap .health-cond-cb:checked').forEach(function (el) {
        if (el.value) ids.push(String(el.value));
      });
    }
    return { mode: mode, ids: ids };
  }

  /** @deprecated use readState */
  function readSelected(container) {
    return readState(container).ids;
  }

  /**
   * Cache of { slug/name → integer id } fetched from /api/health-conditions.
   * Populated once on first call; used by track-calories.js to convert local
   * string slugs → backend integer IDs before posting to /api/profile/health-info.
   */
  var _apiConditionCache = null; // null = not fetched yet, [] = fetched but empty

  function loadApiConditionsIfAvailable(cb) {
    var nutriApi = global.NutriApi;
    if (!nutriApi) { if (cb) cb([]); return; }

    if (_apiConditionCache !== null) { if (cb) cb(_apiConditionCache); return; }

    nutriApi.get('/api/health-conditions').then(function (res) {
      _apiConditionCache = (res && res.health_conditions) ? res.health_conditions : [];
      if (cb) cb(_apiConditionCache);
    }).catch(function () {
      _apiConditionCache = [];
      if (cb) cb([]);
    });
  }

  /**
   * Converts an array of local string slugs (e.g. ["diabetes_type2", "hypertension"])
   * to an array of backend integer IDs.
   * Falls back gracefully: if mapping not available, returns numeric strings as-is.
   *
   * @param {string[]} slugs
   * @param {function(number[]):void} cb
   */
  function slugsToApiIds(slugs, cb) {
    if (!slugs || slugs.length === 0) { cb([]); return; }
    loadApiConditionsIfAvailable(function (apiConditions) {
      if (!apiConditions || apiConditions.length === 0) {
        cb(slugs.map(Number).filter(function (n) { return !isNaN(n) && n > 0; }));
        return;
      }
      var ids = slugs.map(function (slug) {
        var slugNorm = slug.toLowerCase().replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
        var match = apiConditions.find(function (c) {
          if (String(c.id) === String(slug)) return true;
          if (c.slug && c.slug === slug) return true;
          var nameNorm = (c.name || '').toLowerCase().trim();
          // Either the slug contains the name word or name contains the slug word
          return slugNorm.indexOf(nameNorm) !== -1 || nameNorm.indexOf(slugNorm) !== -1 ||
            // Also match first word: "diabetes" in "diabetes_type2"
            slugNorm.split(' ').some(function (word) { return nameNorm === word || nameNorm.indexOf(word) === 0; });
        });
        return match ? Number(match.id) : null;
      }).filter(function (id) { return id !== null && id > 0; });
      cb(ids);
    });
  }

  if (!global._nutriHealthI18nListener) {
    global._nutriHealthI18nListener = true;
    global.addEventListener("nutri-i18n-applied", function () {
      global.document.querySelectorAll("[data-nutri-health-root]").forEach(function (container) {
        if (container.isConnected && typeof container._nutriReRender === "function") {
          try {
            container._nutriReRender();
          } catch (e) {}
        }
      });
    });
  }

  global.NutriHealthConditions = {
    datasetPath: datasetPath,
    fetchConditions: fetchConditions,
    render: render,
    readState: readState,
    readSelected: readSelected,
    inferModeFromProfile: inferModeFromProfile,
    slugsToApiIds: slugsToApiIds,
    loadApiConditionsIfAvailable: loadApiConditionsIfAvailable,
    /** Same rules as site-dataset.json dietaryConditions; used offline and by My Plan fallback */
    FALLBACK_DIETARY_CONDITIONS: FALLBACK_DIETARY_CONDITIONS
  };
})(window);

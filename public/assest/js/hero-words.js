/**
 * ملف إظهار كلمات عنوان ووصف الهيرو كلمة بكلمة في الصفحة الرئيسية.
 * النصوص تتبع لغة NutriI18n الحالية عند التبديل بين العربية والإنجليزية.
 */
(function () {
  var TITLE_ID = "hero-animated-title";
  var SUB_ID = "hero-animated-subtitle";

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function lang() {
    return window.NutriI18n && typeof window.NutriI18n.getLang === "function" ? window.NutriI18n.getLang() : "en";
  }

  function heroCopy() {
    if (lang() === "ar") {
      return {
        titleLines: ["حوّل رحلتك", "الغذائية"],
        subtitle:
          "خطط غذائية مخصصة لنوع جسمك وأسلوب حياتك وأهدافك. تتبع تقدمك بتحليلات ذكية واحصل على دعم أخصائيي تغذية."
      };
    }
    return {
      titleLines: ["Transform Your", "Nutrition Journey"],
      subtitle:
        "Experience personalized diet plans tailored to your body type, lifestyle, and goals. Track your progress with smart analytics and get support from professional nutritionists."
    };
  }

  function tokenize(text) {
    return String(text || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
  }

  function fillTitle(el, lines) {
    var wordsCount = 0;
    lines.forEach(function (line) {
      wordsCount += tokenize(line).length;
    });
    if (!wordsCount) return;
    el.innerHTML = "";
    lines.forEach(function (line, lineIndex) {
      if (lineIndex > 0) el.appendChild(document.createElement("br"));
      tokenize(line).forEach(function (word) {
        var span = document.createElement("span");
        span.className = "hero-word";
        span.textContent = word;
        el.appendChild(span);
        el.appendChild(document.createTextNode(" "));
      });
    });
  }

  function fillSubtitle(el, text) {
    if (!tokenize(text).length) return;
    el.innerHTML = "";
    tokenize(text).forEach(function (word) {
      var span = document.createElement("span");
      span.className = "hero-word hero-word--sub";
      span.textContent = word;
      el.appendChild(span);
      el.appendChild(document.createTextNode(" "));
    });
  }

  function revealAll(words, startDelayMs, staggerMs) {
    if (!words.length) return;
    if (prefersReducedMotion()) {
      for (var i = 0; i < words.length; i++) words[i].classList.add("is-shown");
      return;
    }
    for (var j = 0; j < words.length; j++) {
      (function (idx) {
        window.setTimeout(function () {
          if (words[idx]) words[idx].classList.add("is-shown");
        }, startDelayMs + idx * staggerMs);
      })(j);
    }
  }

  function run() {
    var h1 = document.getElementById(TITLE_ID);
    var sub = document.getElementById(SUB_ID);
    if (!h1 || !sub) return;

    var copy = heroCopy();
    try {
      fillTitle(h1, copy.titleLines);
      fillSubtitle(sub, copy.subtitle);

      var titleWords = h1.querySelectorAll(".hero-word:not(.hero-word--sub)");
      var subWords = sub.querySelectorAll(".hero-word--sub");
      var stagger = lang() === "ar" ? 48 : 55;
      var titleStart = 120;
      revealAll(titleWords, titleStart, stagger);
      revealAll(subWords, titleStart + titleWords.length * stagger + 160, Math.round(stagger * 0.85));
    } catch (e) {
      // Keep readable static fallback content if animation fails.
      if (!h1.textContent || !h1.textContent.trim()) {
        h1.textContent = copy.titleLines.join(" ");
      }
      if (!sub.textContent || !sub.textContent.trim()) {
        sub.textContent = copy.subtitle;
      }
    }
  }

  function boot() {
    run();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.addEventListener("nutri-i18n-applied", function () {
    boot();
  });
})();

/* إدارة فتح/إغلاق القائمة الجانبية على الشاشات الصغيرة وتحسين تفاعلها */
(function () {
  var mq = window.matchMedia("(max-width: 1024px)");
  var bound = false;
  var toggle;
  var overlay;
  var sideNav;
  var lastToggleAt = 0;

  function openNav() {
    sideNav.classList.add("is-open");
    overlay.classList.add("is-visible");
    overlay.setAttribute("aria-hidden", "false");
    toggle.setAttribute("aria-expanded", "true");
    document.body.classList.add("nav-open");
  }

  function closeNav() {
    sideNav.classList.remove("is-open");
    overlay.classList.remove("is-visible");
    overlay.setAttribute("aria-hidden", "true");
    toggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("nav-open");
  }

  function onToggleClick() {
    var now = Date.now();
    if (now - lastToggleAt < 320) return;
    lastToggleAt = now;
    if (sideNav.classList.contains("is-open")) closeNav();
    else openNav();
  }

  function onMqChange() {
    if (!mq.matches) closeNav();
  }

  function bindSideLinks() {
    sideNav.querySelectorAll("a").forEach(function (link) {
      if (link.getAttribute("data-nav-link-bound") === "1") return;
      link.setAttribute("data-nav-link-bound", "1");
      link.addEventListener("click", function () {
        if (mq.matches) closeNav();
      });
    });
  }

  function initNav() {
    if (bound) return;
    toggle = document.getElementById("nav-toggle");
    overlay = document.getElementById("nav-overlay");
    sideNav = document.getElementById("side-nav");
    if (!toggle || !overlay || !sideNav) return;

    bound = true;

    toggle.addEventListener("click", onToggleClick, false);

    /* نسخة احتياطية للمس (بعض إصدارات WebKit مع RTL لا ترسل click موثوقاً على الزر) */
    toggle.addEventListener(
      "touchend",
      function (ev) {
        ev.preventDefault();
        onToggleClick();
      },
      { passive: false }
    );
    overlay.addEventListener("click", closeNav);

    bindSideLinks();

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeNav();
    });

    if (mq.addEventListener) mq.addEventListener("change", onMqChange);
    else if (mq.addListener) mq.addListener(onMqChange);

    /* بعد تغيير اللغة: إغلاق القائمة وإعادة ربط الروابط إذا حُدّث الـ DOM لاحقاً */
    window.addEventListener("nutri-i18n-applied", function () {
      if (mq.matches) closeNav();
      bindSideLinks();
    });
  }

  /**
   * تشغيل التهيئة بعد معالجات DOMContentLoaded الأخرى (خصوصاً i18n) حتى يكون dir/lang
   * مطبّقاً قبل أول تفاعل — يقلل أعطال زر القائمة بعد التبديل للعربية.
   */
  function scheduleInit() {
    if (typeof queueMicrotask === "function") {
      queueMicrotask(initNav);
    } else {
      setTimeout(initNav, 0);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleInit);
  } else {
    scheduleInit();
  }
})();

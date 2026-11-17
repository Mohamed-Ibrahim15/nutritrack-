/* إظهار عناصر الصفحة الداخلية بتأثير دخول عند فتح الصفحة */
(function () {
  var main = document.querySelector('main');
  if (!main) return;

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var reveals = main.querySelectorAll('.page-reveal');
  if (!reveals.length) return;

  function markVisible(el) {
    el.classList.add('is-visible');
  }

  function inViewport(el) {
    var r = el.getBoundingClientRect();
    var vh = window.innerHeight || document.documentElement.clientHeight;
    return r.top < vh * 0.92 && r.bottom > -40;
  }

  if (reduceMotion) {
    for (var i = 0; i < reveals.length; i++) markVisible(reveals[i]);
    return;
  }

  for (var j = 0; j < reveals.length; j++) {
    if (inViewport(reveals[j])) markVisible(reveals[j]);
  }
  main.classList.add('js-page-reveal-ready');

  if (!('IntersectionObserver' in window)) {
    for (var k = 0; k < reveals.length; k++) markVisible(reveals[k]);
    return;
  }

  var io = new IntersectionObserver(
    function (entries) {
      for (var e = 0; e < entries.length; e++) {
        if (!entries[e].isIntersecting) continue;
        markVisible(entries[e].target);
        io.unobserve(entries[e].target);
      }
    },
    { root: null, rootMargin: '0px 0px 12% 0px', threshold: 0 }
  );

  for (var m = 0; m < reveals.length; m++) {
    if (!reveals[m].classList.contains('is-visible')) io.observe(reveals[m]);
  }

  function recheckVisible() {
    for (var r = 0; r < reveals.length; r++) {
      if (reveals[r].classList.contains('is-visible')) continue;
      if (inViewport(reveals[r])) markVisible(reveals[r]);
    }
  }
  window.addEventListener('nutri-i18n-applied', recheckVisible);
  window.addEventListener('resize', recheckVisible);
})();

/* مسؤول عن إظهار عناصر الصفحة التعريفية تدريجيا عند التحميل */
(function () {
  var nodes = document.querySelectorAll('.reveal');
  if (!nodes.length) return;
  for (var i = 0; i < nodes.length; i++) {
    nodes[i].classList.add('is-visible');
  }
})();

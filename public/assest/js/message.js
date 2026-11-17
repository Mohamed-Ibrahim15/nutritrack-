/* إدارة تفاعلات صفحة الرسائل/التقارير وتحديث البطاقات بحسب اللغة أو الحالة */
(function () {
  /* ترجمة النصوص داخل صفحة الرسائل/الأطباء */
  function tr(key) {
    return window.NutriI18n && typeof window.NutriI18n.t === "function" ? window.NutriI18n.t(key) : key;
  }

  /* تحميل بيانات كل طبيب المترجمة وربطها ببيانات البطاقة */
  function syncDoctorCards() {
    document.querySelectorAll(".doctor-card[data-doctor]").forEach(function (card) {
      var id = card.getAttribute("data-doctor");
      if (!id) return;
      var p = "doctor." + id + ".";
      card.dataset.name = tr(p + "name");
      card.dataset.year = tr(p + "year");
      card.dataset.specialty = tr(p + "specialty");
      card.dataset.address = tr(p + "address");
      card.dataset.certs = tr(p + "certs");
      card.dataset.article = tr(p + "article");
      card.dataset.features = tr(p + "features");
      var h3 = card.querySelector("h3");
      if (h3) h3.textContent = tr(p + "name");
      var img = card.querySelector(".doctor-card__avatar");
      if (img) img.setAttribute("alt", tr(p + "name"));
    });

    var yl = document.getElementById("doctor-year-label");
    var sl = document.getElementById("doctor-specialty-label");
    var al = document.getElementById("doctor-address-label");
    if (yl) yl.textContent = tr("doctor.modal.year");
    if (sl) sl.textContent = tr("doctor.modal.specialty");
    if (al) al.textContent = tr("doctor.modal.address");
    var closeBtn = document.getElementById("doctor-modal-close");
    if (closeBtn) closeBtn.setAttribute("aria-label", tr("doctor.modal.close"));
  }

  var cards = document.querySelectorAll(".doctor-card");
  var modal = document.getElementById("doctor-modal");
  if (!cards.length || !modal) return;

  var overlay = document.getElementById("doctor-modal-overlay");
  var closeBtn = document.getElementById("doctor-modal-close");
  var modalName = document.getElementById("modal-doctor-name");
  var modalAvatar = document.getElementById("modal-doctor-avatar");
  var modalCerts = document.getElementById("modal-doctor-certs");
  var modalArticle = document.getElementById("modal-doctor-article");
  var modalFeatures = document.getElementById("modal-doctor-features");
  var modalYear = document.getElementById("modal-doctor-year");
  var modalSpecialty = document.getElementById("modal-doctor-specialty");
  var modalAddress = document.getElementById("modal-doctor-address");
  var modalFacebook = document.getElementById("modal-facebook");
  var modalWhatsapp = document.getElementById("modal-whatsapp");
  var modalContact = document.getElementById("modal-contact");
  var lastTrigger = null;

  syncDoctorCards();

  /* فتح مودال الطبيب المختار وملء كل التفاصيل منه */
  function openModal(card) {
    lastTrigger = card;
    modalName.textContent = card.dataset.name || "";
    modalAvatar.src = card.querySelector(".doctor-card__avatar").src;
    modalAvatar.alt = card.dataset.name || "";
    modalCerts.textContent = card.dataset.certs || "";
    modalArticle.textContent = card.dataset.article || "";
    modalYear.textContent = card.dataset.year || "";
    modalSpecialty.textContent = card.dataset.specialty || "";
    modalAddress.textContent = card.dataset.address || "";
    modalFacebook.href = card.dataset.facebook || "#";
    modalWhatsapp.href = card.dataset.whatsapp || "#";
    modalContact.href = card.dataset.contact || "#";

    modalFeatures.innerHTML = "";
    (card.dataset.features || "")
      .split("|")
      .forEach(function (item) {
        var text = item.trim();
        if (!text) return;
        var li = document.createElement("li");
        li.textContent = text;
        modalFeatures.appendChild(li);
      });

    modal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  /* غلق المودال واسترجاع التركيز للبطاقة التي فتحت منه */
  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = "";
    if (lastTrigger) lastTrigger.focus();
  }

  cards.forEach(function (card) {
    card.addEventListener("click", function () {
      openModal(card);
    });

    card.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openModal(card);
      }
    });
  });

  overlay.addEventListener("click", closeModal);
  closeBtn.addEventListener("click", closeModal);
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !modal.hidden) {
      closeModal();
    }
  });

  window.addEventListener("nutri-i18n-applied", function () {
    syncDoctorCards();
    if (!modal.hidden && lastTrigger) {
      openModal(lastTrigger);
    }
  });
})();

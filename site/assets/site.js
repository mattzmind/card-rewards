/* Lucro website: mobile menu, nav border on scroll, scroll reveal, FAQ search, current year. */
(function () {
  var nav = document.querySelector('.nav');
  var btn = document.querySelector('.menu-btn');
  if (btn && nav) {
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }
  if (nav) {
    var onScroll = function () { nav.classList.toggle('scrolled', window.scrollY > 8); };
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }

  /* Fade sections in as they scroll into view (off for reduced motion) */
  var items = document.querySelectorAll('.reveal');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!('IntersectionObserver' in window) || reduce) {
    items.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* Support: filter FAQ as you type */
  var q = document.getElementById('faq-search');
  if (q) {
    var all = document.querySelectorAll('#faq details');
    var none = document.querySelector('.no-results');
    q.addEventListener('input', function () {
      var t = q.value.trim().toLowerCase(), shown = 0;
      all.forEach(function (d) {
        var hit = !t || d.textContent.toLowerCase().indexOf(t) > -1;
        d.hidden = !hit; if (hit) shown++;
        if (t && hit) d.open = true; else if (!t) d.open = false;
      });
      if (none) none.style.display = shown ? 'none' : 'block';
    });
  }

  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();

/* =========================================================
   ALEX FISCHMAN CARDENAS — main.js
   ========================================================= */

(function () {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  const yearEl = $('#footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  function init() {
    if (typeof gsap === 'undefined') { setTimeout(init, 50); return; }
    gsap.registerPlugin(ScrollTrigger);
    initNav();
    initFilter();
    initOverlay();
    initEntrance();
    initScrollReveal();
    initPressToggle();
    initHoverVideo();
    initSizeSlider();
  }

  /* ── Page entrance ───────────────────────────────────── */
  function initEntrance() {
    gsap.fromTo('.hero-name',
      { opacity: 0 },
      { opacity: 1, duration: 1.6, ease: 'power2.out', delay: 0.5 }
    );
    gsap.fromTo('.hero-scroll',
      { opacity: 0 },
      { opacity: 1, duration: 1, ease: 'power2.out', delay: 1.4 }
    );
  }

  /* ── Nav ─────────────────────────────────────────────── */
  function initNav() {
    const nav = $('#site-nav');
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 40);
    }, { passive: true });

    const aboutLink = $('.nav-about-link');
    if (aboutLink) {
      aboutLink.addEventListener('click', e => {
        e.preventDefault();
        $('#about')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    /* Scroll arrow → work section */
    const scrollBtn = $('#hero-scroll');
    if (scrollBtn) {
      scrollBtn.addEventListener('click', () => {
        $('#work')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  /* ── Filter ──────────────────────────────────────────── */
  function initFilter() {
    const btns  = $$('.filter-btn');
    const cards = $$('.project-card');

    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        const filter = btn.dataset.filter;

        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const show = filter === 'all' ? cards : cards.filter(c => c.dataset.category === filter);
        const hide = cards.filter(c => !show.includes(c));

        if (hide.length) {
          gsap.to(hide, {
            opacity: 0, scale: 0.96, duration: 0.2, ease: 'power2.in',
            onComplete: () => hide.forEach(c => c.classList.add('is-hidden')),
          });
        }

        show.forEach(c => c.classList.remove('is-hidden'));
        gsap.fromTo(show,
          { opacity: 0, scale: 0.97 },
          { opacity: 1, scale: 1, duration: 0.35, ease: 'power2.out', stagger: 0.04, delay: hide.length ? 0.18 : 0 }
        );
      });
    });
  }

  /* ── Scroll reveal ───────────────────────────────────── */
  function initScrollReveal() {
    $$('.project-card').forEach((card, i) => {
      gsap.fromTo(card,
        { opacity: 0, y: 20 },
        {
          opacity: 1, y: 0,
          duration: 0.6, ease: 'power3.out',
          delay: (i % 4) * 0.06,
          scrollTrigger: { trigger: card, start: 'top 92%', toggleActions: 'play none none none' }
        }
      );
    });

    $$('.about-bio-col, .about-awards-col, .about-press-col').forEach((col, i) => {
      gsap.fromTo(col,
        { opacity: 0, y: 16 },
        {
          opacity: 1, y: 0,
          duration: 0.7, ease: 'power3.out', delay: i * 0.1,
          scrollTrigger: { trigger: col, start: 'top 88%', toggleActions: 'play none none none' }
        }
      );
    });
  }

  /* ── Overlay ─────────────────────────────────────────── */
  function initOverlay() {
    const overlay   = $('#project-overlay');
    const closeBtn  = $('#overlay-close');
    const videoWrap = $('#overlay-video');
    const barNum    = $('#overlay-bar-num');
    const barTitle  = $('#overlay-bar-title');
    const barYear   = $('#overlay-bar-year');
    const detailsEl = $('#overlay-details');

    if (!overlay) return;

    $$('.project-card').forEach(card => card.addEventListener('click', () => openOverlay(card)));
    closeBtn.addEventListener('click', closeOverlay);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && overlay.classList.contains('is-open')) closeOverlay();
    });

    function openOverlay(card) {
      const d = card.dataset;

      /* Title bar */
      barNum.textContent   = d.num   || '';
      barTitle.textContent = (d.title || '').toUpperCase();
      barYear.textContent  = d.year  || '';

      /* Detailed sections — always visible */
      detailsEl.innerHTML = buildDetails(d);

      /* Video */
      const id = d.vimeo;
      if (id) {
        videoWrap.innerHTML = `<iframe
          src="https://player.vimeo.com/video/${id}?autoplay=1&color=ffffff&title=0&byline=0&portrait=0"
          allow="autoplay; fullscreen; picture-in-picture" allowfullscreen
          title="${d.title || ''}"></iframe>`;
      }

      overlay.classList.add('is-open');
      overlay.setAttribute('aria-hidden', 'false');
      overlay.scrollTop = 0;
      document.body.style.overflow = 'hidden';

      gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power2.out' });
      closeBtn.focus();
    }

    function closeOverlay() {
      gsap.to(overlay, {
        opacity: 0, duration: 0.3, ease: 'power2.in',
        onComplete: () => {
          overlay.classList.remove('is-open');
          overlay.setAttribute('aria-hidden', 'true');
          document.body.style.overflow = '';
          videoWrap.innerHTML = '';
        }
      });
    }

    /* Build the location/format meta block */
    function buildMeta(d) {
      let html = '';
      if (d.location) html += `<div>${d.location}</div>`;
      if (d.coords)   html += `<div>${d.coords}</div>`;
      if (d.format)   html += `<br><div>${d.format}</div>`;
      return html;
    }

    /* Build synopsis / statement / festivals / credits rows */
    function buildDetails(d) {
      let html = '';

      if (d.synopsis) {
        html += row('Synopsis', `<p>${d.synopsis}</p>`);
      }

      if (d.statement) {
        const paras = d.statement.split('|')
          .map(p => `<p>${p.trim()}</p>`).join('');
        html += row("Director's Statement", paras);
      }

      if (d.festivals) {
        const items = d.festivals.split('|')
          .filter(Boolean)
          .map(f => `<p>${f.trim()}</p>`).join('');
        if (items) html += row('Festivals', items);
      }

      let credits = [];
      try { credits = JSON.parse(d.credits || '[]'); } catch (e) {}
      if (credits.length) {
        const grid = credits.map(c => `
          <div class="credit-item">
            <div class="credit-role">${c.role}</div>
            <div class="credit-name">${c.name}</div>
          </div>`).join('');
        html += row('Credits', `<div class="overlay-credits-grid">${grid}</div>`);
      }

      return html;
    }

    function row(label, contentHtml) {
      return `<div class="overlay-row">
        <div class="overlay-row-label">${label}</div>
        <div class="overlay-row-content">${contentHtml}</div>
      </div>`;
    }
  }

  /* ── Press / Awards toggle ───────────────────────────── */
  function makeToggle(btnId, listId) {
    const btn  = $(`#${btnId}`);
    const list = $(`#${listId}`);
    if (!btn || !list) return;

    let open = false;

    btn.addEventListener('click', () => {
      open = !open;
      if (open) {
        list.style.overflow = 'hidden';
        const h = list.scrollHeight;
        gsap.fromTo(list,
          { height: 0, marginTop: 0 },
          { height: h, marginTop: 20, duration: 0.5, ease: 'power3.inOut',
            onComplete: () => { list.style.height = 'auto'; list.style.overflow = 'visible'; } }
        );
        btn.textContent = '− View less';
      } else {
        list.style.overflow = 'hidden';
        gsap.to(list, { height: 0, marginTop: 0, duration: 0.4, ease: 'power3.inOut' });
        btn.textContent = '+ View more';
      }
    });
  }

  function initPressToggle() {
    makeToggle('press-more-btn',  'press-more-list');
    makeToggle('awards-more-btn', 'awards-more-list');
  }

  /* ── Hover video ─────────────────────────────────────── */
  function initHoverVideo() {
    if (window.matchMedia('(hover: none)').matches) return; // skip touch devices

    $$('.project-card').forEach(card => {
      const id = card.dataset.vimeoHover || card.dataset.vimeo;
      if (!id) return;

      let videoEl   = null;
      let leaveTimer = null;

      card.addEventListener('mouseenter', () => {
        clearTimeout(leaveTimer);
        if (videoEl) return;

        videoEl = document.createElement('div');
        videoEl.className = 'card-video';
        videoEl.innerHTML = `<iframe
          src="https://player.vimeo.com/video/${id}?background=1&autoplay=1&loop=1&muted=1&autopause=0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowfullscreen title="" frameborder="0"></iframe>`;
        card.querySelector('.card-media').appendChild(videoEl);

        // Fade in after iframe has had time to load
        setTimeout(() => { if (videoEl) videoEl.classList.add('is-visible'); }, 500);
      });

      card.addEventListener('mouseleave', () => {
        if (!videoEl) return;
        videoEl.classList.remove('is-visible');
        const el = videoEl;
        videoEl = null;
        leaveTimer = setTimeout(() => el.remove(), 650);
      });
    });
  }

  /* ── Size slider ─────────────────────────────────────── */
  function initSizeSlider() {
    const slider = $('#size-slider');
    if (!slider) return;

    const grid = $('.project-grid');

    function applySize(val) {
      // val 0 → small cards (many cols, ~140px min), val 100 → big cards (few cols, ~700px min)
      const minW = Math.round(140 + (val / 100) * (700 - 140));
      grid.style.gridTemplateColumns = `repeat(auto-fill, minmax(${minW}px, 1fr))`;
    }

    slider.addEventListener('input', () => applySize(+slider.value));
    applySize(+slider.value);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

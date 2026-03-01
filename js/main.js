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
    initResponsiveImages();
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

    function navScrollTo(targetId) {
      const ov = $('#project-overlay');

      if (ov?.classList.contains('is-open')) {
        // Restore scroll and jump to destination while overlay is still covering the page
        document.body.style.overflow = '';
        document.querySelector(targetId)?.scrollIntoView({ behavior: 'instant', block: 'start' });

        // Then fade the overlay away to reveal the page already in position
        gsap.to(ov, {
          opacity: 0, duration: 0.4, ease: 'power2.inOut',
          onComplete: () => {
            ov.classList.remove('is-open');
            ov.setAttribute('aria-hidden', 'true');
            const vw = $('#overlay-video');
            if (vw) vw.innerHTML = '';
          }
        });
      } else {
        document.querySelector(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    const nameLink = $('.nav-name');
    if (nameLink) {
      nameLink.addEventListener('click', e => {
        e.preventDefault();
        navScrollTo('#hero');
      });
    }

    const logoLink = $('.nav-logo');
    if (logoLink) {
      logoLink.addEventListener('click', e => {
        e.preventDefault();
        navScrollTo('#hero');
      });
    }

    const aboutLink = $('.nav-about-link');
    if (aboutLink) {
      aboutLink.addEventListener('click', e => {
        e.preventDefault();
        navScrollTo('#about');
      });
    }

    const filmsLink = $('#nav-films-link');
    if (filmsLink) {
      filmsLink.addEventListener('click', e => {
        e.preventDefault();
        navScrollTo('#work');
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
  function getShow(filter, cards) {
    if (filter === 'all')      return cards;
    if (filter === 'selected') return cards.filter(c => c.dataset.selected === 'true');
    return cards.filter(c => c.dataset.category === filter);
  }

  function initFilter() {
    const btns  = $$('.filter-btn');
    const cards = $$('.project-card');

    // Apply default "selected" filter on load without animation
    const initialShow = getShow('selected', cards);
    cards.forEach(c => {
      if (!initialShow.includes(c)) c.classList.add('is-hidden');
    });

    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        const filter = btn.dataset.filter;

        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const show = getShow(filter, cards);
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
    const videoWrap = $('#overlay-video');
    const barNum    = $('#overlay-bar-num');
    const barTitle  = $('#overlay-bar-title');
    const barYear   = $('#overlay-bar-year');
    const detailsEl  = $('#overlay-details');
    const overlayNav = $('#overlay-nav');
    const overlayMain = $('#overlay-main');
    const allCards   = $$('.project-card');
    let   currentIdx = 0;

    if (!overlay) return;

    $$('.project-card').forEach(card => card.addEventListener('click', () => openOverlay(card)));
    document.addEventListener('keydown', e => {
      if (!overlay.classList.contains('is-open')) return;
      if (e.key === 'Escape') { closeOverlay(); return; }
      if (e.key === 'ArrowRight' && currentIdx < allCards.length - 1) openOverlay(allCards[currentIdx + 1]);
      if (e.key === 'ArrowLeft'  && currentIdx > 0)                  openOverlay(allCards[currentIdx - 1]);
    });

    function openOverlay(card) {
      const alreadyOpen = overlay.classList.contains('is-open');
      currentIdx = allCards.indexOf(card);
      const d = card.dataset;

      /* Title bar */
      barNum.textContent   = d.num   || '';
      barTitle.textContent = (d.title || '').toUpperCase();
      barYear.textContent  = d.year  || '';

      /* Detailed sections — always visible */
      detailsEl.innerHTML = buildDetails(d);
      buildNav(card);

      /* Video */
      const id = d.vimeo;
      if (id) {
        const hashParam = d.vimeoHash ? `&h=${d.vimeoHash}` : '';
        videoWrap.innerHTML = `<iframe
          src="https://player.vimeo.com/video/${id}?autoplay=1${hashParam}&color=ffffff&title=0&byline=0&portrait=0"
          allow="autoplay; fullscreen; picture-in-picture" allowfullscreen
          title="${d.title || ''}"></iframe>`;
      } else {
        videoWrap.innerHTML = '';
      }

      overlay.classList.add('is-open');
      overlay.setAttribute('aria-hidden', 'false');
      if (overlayMain) overlayMain.scrollTop = 0;
      overlay.scrollTop = 0;
      document.body.style.overflow = 'hidden';

      if (!alreadyOpen) {
        gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power2.out' });
      }
    }

    function buildNav(activeCard) {
      if (!overlayNav) return;
      overlayNav.innerHTML = '';
      let activeBtn = null;
      allCards.forEach(card => {
        const btn = document.createElement('button');
        btn.className = 'overlay-nav-item' + (card === activeCard ? ' is-active' : '');
        const sub = card.dataset.categoryLabel || '';
        btn.innerHTML = `<span class="overlay-nav-num">${card.dataset.num || ''}</span>${card.dataset.title || ''}${sub ? `<span class="overlay-nav-sub">${sub}</span>` : ''}`;
        btn.addEventListener('click', () => openOverlay(card));
        overlayNav.appendChild(btn);
        if (card === activeCard) activeBtn = btn;
      });
      if (activeBtn) activeBtn.scrollIntoView({ block: 'nearest' });
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

      if (d.categoryLabel) {
        html += row('Type', `<p>${d.categoryLabel}</p>`);
      }

      if (d.about) {
        const paras = d.about.split('|').map(p => `<p>${p.trim()}</p>`).join('');
        html += row('About', paras);
      }

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

      if (d.awards) {
        const items = d.awards.split('|').filter(Boolean).map(a => `<p>${a.trim()}</p>`).join('');
        if (items) html += row('Awards', items);
      }

      if (d.press) {
        const items = d.press.split('|').filter(Boolean).map(p => `<p>${p.trim()}</p>`).join('');
        if (items) html += row('Press', items);
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

        const hash = card.dataset.vimeoHash ? `&h=${card.dataset.vimeoHash}` : '';
        videoEl = document.createElement('div');
        videoEl.className = 'card-video';
        videoEl.innerHTML = `<iframe
          src="https://player.vimeo.com/video/${id}?background=1&autoplay=1&loop=1&muted=1&autopause=0${hash}"
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

  /* ── Responsive card images ──────────────────────────── */
  function initResponsiveImages() {
    const mq   = window.matchMedia('(max-width: 720px)');
    const imgs = $$('.card-img');

    imgs.forEach(img => {
      const raw = img.style.backgroundImage.replace(/url\(['"]?(.+?)['"]?\)/i, '$1');
      if (!raw) return;
      img.dataset.srcDesktop = raw;
      img.dataset.srcMobile  = raw.replace(/(\.\w+)$/, '-sm$1');
    });

    function apply(isMobile) {
      imgs.forEach(img => {
        if (!img.dataset.srcDesktop) return;
        const src = isMobile ? img.dataset.srcMobile : img.dataset.srcDesktop;
        img.style.backgroundImage = `url('${src}')`;
      });
    }

    mq.addEventListener('change', e => apply(e.matches));
    apply(mq.matches);
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

/* =========================================================
   ALEX FISCHMAN CARDENAS — main-alt.js
   Animation sandbox — toggle options with the flags below
   ========================================================= */

(function () {
  'use strict';

  /* ── Feature flags — comment out to disable ─────────────
     Each flag corresponds to one labelled option in index-alt.html */
  const OPTS = {
    cursor:        true,   // A — custom dot + ring cursor
    grain:         true,   // B — animated film grain on hero
    scramble:      true,   // C — hero name letter scramble on load
    clipReveal:    true,   // D — clip-path card reveals on scroll
    overlaySweep:  true,   // E — horizontal line sweep when overlay opens
  };

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

    if (OPTS.cursor)     initCursor();
    if (OPTS.grain)      initGrain();
    if (OPTS.scramble)   initScramble();    else initFadeEntrance();
    if (OPTS.clipReveal) initClipReveal();  else initScrollReveal();

    initAboutReveal();
  }

  /* ── A: Custom cursor ────────────────────────────────── */
  function initCursor() {
    const dot  = $('#cursor-dot');
    const ring = $('#cursor-ring');
    if (!dot || !ring) return;

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx, ry = my;

    const setDot = {
      x: gsap.quickSetter(dot,  'x', 'px'),
      y: gsap.quickSetter(dot,  'y', 'px'),
    };

    document.addEventListener('mousemove', e => {
      mx = e.clientX;
      my = e.clientY;
      setDot.x(mx);
      setDot.y(my);
    });

    // Ring trails the dot with lerp
    gsap.ticker.add(() => {
      rx += (mx - rx) * 0.12;
      ry += (my - ry) * 0.12;
      gsap.set(ring, { x: rx, y: ry });
    });

    // Ring reacts to interactive elements
    const expand = els => els.forEach(el => {
      el.addEventListener('mouseenter', () =>
        gsap.to(ring, { width: 52, height: 52, borderColor: 'rgba(255,255,255,0.7)', duration: 0.35, ease: 'power3.out' })
      );
      el.addEventListener('mouseleave', () =>
        gsap.to(ring, { width: 28, height: 28, borderColor: 'rgba(255,255,255,0.45)', duration: 0.35, ease: 'power3.out' })
      );
    });

    expand($$('.project-card'));
    expand($$('.filter-btn'));
    expand($$('a'));
    expand($$('button'));

    // Hide cursor when leaving window
    document.addEventListener('mouseleave', () => gsap.to([dot, ring], { opacity: 0, duration: 0.2 }));
    document.addEventListener('mouseenter', () => gsap.to([dot, ring], { opacity: 1, duration: 0.2 }));
  }

  /* ── B: Film grain ───────────────────────────────────── */
  function initGrain() {
    const turb = $('#grain-turb');
    if (!turb) return;

    let seed = 0;
    // Tick at ~12fps — enough to feel like film grain, not epileptic
    setInterval(() => {
      seed = (seed + 1) % 200;
      turb.setAttribute('seed', seed);
    }, 85);
  }

  /* ── C: Hero name scramble ───────────────────────────── */
  function initScramble() {
    const el = $('#hero-name');
    if (!el) return;

    const final   = el.dataset.final || el.textContent.trim();
    const chars   = 'abcdefghijklmnopqrstuvwxyz·—';
    const dur     = 1400; // ms total
    const fps     = 30;
    const frames  = Math.round((dur / 1000) * fps);
    let   frame   = 0;

    // Start after a short delay so the page has settled
    setTimeout(() => {
      gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power2.out' });

      const tick = setInterval(() => {
        el.textContent = final.split('').map((ch, i) => {
          if (ch === ' ') return ' ';
          // Each character resolves in sequence from left to right
          const threshold = i / final.length;
          if (frame / frames > threshold) return ch;
          return chars[Math.floor(Math.random() * chars.length)];
        }).join('');

        frame++;
        if (frame > frames) {
          el.textContent = final;
          clearInterval(tick);
        }
      }, 1000 / fps);

    }, 600);

    // Scroll arrow fades in after scramble settles
    gsap.fromTo('.hero-scroll',
      { opacity: 0 },
      { opacity: 1, duration: 0.8, ease: 'power2.out', delay: 2.2 }
    );
  }

  function initFadeEntrance() {
    gsap.fromTo('#hero-name',
      { opacity: 0 },
      { opacity: 1, duration: 1.6, ease: 'power2.out', delay: 0.5 }
    );
    gsap.fromTo('.hero-scroll',
      { opacity: 0 },
      { opacity: 1, duration: 1, ease: 'power2.out', delay: 1.4 }
    );
  }

  /* ── D: Clip-path card reveals ───────────────────────── */
  function initClipReveal() {
    $$('.project-card').forEach((card, i) => {
      // Set initial state
      gsap.set(card, { clipPath: 'inset(0 0 100% 0)' });

      gsap.to(card, {
        clipPath: 'inset(0 0 0% 0)',
        duration: 0.9,
        ease: 'power3.out',
        delay: (i % 4) * 0.07,
        scrollTrigger: {
          trigger: card,
          start: 'top 90%',
          toggleActions: 'play none none none',
        },
      });
    });
  }

  function initScrollReveal() {
    $$('.project-card').forEach((card, i) => {
      gsap.fromTo(card,
        { opacity: 0, y: 20 },
        {
          opacity: 1, y: 0,
          duration: 0.6, ease: 'power3.out',
          delay: (i % 4) * 0.06,
          scrollTrigger: { trigger: card, start: 'top 92%', toggleActions: 'play none none none' },
        }
      );
    });
  }

  /* ── About reveal (shared) ───────────────────────────── */
  function initAboutReveal() {
    $$('.about-bio-col, .about-awards-col, .about-press-col').forEach((col, i) => {
      gsap.fromTo(col,
        { opacity: 0, y: 16 },
        {
          opacity: 1, y: 0,
          duration: 0.7, ease: 'power3.out', delay: i * 0.1,
          scrollTrigger: { trigger: col, start: 'top 88%', toggleActions: 'play none none none' },
        }
      );
    });
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

        if (OPTS.clipReveal) {
          // Re-run clip reveal for newly shown cards
          gsap.fromTo(show,
            { clipPath: 'inset(0 0 100% 0)' },
            { clipPath: 'inset(0 0 0% 0)', duration: 0.6, ease: 'power3.out', stagger: 0.05, delay: hide.length ? 0.18 : 0 }
          );
        } else {
          gsap.fromTo(show,
            { opacity: 0, scale: 0.97 },
            { opacity: 1, scale: 1, duration: 0.35, ease: 'power2.out', stagger: 0.04, delay: hide.length ? 0.18 : 0 }
          );
        }
      });
    });
  }

  /* ── E: Overlay with line sweep ─────────────────────── */
  function initOverlay() {
    const overlay   = $('#project-overlay');
    const closeBtn  = $('#overlay-close');
    const videoWrap = $('#overlay-video');
    const barNum    = $('#overlay-bar-num');
    const barTitle  = $('#overlay-bar-title');
    const barYear   = $('#overlay-bar-year');
    const moreBtn   = $('#overlay-more-btn');
    const briefDesc = $('#overlay-brief-desc');
    const briefMeta = $('#overlay-brief-meta');
    const detailsEl = $('#overlay-details');
    const sweep     = $('#overlay-sweep');

    if (!overlay) return;

    $$('.project-card').forEach(card => card.addEventListener('click', () => openOverlay(card)));
    closeBtn.addEventListener('click', closeOverlay);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && overlay.classList.contains('is-open')) closeOverlay();
    });

    moreBtn.addEventListener('click', () => {
      const isOpen = detailsEl.classList.contains('is-open');
      if (isOpen) {
        gsap.to(detailsEl, {
          height: 0, duration: 0.4, ease: 'power3.inOut',
          onComplete: () => detailsEl.classList.remove('is-open'),
        });
        moreBtn.textContent = 'More Info';
        moreBtn.classList.remove('is-open');
      } else {
        detailsEl.classList.add('is-open');
        const h = detailsEl.scrollHeight;
        gsap.fromTo(detailsEl,
          { height: 0 },
          { height: h, duration: 0.5, ease: 'power3.inOut',
            onComplete: () => { detailsEl.style.height = 'auto'; } }
        );
        moreBtn.textContent = 'Less Info';
        moreBtn.classList.add('is-open');
      }
    });

    function openOverlay(card) {
      const d = card.dataset;

      barNum.textContent   = d.num   || '';
      barTitle.textContent = (d.title || '').toUpperCase();
      barYear.textContent  = d.year  || '';
      briefDesc.textContent = d.desc || '';
      briefMeta.innerHTML   = buildMeta(d);
      detailsEl.innerHTML   = buildDetails(d);
      detailsEl.classList.remove('is-open');
      detailsEl.style.height = '0';
      moreBtn.textContent   = 'More Info';
      moreBtn.classList.remove('is-open');

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

      if (OPTS.overlaySweep && sweep) {
        // Line sweeps left→right, then content fades in
        gsap.set(sweep, { opacity: 1, x: 0 });
        gsap.to(sweep, {
          x: window.innerWidth,
          duration: 0.5,
          ease: 'power3.inOut',
          onComplete: () => gsap.set(sweep, { opacity: 0, x: 0 }),
        });
        gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power2.out', delay: 0.18 });
      } else {
        gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power2.out' });
      }

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
        },
      });
    }

    function buildMeta(d) {
      let html = '';
      if (d.location) html += `<div>${d.location}</div>`;
      if (d.format)   html += `<br><div>${d.format}</div>`;
      return html;
    }

    function buildDetails(d) {
      let html = '';
      if (d.synopsis)  html += row('Synopsis', `<p>${d.synopsis}</p>`);
      if (d.statement) {
        const paras = d.statement.split('|').map(p => `<p>${p.trim()}</p>`).join('');
        html += row("Director's Statement", paras);
      }
      if (d.festivals) {
        const items = d.festivals.split('|').filter(Boolean).map(f => `<p>${f.trim()}</p>`).join('');
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

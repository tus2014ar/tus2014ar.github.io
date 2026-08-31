// Mobile nav toggle
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');

navToggle.addEventListener('click', () => {
  navLinks.classList.toggle('open');
});

navLinks.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => navLinks.classList.remove('open'));
});

// ============ Nav breadcrumb: current section indicator ============
// Purely decorative — if this never runs, the nav logo just stays on
// its default "home" text; nothing else depends on it.
const navCurrent = document.getElementById('navCurrent');
if (navCurrent) {
  const sections = document.querySelectorAll('#top, main > section');
  window.addEventListener(
    'scroll',
    () => {
      let current = 'home';
      sections.forEach((sec) => {
        const rect = sec.getBoundingClientRect();
        if (rect.top < 120) current = sec.id === 'top' ? 'home' : sec.id;
      });
      navCurrent.textContent = current;
    },
    { passive: true }
  );
}

// ============ Neural-network particle background (hero) ============
// Hand-rolled, zero-dependency canvas animation — no CDN library involved,
// so there's nothing that can silently fail to load or fail to render.
// Purely decorative: if this block errors or reduced-motion is set, the
// container just stays an empty, invisible div — nothing else depends on it.
(function initParticleNet() {
  const host = document.getElementById('tsparticles');
  if (!host || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
  host.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const isDark = matchMedia('(prefers-color-scheme: dark)').matches;
  const dotColor = isDark ? '91, 140, 255' : '37, 99, 235';   // --accent
  const dotAlpha = isDark ? 0.75 : 0.55;
  const linkAlphaMax = isDark ? 0.35 : 0.22;
  const LINK_DIST = 140;
  const SPEED = 0.18;
  const INTERACT_RADIUS = 220;

  let w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
  let particles = [];
  let mouse = { x: -9999, y: -9999 };

  function resize() {
    const rect = host.getBoundingClientRect();
    w = rect.width;
    h = rect.height;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = Math.max(24, Math.min(70, Math.round((w * h) / 16000)));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * SPEED,
      vy: (Math.random() - 0.5) * SPEED,
      r: 1 + Math.random() * 1.6,
    }));
  }

  function step() {
    ctx.clearRect(0, 0, w, h);

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;

      // Pull toward the cursor, stronger the closer a particle is, so the
      // network visibly reaches toward the pointer instead of a flat nudge.
      const dx = mouse.x - p.x, dy = mouse.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist < INTERACT_RADIUS && dist > 0.01) {
        const pull = (1 - dist / INTERACT_RADIUS) * 0.02;
        p.vx += (dx / dist) * pull;
        p.vy += (dy / dist) * pull;
      }
      const speed = Math.hypot(p.vx, p.vy);
      const maxSpeed = SPEED * 2.6;
      if (speed > maxSpeed) { p.vx = (p.vx / speed) * maxSpeed; p.vy = (p.vy / speed) * maxSpeed; }
    }

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i], b = particles[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < LINK_DIST) {
          ctx.strokeStyle = `rgba(${dotColor}, ${linkAlphaMax * (1 - d / LINK_DIST)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    ctx.fillStyle = `rgba(${dotColor}, ${dotAlpha})`;
    for (const p of particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(step);
  }

  resize();
  requestAnimationFrame(step);
  window.addEventListener('resize', resize, { passive: true });
  host.addEventListener('pointermove', (e) => {
    const rect = host.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });
  host.addEventListener('pointerleave', () => { mouse.x = -9999; mouse.y = -9999; });
})();

// ============ Cursor-follow glow ============
// Purely decorative — if this never runs, the glow div just stays invisible
// (opacity: 0 by default in CSS), it never hides any real content.
const glow = document.getElementById('cursorGlow');
if (glow && matchMedia('(hover: hover)').matches) {
  window.addEventListener('pointermove', (e) => {
    glow.style.setProperty('--mx', `${e.clientX}px`);
    glow.style.setProperty('--my', `${e.clientY + window.scrollY}px`);
    glow.classList.add('active');
  }, { passive: true });
  document.addEventListener('pointerleave', () => glow.classList.remove('active'));
}

// ============ Count-up numbers ============
// Safety: the target element's textContent is ALWAYS the real, correct value
// from the HTML. If this code never runs (or the observer never fires), the
// real value is what's already on screen — nothing is ever blanked or zeroed
// out ahead of time. This only animates FROM a computed start, it never hides.
function animateCountUp(el) {
  const original = el.textContent.trim();
  const match = original.match(/^([^\d]*)([\d,]+(?:\.\d+)?)(.*)$/);
  if (!match) return; // not a numeric label (e.g. plain text) — leave as-is

  const [, prefix, numStr, suffix] = match;
  const hasComma = numStr.includes(',');
  const decimals = numStr.includes('.') ? numStr.split('.')[1].length : 0;
  const target = parseFloat(numStr.replace(/,/g, ''));
  if (!isFinite(target) || target === 0) return;

  const duration = 1400;
  const start = performance.now();

  function frame(now) {
    const elapsed = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - elapsed, 3); // ease-out cubic
    const current = target * eased;

    let display = decimals > 0 ? current.toFixed(decimals) : Math.round(current).toString();
    if (hasComma) display = Number(display).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

    el.textContent = `${prefix}${display}${suffix}`;

    if (elapsed < 1) {
      requestAnimationFrame(frame);
    } else {
      el.textContent = original; // guarantee exact original string on completion
    }
  }
  requestAnimationFrame(frame);
}

const countTargets = document.querySelectorAll('.impact-number, .project-stats strong');
if ('IntersectionObserver' in window && countTargets.length) {
  const countObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCountUp(entry.target);
          countObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.4 }
  );
  countTargets.forEach((el) => countObserver.observe(el));
}

// ============ Hero terminal: typewriter git/CI workflow ============
// Purely decorative — the terminal window and title bar are fully visible
// on their own (real CSS, no JS needed). If this script never runs, the
// terminal simply sits empty below its title bar; nothing else on the
// page depends on it.
const termOut = document.getElementById('terminalOutput');
if (termOut) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Each step: a typed command line, followed by instantly-printed output lines.
  const script = [
    {
      cmd: '$ whoami',
      output: [
        { t: 'I ship efficient, scalable data solutions with real-world impact to' },
        { t: 'production, most recently as a Data Science Intern at Barton Malow.' },
        { t: '5+ years of experience in Data Engineering and Analytics across Oracle' },
        { t: 'and Accenture, currently building deeper Data Science foundations at' },
        { t: 'Penn State.' },
      ],
    },
    {
      cmd: '$ git checkout -b add-databricks-cost-analytics',
      output: [{ t: "Switched to a new branch 'add-databricks-cost-analytics'", cls: 't-dim' }],
    },
    {
      cmd: '$ git commit -m "Add Cost Analytics & FinOps framework"',
      output: [
        { t: '[add-databricks-cost-analytics 7a3f9c2] Add Cost Analytics & FinOps framework', cls: 't-dim' },
        { t: ' 12 files changed, 4875 insertions(+)', cls: 't-dim' },
      ],
    },
    {
      cmd: '$ git push -u origin add-databricks-cost-analytics',
      output: [{ t: "branch set up to track 'origin/add-databricks-cost-analytics'", cls: 't-dim' }],
    },
    {
      cmd: '$ gh pr create --title "Add Cost Analytics & FinOps framework"',
      output: [{ t: 'https://github.com/tus2014ar/databricks-cost-analytics/pull/1', cls: 't-url' }],
    },
    {
      cmd: '$ gh pr checks 1',
      output: [{ t: '✓ lint-and-validate   pass', cls: 't-ok' }],
    },
    {
      cmd: '$ gh pr merge --merge',
      output: [{ t: '✓ Merged pull request #1 into main', cls: 't-ok' }],
    },
  ];

  const TYPE_MS = 52;
  const LINE_PAUSE_MS = 400;
  const STEP_PAUSE_MS = 700;
  const LOOP_PAUSE_MS = 4200;

  let cancelled = false;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function typeLine(text, cls) {
    const span = document.createElement('span');
    if (cls) span.className = cls;
    termOut.appendChild(span);
    for (let i = 0; i < text.length; i++) {
      if (cancelled) return;
      span.innerHTML = esc(text.slice(0, i + 1));
      await sleep(TYPE_MS);
    }
    termOut.appendChild(document.createElement('br'));
  }

  function printLine(text, cls) {
    const span = document.createElement('span');
    if (cls) span.className = cls;
    span.innerHTML = esc(text);
    termOut.appendChild(span);
    termOut.appendChild(document.createElement('br'));
  }

  async function runScript() {
    while (!cancelled) {
      termOut.innerHTML = '';
      for (const step of script) {
        if (cancelled) return;
        await typeLine(step.cmd, 't-prompt');
        await sleep(LINE_PAUSE_MS);
        step.output.forEach((line) => printLine(line.t, line.cls));
        termOut.parentElement.scrollTop = termOut.parentElement.scrollHeight;
        await sleep(STEP_PAUSE_MS);
      }
      await sleep(LOOP_PAUSE_MS);
    }
  }

  // Only run while the terminal is actually visible on screen.
  if ('IntersectionObserver' in window) {
    const termObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && termOut.dataset.started !== 'true') {
          termOut.dataset.started = 'true';
          runScript();
        }
      });
    }, { threshold: 0.3 });
    termObserver.observe(termOut.closest('.terminal'));
  } else {
    runScript();
  }
}

// ============ DQX live monitor: scrolling telemetry waveform ============
// The static polyline/polygon already in the HTML is a real, complete
// waveform on its own — if this script never runs (or reduced-motion is
// set), the widget just stays on that static shape. This only makes it
// scroll like a live feed on top of that baseline.
(function initMonitorWave() {
  const line = document.querySelector('.monitor-line');
  const area = document.querySelector('.monitor-area');
  const head = document.querySelector('.monitor-live-dot');
  if (!line || !area || !head || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const initial = line.getAttribute('points').trim().split(/\s+/).map((p) => {
    const [, y] = p.split(',');
    return parseFloat(y);
  });
  const points = initial.slice();
  const N = points.length;
  const W = 300, H = 100;
  const STEP = W / (N - 1);
  const BASELINE = 76, SPIKE_TOP = 32;

  let target = BASELINE;
  let ticksToNewTarget = 0;

  function nextValue(prev) {
    if (ticksToNewTarget <= 0) {
      target = Math.random() < 0.22 ? SPIKE_TOP + Math.random() * 18 : BASELINE - Math.random() * 6;
      ticksToNewTarget = 3 + Math.floor(Math.random() * 4);
    }
    ticksToNewTarget--;
    const next = prev + (target - prev) * 0.35 + (Math.random() - 0.5) * 3;
    return Math.max(SPIKE_TOP, Math.min(BASELINE + 4, next));
  }

  function render() {
    const linePts = points.map((y, i) => `${(i * STEP).toFixed(1)},${y.toFixed(1)}`).join(' ');
    line.setAttribute('points', linePts);
    area.setAttribute('points', `0,${H} ${linePts} ${W},${H}`);
    head.setAttribute('cx', ((N - 1) * STEP).toFixed(1));
    head.setAttribute('cy', points[N - 1].toFixed(1));
  }

  let intervalId = null;
  function tick() {
    points.shift();
    points.push(nextValue(points[points.length - 1]));
    render();
  }

  const wave = document.querySelector('.monitor-wave');
  if ('IntersectionObserver' in window) {
    const waveObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !intervalId) {
          intervalId = setInterval(tick, 550);
        } else if (!entry.isIntersecting && intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      });
    }, { threshold: 0.2 });
    waveObserver.observe(wave);
  } else {
    intervalId = setInterval(tick, 550);
  }
})();

// ============ Project tabs ============
// The default-active tab's cards carry class="show" directly in the HTML,
// so they're visible even if this script never runs; only switching tabs
// requires JS.
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    const cat = tab.dataset.cat;
    document.querySelectorAll('.project-card').forEach((card) => {
      card.classList.toggle('show', card.dataset.cat === cat);
    });
  });
});

// ============ Magnetic tilt on project cards ============
// Decorative transform only — cards are fully visible and readable with or
// without this; it never touches opacity or display.
if (matchMedia('(hover: hover)').matches) {
  document.querySelectorAll('.project-card').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.setProperty('--ry', `${px * 8}deg`);
      card.style.setProperty('--rx', `${-py * 8}deg`);
    });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  });
}

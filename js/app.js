(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  $("#year").textContent = new Date().getFullYear();

  /* ---------- Navbar, progress bar, back-to-top, active link ---------- */
  const nav = $("#nav");
  const progress = $(".scroll-progress");
  const toTop = $("#toTop");
  const links = $$('.nav-links a[href^="#"]');
  const sections = links.map((a) => $(a.getAttribute("href"))).filter(Boolean);
  const timeline = $("#timeline");

  function onScroll() {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    nav.classList.toggle("scrolled", y > 30);
    toTop.classList.toggle("show", y > 700);

    let current = "";
    for (const s of sections) if (s.getBoundingClientRect().top <= innerHeight * 0.35) current = s.id;
    links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + current));

    if (timeline) {
      const r = timeline.getBoundingClientRect();
      const pct = Math.min(Math.max((innerHeight * 0.6 - r.top) / r.height, 0), 1);
      timeline.style.setProperty("--fill", (pct * 100).toFixed(1) + "%");
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  const menuBtn = $("#menuBtn");
  const navLinks = $("#navLinks");
  function setMenu(open) {
    menuBtn.classList.toggle("open", open);
    navLinks.classList.toggle("open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    document.body.style.overflow = open ? "hidden" : "";
  }
  menuBtn.addEventListener("click", () => setMenu(!navLinks.classList.contains("open")));
  navLinks.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });

  /* ---------- Reveal on scroll (staggered per group) ---------- */
  const groups = new Map();
  $$(".reveal").forEach((el) => {
    const parent = el.parentElement;
    const i = groups.get(parent) || 0;
    groups.set(parent, i + 1);
    el.style.setProperty("--d", Math.min(i * 0.08, 0.5) + "s");
  });
  if (reduceMotion || !("IntersectionObserver" in window)) {
    $$(".reveal").forEach((el) => el.classList.add("in"));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    $$(".reveal").forEach((el) => io.observe(el));
  }

  /* ---------- Animated counters ---------- */
  const counters = $$(".num[data-count]");
  function runCounter(el) {
    const target = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimals || "0", 10);
    const suffix = el.dataset.suffix || "";
    if (reduceMotion) { el.textContent = target.toFixed(decimals) + suffix; return; }
    const start = performance.now(), dur = 1600;
    (function step(now) {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * eased).toFixed(decimals) + (p === 1 ? suffix : "");
      if (p < 1) requestAnimationFrame(step);
    })(start);
  }
  if ("IntersectionObserver" in window) {
    const co = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { runCounter(en.target); co.unobserve(en.target); } });
    }, { threshold: 0.6 });
    counters.forEach((el) => co.observe(el));
  } else counters.forEach(runCounter);

  /* ---------- Cursor glow, card spotlight, 3D tilt (desktop only) ---------- */
  if (finePointer && !reduceMotion) {
    const glow = $(".cursor-glow");
    let gx = 0, gy = 0, tx = 0, ty = 0, glowing = false;
    window.addEventListener("mousemove", (e) => {
      tx = e.clientX; ty = e.clientY;
      if (!glowing) { glowing = true; glow.style.opacity = "1"; requestAnimationFrame(moveGlow); }
    }, { passive: true });
    function moveGlow() {
      gx += (tx - gx) * 0.12; gy += (ty - gy) * 0.12;
      glow.style.transform = `translate(${gx - 260}px, ${gy - 260}px)`;
      requestAnimationFrame(moveGlow);
    }
    glow.style.left = "0"; glow.style.top = "0";

    $$(".skill-card").forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", e.clientX - r.left + "px");
        card.style.setProperty("--my", e.clientY - r.top + "px");
      });
    });

    $$(".tilt").forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `rotateY(${px * 10}deg) rotateX(${-py * 10}deg) translateY(-6px)`;
      });
      card.addEventListener("mouseleave", () => { card.style.transform = ""; });
    });
  }

  /* ---------- Certificate lightbox ---------- */
  const lb = $("#lightbox"), lbImg = $("#lightboxImg"), lbCap = $("#lightboxCaption");
  let lastFocus = null;
  function openLb(src, title) {
    lastFocus = document.activeElement;
    lbImg.src = src; lbImg.alt = title; lbCap.textContent = title;
    lb.hidden = false; document.body.style.overflow = "hidden";
    $("#lightboxClose").focus();
  }
  function closeLb() {
    lb.hidden = true; document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }
  $$(".cert").forEach((b) => b.addEventListener("click", () => openLb(b.dataset.img, b.dataset.title)));
  $("#lightboxClose").addEventListener("click", closeLb);
  lb.addEventListener("click", (e) => { if (e.target === lb) closeLb(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { if (!lb.hidden) closeLb(); else if (navLinks.classList.contains("open")) setMenu(false); }
  });

  /* ---------- Copy email ---------- */
  const copyBtn = $("#copyEmail");
  copyBtn.addEventListener("click", async () => {
    const label = copyBtn.querySelector("span");
    const icon = copyBtn.querySelector("i");
    try {
      await navigator.clipboard.writeText(copyBtn.dataset.email);
      label.textContent = "Copied!";
      icon.className = "fa-solid fa-check";
    } catch {
      window.location.href = "mailto:" + copyBtn.dataset.email;
      return;
    }
    setTimeout(() => { label.textContent = "Copy Email"; icon.className = "fa-regular fa-copy"; }, 2000);
  });
})();

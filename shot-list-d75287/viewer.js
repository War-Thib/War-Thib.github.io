
(() => {
  const vp = document.getElementById("lb-viewport");
  const board = document.getElementById("lb-board");
  const lightbox = document.getElementById("lb-lightbox");
  const LB_SIZE = { w: +board.dataset.w, h: +board.dataset.h };
  const TOP = 48;
  let x = 0, y = 0, s = 1;
  const apply = () => { board.style.transform = "translate(" + x + "px," + y + "px) scale(" + s + ")"; };
  const fit = () => {
    const w = innerWidth, h = innerHeight - TOP;
    s = Math.min(w / LB_SIZE.w, h / LB_SIZE.h, 1.5) * 0.96;
    x = (w - LB_SIZE.w * s) / 2; y = TOP + (h - LB_SIZE.h * s) / 2; apply();
  };
  const zoomAt = (px, py, next) => {
    next = Math.min(8, Math.max(0.05, next));
    x = px - (px - x) * (next / s); y = py - (py - y) * (next / s); s = next; apply();
  };
  fit();
  addEventListener("resize", fit);
  document.querySelector(".lb-tools").addEventListener("click", (e) => {
    const z = e.target.closest("[data-zoom]")?.dataset.zoom;
    if (z === "fit") fit();
    else if (z) zoomAt(innerWidth / 2, innerHeight / 2, s * (z === "in" ? 1.4 : 1 / 1.4));
  });
  vp.addEventListener("wheel", (e) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) zoomAt(e.clientX, e.clientY, s * Math.exp(-e.deltaY / 100));
    else { x -= e.deltaX; y -= e.deltaY; apply(); }
  }, { passive: false });

  // Drag to pan (mouse or one finger), pinch to zoom; a tap that did not move is a click.
  const pts = new Map();
  let start = null, moved = false, pinch = null;
  vp.addEventListener("pointerdown", (e) => {
    if (e.target.closest("video")) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 1) { start = { x: e.clientX, y: e.clientY }; moved = false; }
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, s };
      moved = true;
    }
    vp.setPointerCapture(e.pointerId);
  });
  vp.addEventListener("pointermove", (e) => {
    const p = pts.get(e.pointerId);
    if (!p) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pts.size === 2) {
      const [a, b] = [...pts.values()];
      zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, (pinch.s * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.d);
      return;
    }
    if (!moved && Math.hypot(e.clientX - start.x, e.clientY - start.y) < 6) return;
    moved = true;
    vp.classList.add("lb-dragging");
    x += e.clientX - p.x; y += e.clientY - p.y; apply();
  });
  const end = (e) => {
    if (!pts.delete(e.pointerId)) return;
    if (pts.size < 2) pinch = null;
    if (pts.size === 0) vp.classList.remove("lb-dragging");
    if (e.type === "pointerup" && !moved && pts.size === 0) tap(e);
  };
  vp.addEventListener("pointerup", end);
  vp.addEventListener("pointercancel", end);

  function tap(e) {
    const target = document.elementFromPoint(e.clientX, e.clientY);
    if (!target) return;
    const sub = target.closest("[data-export-board]")?.dataset.exportBoard;
    if (sub) return void (location.href = "b-" + sub + ".html");
    const link = target.closest("a[href]")?.href || target.closest("[data-open-link]")?.dataset.openLink;
    if (link) return void open(link, "_blank", "noopener");
    const play = target.closest("[data-video-src]");
    if (play) {
      const frame = play.parentElement;
      const video = document.createElement("video");
      video.src = play.dataset.videoSrc; video.controls = true; video.autoplay = true; video.playsInline = true;
      video.style.cssText = "position:absolute;inset:0;width:100%;height:100%;background:#000";
      frame.appendChild(video);
      return;
    }
    const img = target.closest("img");
    if (img) {
      lightbox.innerHTML = "";
      const big = new Image(); big.src = img.src; big.alt = img.alt;
      lightbox.appendChild(big); lightbox.hidden = false;
    }
  }
  // Links are opened by tap(); keep the browser from following them twice.
  board.addEventListener("click", (e) => { if (e.target.closest("a")) e.preventDefault(); });
  lightbox.addEventListener("click", () => { lightbox.hidden = true; });
  addEventListener("keydown", (e) => { if (e.key === "Escape") lightbox.hidden = true; });
})();

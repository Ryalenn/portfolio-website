// ascii-wave.js — fond de nuages ASCII plein écran

(function () {
  const canvas = document.getElementById("ascii-canvas");
  if (!canvas) {
    console.error("ascii-canvas introuvable");
    return;
  }

  const CHAR_WIDTH = 6;
  const CHAR_HEIGHT = 12;

  let COLS = 0;
  let ROWS = 0;
  let t = 0;

  function computeGridSize() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    COLS = Math.max(40, Math.floor(w / CHAR_WIDTH) + 20);
    ROWS = Math.max(24, Math.floor(h / CHAR_HEIGHT) + 20);
  }

  function valueToChar(v) {
    if (v < 0.35) return " ";
    if (v < 0.50) return ".";
    if (v < 0.60) return ",";
    if (v < 0.70) return ":";
    if (v < 0.80) return ";";
    if (v < 0.90) return "*";
    return "#";
  }

  function frame() {
    if (!COLS || !ROWS) return;

    let output = "";

    for (let y = 0; y < ROWS; y++) {
      const ny = y / ROWS;

      for (let x = 0; x < COLS; x++) {
        const nx = x / COLS;

        const cx = nx - 0.5;
        const cy = ny - 0.5;
        const r = Math.sqrt(cx * cx + cy * cy);
        const theta = Math.atan2(cy, cx);

        const wx =
          nx +
          0.10 * Math.sin(2 * Math.PI * (ny * 1.3 + t * 0.04)) +
          0.05 * Math.sin(2 * Math.PI * (theta * 1.5 - t * 0.03));

        const wy =
          ny +
          0.10 * Math.sin(2 * Math.PI * (nx * 1.1 - t * 0.035)) +
          0.04 * Math.sin(2 * Math.PI * (r * 2.0 + t * 0.02));

        const s1 = Math.sin(2 * Math.PI * (wx * 1.2 + t * 0.05));
        const s2 = Math.sin(2 * Math.PI * (wy * 1.8 - t * 0.035));
        const s3 = Math.sin(2 * Math.PI * ((wx + wy) * 1.3 + t * 0.03));
        const s4 = Math.sin(2 * Math.PI * (r * 2.6 - t * 0.02));
        const s5 = Math.sin(2 * Math.PI * (wx * 3.2 - wy * 2.3 + t * 0.04));

        let v =
          0.45 +
          0.30 * s1 +
          0.26 * s2 +
          0.22 * s3 +
          0.18 * s4 +
          0.12 * s5;

        const stripe =
          0.5 + 0.5 * Math.sin(2 * Math.PI * (wx * 0.7 - wy * 0.9 + t * 0.015));
        const mask = Math.pow(stripe, 2.4);

        v *= mask;

        v = 0.5 + 0.5 * Math.tanh(v * 1.2);
        v = Math.max(0, Math.min(1, v));

        output += valueToChar(v);
      }

      if (y < ROWS - 1) output += "\n";
    }

    canvas.textContent = output;
  }

  let lastTime = null;
  let acc = 0;
  const TARGET_FPS = 20;
  const FRAME_INTERVAL = 1000 / TARGET_FPS;

  function loop(now) {
    if (lastTime == null) lastTime = now;
    const dtMs = now - lastTime;
    lastTime = now;

    acc += dtMs;

    if (acc >= FRAME_INTERVAL) {
      const dt = acc / 1000;
      acc = 0;

      t += dt * 0.75;

      frame();
    }

    requestAnimationFrame(loop);
  }

  function start() {
    computeGridSize();
    frame();
    requestAnimationFrame(loop);
  }

  window.addEventListener("resize", () => {
    computeGridSize();
    frame();
  });

  start();
})();

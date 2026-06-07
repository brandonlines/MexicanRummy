// ===== src/js/ui/confetti.js =====
// No dependency, self-stopping, aria-hidden canvas, never focusable, hard no-op
// under reduced motion. Frees its backing store on finish so it never blocks taps.
export function burstConfetti(canvas, { count = 120, duration = 2200 } = {}) {
  if (!canvas) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const ctx = canvas.getContext('2d'); const dpr = window.devicePixelRatio || 1;
  const W = canvas.width = innerWidth * dpr, H = canvas.height = innerHeight * dpr;
  const cs = getComputedStyle(document.documentElement);
  const palette = ['--color-primary', '--color-accent', '--color-success', '--color-secondary']
    .map(v => cs.getPropertyValue(v).trim()).filter(Boolean);   // theme-driven (cozy=gold/red/green)
  const P = Array.from({ length: count }, () => ({
    x: Math.random() * W, y: -20 * dpr - Math.random() * H * 0.3, r: (4 + Math.random() * 5) * dpr,
    vx: (-1 + Math.random() * 2) * dpr, vy: (2 + Math.random() * 3) * dpr,
    rot: Math.random() * Math.PI, vr: -0.2 + Math.random() * 0.4,
    c: palette[(Math.random() * palette.length) | 0] || '#f6c75a'
  }));
  const start = performance.now();
  (function frame(now) {
    const t = now - start; ctx.clearRect(0, 0, W, H);
    for (const p of P) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.03 * dpr; p.rot += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c;
      ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.6); ctx.restore();
    }
    if (t < duration) requestAnimationFrame(frame);
    else { ctx.clearRect(0, 0, W, H); canvas.width = canvas.height = 0; } // free backing store on iPad
  })(start);
}

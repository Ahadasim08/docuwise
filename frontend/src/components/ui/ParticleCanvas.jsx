import { useEffect, useRef } from "react";

const PARTICLE_COUNT = 60;
const STAR_COUNT = 80;
const REPEL_RADIUS = 180;
const SPRING = 0.04;
const DAMPING = 0.88;
const PARTICLE_RADIUS = 2.5;

class Particle {
  constructor(x, y, r, color) {
    this.ox = x; this.oy = y;
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.r = r;
    this.color = color;
  }

  update(mx, my) {
    const dx = this.x - mx;
    const dy = this.y - my;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < REPEL_RADIUS && dist > 0) {
      const force = (REPEL_RADIUS - dist) / REPEL_RADIUS;
      this.vx += (dx / dist) * force * 6;
      this.vy += (dy / dist) * force * 6;
    }
    // spring back to origin
    this.vx += (this.ox - this.x) * SPRING;
    this.vy += (this.oy - this.y) * SPRING;
    this.vx *= DAMPING;
    this.vy *= DAMPING;
    this.x += this.vx;
    this.y += this.vy;
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
  }
}

class Star {
  constructor(w, h) {
    this.reset(w, h);
  }

  reset(w, h) {
    this.x = Math.random() * w;
    this.y = Math.random() * h;
    this.r = Math.random() * 0.8 + 0.2;
    this.alpha = Math.random() * 0.4 + 0.1;
    this.speed = Math.random() * 0.15 + 0.05;
    this.w = w; this.h = h;
  }

  update() {
    this.y -= this.speed;
    if (this.y < 0) { this.y = this.h; this.x = Math.random() * this.w; }
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${this.alpha})`;
    ctx.fill();
  }
}

export default function ParticleCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let particles = [];
    let stars = [];
    let mouse = { x: -9999, y: -9999 };
    let raf;
    let glowPhase = 0;
    let w, h;

    function resize() {
      w = canvas.width = canvas.offsetWidth;
      h = canvas.height = canvas.offsetHeight;
      init();
    }

    function init() {
      particles = [];
      stars = [];

      // Grid of particles
      const cols = 8;
      const rows = Math.ceil(PARTICLE_COUNT / cols);
      const padX = w * 0.15;
      const padY = h * 0.15;
      const gapX = (w - padX * 2) / (cols - 1);
      const gapY = (h - padY * 2) / (rows - 1);

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = padX + col * gapX + (Math.random() - 0.5) * 20;
        const y = padY + row * gapY + (Math.random() - 0.5) * 20;
        const brightness = 40 + Math.floor(Math.random() * 40);
        const alpha = 0.3 + Math.random() * 0.4;
        particles.push(new Particle(x, y, PARTICLE_RADIUS * (0.6 + Math.random() * 0.8), `rgba(251,191,36,${alpha})`));
      }

      for (let i = 0; i < STAR_COUNT; i++) stars.push(new Star(w, h));
    }

    function drawGlow(t) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.002);
      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(w, h) * (0.35 + pulse * 0.08);
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, `rgba(251,191,36,${0.04 + pulse * 0.03})`);
      grad.addColorStop(0.5, `rgba(251,191,36,${0.01 + pulse * 0.01})`);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    function loop(t) {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#080808";
      ctx.fillRect(0, 0, w, h);

      // Stars
      for (const s of stars) { s.update(); s.draw(ctx); }

      // Radial glow
      drawGlow(t);

      // Draw connection lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 120) {
            const alpha = (1 - d / 120) * 0.12;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(251,191,36,${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Particles
      for (const p of particles) {
        p.update(mouse.x, mouse.y);
        p.draw(ctx);
      }

      raf = requestAnimationFrame(loop);
    }

    const onMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const onMouseLeave = () => { mouse.x = -9999; mouse.y = -9999; };

    resize();
    raf = requestAnimationFrame(loop);
    window.addEventListener("resize", resize);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", onMouseLeave);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseleave", onMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      aria-hidden="true"
    />
  );
}

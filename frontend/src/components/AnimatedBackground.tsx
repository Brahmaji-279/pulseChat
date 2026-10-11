import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseRadius: number;
  alpha: number;
  color: string;
}

export const AnimatedBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let isTabVisible = !document.hidden;

    // Respect prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Responsive sizing
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Visibility change handler to save battery & CPU
    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden;
      if (isTabVisible && !prefersReducedMotion) {
        lastTime = performance.now();
        render(performance.now());
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Mouse tracking
    const mouse = { x: -1000, y: -1000, radius: 140 };
    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    // Create particles based on screen width
    const particleCount = Math.min(width < 768 ? 32 : 64, 80);
    const particles: Particle[] = [];
    const colors = ['#8a2be2', '#00f0ff', '#a855f7', '#38bdf8', '#c084fc'];

    for (let i = 0; i < particleCount; i++) {
      const radius = Math.random() * 1.8 + 0.8;
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: prefersReducedMotion ? 0 : (Math.random() - 0.5) * 0.45,
        vy: prefersReducedMotion ? 0 : (Math.random() - 0.5) * 0.45,
        radius,
        baseRadius: radius,
        alpha: Math.random() * 0.6 + 0.25,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    const maxDistance = 145;
    let lastTime = performance.now();

    const render = (time: number) => {
      if (!isTabVisible) return;

      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      ctx.clearRect(0, 0, width, height);

      // Update and draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (!prefersReducedMotion) {
          p.x += p.vx * 60 * dt;
          p.y += p.vy * 60 * dt;

          // Bounce off boundaries
          if (p.x < 0) {
            p.x = 0;
            p.vx *= -1;
          } else if (p.x > width) {
            p.x = width;
            p.vx *= -1;
          }
          if (p.y < 0) {
            p.y = 0;
            p.vy *= -1;
          } else if (p.y > height) {
            p.y = height;
            p.vy *= -1;
          }

          // Mouse interaction (gentle attraction / swell)
          const dxMouse = mouse.x - p.x;
          const dyMouse = mouse.y - p.y;
          const distMouse = Math.hypot(dxMouse, dyMouse);

          if (distMouse < mouse.radius) {
            const force = (mouse.radius - distMouse) / mouse.radius;
            p.x -= (dxMouse / distMouse) * force * 1.5;
            p.y -= (dyMouse / distMouse) * force * 1.5;
            p.radius = p.baseRadius * (1 + force * 0.8);
          } else {
            p.radius = p.baseRadius;
          }
        }

        // Draw node
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw connections to nearby nodes
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);

          if (dist < maxDistance) {
            const lineAlpha = (1 - dist / maxDistance) * 0.22;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            // Slight gradient between colors
            ctx.strokeStyle = p.color;
            ctx.globalAlpha = lineAlpha;
            ctx.lineWidth = 0.85;
            ctx.stroke();
          }
        }
      }

      ctx.globalAlpha = 1.0;

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render(performance.now());

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden select-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      {/* LAYER 1: Pure Black Base Background */}
      <div className="absolute inset-0 bg-[#030303]" />

      {/* LAYER 2: Granular Dark Texture Surface */}
      <div
        className="absolute inset-0 opacity-[0.22] mix-blend-screen bg-repeat bg-center"
        style={{
          backgroundImage: `url('/assets/pulse-texture.jpg')`,
          backgroundSize: '400px 400px',
        }}
      />

      {/* LAYER 3: Interactive Particle Mesh & Geometric Lines */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block w-full h-full pointer-events-auto"
        style={{ mixBlendMode: 'screen' }}
      />

      {/* LAYER 4: Ambient Radial Lighting & Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at 18% 22%, rgba(138, 43, 226, 0.12) 0%, transparent 45%),
            radial-gradient(circle at 82% 78%, rgba(0, 240, 255, 0.08) 0%, transparent 48%),
            radial-gradient(circle at 50% 50%, transparent 40%, rgba(3, 3, 3, 0.75) 100%)
          `,
        }}
      />

      {/* LAYER 5: Network Mesh Overlay Blend (pulse-network.png) */}
      <div
        className="absolute inset-0 opacity-[0.10] mix-blend-screen bg-cover bg-center pointer-events-none"
        style={{
          backgroundImage: `url('/assets/pulse-network.png')`,
        }}
      />
    </div>
  );
};

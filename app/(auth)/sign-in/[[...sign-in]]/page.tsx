"use client";

import { SignIn } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

// Radius Mining SVG Logo Component
function RadiusLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer orbit dots */}
      <circle cx="100" cy="18" r="10" fill="#8B1FA9" />
      <circle cx="100" cy="182" r="10" fill="#8B1FA9" />
      <circle cx="18" cy="100" r="10" fill="#8B1FA9" />
      <circle cx="182" cy="100" r="10" fill="#8B1FA9" />
      {/* Diagonal orbit dots */}
      <circle cx="41" cy="41" r="8" fill="#6D28D9" opacity="0.8" />
      <circle cx="159" cy="41" r="8" fill="#6D28D9" opacity="0.8" />
      <circle cx="41" cy="159" r="8" fill="#6D28D9" opacity="0.8" />
      <circle cx="159" cy="159" r="8" fill="#6D28D9" opacity="0.8" />
      {/* Inner ring dots */}
      <circle cx="100" cy="52" r="7" fill="#a78bfa" opacity="0.7" />
      <circle cx="148" cy="100" r="7" fill="#a78bfa" opacity="0.7" />
      <circle cx="100" cy="148" r="7" fill="#a78bfa" opacity="0.7" />
      <circle cx="52" cy="100" r="7" fill="#a78bfa" opacity="0.7" />
      {/* Center core */}
      <circle cx="100" cy="100" r="18" fill="#8B1FA9" />
      <circle cx="100" cy="100" r="10" fill="#c084fc" />
      {/* Connecting lines */}
      <line x1="100" y1="28" x2="100" y2="52" stroke="#8B1FA9" strokeWidth="2" opacity="0.4" />
      <line x1="100" y1="148" x2="100" y2="172" stroke="#8B1FA9" strokeWidth="2" opacity="0.4" />
      <line x1="28" y1="100" x2="52" y2="100" stroke="#8B1FA9" strokeWidth="2" opacity="0.4" />
      <line x1="148" y1="100" x2="172" y2="100" stroke="#8B1FA9" strokeWidth="2" opacity="0.4" />
    </svg>
  );
}

// Full horizontal logo with text
function RadiusLogoFull() {
  return (
    <svg width="220" height="48" viewBox="0 0 220 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Icon */}
      <circle cx="8" cy="24" r="3.5" fill="#8B1FA9" />
      <circle cx="40" cy="24" r="3.5" fill="#8B1FA9" />
      <circle cx="24" cy="8" r="3.5" fill="#8B1FA9" />
      <circle cx="24" cy="40" r="3.5" fill="#8B1FA9" />
      <circle cx="12" cy="12" r="2.8" fill="#6D28D9" opacity="0.8" />
      <circle cx="36" cy="12" r="2.8" fill="#6D28D9" opacity="0.8" />
      <circle cx="12" cy="36" r="2.8" fill="#6D28D9" opacity="0.8" />
      <circle cx="36" cy="36" r="2.8" fill="#6D28D9" opacity="0.8" />
      <circle cx="24" cy="16" r="2.5" fill="#a78bfa" opacity="0.7" />
      <circle cx="32" cy="24" r="2.5" fill="#a78bfa" opacity="0.7" />
      <circle cx="24" cy="32" r="2.5" fill="#a78bfa" opacity="0.7" />
      <circle cx="16" cy="24" r="2.5" fill="#a78bfa" opacity="0.7" />
      <circle cx="24" cy="24" r="5.5" fill="#8B1FA9" />
      <circle cx="24" cy="24" r="3" fill="#c084fc" />
      {/* "Sinapse" small text */}
      <text x="56" y="18" fontSize="10" fill="#a78bfa" fontFamily="system-ui, sans-serif" fontWeight="500" letterSpacing="0.05em">Sinapse</text>
      {/* "RADIUS MINING" large text */}
      <text x="56" y="38" fontSize="18" fill="#1E1B4B" fontFamily="system-ui, sans-serif" fontWeight="800" letterSpacing="0.08em">RADIUS MINING</text>
    </svg>
  );
}

// 3D Mining Canvas Animation
function MiningAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animFrame: number;
    let t = 0;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Mining rig nodes — ASICs in 3D grid
    const COLS = 6;
    const ROWS = 4;
    const nodes: { x: number; y: number; z: number; active: boolean; heat: number; pulse: number }[] = [];

    for (let col = 0; col < COLS; col++) {
      for (let row = 0; row < ROWS; row++) {
        nodes.push({
          x: col,
          y: row,
          z: Math.random() * 2,
          active: Math.random() > 0.15,
          heat: Math.random(),
          pulse: Math.random() * Math.PI * 2,
        });
      }
    }

    // Hash particles flying upward
    const particles: { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; char: string }[] = [];
    const hexChars = "0123456789ABCDEF";
    
    const spawnParticle = (cx: number, cy: number) => {
      particles.push({
        x: cx,
        y: cy,
        vx: (Math.random() - 0.5) * 0.8,
        vy: -(Math.random() * 1.5 + 0.5),
        life: 1,
        maxLife: 60 + Math.random() * 80,
        char: hexChars[Math.floor(Math.random() * 16)],
      });
    };

    // Bitcoin symbols floating
    const coins: { x: number; y: number; vy: number; size: number; opacity: number; rot: number; rotSpeed: number }[] = [];
    for (let i = 0; i < 6; i++) {
      coins.push({
        x: Math.random(),
        y: Math.random(),
        vy: -(Math.random() * 0.3 + 0.1),
        size: 12 + Math.random() * 16,
        opacity: 0.08 + Math.random() * 0.12,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.02,
      });
    }

    const project3D = (x: number, y: number, z: number, w: number, h: number) => {
      const angle = t * 0.008;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      const gridW = (COLS - 1) * 80;
      const gridH = (ROWS - 1) * 60;

      const wx = (x - (COLS - 1) / 2) * 80;
      const wz = (z - 1) * 30;
      const wy = (y - (ROWS - 1) / 2) * 60;

      const rx = wx * cos - wz * sin;
      const rz = wx * sin + wz * cos;

      const fov = 600;
      const cz = fov + rz;
      const px = (rx / cz) * fov + w / 2;
      const py = (wy / cz) * fov + h / 2 - 30;
      const scale = fov / cz;

      return { px, py, scale };
    };

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      t++;

      // Dark background (transparent — CSS handles bg)
      ctx.fillStyle = "rgba(13, 11, 31, 0)";

      // Subtle grid lines
      ctx.strokeStyle = "rgba(139, 31, 169, 0.06)";
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let gx = 0; gx < w; gx += gridSize) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, h);
        ctx.stroke();
      }
      for (let gy = 0; gy < h; gy += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(w, gy);
        ctx.stroke();
      }

      // Draw 3D ASIC miner grid
      const sorted = [...nodes].sort((a, b) => {
        const pa = project3D(a.x, a.y, a.z, w, h);
        const pb = project3D(b.x, b.y, b.z, w, h);
        return pa.scale - pb.scale;
      });

      // Draw edges first
      for (let i = 0; i < sorted.length; i++) {
        const n = sorted[i];
        const { px, py, scale } = project3D(n.x, n.y, n.z, w, h);

        // Connect to right neighbor
        const right = nodes.find(m => m.x === n.x + 1 && m.y === n.y);
        if (right) {
          const { px: rpx, py: rpy } = project3D(right.x, right.y, right.z, w, h);
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(rpx, rpy);
          ctx.strokeStyle = "rgba(139, 31, 169, 0.15)";
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
        // Connect to bottom neighbor
        const below = nodes.find(m => m.x === n.x && m.y === n.y + 1);
        if (below) {
          const { px: bpx, py: bpy } = project3D(below.x, below.y, below.z, w, h);
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(bpx, bpy);
          ctx.strokeStyle = "rgba(139, 31, 169, 0.12)";
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }

      // Draw ASIC nodes
      for (const n of sorted) {
        const { px, py, scale } = project3D(n.x, n.y, n.z, w, h);
        const nodeSize = scale * 18;
        n.pulse += 0.03;

        if (!n.active) {
          // Offline node
          ctx.beginPath();
          ctx.arc(px, py, nodeSize * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(100, 116, 139, 0.2)";
          ctx.fill();
          ctx.strokeStyle = "rgba(100, 116, 139, 0.3)";
          ctx.lineWidth = 0.5 * scale;
          ctx.stroke();
          continue;
        }

        // Heat color: purple → magenta → orange
        const heat = n.heat;
        const r = Math.round(139 + heat * 80);
        const g = Math.round(31 * (1 - heat * 0.5));
        const b = Math.round(169 * (1 - heat * 0.8));

        // Outer glow pulse
        const glowSize = nodeSize * (1.5 + Math.sin(n.pulse) * 0.3);
        const grad = ctx.createRadialGradient(px, py, 0, px, py, glowSize);
        grad.addColorStop(0, `rgba(${r},${g},${b},0.3)`);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath();
        ctx.arc(px, py, glowSize, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Node body — 3D box effect
        ctx.save();
        ctx.translate(px, py);

        // Box face
        const bw = nodeSize * 1.4;
        const bh = nodeSize * 0.8;
        ctx.fillStyle = `rgba(${r * 0.3}, ${g * 0.3}, ${b * 0.4}, 0.9)`;
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.7)`;
        ctx.lineWidth = 0.8 * scale;
        ctx.beginPath();
        ctx.roundRect(-bw / 2, -bh / 2, bw, bh, 3 * scale);
        ctx.fill();
        ctx.stroke();

        // Box top (3D top face)
        const topH = bh * 0.3;
        ctx.beginPath();
        ctx.moveTo(-bw / 2, -bh / 2);
        ctx.lineTo(-bw / 2 + topH * 0.6, -bh / 2 - topH);
        ctx.lineTo(bw / 2 + topH * 0.6, -bh / 2 - topH);
        ctx.lineTo(bw / 2, -bh / 2);
        ctx.closePath();
        ctx.fillStyle = `rgba(${r * 0.5}, ${g * 0.5}, ${b * 0.6}, 0.8)`;
        ctx.fill();
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.5)`;
        ctx.stroke();

        // LED indicator
        const ledPulse = Math.sin(n.pulse * 2) * 0.5 + 0.5;
        ctx.beginPath();
        ctx.arc(bw / 2 - 5 * scale, 0, 2.5 * scale, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(100, 255, 100, ${0.5 + ledPulse * 0.5})`;
        ctx.fill();

        // Vent lines
        for (let v = -1; v <= 1; v++) {
          ctx.beginPath();
          ctx.moveTo(-bw * 0.25, v * bh * 0.2);
          ctx.lineTo(bw * 0.1, v * bh * 0.2);
          ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.3)`;
          ctx.lineWidth = 0.8 * scale;
          ctx.stroke();
        }

        ctx.restore();

        // Spawn hash particles from active nodes
        if (Math.random() < 0.015 * scale) {
          spawnParticle(px, py);
        }

        // Heat text
        n.heat += (Math.random() - 0.5) * 0.005;
        n.heat = Math.max(0, Math.min(1, n.heat));
      }

      // Update and draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;

        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        const alpha = (p.life / p.maxLife) * 0.8;
        ctx.font = `${10 + Math.random() * 2}px monospace`;
        ctx.fillStyle = `rgba(192, 132, 252, ${alpha})`;
        ctx.fillText(p.char, p.x, p.y);

        // Randomly change char
        if (Math.random() < 0.1) {
          p.char = hexChars[Math.floor(Math.random() * 16)];
        }
      }

      // Keep particle count in check
      if (particles.length > 200) particles.splice(0, particles.length - 200);

      // Draw floating bitcoin symbols
      for (const coin of coins) {
        coin.y += coin.vy / h;
        coin.rot += coin.rotSpeed;
        if (coin.y < -0.1) coin.y = 1.1;

        ctx.save();
        ctx.translate(coin.x * w, coin.y * h);
        ctx.rotate(coin.rot);
        ctx.font = `${coin.size}px serif`;
        ctx.fillStyle = `rgba(168, 85, 247, ${coin.opacity})`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("₿", 0, 0);
        ctx.restore();
      }

      // Hashrate display at bottom
      const hashRate = (85 + Math.sin(t * 0.02) * 8).toFixed(1);
      ctx.font = "11px monospace";
      ctx.fillStyle = "rgba(139, 31, 169, 0.4)";
      ctx.textAlign = "left";
      ctx.fillText(`HASHRATE: ${hashRate} TH/s`, 16, h - 48);
      ctx.fillText(`BLOCK: #893.${241 + Math.floor(t / 300)}`, 16, h - 32);
      ctx.fillText(`TEMP: ${(58 + Math.sin(t * 0.01) * 4).toFixed(0)}°C`, 16, h - 16);

      animFrame = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ opacity: 0.9 }}
    />
  );
}

export default function SignInPage() {
  return (
    <div className="min-h-screen flex" style={{ background: "#0D0B1F" }}>
      {/* Left panel — animated 3D mining */}
      <div className="hidden lg:flex flex-1 flex-col relative overflow-hidden">
        {/* 3D Mining animation fills the panel */}
        <MiningAnimation />

        {/* Overlay content */}
        <div className="relative z-10 flex flex-col h-full p-12 justify-between">
          {/* Logo — using full SVG logo */}
          <div className="flex items-center gap-3">
            <div
              className="rounded-xl p-1.5 flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#1E1B4B,#8B1FA9)" }}
            >
              <RadiusLogo size={36} />
            </div>
            <div>
              <p className="text-white font-bold text-lg tracking-tight">Radius Sinapse</p>
              <p className="text-xs" style={{ color: "#a78bfa" }}>O&amp;M · Bitcoin Mining</p>
            </div>
          </div>

          {/* Center content */}
          <div className="space-y-8">
            {/* Live block data */}
            <div className="font-mono text-xs space-y-1.5 opacity-50" style={{ color: "#a78bfa" }}>
              {["Block #893.241", "Hash: 0x1E1B4B8B1FA9...", "Nonce: 2847391029", "Diff: 88.1 T"].map((line) => (
                <div key={line} className="flex items-center gap-2">
                  <span style={{ color: "#8B1FA9" }}>›</span>
                  <span>{line}</span>
                </div>
              ))}
            </div>

            {/* Main heading */}
            <div>
              <h1 className="text-5xl font-black tracking-tight leading-none text-white">
                Operations &amp;<br />
                <span
                  style={{
                    background: "linear-gradient(90deg,#8B1FA9,#c084fc)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Maintenance
                </span>
              </h1>
              <p className="mt-4 text-base leading-relaxed" style={{ color: "#94a3b8" }}>
                Gestão de Ordens de Serviço com SLA contratual para operação de containers ANTSPACE HK3.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Uptime alvo", value: "99.9%", color: "#8B1FA9" },
                { label: "SLA resolução", value: "96h", color: "#6366f1" },
                { label: "Containers", value: "HK3", color: "#a78bfa" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl p-3 text-center"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p className="text-xs" style={{ color: "#334155" }}>
            © {new Date().getFullYear()} Radius Mining · Sistema interno restrito
          </p>
        </div>
      </div>

      {/* Right panel — Clerk SignIn */}
      <div
        className="flex-1 lg:max-w-[480px] flex items-center justify-center p-8"
        style={{ background: "#0D0B1F", borderLeft: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="w-full max-w-sm space-y-6">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-6">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#1E1B4B,#8B1FA9)" }}
            >
              <RadiusLogo size={28} />
            </div>
            <p className="text-white font-bold">Radius Sinapse</p>
          </div>

          {/* Full logo — desktop right panel top */}
          <div className="hidden lg:flex justify-center mb-2">
            <RadiusLogoFull />
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-white">Acessar plataforma</h2>
            <p className="text-sm" style={{ color: "#64748b" }}>
              Entre com sua conta autorizada
            </p>
          </div>

          <SignIn
            appearance={{
              variables: {
                colorPrimary: "#8B1FA9",
                colorBackground: "transparent",
                colorText: "#f8fafc",
                colorTextSecondary: "#94a3b8",
                colorInputBackground: "#1a1830",
                colorInputText: "#f8fafc",
                colorNeutral: "#f8fafc",
                borderRadius: "0.75rem",
                fontFamily: "inherit",
              },
              elements: {
                rootBox: "w-full",
                // Remove card box entirely
                card: "shadow-none border-0 !bg-transparent p-0 !backdrop-blur-none",
                cardBox: "shadow-none border-0 !bg-transparent",
                // Hide built-in header
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                // Social buttons — ghost style matching layout
                socialButtonsBlockButton:
                  "!border !border-white/10 !bg-white/5 !text-white hover:!bg-white/10 !rounded-xl",
                socialButtonsBlockButtonText: "!text-white",
                socialButtonsBlockButtonArrow: "!text-white/40",
                // Divider
                dividerLine: "!bg-white/10",
                badge: "!bg-white/10 !text-white !border-white/20",
                dividerText: "!text-slate-500",
                // Form labels + fields
                formFieldLabel: "!text-slate-300",
                formFieldInput:
                  "!bg-[#1a1830] !border-white/10 !text-white !rounded-xl focus:!border-purple-500/50",
                formFieldInputShowPasswordButton: "!text-slate-400",
                // Links (Use phone, etc)
                formFieldAction: "!text-purple-400 hover:!text-purple-300",
                // Primary button
                formButtonPrimary:
                  "!rounded-xl !font-semibold !bg-[#8B1FA9] hover:!bg-[#7a1a95]",
                // Footer links
                footerActionText: "!text-slate-400",
                footerActionLink: "!text-purple-400 hover:!text-purple-300",
                footerAction: "!border-t-0",
                // Internal card background override
                main: "!bg-transparent",
                // "Secured by Clerk" + dev mode
                footer: "!bg-transparent [&>*]:!bg-transparent",
              },
            }}
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-up"
            signUpFallbackRedirectUrl="/dashboard"
          />
        </div>
      </div>
    </div>
  );
}
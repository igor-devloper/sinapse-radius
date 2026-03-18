"use client";

import { SignUp } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

function RadiusLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="18" r="10" fill="#8B1FA9" />
      <circle cx="100" cy="182" r="10" fill="#8B1FA9" />
      <circle cx="18" cy="100" r="10" fill="#8B1FA9" />
      <circle cx="182" cy="100" r="10" fill="#8B1FA9" />
      <circle cx="41" cy="41" r="8" fill="#6D28D9" opacity="0.8" />
      <circle cx="159" cy="41" r="8" fill="#6D28D9" opacity="0.8" />
      <circle cx="41" cy="159" r="8" fill="#6D28D9" opacity="0.8" />
      <circle cx="159" cy="159" r="8" fill="#6D28D9" opacity="0.8" />
      <circle cx="100" cy="52" r="7" fill="#a78bfa" opacity="0.7" />
      <circle cx="148" cy="100" r="7" fill="#a78bfa" opacity="0.7" />
      <circle cx="100" cy="148" r="7" fill="#a78bfa" opacity="0.7" />
      <circle cx="52" cy="100" r="7" fill="#a78bfa" opacity="0.7" />
      <circle cx="100" cy="100" r="18" fill="#8B1FA9" />
      <circle cx="100" cy="100" r="10" fill="#c084fc" />
      <line x1="100" y1="28" x2="100" y2="52" stroke="#8B1FA9" strokeWidth="2" opacity="0.4" />
      <line x1="100" y1="148" x2="100" y2="172" stroke="#8B1FA9" strokeWidth="2" opacity="0.4" />
      <line x1="28" y1="100" x2="52" y2="100" stroke="#8B1FA9" strokeWidth="2" opacity="0.4" />
      <line x1="148" y1="100" x2="172" y2="100" stroke="#8B1FA9" strokeWidth="2" opacity="0.4" />
    </svg>
  );
}

function MiningParticles() {
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

    // Floating hash nodes
    const hexChars = "0123456789ABCDEF";
    const floaters: { x: number; y: number; vx: number; vy: number; char: string; opacity: number; size: number }[] = [];
    for (let i = 0; i < 60; i++) {
      floaters.push({
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 0.0008,
        vy: -(Math.random() * 0.0006 + 0.0002),
        char: hexChars[Math.floor(Math.random() * 16)],
        opacity: Math.random() * 0.25 + 0.05,
        size: 10 + Math.random() * 8,
      });
    }

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      t++;

      // Grid
      ctx.strokeStyle = "rgba(139, 31, 169, 0.06)";
      ctx.lineWidth = 1;
      for (let gx = 0; gx < w; gx += 40) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke();
      }
      for (let gy = 0; gy < h; gy += 40) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
      }

      // Central glow
      const cx = w / 2;
      const cy = h / 2;
      const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * 0.5);
      gr.addColorStop(0, "rgba(139,31,169,0.08)");
      gr.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, w, h);

      // Floating hex chars
      for (const f of floaters) {
        f.x += f.vx;
        f.y += f.vy;
        if (f.y < -0.05) f.y = 1.05;
        if (f.x < -0.05) f.x = 1.05;
        if (f.x > 1.05) f.x = -0.05;

        if (Math.random() < 0.005) {
          f.char = hexChars[Math.floor(Math.random() * 16)];
        }

        ctx.font = `${f.size}px monospace`;
        ctx.fillStyle = `rgba(167, 139, 250, ${f.opacity})`;
        ctx.fillText(f.char, f.x * w, f.y * h);
      }

      // Pulsing ring
      const ringR = 80 + Math.sin(t * 0.02) * 20;
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(139, 31, 169, ${0.05 + Math.sin(t * 0.02) * 0.03})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      animFrame = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.8 }} />;
}

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center relative" style={{ background: "#0D0B1F" }}>
      <MiningParticles />

      <div className="relative z-10 w-full max-w-sm px-4 space-y-6">
        {/* Logo centered */}
        <div className="flex flex-col items-center gap-3 mb-2">
          <div
            className="rounded-2xl p-3 flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#1E1B4B,#8B1FA9)", boxShadow: "0 0 40px rgba(139,31,169,0.4)" }}
          >
            <RadiusLogo size={44} />
          </div>
          <div className="text-center">
            <p className="text-white font-bold text-base tracking-tight">Radius Sinapse</p>
            <p className="text-xs" style={{ color: "#a78bfa" }}>O&amp;M · Bitcoin Mining</p>
          </div>
        </div>

        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold text-white">Criar conta</h2>
          <p className="text-sm" style={{ color: "#64748b" }}>
            Após criação, aguarde liberação de cargo pelo admin.
          </p>
        </div>

        <SignUp
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
              card: "shadow-none border-0 !bg-transparent p-0 !backdrop-blur-none",
              cardBox: "shadow-none border-0 !bg-transparent",
              headerTitle: "hidden",
              headerSubtitle: "hidden",
              socialButtonsBlockButton:
                "!border !border-white/10 !bg-white/5 !text-white hover:!bg-white/10 !rounded-xl",
              socialButtonsBlockButtonText: "!text-white",
              dividerLine: "!bg-white/10",
              dividerText: "!text-slate-500",
              formFieldLabel: "!text-slate-300",
              formFieldInput:
                "!bg-[#1a1830] !border-white/10 !text-white !rounded-xl focus:!border-purple-500/50",
              formFieldInputShowPasswordButton: "!text-slate-400",
              formFieldAction: "!text-purple-400 hover:!text-purple-300",
              formButtonPrimary:
                "!rounded-xl !font-semibold !bg-[#8B1FA9] hover:!bg-[#7a1a95]",
              footerActionText: "!text-slate-400",
              footerActionLink: "!text-purple-400 hover:!text-purple-300",
              footerAction: "!border-t-0",
              main: "!bg-transparent",
              footer: "!bg-transparent [&>*]:!bg-transparent",
            },
          }}
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
        />
      </div>
    </div>
  );
}
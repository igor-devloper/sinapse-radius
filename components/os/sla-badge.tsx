"use client";

import { SLAInfo } from "@/lib/sla";
import { ShieldAlert, ShieldCheck, ShieldEllipsis } from "lucide-react";

interface SLABadgeProps {
  sla: SLAInfo;
  compact?: boolean;
  showProgress?: boolean;
}

const colorMap = {
  green: {
    bg: "bg-green-100",
    text: "text-green-700",
    bar: "bg-green-500",
    icon: ShieldCheck,
  },
  yellow: {
    bg: "bg-yellow-100",
    text: "text-yellow-700",
    bar: "bg-yellow-400",
    icon: ShieldEllipsis,
  },
  orange: {
    bg: "bg-orange-100",
    text: "text-orange-700",
    bar: "bg-orange-500",
    icon: ShieldAlert,
  },
  red: {
    bg: "bg-red-100",
    text: "text-red-700",
    bar: "bg-red-500",
    icon: ShieldAlert,
  },
};

export function SLABadge({ sla, compact = false, showProgress = false }: SLABadgeProps) {
  const c = colorMap[sla.statusColor];
  const Icon = c.icon;

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${c.bg} ${c.text}`}>
        <Icon className="w-3 h-3" />
        {sla.tempoFormatado}
      </span>
    );
  }

  return (
    <div className={`rounded-xl p-4 ${c.bg} space-y-2`}>
      <div className="flex items-center justify-between">
        <span className={`text-sm font-semibold flex items-center gap-1.5 ${c.text}`}>
          <Icon className="w-4 h-4" />
          {sla.statusLabel}
        </span>
        <span className={`text-xs font-medium ${c.text}`}>
          {sla.percentualDecorrido}% decorrido
        </span>
      </div>
      <p className={`text-sm ${c.text}`}>{sla.tempoFormatado}</p>
      {showProgress && (
        <div className="w-full h-1.5 bg-white/60 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${c.bar}`}
            style={{ width: `${sla.percentualDecorrido}%` }}
          />
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <div>
          <p className="text-xs text-gray-500">Emissão OS Axia</p>
          <p className={`text-xs font-medium ${c.text}`}>
            {sla.dataEmissaoAxia.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}
            {" "}
            {sla.dataEmissaoAxia.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Prazo limite</p>
          <p className={`text-xs font-medium ${c.text}`}>
            {sla.dataLimite.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";

import {
  SLAInfo, ATIVIDADE_CORRETIVA_LABEL, prazoFormatado, formatarDataBR,
} from "@/lib/sla-manual";
import { ShieldAlert, ShieldCheck, ShieldEllipsis, BookOpen, Zap } from "lucide-react";

interface SLABadgeProps {
  sla: SLAInfo;
  compact?: boolean;
  showProgress?: boolean;
}

const colorMap = {
  green:  { bg: "bg-green-100",  text: "text-green-700",  bar: "bg-green-500",  icon: ShieldCheck },
  yellow: { bg: "bg-yellow-100", text: "text-yellow-700", bar: "bg-yellow-400", icon: ShieldEllipsis },
  orange: { bg: "bg-orange-100", text: "text-orange-700", bar: "bg-orange-500", icon: ShieldAlert },
  red:    { bg: "bg-red-100",    text: "text-red-700",    bar: "bg-red-500",    icon: ShieldAlert },
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
    <div className={`rounded-xl p-4 ${c.bg} space-y-3`}>
      {/* Status + percentual */}
      <div className="flex items-center justify-between">
        <span className={`text-sm font-semibold flex items-center gap-1.5 ${c.text}`}>
          <Icon className="w-4 h-4" />
          {sla.statusLabel}
        </span>
        <span className={`text-xs font-medium ${c.text}`}>
          {sla.percentualDecorrido}% do prazo decorrido
        </span>
      </div>

      {/* Tempo restante */}
      <p className={`text-base font-semibold ${c.text}`}>{sla.tempoFormatado}</p>

      {/* Barra */}
      {showProgress && (
        <div className="w-full h-2 bg-white/60 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${c.bar}`}
            style={{ width: `${sla.percentualDecorrido}%` }}
          />
        </div>
      )}

      {/* Datas */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Emissão OS Axia</p>
          <p className={`text-xs font-semibold ${c.text}`}>{formatarDataBR(sla.dataEmissaoAxia)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Prazo limite (resolução)</p>
          <p className={`text-xs font-semibold ${c.text}`}>{formatarDataBR(sla.dataLimiteSLA)}</p>
        </div>
      </div>

      {/* Prazo de atuação (corretivas) */}
      {sla.atuacaoHoras && (
        <div className="flex items-center gap-2 bg-white/50 rounded-lg px-3 py-1.5">
          <Zap className={`w-3.5 h-3.5 shrink-0 ${c.text}`} />
          <p className={`text-xs ${c.text}`}>
            Prazo de atuação: <span className="font-semibold">{prazoFormatado(sla.atuacaoHoras)}</span>
            {" "}para iniciar atendimento
          </p>
        </div>
      )}

      {/* Referência */}
      <div className="flex items-start gap-2 pt-1 border-t border-white/40">
        <BookOpen className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${c.text} opacity-70`} />
        <div>
          <p className="text-xs text-gray-600">
            Prazo contratual: <span className={`font-medium ${c.text}`}>{prazoFormatado(sla.prazoHoras)}</span>
            {" · "}{sla.referenciaManual}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {ATIVIDADE_CORRETIVA_LABEL[sla.tipoAtividadeCorretiva] ?? sla.tipoAtividadeCorretiva}
          </p>
        </div>
      </div>
    </div>
  );
}
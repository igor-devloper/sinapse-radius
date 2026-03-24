"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Wrench,
  AlertTriangle,
  Clock,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isToday,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  PERIODICIDADE_LABEL,
  PERIODICIDADE_COR,
  PERIODICIDADES_ORDENADAS,
} from "@/lib/checklist-preventiva";
import type { EventoCalendario, EventoPreventiva } from "@/lib/calendario-service";

// ─── Tipos locais ─────────────────────────────────────────────────────────────

type ResumoPeriodicidade = Record<
  string,
  { previstas: number; executadas: number; pendentes: number }
>;

// ─── Helpers de badge ─────────────────────────────────────────────────────────

// Cobre todos os valores de StatusOS do schema
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    ABERTA:           { label: "Aberta",           cls: "bg-blue-100 text-blue-700" },
    EM_ANDAMENTO:     { label: "Em andamento",     cls: "bg-yellow-100 text-yellow-700" },
    AGUARDANDO_PECA:  { label: "Aguard. peça",     cls: "bg-orange-100 text-orange-700" },
    PAUSADA:          { label: "Pausada",           cls: "bg-gray-200 text-gray-600" },
    CONCLUIDA:        { label: "Concluída",         cls: "bg-green-100 text-green-700" },
    CANCELADA:        { label: "Cancelada",         cls: "bg-red-100 text-red-600" },
  };
  const s = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-600" };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}

// Cobre todos os valores de PrioridadeOS do schema
function PrioridadeDot({ prioridade }: { prioridade: string }) {
  const cores: Record<string, string> = {
    CRITICA: "bg-red-500",
    ALTA:    "bg-orange-400",
    MEDIA:   "bg-yellow-400",
    BAIXA:   "bg-green-400",
  };
  return (
    <span
      className={`w-2 h-2 rounded-full shrink-0 ${cores[prioridade] ?? "bg-gray-300"}`}
      title={prioridade}
    />
  );
}

// ─── Chip de evento no grid ───────────────────────────────────────────────────

function EventoChip({ ev }: { ev: EventoCalendario }) {
  if (ev.tipo === "os_preventiva") {
    const { cor, periodicidadeLabel, sugestao, os } = ev;
    return (
      <span
        className={[
          "flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded truncate",
          cor.bg,
          cor.text,
          sugestao ? "border border-dashed " + cor.border : "",
        ].join(" ")}
        title={os.titulo}
      >
        <Wrench className="w-2.5 h-2.5 shrink-0" />
        <span className="truncate">{periodicidadeLabel}</span>
      </span>
    );
  }

  if (ev.tipo === "os_corretiva") {
    return (
      <span
        className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded truncate bg-red-50 text-red-700"
        title={ev.os.titulo}
      >
        <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
        <span className="truncate">{ev.os.titulo}</span>
      </span>
    );
  }

  // vencimento_sla
  return (
    <span
      className={[
        "flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded truncate",
        ev.slaVencido
          ? "bg-red-100 text-red-700 border border-red-300"
          : "bg-amber-50 text-amber-700 border border-amber-200",
      ].join(" ")}
      title={`SLA: ${ev.os.titulo}`}
    >
      <Clock className="w-2.5 h-2.5 shrink-0" />
      <span className="truncate">SLA · {ev.os.numero}</span>
    </span>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function CalendarioOS({
  mesAtual,
  eventosPorDia,
  resumoPorPeriodicidade,
  totalOSProgramadas,
}: {
  mesAtual: string;
  eventosPorDia: Record<string, EventoCalendario[]>;
  resumoPorPeriodicidade: ResumoPeriodicidade;
  totalOSProgramadas: number;
}) {
  const router = useRouter();
  const [diaDetalhe, setDiaDetalhe] = useState<string | null>(null);

  const [ano, mes] = mesAtual.split("-").map(Number);
  const dataRef = new Date(ano, mes - 1, 1);

  const diasDoMes = eachDayOfInterval({
    start: startOfMonth(dataRef),
    end: endOfMonth(dataRef),
  });

  const primeiroDiaSemana = getDay(startOfMonth(dataRef));

  function navMes(delta: number) {
    const nova = new Date(ano, mes - 1 + delta, 1);
    router.push(`/calendario?mes=${format(nova, "yyyy-MM")}`);
  }

  const semanas = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  // periodicidades que aparecem no mês (excluindo DIARIA — exibida como MENSAL)
  const periodicidadesDoMes = PERIODICIDADES_ORDENADAS.filter(
    (p) => p !== "DIARIA" && resumoPorPeriodicidade[p]
  );

  const eventosDoDia = diaDetalhe ? (eventosPorDia[diaDetalhe] ?? []) : [];

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navMes(-1)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <h2 className="text-lg font-semibold capitalize text-gray-900">
            {format(dataRef, "MMMM yyyy", { locale: ptBR })}
          </h2>

          <button
            onClick={() => navMes(1)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Legenda */}
        <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-violet-100 border border-violet-300" />
            Preventiva
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm border border-dashed border-violet-300" />
            Sugerida
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-100 border border-red-300" />
            Corretiva
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-50 border border-amber-200" />
            Venc. SLA
          </span>
        </div>
      </div>

      {/* GRID CALENDÁRIO */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-100">
          {semanas.map((s) => (
            <div key={s} className="text-center text-xs py-2 text-gray-400 font-medium">
              {s}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {/* Células de offset */}
          {Array.from({ length: primeiroDiaSemana }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="min-h-[90px] border-b border-r border-gray-50 bg-gray-50/40"
            />
          ))}

          {diasDoMes.map((dia, idx) => {
            const key = format(dia, "yyyy-MM-dd");
            const eventos = eventosPorDia[key] ?? [];
            const hoje = isToday(dia);
            const selecionado = diaDetalhe === key;
            const colIdx = (primeiroDiaSemana + idx) % 7;
            const isLastCol = colIdx === 6;

            return (
              <div
                key={key}
                onClick={() => setDiaDetalhe(selecionado ? null : key)}
                className={[
                  "min-h-[90px] p-1.5 flex flex-col gap-0.5 border-b border-gray-100 cursor-pointer transition-colors",
                  !isLastCol && "border-r",
                  hoje ? "bg-violet-50/40" : "",
                  selecionado ? "ring-2 ring-inset ring-violet-400" : "",
                  eventos.length ? "hover:bg-gray-50" : "",
                ].join(" ")}
              >
                {/* Número do dia */}
                <span
                  className={[
                    "self-start text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                    hoje
                      ? "bg-violet-600 text-white"
                      : "text-gray-500",
                  ].join(" ")}
                >
                  {format(dia, "d")}
                </span>

                {/* Chips de eventos (máx 3 visíveis) */}
                {eventos.slice(0, 3).map((ev, i) => (
                  <EventoChip key={i} ev={ev} />
                ))}

                {eventos.length > 3 && (
                  <span className="text-[10px] text-gray-400 pl-1">
                    +{eventos.length - 3} mais
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* PAINEL DE DETALHE DO DIA */}
      {diaDetalhe && eventosDoDia.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">
              {format(new Date(diaDetalhe + "T12:00:00"), "d 'de' MMMM", {
                locale: ptBR,
              })}
              <span className="ml-2 text-gray-400 font-normal">
                ({eventosDoDia.length}{" "}
                {eventosDoDia.length === 1 ? "evento" : "eventos"})
              </span>
            </h3>
            <button
              onClick={() => setDiaDetalhe(null)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Fechar
            </button>
          </div>

          <ul className="divide-y divide-gray-50">
            {eventosDoDia.map((ev, i) => {
              const isSugestao =
                ev.tipo === "os_preventiva" && (ev as EventoPreventiva).sugestao;

              return (
                <li key={i} className="px-5 py-3">
                  {isSugestao ? (
                    // Sugestão: não tem OS ainda
                    <div className="flex items-start gap-3 opacity-70">
                      <Wrench className="w-4 h-4 mt-0.5 text-violet-400 shrink-0" />
                      <div>
                        <p className="text-sm text-gray-700 italic">{ev.os.titulo}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Preventiva prevista — ainda sem OS cadastrada
                        </p>
                      </div>
                    </div>
                  ) : (
                    <Link
                      href={`/ordens/${ev.os.id}`}
                      className="flex items-start gap-3 group"
                    >
                      {ev.tipo === "os_preventiva" && (
                        <Wrench className="w-4 h-4 mt-0.5 text-violet-500 shrink-0" />
                      )}
                      {ev.tipo === "os_corretiva" && (
                        <AlertTriangle className="w-4 h-4 mt-0.5 text-red-500 shrink-0" />
                      )}
                      {ev.tipo === "vencimento_sla" && (
                        <Clock
                          className={`w-4 h-4 mt-0.5 shrink-0 ${
                            ev.slaVencido ? "text-red-600" : "text-amber-500"
                          }`}
                        />
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-gray-400 font-mono">
                            {ev.os.numero}
                          </span>
                          <PrioridadeDot prioridade={ev.os.prioridade} />
                          <StatusBadge status={ev.os.status} />
                          {ev.tipo === "vencimento_sla" && ev.slaVencido && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                              SLA Vencido
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-gray-800 group-hover:text-violet-700 truncate mt-0.5">
                          {ev.os.titulo}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {ev.os.subsistema}
                          {ev.os.responsavel && ` · ${ev.os.responsavel.nome}`}
                        </p>
                      </div>
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* RESUMO DE PREVENTIVAS POR PERIODICIDADE */}
      {periodicidadesDoMes.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-800">
              Preventivas do mês
            </h3>
            <span className="ml-auto text-xs text-gray-400">
              {totalOSProgramadas} evento{totalOSProgramadas !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="divide-y divide-gray-50">
            {periodicidadesDoMes.map((per) => {
              const r = resumoPorPeriodicidade[per];
              const cor = PERIODICIDADE_COR[per];
              const label = PERIODICIDADE_LABEL[per] ?? per;
              const pct = r.previstas > 0 ? (r.executadas / r.previstas) * 100 : 0;

              return (
                <div key={per} className="px-5 py-3 flex items-center gap-4">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${cor?.bg ?? "bg-gray-100"} ${cor?.text ?? "text-gray-700"}`}
                  >
                    {label}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>
                        {r.executadas}/{r.previstas} concluídas
                      </span>
                      <span
                        className={
                          r.pendentes > 0
                            ? "text-amber-600 font-medium"
                            : "text-green-600 font-medium"
                        }
                      >
                        {r.pendentes > 0
                          ? `${r.pendentes} pendente${r.pendentes > 1 ? "s" : ""}`
                          : "Tudo concluído ✓"}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-400 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
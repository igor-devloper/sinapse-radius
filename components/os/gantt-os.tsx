"use client";

import { useMemo, useState, useCallback } from "react";
import {
  format, startOfMonth, endOfMonth, eachMonthOfInterval,
  subMonths, addMonths, isAfter, isBefore, isSameMonth, setDate
} from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { Plus, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface OSResumida {
  id: string;
  numero: string;
  titulo: string;
  status: string;
  periodicidadePreventiva?: string | null;
  dataProgramada?: Date | string | null;
  dataConclusao?: Date | string | null;
  tipoOS: string;
}

// Slot esperado no cronograma: pode ter OS ou não
interface Slot {
  periodicidade: string;
  mes: Date;            // primeiro dia do mês esperado
  os: OSResumida | null;
  esperado: boolean;    // se esse mês deveria ter uma OS dessa periodicidade
}

// ─── Constantes ───────────────────────────────────────────────────────────────
const PERIODICIDADES_ATIVAS = ["MENSAL", "TRIMESTRAL", "SEMESTRAL", "ANUAL", "HORAS_2000"] as const;

const LABEL: Record<string, string> = {
  MENSAL: "Mensal",
  TRIMESTRAL: "Trimestral",
  SEMESTRAL: "Semestral",
  ANUAL: "Anual",
  HORAS_2000: "2.000 h",
  BIENNIAL: "Bienal",
};

const PRIORIDADE_POR_PERIODICIDADE: Record<string, string> = {
  MENSAL: "MEDIA",
  TRIMESTRAL: "MEDIA",
  SEMESTRAL: "ALTA",
  ANUAL: "ALTA",
  HORAS_2000: "ALTA",
};

const STATUS_COR: Record<string, { bg: string; label: string }> = {
  ABERTA:          { bg: "bg-orange-400", label: "Aberta" },
  EM_ANDAMENTO:    { bg: "bg-violet-500", label: "Em andamento" },
  AGUARDANDO_PECA: { bg: "bg-yellow-400", label: "Aguard. peça" },
  PAUSADA:         { bg: "bg-gray-400",   label: "Pausada" },
  CONCLUIDA:       { bg: "bg-green-500",  label: "Concluída" },
  CANCELADA:       { bg: "bg-red-300",    label: "Cancelada" },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Retorna true se um mês deveria ter uma OS daquela periodicidade */
function mesEsperado(mes: Date, periodicidade: string): boolean {
  const m = mes.getMonth() + 1; // 1..12
  switch (periodicidade) {
    case "MENSAL":     return true;
    case "HORAS_2000": return m % 2 === 0; // meses pares (fev, abr, jun...)
    case "TRIMESTRAL": return m % 3 === 0; // mar, jun, set, dez
    case "SEMESTRAL":  return m === 6 || m === 12;
    case "ANUAL":      return m === 12;
    default:           return false;
  }
}

function classifySlot(slot: Slot, hoje: Date): "atrasada" | "atual" | "futura" | "concluida" | "nao_esperado" {
  if (!slot.esperado) return "nao_esperado";
  if (!slot.os) {
    if (isBefore(slot.mes, startOfMonth(hoje))) return "atrasada";
    if (isSameMonth(slot.mes, hoje)) return "atual";
    return "futura";
  }
  if (slot.os.status === "CONCLUIDA") return "concluida";
  if (isBefore(slot.mes, startOfMonth(hoje))) return "atrasada";
  if (isSameMonth(slot.mes, hoje)) return "atual";
  return "futura";
}

// ─── Botão de criar OS ────────────────────────────────────────────────────────
function BotaoCriarOS({
  periodicidade,
  mes,
  onCriada,
}: {
  periodicidade: string;
  mes: Date;
  onCriada: (os: OSResumida) => void;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const criar = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    try {
      // Usa o dia 1 do mês como dataProgramada
      const dataProgramada = setDate(mes, 1);
      dataProgramada.setHours(8, 0, 0, 0);

      const res = await fetch("/api/os", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipoOS: "PREVENTIVA",
          periodicidadePreventiva: periodicidade,
          dataProgramada: dataProgramada.toISOString(),
          subsistema: "Geral",
          prioridade: PRIORIDADE_POR_PERIODICIDADE[periodicidade] ?? "MEDIA",
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err?.error?.formErrors?.[0] ?? "Erro ao criar OS");
        return;
      }

      const { os } = await res.json();
      toast.success(`OS ${os.numero} criada com sucesso!`, {
        action: { label: "Abrir", onClick: () => router.push(`/ordens/${os.id}`) },
      });
      onCriada(os);
      router.refresh();
    } catch {
      toast.error("Erro de conexão ao criar OS");
    } finally {
      setLoading(false);
    }
  }, [periodicidade, mes, onCriada, router]);

  return (
    <button
      onClick={criar}
      disabled={loading}
      title={`Criar OS preventiva ${LABEL[periodicidade] ?? periodicidade} — ${format(mes, "MMM/yy", { locale: ptBR })}`}
      className="w-9 h-6 rounded border-2 border-dashed border-gray-300 hover:border-violet-400 hover:bg-violet-50 flex items-center justify-center transition-all group disabled:opacity-50"
    >
      {loading
        ? <Loader2 className="w-3 h-3 text-violet-500 animate-spin" />
        : <Plus className="w-3 h-3 text-gray-300 group-hover:text-violet-500 transition-colors" />
      }
    </button>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function GanttOS({ ordens: ordensInicial }: { ordens: OSResumida[] }) {
  const hoje = new Date();
  const inicio = subMonths(startOfMonth(hoje), 2);
  const fim    = addMonths(endOfMonth(hoje), 4);
  const meses  = eachMonthOfInterval({ start: inicio, end: fim });

  // Estado local para adicionar OS criadas on-the-fly sem full reload
  const [ordensLocais, setOrdensLocais] = useState<OSResumida[]>(ordensInicial);

  const preventivas = useMemo(
    () => ordensLocais.filter((o) => o.tipoOS === "PREVENTIVA"),
    [ordensLocais]
  );

  // Para cada linha de periodicidade × coluna de mês → Slot
  const tabela = useMemo(() => {
    return PERIODICIDADES_ATIVAS.map((periodo) => {
      const slots: Slot[] = meses.map((mes) => {
        const esperado = mesEsperado(mes, periodo);
        const os = esperado
          ? (preventivas.find(
              (o) =>
                o.periodicidadePreventiva === periodo &&
                o.dataProgramada &&
                isSameMonth(new Date(o.dataProgramada), mes)
            ) ?? null)
          : null;
        return { periodicidade: periodo, mes, os, esperado };
      });
      return { periodo, slots };
    });
  }, [preventivas, meses]);

  // Contadores para o resumo
  const totalFaltando = useMemo(() => {
    let count = 0;
    tabela.forEach(({ slots }) => {
      slots.forEach((s) => {
        if (s.esperado && !s.os && !isAfter(s.mes, endOfMonth(addMonths(hoje, 1)))) count++;
      });
    });
    return count;
  }, [tabela, hoje]);

  const handleCriada = useCallback((novaOS: OSResumida) => {
    setOrdensLocais((prev) => [...prev, novaOS]);
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-50 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Cronograma de Preventivas</h3>
          <p className="text-xs text-gray-400 mt-0.5">Visão completa — OS existentes e o que ainda falta criar</p>
        </div>
        {totalFaltando > 0 && (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5 shrink-0">
            <AlertTriangle className="w-3.5 h-3.5" />
            {totalFaltando} OS pendente{totalFaltando > 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Legenda */}
      <div className="px-5 py-2.5 flex items-center gap-4 flex-wrap border-b border-gray-50 bg-gray-50/40">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-green-500 inline-block" />
          <span className="text-xs text-gray-500">Concluída</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-violet-500 inline-block" />
          <span className="text-xs text-gray-500">Em andamento / Aberta</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-red-400 inline-block" />
          <span className="text-xs text-gray-500">Atrasada</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-gray-200 inline-block" />
          <span className="text-xs text-gray-500">Futura (OS existe)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-sm border-2 border-dashed border-gray-300 inline-block" />
          <span className="text-xs text-gray-500">Falta criar OS</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-gray-100 inline-block" />
          <span className="text-xs text-gray-500">Não esperado</span>
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full" style={{ minWidth: `${120 + meses.length * 52}px` }}>
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 sticky left-0 bg-white z-10 w-28">
                Periodicidade
              </th>
              {meses.map((mes) => {
                const isHoje = isSameMonth(mes, hoje);
                const isPast = isBefore(mes, startOfMonth(hoje));
                return (
                  <th
                    key={mes.toISOString()}
                    className={`text-center px-1 py-2.5 text-xs font-medium w-14 ${
                      isHoje
                        ? "text-violet-700 bg-violet-50/70"
                        : isPast
                        ? "text-gray-300"
                        : "text-gray-400"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      {format(mes, "MMM", { locale: ptBR })}
                      <span className={`text-[10px] ${isHoje ? "text-violet-500 font-bold" : "text-gray-300"}`}>
                        {format(mes, "yy")}
                      </span>
                      {isHoje && <div className="w-1 h-1 rounded-full bg-violet-500" />}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {tabela.map(({ periodo, slots }) => (
              <tr key={periodo} className="hover:bg-gray-50/50 transition-colors group">
                {/* Label da periodicidade */}
                <td className="px-4 py-3 sticky left-0 bg-white group-hover:bg-gray-50/50 z-10">
                  <span className="text-xs font-bold text-gray-700 whitespace-nowrap">
                    {LABEL[periodo] ?? periodo}
                  </span>
                </td>

                {/* Slots */}
                {slots.map((slot) => {
                  const classif = classifySlot(slot, hoje);
                  const isHojeCol = isSameMonth(slot.mes, hoje);

                  return (
                    <td
                      key={slot.mes.toISOString()}
                      className={`text-center px-1.5 py-3 ${isHojeCol ? "bg-violet-50/30" : ""}`}
                    >
                      {/* Não esperado: traço */}
                      {classif === "nao_esperado" && (
                        <div className="w-9 h-6 flex items-center justify-center mx-auto">
                          <span className="text-gray-200 text-xs">–</span>
                        </div>
                      )}

                      {/* Tem OS → link colorido */}
                      {slot.os && classif !== "nao_esperado" && (
                        <Link
                          href={`/ordens/${slot.os.id}`}
                          title={`${slot.os.numero} — ${slot.os.titulo} (${STATUS_COR[slot.os.status]?.label ?? slot.os.status})`}
                          className={`mx-auto w-9 h-6 rounded flex items-center justify-center hover:scale-110 hover:shadow-md transition-all cursor-pointer shadow-sm text-white text-[9px] font-bold ${
                            classif === "concluida"
                              ? "bg-green-500"
                              : classif === "atrasada"
                              ? "bg-red-400"
                              : classif === "atual"
                              ? STATUS_COR[slot.os.status]?.bg ?? "bg-violet-500"
                              : "bg-gray-300"
                          }`}
                        >
                          {slot.os.status === "CONCLUIDA"
                            ? <CheckCircle2 className="w-3 h-3" />
                            : slot.os.numero.slice(-3)
                          }
                        </Link>
                      )}

                      {/* Sem OS + esperado → botão criar */}
                      {!slot.os && classif !== "nao_esperado" && (
                        <div className="mx-auto w-fit">
                          <BotaoCriarOS
                            periodicidade={periodo}
                            mes={slot.mes}
                            onCriada={handleCriada}
                          />
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer informativo */}
      <div className="px-5 py-3 border-t border-gray-50 bg-gray-50/30">
        <p className="text-xs text-gray-400">
          Clique em <strong className="text-violet-600">+</strong> para criar automaticamente a OS recomendada com checklist pré-preenchido.
          Clique em qualquer OS existente para abrir os detalhes.
        </p>
      </div>
    </div>
  );
}
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, format, addMonths, subMonths, isToday, isSameMonth
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Wrench, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Evento = {
  id: string;
  numero: string;
  titulo: string;
  tipo: "programada" | "vencimento_sla";
  prioridade: string;
  status?: string;
  dataProgramada?: string;
  dataLimiteSLA?: string;
  subsistema?: string;
  componenteTag?: string;
  responsavelNome?: string;
};

const prioridadeColor: Record<string, string> = {
  CRITICA: "bg-red-500",
  ALTA: "bg-orange-400",
  MEDIA: "bg-yellow-400",
  BAIXA: "bg-green-400",
};

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function CalendarioClient({
  eventosPorDia,
  mesAtual,
}: {
  eventosPorDia: Record<string, Evento[]>;
  mesAtual: string;
}) {
  const router = useRouter();
  const [dataRef, setDataRef] = useState(new Date(mesAtual));

  const inicio = startOfMonth(dataRef);
  const fim = endOfMonth(dataRef);
  const dias = eachDayOfInterval({ start: inicio, end: fim });

  // Offset para começar na coluna certa (domingo = 0)
  const offsetInicio = getDay(inicio);

  function navegar(direcao: "prev" | "next") {
    const novaData = direcao === "prev" ? subMonths(dataRef, 1) : addMonths(dataRef, 1);
    setDataRef(novaData);
    const mesStr = format(novaData, "yyyy-MM");
    router.push(`/calendario?mes=${mesStr}`, { scroll: false });
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header navegação */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 capitalize">
          {format(dataRef, "MMMM yyyy", { locale: ptBR })}
        </h2>
        <div className="flex items-center gap-1">
          {/* Legenda */}
          <div className="flex items-center gap-3 mr-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-violet-100 border border-violet-300" />
              Manutenção programada
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-100 border border-red-300" />
              Vencimento SLA
            </span>
          </div>
          <button
            onClick={() => navegar("prev")}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDataRef(new Date())}
            className="px-3 py-1 text-xs rounded-lg hover:bg-gray-100 transition-colors text-gray-600 font-medium"
          >
            Hoje
          </button>
          <button
            onClick={() => navegar("next")}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid de dias da semana */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="text-center py-2 text-xs font-medium text-gray-400">
            {d}
          </div>
        ))}
      </div>

      {/* Grid do calendário */}
      <div className="grid grid-cols-7">
        {/* Células vazias de offset */}
        {Array.from({ length: offsetInicio }).map((_, i) => (
          <div key={`empty-${i}`} className="min-h-[100px] border-b border-r border-gray-50 bg-gray-50/40" />
        ))}

        {dias.map((dia, idx) => {
          const diaStr = format(dia, "yyyy-MM-dd");
          const eventos = eventosPorDia[diaStr] ?? [];
          const hoje = isToday(dia);
          const colIdx = (offsetInicio + idx) % 7;
          const isLastCol = colIdx === 6;

          return (
            <div
              key={diaStr}
              className={cn(
                "min-h-[100px] border-b border-gray-100 p-2 flex flex-col gap-1",
                !isLastCol && "border-r",
                hoje && "bg-violet-50/30"
              )}
            >
              {/* Número do dia */}
              <span
                className={cn(
                  "self-start text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                  hoje
                    ? "bg-violet-600 text-white"
                    : "text-gray-500 hover:bg-gray-100"
                )}
              >
                {format(dia, "d")}
              </span>

              {/* Eventos */}
              {eventos.slice(0, 3).map((ev) => (
                <Link
                  key={`${ev.id}-${ev.tipo}`}
                  href={`/ordens/${ev.id}`}
                  className={cn(
                    "text-xs px-1.5 py-1 rounded-md flex items-start gap-1 group truncate",
                    ev.tipo === "programada"
                      ? "bg-violet-50 text-violet-700 hover:bg-violet-100"
                      : "bg-red-50 text-red-700 hover:bg-red-100"
                  )}
                  title={ev.titulo}
                >
                  {ev.tipo === "programada" ? (
                    <Wrench className="w-3 h-3 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                  )}
                  <span className="truncate leading-tight">{ev.titulo}</span>
                </Link>
              ))}

              {eventos.length > 3 && (
                <span className="text-xs text-gray-400 pl-1">
                  +{eventos.length - 3} mais
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
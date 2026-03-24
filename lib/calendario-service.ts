import { prisma } from "@/lib/prisma";
import {
  startOfMonth,
  endOfMonth,
  format,
  addMonths,
  addWeeks,
  addYears,
} from "date-fns";
import {
  PERIODICIDADE_LABEL,
  PERIODICIDADE_COR,
} from "@/lib/checklist-preventiva";

// ─── Tipos exportados ─────────────────────────────────────────────────────────

export type EventoCalendario =
  | EventoPreventiva
  | EventoCorretiva
  | EventoVencimentoSLA;

export type EventoPreventiva = {
  tipo: "os_preventiva";
  periodicidade: string;
  periodicidadeLabel: string;
  cor: { bg: string; text: string; border: string };
  sugestao: boolean; // true = ainda não tem OS criada
  os: OSResumida;
};

export type EventoCorretiva = {
  tipo: "os_corretiva";
  os: OSResumida;
};

export type EventoVencimentoSLA = {
  tipo: "vencimento_sla";
  slaVencido: boolean;
  os: OSResumida;
};

export type OSResumida = {
  id: string;
  numero: string;
  titulo: string;
  status: string;
  prioridade: string;
  tipoOS: string;
  subsistema: string;
  containerId?: string | null;
  responsavel: { nome: string; avatarUrl?: string | null } | null;
  dataLimiteSLA?: Date | null;
  slaVencido?: boolean;
};

// ─── Função principal ─────────────────────────────────────────────────────────

export async function getCalendarioData(mesParam?: string) {
  let dataRef = new Date();

  if (mesParam) {
    const [ano, mes] = mesParam.split("-").map(Number);
    dataRef = new Date(ano, mes - 1, 1);
  }

  const inicio = startOfMonth(dataRef);
  const fim = endOfMonth(dataRef);

  // ── Busca OS preventivas com dataProgramada ───────────────────────────────
  const osPreventivas = await prisma.ordemServico.findMany({
    where: {
      tipoOS: "PREVENTIVA",
      dataProgramada: { not: null },
    },
    select: {
      id: true,
      numero: true,
      titulo: true,
      tipoOS: true,
      periodicidadePreventiva: true,
      prioridade: true,
      status: true,
      dataProgramada: true,
      subsistema: true,
      containerId: true,
      dataLimiteSLA: true,
      slaVencido: true,
      responsavel: { select: { nome: true, avatarUrl: true } },
    },
    orderBy: { dataProgramada: "asc" },
  });

  // ── Busca OS corretivas com dataProgramada ou dataLimiteSLA no mês ────────
  const osCorretivas = await prisma.ordemServico.findMany({
    where: {
      tipoOS: "CORRETIVA",
      OR: [
        { dataProgramada: { gte: inicio, lte: fim } },
        { dataLimiteSLA: { gte: inicio, lte: fim } },
      ],
    },
    select: {
      id: true,
      numero: true,
      titulo: true,
      tipoOS: true,
      prioridade: true,
      status: true,
      dataProgramada: true,
      dataLimiteSLA: true,
      slaVencido: true,
      subsistema: true,
      containerId: true,
      responsavel: { select: { nome: true, avatarUrl: true } },
    },
    orderBy: { dataLimiteSLA: "asc" },
  });

  const eventosPorDia: Record<string, EventoCalendario[]> = {};

  function addEvento(diaKey: string, ev: EventoCalendario) {
    if (!eventosPorDia[diaKey]) eventosPorDia[diaKey] = [];
    eventosPorDia[diaKey].push(ev);
  }

  // ── 1. OS preventivas reais no mês ───────────────────────────────────────
  for (const os of osPreventivas) {
    if (!os.dataProgramada || !os.periodicidadePreventiva) continue;

    const data = new Date(os.dataProgramada);
    if (data < inicio || data > fim) continue;

    const diaKey = format(data, "yyyy-MM-dd");
    const per = os.periodicidadePreventiva;

    addEvento(diaKey, {
      tipo: "os_preventiva",
      periodicidade: per,
      periodicidadeLabel: PERIODICIDADE_LABEL[per] ?? per,
      cor: PERIODICIDADE_COR[per] ?? fallbackCor(),
      sugestao: false,
      os: toOSResumida(os),
    });
  }

  // ── 2. Sugestões de próximas preventivas ─────────────────────────────────
  const ultimasPorPeriodicidade = getUltimasOS(osPreventivas);

  for (const os of ultimasPorPeriodicidade) {
    if (!os.dataProgramada || !os.periodicidadePreventiva) continue;

    const proximaData = calcularProximaData(
      os.dataProgramada,
      os.periodicidadePreventiva
    );
    if (!proximaData || proximaData < inicio || proximaData > fim) continue;

    const diaKey = format(proximaData, "yyyy-MM-dd");
    const per = os.periodicidadePreventiva;

    const jaExiste = (eventosPorDia[diaKey] ?? []).some(
      (e) => e.tipo === "os_preventiva" && (e as EventoPreventiva).periodicidade === per
    );
    if (jaExiste) continue;

    addEvento(diaKey, {
      tipo: "os_preventiva",
      periodicidade: per,
      periodicidadeLabel: PERIODICIDADE_LABEL[per] ?? per,
      cor: PERIODICIDADE_COR[per] ?? fallbackCor(),
      sugestao: true,
      os: {
        id: `sugestao-${per}`,
        numero: "—",
        titulo: `Preventiva sugerida (${PERIODICIDADE_LABEL[per] ?? per})`,
        status: "ABERTA",
        prioridade: "MEDIA",
        tipoOS: "PREVENTIVA",
        subsistema: os.subsistema,
        containerId: os.containerId,
        responsavel: null,
      },
    });
  }

  // ── 3. OS corretivas no mês ──────────────────────────────────────────────
  for (const os of osCorretivas) {
    const dataBase = os.dataProgramada ?? os.dataLimiteSLA;
    if (!dataBase) continue;

    const data = new Date(dataBase);
    if (data >= inicio && data <= fim) {
      const diaKey = format(data, "yyyy-MM-dd");
      addEvento(diaKey, { tipo: "os_corretiva", os: toOSResumida(os) });
    }

    // Evento separado de vencimento SLA quando cai em dia diferente
    if (os.dataLimiteSLA) {
      const slaData = new Date(os.dataLimiteSLA);
      const slaDiaKey = format(slaData, "yyyy-MM-dd");
      const baseDiaKey = data ? format(data, "yyyy-MM-dd") : null;

      if (
        slaData >= inicio &&
        slaData <= fim &&
        slaDiaKey !== baseDiaKey
      ) {
        addEvento(slaDiaKey, {
          tipo: "vencimento_sla",
          slaVencido: os.slaVencido ?? false,
          os: toOSResumida(os),
        });
      }
    }
  }

  // ── 4. Resumo por periodicidade (só preventivas) ─────────────────────────
  const resumoPorPeriodicidade: Record<
    string,
    { previstas: number; executadas: number; pendentes: number }
  > = {};

  for (const eventos of Object.values(eventosPorDia)) {
    for (const ev of eventos) {
      if (ev.tipo !== "os_preventiva") continue;

      const per = (ev as EventoPreventiva).periodicidade;

      if (!resumoPorPeriodicidade[per]) {
        resumoPorPeriodicidade[per] = { previstas: 0, executadas: 0, pendentes: 0 };
      }

      resumoPorPeriodicidade[per].previstas++;

      if (ev.os.status === "CONCLUIDA") {
        resumoPorPeriodicidade[per].executadas++;
      } else {
        resumoPorPeriodicidade[per].pendentes++;
      }
    }
  }

  return {
    mes: mesParam ?? format(dataRef, "yyyy-MM"),
    eventosPorDia,
    totalOSProgramadas: Object.values(eventosPorDia).flat().length,
    resumoPorPeriodicidade,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toOSResumida(os: any): OSResumida {
  return {
    id: os.id,
    numero: os.numero,
    titulo: os.titulo,
    status: os.status,
    prioridade: os.prioridade,
    tipoOS: os.tipoOS,
    subsistema: os.subsistema,
    containerId: os.containerId ?? null,
    responsavel: os.responsavel ?? null,
    dataLimiteSLA: os.dataLimiteSLA ?? null,
    slaVencido: os.slaVencido ?? false,
  };
}

function fallbackCor() {
  return { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-200" };
}

function getUltimasOS(osList: any[]) {
  const map = new Map<string, any>();
  for (const os of osList) {
    const key = os.periodicidadePreventiva;
    if (!key) continue;
    const atual = map.get(key);
    if (!atual || os.dataProgramada > atual.dataProgramada) {
      map.set(key, os);
    }
  }
  return Array.from(map.values());
}

/**
 * Calcula a próxima data de preventiva a partir da última OS registrada.
 * Cobre todos os valores do enum PeriodicidadePreventiva do schema.
 *
 *   DIARIA     → agrupa mensalmente no calendário (não faz sentido exibir dia a dia)
 *   SEMANAL    → +1 semana
 *   MENSAL     → +1 mês
 *   TRIMESTRAL → +3 meses
 *   SEMESTRAL  → +6 meses
 *   ANUAL      → +1 ano
 *   HORAS_2000 → sem cadência temporal fixa, sem sugestão automática
 *   BIENNIAL   → +2 anos
 */
function calcularProximaData(data: Date, periodicidade: string): Date | null {
  switch (periodicidade) {
    case "DIARIA":
      return addMonths(data, 1);
    case "SEMANAL":
      return addWeeks(data, 1);
    case "MENSAL":
      return addMonths(data, 1);
    case "TRIMESTRAL":
      return addMonths(data, 3);
    case "SEMESTRAL":
      return addMonths(data, 6);
    case "ANUAL":
      return addYears(data, 1);
    case "HORAS_2000":
      return null;
    case "BIENNIAL":
      return addYears(data, 2);
    default:
      return null;
  }
}
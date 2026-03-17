import { addMonths, differenceInDays, differenceInHours, isPast, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { format } from "date-fns";

export const PRAZO_CONTRATO_MESES = 24; // conforme contrato Axia

export interface SLAInfo {
  dataEmissaoAxia: Date;
  dataLimite: Date;
  diasRestantes: number;
  horasRestantes: number;
  percentualDecorrido: number; // 0–100
  vencido: boolean;
  statusLabel: string;
  statusColor: "green" | "yellow" | "orange" | "red";
  tempoFormatado: string;
}

/**
 * Calcula SLA com base na data de emissão da OS pela Axia (CONTRATANTE).
 * Prazo: 24 meses a partir da emissão.
 */
export function calcularSLA(dataEmissaoAxia: Date): SLAInfo {
  const agora = new Date();
  const dataLimite = addMonths(dataEmissaoAxia, PRAZO_CONTRATO_MESES);
  const totalDias = differenceInDays(dataLimite, dataEmissaoAxia);
  const diasDecorridos = differenceInDays(agora, dataEmissaoAxia);
  const diasRestantes = differenceInDays(dataLimite, agora);
  const horasRestantes = differenceInHours(dataLimite, agora);
  const vencido = isPast(dataLimite);
  const percentualDecorrido = Math.min(
    100,
    Math.max(0, Math.round((diasDecorridos / totalDias) * 100))
  );

  let statusLabel: string;
  let statusColor: SLAInfo["statusColor"];
  let tempoFormatado: string;

  if (vencido) {
    statusLabel = "SLA Vencido";
    statusColor = "red";
    const diasAtrasado = Math.abs(diasRestantes);
    tempoFormatado = `Vencido há ${diasAtrasado} dia${diasAtrasado !== 1 ? "s" : ""}`;
  } else if (diasRestantes <= 30) {
    statusLabel = "Crítico";
    statusColor = "red";
    tempoFormatado = `${diasRestantes} dia${diasRestantes !== 1 ? "s" : ""} restantes`;
  } else if (diasRestantes <= 90) {
    statusLabel = "Atenção";
    statusColor = "orange";
    tempoFormatado = `${diasRestantes} dias restantes`;
  } else if (diasRestantes <= 180) {
    statusLabel = "Em andamento";
    statusColor = "yellow";
    tempoFormatado = `${diasRestantes} dias restantes`;
  } else {
    statusLabel = "No prazo";
    statusColor = "green";
    const mesesRestantes = Math.floor(diasRestantes / 30);
    tempoFormatado = `${mesesRestantes} meses restantes`;
  }

  return {
    dataEmissaoAxia,
    dataLimite,
    diasRestantes,
    horasRestantes,
    percentualDecorrido,
    vencido,
    statusLabel,
    statusColor,
    tempoFormatado,
  };
}

export function formatarDataBR(data: Date): string {
  return format(data, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

export function formatarDataCurta(data: Date): string {
  return format(data, "dd/MM/yyyy", { locale: ptBR });
}

/**
 * Gera o número sequencial da OS: OS-YYYY-NNN
 */
export function gerarNumeroOS(sequencial: number): string {
  const ano = new Date().getFullYear();
  const num = String(sequencial).padStart(4, "0");
  return `OS-${ano}-${num}`;
}

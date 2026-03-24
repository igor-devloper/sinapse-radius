/**
 * lib/sla-manual.ts
 *
 * Regras de SLA aplicadas SOMENTE às OS corretivas — Contrato Axia §1.3.4.
 * OS preventivas NÃO possuem SLA.
 */

import { addHours, differenceInHours, differenceInMinutes, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { format } from "date-fns";

export interface PrazoSLA {
  resolucaoHoras: number;
  atuacaoHoras?: number;
  fonte: string;
}

// ─── SLA apenas para atividades CORRETIVAS ────────────────────────────────────
export const PRAZO_SLA: Record<string, PrazoSLA> = {
  FALHA_ENERGIA:                 { resolucaoHoras: 96,  atuacaoHoras: 48,  fonte: "Contrato Axia §1.3.4 — Sistema offline" },
  FALHA_BOMBA_CIRCULACAO:        { resolucaoHoras: 96,  atuacaoHoras: 48,  fonte: "Contrato Axia §1.3.4 — Sistema offline" },
  FALHA_VENTILADOR_EXAUSTAO:     { resolucaoHoras: 96,  atuacaoHoras: 48,  fonte: "Contrato Axia §1.3.4 — Máq. offline >10%" },
  FALHA_BOMBA_REPOSICAO:         { resolucaoHoras: 96,  atuacaoHoras: 48,  fonte: "Contrato Axia §1.3.4 — Sistema offline" },
  ALARME_VAZAMENTO:              { resolucaoHoras: 96,  atuacaoHoras: 48,  fonte: "Contrato Axia §1.3.4 — Sistema offline" },
  ALARME_ALTA_TEMPERATURA:       { resolucaoHoras: 96,  atuacaoHoras: 48,  fonte: "Contrato Axia §1.3.4 — Sistema offline" },
  ALARME_ALTA_PRESSAO:           { resolucaoHoras: 96,  atuacaoHoras: 48,  fonte: "Contrato Axia §1.3.4 — Sistema offline" },
  ALARME_BAIXA_PRESSAO:          { resolucaoHoras: 96,  atuacaoHoras: 48,  fonte: "Contrato Axia §1.3.4 — Sistema offline" },
  ALARME_BAIXA_VAZAO:            { resolucaoHoras: 96,  atuacaoHoras: 48,  fonte: "Contrato Axia §1.3.4 — Sistema offline" },
  ALARME_CONDENSACAO:            { resolucaoHoras: 192, atuacaoHoras: 120, fonte: "Contrato Axia §1.3.4 — Máq. offline ≤10%" },
  FALHA_VEDACAO_BOMBA:           { resolucaoHoras: 96,  atuacaoHoras: 48,  fonte: "Contrato Axia §1.3.4 — Sistema offline" },
  FALHA_VENTILADOR_TORRE:        { resolucaoHoras: 192, atuacaoHoras: 120, fonte: "Contrato Axia §1.3.4 — Máq. offline ≤10%" },
  SUBSTITUICAO_VALVULA_EXAUSTAO: { resolucaoHoras: 192, atuacaoHoras: 120, fonte: "Contrato Axia §1.3.4 — Máq. offline ≤10%" },
  SUBSTITUICAO_VENTILADOR_TORRE: { resolucaoHoras: 192, atuacaoHoras: 120, fonte: "Contrato Axia §1.3.4 — Máq. offline ≤10%" },
  OUTRO:                         { resolucaoHoras: 192, atuacaoHoras: 120, fonte: "Contrato Axia §1.3.4 — Máq. offline ≤10%" },
};

export const PRAZO_HORAS: Record<string, number> = Object.fromEntries(
  Object.entries(PRAZO_SLA).map(([k, v]) => [k, v.resolucaoHoras])
);

export const ATIVIDADE_CORRETIVA_LABEL: Record<string, string> = {
  FALHA_ENERGIA:                 "Falha de energia",
  FALHA_BOMBA_CIRCULACAO:        "Falha bomba de circulação",
  FALHA_VENTILADOR_EXAUSTAO:     "Falha ventilador de exaustão",
  FALHA_BOMBA_REPOSICAO:         "Falha bomba de reposição",
  ALARME_VAZAMENTO:              "Alarme de vazamento",
  ALARME_ALTA_TEMPERATURA:       "Alarme alta temperatura de fornecimento",
  ALARME_ALTA_PRESSAO:           "Alarme alta pressão de fornecimento",
  ALARME_BAIXA_PRESSAO:          "Alarme baixa pressão de retorno",
  ALARME_BAIXA_VAZAO:            "Alarme baixa vazão de fornecimento",
  ALARME_CONDENSACAO:            "Alarme de condensação",
  FALHA_VEDACAO_BOMBA:           "Falha vedação mecânica da bomba",
  FALHA_VENTILADOR_TORRE:        "Falha ventilador — torre seca",
  SUBSTITUICAO_VALVULA_EXAUSTAO: "Substituição válvula de exaustão",
  SUBSTITUICAO_VENTILADOR_TORRE: "Substituição ventilador torre seca",
  OUTRO:                         "Outro",
};

export const ATIVIDADE_REFERENCIA_MANUAL: Record<string, string> = Object.fromEntries(
  Object.entries(PRAZO_SLA).map(([k, v]) => [k, v.fonte])
);

export const ATIVIDADES_CORRETIVAS = Object.keys(PRAZO_SLA);

export const SUBSISTEMAS = [
  "Estação de Bombas",
  "Torre Seca",
  "Torre Seca/Úmida",
  "QCP — Quadro de Controle Principal",
  "QDC A — Quadro de Distribuição",
  "QDC B — Quadro de Distribuição",
  "Sistema de Manifold",
  "Trocador de Calor de Placas",
  "Sistema de Rede / Distribuição",
  "Tanque de Armazenamento",
  "Ventiladores de Exaustão",
  "Servidores / Placas de Resfriamento",
  "Geral",
];

// ─── Tipo de SLA info ─────────────────────────────────────────────────────────
export interface SLAInfo {
  tipoAtividadeCorretiva: string;
  prazoHoras: number;
  atuacaoHoras?: number;
  dataEmissaoAxia: Date;
  dataLimiteSLA: Date;
  dataLimiteAtuacao?: Date;
  horasRestantes: number;
  minutosRestantes: number;
  percentualDecorrido: number;
  vencido: boolean;
  statusLabel: string;
  statusColor: "green" | "yellow" | "orange" | "red";
  tempoFormatado: string;
  referenciaManual: string;
}

/**
 * Calcula o SLA para uma OS corretiva.
 * Deve ser chamado APENAS quando tipoOS === "CORRETIVA".
 */
export function calcularSLA(dataEmissaoAxia: Date, tipoAtividadeCorretiva: string): SLAInfo {
  const prazoConfig = PRAZO_SLA[tipoAtividadeCorretiva] ?? { resolucaoHoras: 72, fonte: "—" };
  const prazoHoras = prazoConfig.resolucaoHoras;
  const atuacaoHoras = prazoConfig.atuacaoHoras;

  const dataLimiteSLA = addHours(dataEmissaoAxia, prazoHoras);
  const dataLimiteAtuacao = atuacaoHoras ? addHours(dataEmissaoAxia, atuacaoHoras) : undefined;

  const agora = new Date();
  const horasRestantes = differenceInHours(dataLimiteSLA, agora);
  const minutosRestantes = differenceInMinutes(dataLimiteSLA, agora);
  const vencido = isPast(dataLimiteSLA);
  const horasDecorridas = differenceInHours(agora, dataEmissaoAxia);
  const percentualDecorrido = Math.min(100, Math.max(0, Math.round((horasDecorridas / prazoHoras) * 100)));
  const pct = percentualDecorrido;

  let statusLabel: string, statusColor: SLAInfo["statusColor"], tempoFormatado: string;

  if (vencido) {
    statusLabel = "SLA Vencido"; statusColor = "red";
    const h = Math.abs(horasRestantes);
    tempoFormatado = h < 24 ? `Vencido há ${h}h` : `Vencido há ${Math.floor(h / 24)}d ${h % 24}h`;
  } else if (pct >= 90 || horasRestantes <= 4) {
    statusLabel = "Crítico"; statusColor = "red";
    tempoFormatado = horasRestantes < 1 ? `${minutosRestantes} min` : `${horasRestantes}h restantes`;
  } else if (pct >= 70) {
    statusLabel = "Atenção"; statusColor = "orange";
    tempoFormatado = horasRestantes < 48 ? `${horasRestantes}h restantes` : `${Math.floor(horasRestantes / 24)}d restantes`;
  } else if (pct >= 40) {
    statusLabel = "Em andamento"; statusColor = "yellow";
    tempoFormatado = horasRestantes < 48 ? `${horasRestantes}h restantes` : `${Math.floor(horasRestantes / 24)}d restantes`;
  } else {
    statusLabel = "No prazo"; statusColor = "green";
    tempoFormatado = horasRestantes < 48 ? `${horasRestantes}h restantes` : `${Math.floor(horasRestantes / 24)}d restantes`;
  }

  return {
    tipoAtividadeCorretiva, prazoHoras, atuacaoHoras, dataEmissaoAxia,
    dataLimiteSLA, dataLimiteAtuacao, horasRestantes, minutosRestantes,
    percentualDecorrido, vencido, statusLabel, statusColor, tempoFormatado,
    referenciaManual: prazoConfig.fonte,
  };
}

// ─── Helpers de formatação ────────────────────────────────────────────────────
export function formatarDataBR(data: Date): string {
  return format(data, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

export function formatarDataCurta(data: Date): string {
  return format(data, "dd/MM/yyyy", { locale: ptBR });
}

export function prazoFormatado(horas: number): string {
  if (horas < 24) return `${horas}h`;
  if (horas < 168) return `${Math.floor(horas / 24)} dias`;
  if (horas < 720) return `${Math.floor(horas / 168)} sem.`;
  if (horas < 8760) return `${Math.floor(horas / 720)} meses`;
  return `${Math.floor(horas / 8760)} ano(s)`;
}

export function gerarNumeroOS(sequencial: number): string {
  const ano = new Date().getFullYear();
  return `OS-${ano}-${String(sequencial).padStart(4, "0")}`;
}
/**
 * lib/sla-manual.ts
 *
 * Prazos de SLA derivados de:
 *   1. Manual ANTSPACE HK3 V6 — Seção 9 (manutenções preventivas)
 *   2. Contrato Axia — Seção 1.3.4 (SLAs de operação corretiva)
 *
 * Tabela contratual Axia:
 *   Máquinas offline até 10%   → Atuação: 5 dias (120h) / Resolução: 8 dias (192h)
 *   Máquinas offline acima 10% → Atuação: 48h          / Resolução: 96h
 *   Sistema offline             → Atuação: 48h          / Resolução: 96h
 *
 * Todos os prazos em HORAS para uniformidade.
 */

import { addHours, differenceInHours, differenceInMinutes, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { format } from "date-fns";

// ─── Tabela de prazos (em horas) ──────────────────────────────────────────────
// Para corretivas: usamos o prazo de RESOLUÇÃO (mais crítico).
// O campo slaAtuacaoHoras é informativo para exibição.

export interface PrazoSLA {
  resolucaoHoras: number;   // prazo principal usado para calcular deadline
  atuacaoHoras?: number;    // prazo de atuação (alerta antecipado)
  fonte: string;            // referência do manual ou contrato
}

export const PRAZO_SLA: Record<string, PrazoSLA> = {
  // ── Preventiva (Manual ANTSPACE HK3 V6, Seção 9) ─────────────────────────
  LUBRIFICACAO_ROLAMENTOS:          { resolucaoHoras: 2000, fonte: "Manual §9.3.7 — a cada 2.000h" },
  FILTRO_SUCCAO_ASPERSAO:           { resolucaoHoras: 720,  fonte: "Manual §9.3.1 — mensal" },
  FILTRO_DUTO_FORNECIMENTO:         { resolucaoHoras: 720,  fonte: "Manual §9.3.1 — mensal" },
  INSPECAO_ALETAS_TROCADOR:         { resolucaoHoras: 720,  fonte: "Manual §9.4.2 — mensal" },
  MANUTENCAO_VENTILADOR_TORRE:      { resolucaoHoras: 720,  fonte: "Manual §9.4.5 — mensal" },
  VERIFICACAO_QUADRO_CONTROLE:      { resolucaoHoras: 720,  fonte: "Manual §9.4.4 — mensal" },
  INSPECAO_NIVEL_TANQUE_CONTAINER:  { resolucaoHoras: 168,  fonte: "Manual §9.3.5 — semanal" },
  INSPECAO_NIVEL_TANQUE_TORRE:      { resolucaoHoras: 24,   fonte: "Manual §9.3.5 — diário" },
  REGISTRO_TEMPERATURA_PRESSAO:     { resolucaoHoras: 12,   fonte: "Manual §9.2.2 — 2× ao dia" },
  FILTRO_Y_REPOSICAO:               { resolucaoHoras: 4380, fonte: "Manual §9.3.1 — semestral" },
  INSPECAO_VAZAMENTOS_TUBULACAO:    { resolucaoHoras: 4380, fonte: "Manual §9.3.2 — semestral" },
  TESTE_PH_FLUIDO:                  { resolucaoHoras: 4380, fonte: "Manual §9.3.6 — semestral" },
  INSPECAO_ELETRICA_QCP:            { resolucaoHoras: 4380, fonte: "Manual §9.3.3 — semestral" },
  DRENAGEM_TOPO_TORRE:              { resolucaoHoras: 2190, fonte: "Manual §9.4.3 — trimestral" },
  SUBSTITUICAO_FLUIDO_REFRIGERANTE: { resolucaoHoras: 8760, fonte: "Manual §9.3.4 — anual" },
  INSPECAO_ANUAL_GERAL:             { resolucaoHoras: 8760, fonte: "Manual §9.4.6 — anual" },

  // ── Corretiva — Contrato Axia §1.3.4 ─────────────────────────────────────
  // Sistema offline (problema elétrico/hidráulico/comunicação/refrigeração)
  // → Atuação: 48h | Resolução: 96h
  FALHA_ENERGIA:              { resolucaoHoras: 96,  atuacaoHoras: 48,  fonte: "Contrato Axia §1.3.4 — Sistema offline" },
  FALHA_BOMBA_CIRCULACAO:     { resolucaoHoras: 96,  atuacaoHoras: 48,  fonte: "Contrato Axia §1.3.4 — Sistema offline" },
  FALHA_VENTILADOR_EXAUSTAO:  { resolucaoHoras: 96,  atuacaoHoras: 48,  fonte: "Contrato Axia §1.3.4 — Máq. offline >10%" },
  FALHA_BOMBA_REPOSICAO:      { resolucaoHoras: 96,  atuacaoHoras: 48,  fonte: "Contrato Axia §1.3.4 — Sistema offline" },
  ALARME_VAZAMENTO:           { resolucaoHoras: 96,  atuacaoHoras: 48,  fonte: "Contrato Axia §1.3.4 — Sistema offline" },
  ALARME_ALTA_TEMPERATURA:    { resolucaoHoras: 96,  atuacaoHoras: 48,  fonte: "Contrato Axia §1.3.4 — Sistema offline" },
  ALARME_ALTA_PRESSAO:        { resolucaoHoras: 96,  atuacaoHoras: 48,  fonte: "Contrato Axia §1.3.4 — Sistema offline" },
  ALARME_BAIXA_PRESSAO:       { resolucaoHoras: 96,  atuacaoHoras: 48,  fonte: "Contrato Axia §1.3.4 — Sistema offline" },
  ALARME_BAIXA_VAZAO:         { resolucaoHoras: 96,  atuacaoHoras: 48,  fonte: "Contrato Axia §1.3.4 — Sistema offline" },
  ALARME_CONDENSACAO:         { resolucaoHoras: 192, atuacaoHoras: 120, fonte: "Contrato Axia §1.3.4 — Máq. offline ≤10%" },
  FALHA_VEDACAO_BOMBA:        { resolucaoHoras: 96,  atuacaoHoras: 48,  fonte: "Contrato Axia §1.3.4 — Sistema offline" },
  FALHA_VENTILADOR_TORRE:     { resolucaoHoras: 192, atuacaoHoras: 120, fonte: "Contrato Axia §1.3.4 — Máq. offline ≤10%" },
  SUBSTITUICAO_VALVULA_EXAUSTAO: { resolucaoHoras: 192, atuacaoHoras: 120, fonte: "Contrato Axia §1.3.4 — Máq. offline ≤10%" },
  SUBSTITUICAO_VENTILADOR_TORRE: { resolucaoHoras: 192, atuacaoHoras: 120, fonte: "Contrato Axia §1.3.4 — Máq. offline ≤10%" },
  OUTRO:                      { resolucaoHoras: 192, atuacaoHoras: 120, fonte: "Contrato Axia §1.3.4 — Máq. offline ≤10%" },
};

// Compat — mantém PRAZO_HORAS apontando para resolucaoHoras
export const PRAZO_HORAS: Record<string, number> = Object.fromEntries(
  Object.entries(PRAZO_SLA).map(([k, v]) => [k, v.resolucaoHoras])
);

// ─── Labels ───────────────────────────────────────────────────────────────────
export const ATIVIDADE_LABEL: Record<string, string> = {
  LUBRIFICACAO_ROLAMENTOS:          "Lubrificação de rolamentos (bomba)",
  FILTRO_SUCCAO_ASPERSAO:           "Limpeza filtro sucção — aspersão torre",
  FILTRO_DUTO_FORNECIMENTO:         "Limpeza filtro — duto de fornecimento",
  INSPECAO_ALETAS_TROCADOR:         "Inspeção/limpeza aletas trocador de calor",
  MANUTENCAO_VENTILADOR_TORRE:      "Manutenção ventiladores — torre seca",
  VERIFICACAO_QUADRO_CONTROLE:      "Verificação quadro de controle elétrico",
  INSPECAO_NIVEL_TANQUE_CONTAINER:  "Inspeção nível tanque — container",
  INSPECAO_NIVEL_TANQUE_TORRE:      "Inspeção nível tanque — torre seca",
  REGISTRO_TEMPERATURA_PRESSAO:     "Registro temperatura / pressão / vazão",
  FILTRO_Y_REPOSICAO:               "Limpeza filtro Y — duto de reposição",
  INSPECAO_VAZAMENTOS_TUBULACAO:    "Inspeção vazamentos — rede de tubulações",
  TESTE_PH_FLUIDO:                  "Teste de pH do fluido refrigerante",
  INSPECAO_ELETRICA_QCP:            "Inspeção elétrica terminais QCP",
  DRENAGEM_TOPO_TORRE:              "Drenagem porta topo — torre seca",
  SUBSTITUICAO_FLUIDO_REFRIGERANTE: "Substituição fluido refrigerante",
  INSPECAO_ANUAL_GERAL:             "Inspeção anual geral",
  FALHA_ENERGIA:                    "Falha de energia",
  FALHA_BOMBA_CIRCULACAO:           "Falha bomba de circulação",
  FALHA_VENTILADOR_EXAUSTAO:        "Falha ventilador de exaustão",
  FALHA_BOMBA_REPOSICAO:            "Falha bomba de reposição",
  ALARME_VAZAMENTO:                 "Alarme de vazamento",
  ALARME_ALTA_TEMPERATURA:          "Alarme alta temperatura de fornecimento",
  ALARME_ALTA_PRESSAO:              "Alarme alta pressão de fornecimento",
  ALARME_BAIXA_PRESSAO:             "Alarme baixa pressão de retorno",
  ALARME_BAIXA_VAZAO:               "Alarme baixa vazão de fornecimento",
  ALARME_CONDENSACAO:               "Alarme de condensação",
  FALHA_VEDACAO_BOMBA:              "Falha vedação mecânica da bomba",
  FALHA_VENTILADOR_TORRE:           "Falha ventilador — torre seca",
  SUBSTITUICAO_VALVULA_EXAUSTAO:    "Substituição válvula de exaustão",
  SUBSTITUICAO_VENTILADOR_TORRE:    "Substituição ventilador torre seca",
  OUTRO:                            "Outro",
};

export const ATIVIDADE_REFERENCIA_MANUAL: Record<string, string> = Object.fromEntries(
  Object.entries(PRAZO_SLA).map(([k, v]) => [k, v.fonte])
);

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

export const ATIVIDADES_PREVENTIVAS = [
  "LUBRIFICACAO_ROLAMENTOS","FILTRO_SUCCAO_ASPERSAO","FILTRO_DUTO_FORNECIMENTO",
  "INSPECAO_ALETAS_TROCADOR","MANUTENCAO_VENTILADOR_TORRE","VERIFICACAO_QUADRO_CONTROLE",
  "INSPECAO_NIVEL_TANQUE_CONTAINER","INSPECAO_NIVEL_TANQUE_TORRE","REGISTRO_TEMPERATURA_PRESSAO",
  "FILTRO_Y_REPOSICAO","INSPECAO_VAZAMENTOS_TUBULACAO","TESTE_PH_FLUIDO",
  "INSPECAO_ELETRICA_QCP","DRENAGEM_TOPO_TORRE","SUBSTITUICAO_FLUIDO_REFRIGERANTE","INSPECAO_ANUAL_GERAL",
];

export const ATIVIDADES_CORRETIVAS = [
  "FALHA_ENERGIA","FALHA_BOMBA_CIRCULACAO","FALHA_VENTILADOR_EXAUSTAO","FALHA_BOMBA_REPOSICAO",
  "ALARME_VAZAMENTO","ALARME_ALTA_TEMPERATURA","ALARME_ALTA_PRESSAO","ALARME_BAIXA_PRESSAO",
  "ALARME_BAIXA_VAZAO","ALARME_CONDENSACAO","FALHA_VEDACAO_BOMBA","FALHA_VENTILADOR_TORRE",
  "SUBSTITUICAO_VALVULA_EXAUSTAO","SUBSTITUICAO_VENTILADOR_TORRE","OUTRO",
];

// ─── Tipos ────────────────────────────────────────────────────────────────────
export interface SLAInfo {
  tipoAtividade: string;
  prazoHoras: number;           // resolucaoHoras
  atuacaoHoras?: number;        // prazo de atuação (corretivas)
  dataEmissaoAxia: Date;
  dataLimiteSLA: Date;          // deadline de resolução
  dataLimiteAtuacao?: Date;     // deadline de atuação (corretivas)
  horasRestantes: number;
  minutosRestantes: number;
  percentualDecorrido: number;
  vencido: boolean;
  statusLabel: string;
  statusColor: "green" | "yellow" | "orange" | "red";
  tempoFormatado: string;
  referenciaManual: string;
  isCorretiva: boolean;
}

// ─── Calculador ───────────────────────────────────────────────────────────────
export function calcularSLA(dataEmissaoAxia: Date, tipoAtividade: string): SLAInfo {
  const prazoConfig = PRAZO_SLA[tipoAtividade] ?? { resolucaoHoras: 72, fonte: "—" };
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
  const isCorretiva = ATIVIDADES_CORRETIVAS.includes(tipoAtividade);

  let statusLabel: string;
  let statusColor: SLAInfo["statusColor"];
  let tempoFormatado: string;

  if (vencido) {
    statusLabel = "SLA Vencido";
    statusColor = "red";
    const hAtrasado = Math.abs(horasRestantes);
    tempoFormatado = hAtrasado < 24
      ? `Vencido há ${hAtrasado}h`
      : `Vencido há ${Math.floor(hAtrasado / 24)}d ${hAtrasado % 24}h`;
  } else if (pct >= 90 || horasRestantes <= (isCorretiva ? 4 : 2)) {
    statusLabel = "Crítico";
    statusColor = "red";
    tempoFormatado = horasRestantes < 1
      ? `${minutosRestantes} min restantes`
      : `${horasRestantes}h restantes`;
  } else if (pct >= 70) {
    statusLabel = "Atenção";
    statusColor = "orange";
    tempoFormatado = horasRestantes < 48
      ? `${horasRestantes}h restantes`
      : `${Math.floor(horasRestantes / 24)}d restantes`;
  } else if (pct >= 40) {
    statusLabel = "Em andamento";
    statusColor = "yellow";
    tempoFormatado = horasRestantes < 48
      ? `${horasRestantes}h restantes`
      : `${Math.floor(horasRestantes / 24)}d restantes`;
  } else {
    statusLabel = "No prazo";
    statusColor = "green";
    tempoFormatado = horasRestantes < 48
      ? `${horasRestantes}h restantes`
      : `${Math.floor(horasRestantes / 24)}d restantes`;
  }

  return {
    tipoAtividade, prazoHoras, atuacaoHoras,
    dataEmissaoAxia, dataLimiteSLA, dataLimiteAtuacao,
    horasRestantes, minutosRestantes, percentualDecorrido, vencido,
    statusLabel, statusColor, tempoFormatado,
    referenciaManual: prazoConfig.fonte,
    isCorretiva,
  };
}

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
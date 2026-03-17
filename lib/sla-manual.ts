/**
 * lib/sla-manual.ts
 * 
 * Prazos de SLA derivados do Manual ANTSPACE HK3 V6 — Bitmain Technologies
 * Seção 9 — Manutenção do Sistema
 * 
 * Todos os prazos estão em HORAS para uniformidade de cálculo.
 * O prazo é aplicado a partir de dataEmissaoAxia (data/hora da OS emitida pela Axia).
 */

import { addHours, differenceInHours, differenceInMinutes, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { format } from "date-fns";

// ─── Tabela de prazos por atividade (em horas) ────────────────────────────────

export const PRAZO_HORAS: Record<string, number> = {
  // ── Prazos do Manual ────────────────────────────────────────────────────────
  LUBRIFICACAO_ROLAMENTOS:          2000,  // Seção 9.2.7 — exatamente 2.000h operação (~83 dias)
  FILTRO_SUCCAO_ASPERSAO:           720,   // Seção 9.3.1 — mensal (~30 dias)
  FILTRO_DUTO_FORNECIMENTO:         720,   // Seção 9.3.1 — mensal
  INSPECAO_ALETAS_TROCADOR:         720,   // Seção 9.4.2 — mensal
  MANUTENCAO_VENTILADOR_TORRE:      720,   // Seção 9.4.5 — mensal
  VERIFICACAO_QUADRO_CONTROLE:      720,   // Seção 9.4.4 — mensal
  INSPECAO_NIVEL_TANQUE_CONTAINER:  168,   // Seção 9.3.5 — semanal (7 dias)
  INSPECAO_NIVEL_TANQUE_TORRE:      24,    // Seção 9.3.5 — diário
  REGISTRO_TEMPERATURA_PRESSAO:     12,    // Seção 9.2.2 — 2× ao dia (a cada 12h)
  FILTRO_Y_REPOSICAO:               4380,  // Seção 9.3.1 — semestral (~6 meses)
  INSPECAO_VAZAMENTOS_TUBULACAO:    4380,  // Seção 9.3.2 — semestral
  TESTE_PH_FLUIDO:                  4380,  // Seção 9.3.6 — semestral
  INSPECAO_ELETRICA_QCP:            4380,  // Seção 9.3.3 — semestral
  DRENAGEM_TOPO_TORRE:              2190,  // Seção 9.4.3 — trimestral (~3 meses)
  SUBSTITUICAO_FLUIDO_REFRIGERANTE: 8760,  // Seção 9.3.4 — anual
  INSPECAO_ANUAL_GERAL:             8760,  // Seção 9.4.6 — anual

  // ── Corretivas / Emergenciais (prazo definido internamente pela gravidade) ──
  FALHA_ENERGIA:                    4,     // emergência — resolver em até 4h
  FALHA_BOMBA_CIRCULACAO:           4,     // emergência — risco de parada do container
  FALHA_VENTILADOR_EXAUSTAO:        8,     // urgente — 8h para ação
  FALHA_BOMBA_REPOSICAO:            8,
  ALARME_VAZAMENTO:                 2,     // emergência — 2h para localizar e isolar
  ALARME_ALTA_TEMPERATURA:          2,     // emergência — risco ao hardware
  ALARME_ALTA_PRESSAO:              4,
  ALARME_BAIXA_PRESSAO:             8,
  ALARME_BAIXA_VAZAO:               8,
  ALARME_CONDENSACAO:               24,    // ajustar temperatura-alvo em 24h
  FALHA_VEDACAO_BOMBA:              8,
  FALHA_VENTILADOR_TORRE:           24,
  SUBSTITUICAO_VALVULA_EXAUSTAO:    48,
  SUBSTITUICAO_VENTILADOR_TORRE:    48,
  OUTRO:                            72,
};

// Labels em português para exibição
export const ATIVIDADE_LABEL: Record<string, string> = {
  LUBRIFICACAO_ROLAMENTOS:          "Lubrificação de rolamentos (bomba)",
  FILTRO_SUCCAO_ASPERSAO:           "Limpeza filtro de sucção — aspersão torre",
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

// Seção do manual de referência
export const ATIVIDADE_REFERENCIA_MANUAL: Record<string, string> = {
  LUBRIFICACAO_ROLAMENTOS:          "Seção 9.3.7 — Manutenção da bomba de água",
  FILTRO_SUCCAO_ASPERSAO:           "Seção 9.3.1 — Manutenção de filtros",
  FILTRO_DUTO_FORNECIMENTO:         "Seção 9.3.1 — Manutenção de filtros",
  INSPECAO_ALETAS_TROCADOR:         "Seção 9.4.2 — Manutenção das aletas",
  MANUTENCAO_VENTILADOR_TORRE:      "Seção 9.4.5 — Manutenção do ventilador",
  VERIFICACAO_QUADRO_CONTROLE:      "Seção 9.4.4 — Manutenção do quadro de controle",
  INSPECAO_NIVEL_TANQUE_CONTAINER:  "Seção 9.3.5 — Inspeção do nível do tanque",
  INSPECAO_NIVEL_TANQUE_TORRE:      "Seção 9.3.5 — Inspeção do nível do tanque",
  REGISTRO_TEMPERATURA_PRESSAO:     "Seção 9.2.2 — Verificação de aplicação",
  FILTRO_Y_REPOSICAO:               "Seção 9.3.1 — Manutenção de filtros",
  INSPECAO_VAZAMENTOS_TUBULACAO:    "Seção 9.3.2 — Manutenção de tubulações",
  TESTE_PH_FLUIDO:                  "Seção 9.3.6 — Manutenção do fluido refrigerante",
  INSPECAO_ELETRICA_QCP:            "Seção 9.3.3 — Manutenção de componentes elétricos",
  DRENAGEM_TOPO_TORRE:              "Seção 9.4.3 — Manutenção da porta de drenagem",
  SUBSTITUICAO_FLUIDO_REFRIGERANTE: "Seção 9.3.4 — Drenagem do fluido refrigerante",
  INSPECAO_ANUAL_GERAL:             "Seção 9.4.6 — Outros",
  FALHA_ENERGIA:                    "Seção 8.1 — Falha de energia",
  FALHA_BOMBA_CIRCULACAO:           "Seção 8.1 — Falha da bomba de circulação",
  FALHA_VENTILADOR_EXAUSTAO:        "Seção 8.1 — Falha do ventilador de exaustão",
  FALHA_BOMBA_REPOSICAO:            "Seção 8.1 — Falha da bomba de reposição",
  ALARME_VAZAMENTO:                 "Seção 8.1 — Alarme de vazamento",
  ALARME_ALTA_TEMPERATURA:          "Seção 8.1 — Alarme de alta temperatura",
  ALARME_ALTA_PRESSAO:              "Seção 8.1 — Alarme de alta pressão",
  ALARME_BAIXA_PRESSAO:             "Seção 8.1 — Alarme de baixa pressão de retorno",
  ALARME_BAIXA_VAZAO:               "Seção 8.1 — Alarme de baixa vazão",
  ALARME_CONDENSACAO:               "Seção 8.1 — Alarme de condensação",
  FALHA_VEDACAO_BOMBA:              "Seção 8.1 — Vazamento no selo mecânico",
  FALHA_VENTILADOR_TORRE:           "Seção 8.2 — Falhas da torre seca",
  SUBSTITUICAO_VALVULA_EXAUSTAO:    "Seção 8.2 — Substituição da válvula de exaustão",
  SUBSTITUICAO_VENTILADOR_TORRE:    "Seção 8.2 — Substituição do ventilador",
  OUTRO:                            "—",
};

// Subsistemas do ANTSPACE HK3
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

// ─── Tipos de atividade agrupados para o formulário ──────────────────────────

export const ATIVIDADES_PREVENTIVAS = [
  "LUBRIFICACAO_ROLAMENTOS",
  "FILTRO_SUCCAO_ASPERSAO",
  "FILTRO_DUTO_FORNECIMENTO",
  "INSPECAO_ALETAS_TROCADOR",
  "MANUTENCAO_VENTILADOR_TORRE",
  "VERIFICACAO_QUADRO_CONTROLE",
  "INSPECAO_NIVEL_TANQUE_CONTAINER",
  "INSPECAO_NIVEL_TANQUE_TORRE",
  "REGISTRO_TEMPERATURA_PRESSAO",
  "FILTRO_Y_REPOSICAO",
  "INSPECAO_VAZAMENTOS_TUBULACAO",
  "TESTE_PH_FLUIDO",
  "INSPECAO_ELETRICA_QCP",
  "DRENAGEM_TOPO_TORRE",
  "SUBSTITUICAO_FLUIDO_REFRIGERANTE",
  "INSPECAO_ANUAL_GERAL",
];

export const ATIVIDADES_CORRETIVAS = [
  "FALHA_ENERGIA",
  "FALHA_BOMBA_CIRCULACAO",
  "FALHA_VENTILADOR_EXAUSTAO",
  "FALHA_BOMBA_REPOSICAO",
  "ALARME_VAZAMENTO",
  "ALARME_ALTA_TEMPERATURA",
  "ALARME_ALTA_PRESSAO",
  "ALARME_BAIXA_PRESSAO",
  "ALARME_BAIXA_VAZAO",
  "ALARME_CONDENSACAO",
  "FALHA_VEDACAO_BOMBA",
  "FALHA_VENTILADOR_TORRE",
  "SUBSTITUICAO_VALVULA_EXAUSTAO",
  "SUBSTITUICAO_VENTILADOR_TORRE",
  "OUTRO",
];

// ─── Calculador de SLA ────────────────────────────────────────────────────────

export interface SLAInfo {
  tipoAtividade: string;
  prazoHoras: number;
  dataEmissaoAxia: Date;
  dataLimiteSLA: Date;
  horasRestantes: number;
  minutosRestantes: number;
  percentualDecorrido: number;
  vencido: boolean;
  statusLabel: string;
  statusColor: "green" | "yellow" | "orange" | "red";
  tempoFormatado: string;
  referenciaManual: string;
}

export function calcularSLA(dataEmissaoAxia: Date, tipoAtividade: string): SLAInfo {
  const prazoHoras = PRAZO_HORAS[tipoAtividade] ?? 72;
  const dataLimiteSLA = addHours(dataEmissaoAxia, prazoHoras);
  const agora = new Date();
  const horasRestantes = differenceInHours(dataLimiteSLA, agora);
  const minutosRestantes = differenceInMinutes(dataLimiteSLA, agora);
  const vencido = isPast(dataLimiteSLA);

  const totalHoras = prazoHoras;
  const horasDecorridas = differenceInHours(agora, dataEmissaoAxia);
  const percentualDecorrido = Math.min(100, Math.max(0, Math.round((horasDecorridas / totalHoras) * 100)));

  // Thresholds relativos ao prazo (percentual)
  const pct = percentualDecorrido;

  let statusLabel: string;
  let statusColor: SLAInfo["statusColor"];
  let tempoFormatado: string;

  if (vencido) {
    statusLabel = "SLA Vencido";
    statusColor = "red";
    const hAtrasado = Math.abs(horasRestantes);
    if (hAtrasado < 24) {
      tempoFormatado = `Vencido há ${hAtrasado}h`;
    } else {
      tempoFormatado = `Vencido há ${Math.floor(hAtrasado / 24)}d ${hAtrasado % 24}h`;
    }
  } else if (pct >= 90 || horasRestantes <= 2) {
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
    tipoAtividade,
    prazoHoras,
    dataEmissaoAxia,
    dataLimiteSLA,
    horasRestantes,
    minutosRestantes,
    percentualDecorrido,
    vencido,
    statusLabel,
    statusColor,
    tempoFormatado,
    referenciaManual: ATIVIDADE_REFERENCIA_MANUAL[tipoAtividade] ?? "—",
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
  if (horas < 720) return `${Math.floor(horas / 168)} semanas`;
  if (horas < 8760) return `${Math.floor(horas / 720)} meses`;
  return `${Math.floor(horas / 8760)} ano(s)`;
}

export function gerarNumeroOS(sequencial: number): string {
  const ano = new Date().getFullYear();
  const num = String(sequencial).padStart(4, "0");
  return `OS-${ano}-${num}`;
}

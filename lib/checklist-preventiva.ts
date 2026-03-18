/**
 * Checklist de manutenção preventiva — Manual ANTSPACE HK3 V6
 * Cada item tem ID único, descrição, periodicidade e seção de referência.
 * Quando uma OS de tipo MANUTENCAO_PREVENTIVA_GERAL é aberta,
 * esses itens são gerados automaticamente no banco.
 */

export interface ChecklistItem {
  id: string;           // identificador único e estável
  descricao: string;    // ação a executar
  periodicidade: string; // ex: "Mensal", "Semanal", "Semestral"
  subsistema: string;   // a qual subsistema pertence
  referencia: string;   // seção do manual
}

export const CHECKLIST_PREVENTIVA: ChecklistItem[] = [
  // ── Diário ────────────────────────────────────────────────────────────────
  {
    id: "P-001",
    descricao: "Verificar nível do tanque de fluido — torre seca",
    periodicidade: "Diário",
    subsistema: "Torre Seca",
    referencia: "Manual §9.3.5",
  },
  {
    id: "P-002",
    descricao: "Registrar temperatura de fornecimento e retorno",
    periodicidade: "2× ao dia",
    subsistema: "Estação de Bombas",
    referencia: "Manual §9.2.2",
  },
  {
    id: "P-003",
    descricao: "Registrar pressão de fornecimento e retorno",
    periodicidade: "2× ao dia",
    subsistema: "Estação de Bombas",
    referencia: "Manual §9.2.2",
  },
  {
    id: "P-004",
    descricao: "Registrar vazão do sistema e verificar alarmes ativos",
    periodicidade: "2× ao dia",
    subsistema: "Estação de Bombas",
    referencia: "Manual §9.2.2",
  },
  // ── Semanal ────────────────────────────────────────────────────────────────
  {
    id: "P-005",
    descricao: "Verificar nível do tanque de fluido — container (reposição se < 2/3)",
    periodicidade: "Semanal",
    subsistema: "Tanque de Armazenamento",
    referencia: "Manual §9.3.5",
  },
  // ── Mensal ─────────────────────────────────────────────────────────────────
  {
    id: "P-006",
    descricao: "Limpar filtro de sucção da bomba de aspersão da torre seca",
    periodicidade: "Mensal",
    subsistema: "Torre Seca",
    referencia: "Manual §9.3.1",
  },
  {
    id: "P-007",
    descricao: "Limpar filtro do duto de fornecimento de fluido — estação de bombas",
    periodicidade: "Mensal",
    subsistema: "Estação de Bombas",
    referencia: "Manual §9.3.1",
  },
  {
    id: "P-008",
    descricao: "Inspecionar/limpar aletas do trocador de calor (pistola de ar ou água)",
    periodicidade: "Mensal",
    subsistema: "Torre Seca",
    referencia: "Manual §9.4.2",
  },
  {
    id: "P-009",
    descricao: "Verificar ventiladores da torre seca (pás, ruídos, parafusos, terminais)",
    periodicidade: "Mensal",
    subsistema: "Torre Seca",
    referencia: "Manual §9.4.5",
  },
  {
    id: "P-010",
    descricao: "Verificar água acumulada no quadro de controle elétrico da torre",
    periodicidade: "Mensal",
    subsistema: "QCP — Quadro de Controle Principal",
    referencia: "Manual §9.4.4",
  },
  // ── Trimestral ─────────────────────────────────────────────────────────────
  {
    id: "P-011",
    descricao: "Limpar porta de drenagem no topo da torre seca (folhas e detritos)",
    periodicidade: "Trimestral",
    subsistema: "Torre Seca",
    referencia: "Manual §9.4.3",
  },
  // ── Semestral ──────────────────────────────────────────────────────────────
  {
    id: "P-012",
    descricao: "Limpar filtro Y do duto de reposição da estação de bombas",
    periodicidade: "Semestral",
    subsistema: "Estação de Bombas",
    referencia: "Manual §9.3.1",
  },
  {
    id: "P-013",
    descricao: "Inspecionar rede de tubulações quanto a vazamentos",
    periodicidade: "Semestral",
    subsistema: "Sistema de Manifold",
    referencia: "Manual §9.3.2",
  },
  {
    id: "P-014",
    descricao: "Testar pH do fluido refrigerante (valor entre 7 e 9)",
    periodicidade: "Semestral",
    subsistema: "Estação de Bombas",
    referencia: "Manual §9.3.6",
  },
  {
    id: "P-015",
    descricao: "Inspecionar e reapertar terminais e parafusos elétricos do QCP",
    periodicidade: "Semestral",
    subsistema: "QCP — Quadro de Controle Principal",
    referencia: "Manual §9.3.3",
  },
  // ── A cada 2.000 h ─────────────────────────────────────────────────────────
  {
    id: "P-016",
    descricao: "Lubrificar rolamentos do motor da bomba de circulação (graxa Polyrex EM)",
    periodicidade: "A cada 2.000 h",
    subsistema: "Estação de Bombas",
    referencia: "Manual §9.3.7",
  },
  // ── Anual ──────────────────────────────────────────────────────────────────
  {
    id: "P-017",
    descricao: "Rastrear e registrar parâmetros do fluido refrigerante (Tabela 9.1)",
    periodicidade: "Anual",
    subsistema: "Estação de Bombas",
    referencia: "Manual §9.3.6",
  },
  {
    id: "P-018",
    descricao: "Inspeção geral de todos os componentes e sistemas",
    periodicidade: "Anual",
    subsistema: "Geral",
    referencia: "Manual §9.4.6",
  },
  // ── 1-2 anos ───────────────────────────────────────────────────────────────
  {
    id: "P-019",
    descricao: "Drenar e substituir fluido refrigerante do sistema (~1.500 L)",
    periodicidade: "A cada 1-2 anos",
    subsistema: "Estação de Bombas",
    referencia: "Manual §9.3.4",
  },
];

export const CHECKLIST_POR_ID = Object.fromEntries(
  CHECKLIST_PREVENTIVA.map((i) => [i.id, i])
);
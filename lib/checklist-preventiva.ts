
export interface ChecklistItem {
  id: string;
  descricao: string;
  periodicidade: string;
  subsistema: string;
  referencia: string;
}

export const CHECKLIST_PREVENTIVA: ChecklistItem[] = [
  { id: "P-001", descricao: "Registrar temperatura de fornecimento e retorno", periodicidade: "Mensal", subsistema: "Estação de Bombas", referencia: "Manual §9.2.2" },
  { id: "P-002", descricao: "Registrar pressão de fornecimento e retorno", periodicidade: "Mensal", subsistema: "Estação de Bombas", referencia: "Manual §9.2.2" },
  { id: "P-003", descricao: "Registrar vazão do sistema e verificar alarmes ativos", periodicidade: "Mensal", subsistema: "Estação de Bombas", referencia: "Manual §9.2.2" },
  { id: "P-004", descricao: "Limpar filtro do duto de fornecimento de fluido — estação de bombas", periodicidade: "Mensal", subsistema: "Estação de Bombas", referencia: "Manual §9.3.1" },
  { id: "P-005", descricao: "Verificar nível do tanque de fluido — container (reposição se < 2/3)", periodicidade: "Mensal", subsistema: "Tanque de Armazenamento", referencia: "Manual §9.3.5" },
  { id: "P-006", descricao: "Verificar nível do tanque de fluido — torre seca", periodicidade: "Mensal", subsistema: "Torre Seca", referencia: "Manual §9.3.5" },
  { id: "P-007", descricao: "Limpar filtro de sucção da bomba de aspersão da torre seca", periodicidade: "Mensal", subsistema: "Torre Seca", referencia: "Manual §9.3.1" },
  { id: "P-008", descricao: "Inspecionar/limpar aletas do trocador de calor (pistola de ar ou água)", periodicidade: "Mensal", subsistema: "Torre Seca", referencia: "Manual §9.4.2" },
  { id: "P-009", descricao: "Verificar ventiladores da torre seca (pás, ruídos, parafusos, terminais)", periodicidade: "Mensal", subsistema: "Torre Seca", referencia: "Manual §9.4.5" },
  { id: "P-010", descricao: "Verificar água acumulada no quadro de controle elétrico da torre", periodicidade: "Mensal", subsistema: "QCP — Quadro de Controle Principal", referencia: "Manual §9.4.4" },
  { id: "P-011", descricao: "Lubrificar rolamentos do motor da bomba de circulação (graxa Polyrex EM)", periodicidade: "2 meses", subsistema: "Estação de Bombas", referencia: "Manual §9.3.7" },
  { id: "P-012", descricao: "Termovisão nas conexões e quadros QCP", periodicidade: "2 meses", subsistema: "QCP — Quadro de Controle Principal", referencia: "Manual §9.4.4" },
  { id: "P-013", descricao: "Limpar porta de drenagem no topo da torre seca (folhas e detritos)", periodicidade: "Trimestral", subsistema: "Torre Seca", referencia: "Manual §9.4.3" },
  { id: "P-014", descricao: "Limpar filtro Y do duto de reposição da estação de bombas", periodicidade: "Semestral", subsistema: "Estação de Bombas", referencia: "Manual §9.3.1" },
  { id: "P-015", descricao: "Testar pH do fluido refrigerante (valor entre 7 e 9)", periodicidade: "Semestral", subsistema: "Estação de Bombas", referencia: "Manual §9.3.6" },
  { id: "P-016", descricao: "Inspecionar e reapertar terminais e parafusos elétricos do QCP", periodicidade: "Semestral", subsistema: "QCP — Quadro de Controle Principal", referencia: "Manual §9.3.3" },
  { id: "P-017", descricao: "Inspecionar rede de tubulações quanto a vazamentos", periodicidade: "Semestral", subsistema: "Sistema de Manifold", referencia: "Manual §9.3.2" },
  { id: "P-018", descricao: "Rastrear e registrar parâmetros do fluido refrigerante (Tabela 9.1)", periodicidade: "Anual", subsistema: "Estação de Bombas", referencia: "Manual §9.3.6" },
  { id: "P-019", descricao: "Inspeção geral de todos os componentes e sistemas", periodicidade: "Anual", subsistema: "Geral", referencia: "Manual §9.4.6" },
  { id: "P-020", descricao: "Drenar e substituir fluido refrigerante do sistema (~1.500 L)", periodicidade: "A cada 1-2 anos", subsistema: "Estação de Bombas", referencia: "Manual §9.3.4" },
];

export const CHECKLIST_POR_ID = Object.fromEntries(
  CHECKLIST_PREVENTIVA.map((i) => [i.id, i])
);

/** Mapa: enum periodicidade → rótulos de itens que devem ser incluídos */
export const PERIODICIDADE_ITENS: Record<string, string[]> = {
  MENSAL:     ["Mensal"],
  SEMANAL:    ["Semanal"],
  HORAS_2000: ["2 meses"],
  TRIMESTRAL: ["Trimestral"],
  SEMESTRAL:  ["Semestral"],
  ANUAL:      ["Anual"],
  BIENNIAL:   ["A cada 1-2 anos"],
};

/**
 * Retorna itens para uma única periodicidade (sem acúmulo).
 * Usado para preview e geração individual.
 */
export function itensPorPeriodicidade(periodicidade: string): ChecklistItem[] {
  const rotulos = PERIODICIDADE_ITENS[periodicidade] ?? [];
  return CHECKLIST_PREVENTIVA.filter((item) => rotulos.includes(item.periodicidade));
}

/**
 * NOVO: Retorna a lista unificada de itens para múltiplas periodicidades.
 * - Pega itens de cada periodicidade selecionada
 * - Remove duplicados por itemId
 * - Mantém a ordem original do CHECKLIST_PREVENTIVA
 */
export function itensPorMultiplasPeriodicidades(periodicidades: string[]): ChecklistItem[] {
  const idsVistos = new Set<string>();
  const resultado: ChecklistItem[] = [];

  // Itera na ordem original do checklist para manter consistência
  for (const item of CHECKLIST_PREVENTIVA) {
    if (idsVistos.has(item.id)) continue;

    // Verifica se alguma das periodicidades selecionadas inclui este item
    const incluir = periodicidades.some((per) => {
      const rotulos = PERIODICIDADE_ITENS[per] ?? [];
      return rotulos.includes(item.periodicidade);
    });

    if (incluir) {
      resultado.push(item);
      idsVistos.add(item.id);
    }
  }

  return resultado;
}

/**
 * Compatibilidade legada: aceita periodicidade única como string.
 * Internamente chama itensPorMultiplasPeriodicidades.
 */
export function itensParaOS(periodicidades: string | string[]): ChecklistItem[] {
  const arr = Array.isArray(periodicidades) ? periodicidades : [periodicidades];
  return itensPorMultiplasPeriodicidades(arr);
}

export const PERIODICIDADE_LABEL: Record<string, string> = {
  DIARIA:     "Diária / 2× ao dia",
  SEMANAL:    "Semanal",
  MENSAL:     "Mensal",
  TRIMESTRAL: "Trimestral",
  SEMESTRAL:  "Semestral",
  ANUAL:      "Anual",
  HORAS_2000: "A cada 2.000 h",
  BIENNIAL:   "A cada 1-2 anos",
};

export const PERIODICIDADES_ORDENADAS: string[] = [
  "MENSAL", "HORAS_2000", "TRIMESTRAL", "SEMESTRAL", "ANUAL", "BIENNIAL",
];

export const PERIODICIDADE_COR: Record<string, { bg: string; text: string; border: string }> = {
  DIARIA:     { bg: "bg-sky-100",    text: "text-sky-700",    border: "border-sky-200" },
  SEMANAL:    { bg: "bg-blue-100",   text: "text-blue-700",   border: "border-blue-200" },
  MENSAL:     { bg: "bg-violet-100", text: "text-violet-700", border: "border-violet-200" },
  HORAS_2000: { bg: "bg-amber-100",  text: "text-amber-700",  border: "border-amber-200" },
  TRIMESTRAL: { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-200" },
  SEMESTRAL:  { bg: "bg-fuchsia-100",text: "text-fuchsia-700",border: "border-fuchsia-200" },
  ANUAL:      { bg: "bg-emerald-100",text: "text-emerald-700",border: "border-emerald-200" },
  BIENNIAL:   { bg: "bg-teal-100",   text: "text-teal-700",   border: "border-teal-200" },
};

/** Instruções passo a passo extraídas do Manual ANTSPACE HK3 V6 (Item 9) */
export const INSTRUCOES_MANUAL: Record<string, { titulo: string; passos: string[] }> = {
  "P-001": {
    titulo: "Registrar temperatura de fornecimento e retorno (§9.2.2)",
    passos: [
      "Acesse a Tela Principal do painel touch screen do QCP.",
      "Localize os campos de temperatura de fornecimento (supply) e retorno (return).",
      "Anote os valores exibidos no formulário de registro — registrar a cada meio dia.",
      "Verifique se os valores estão dentro da faixa esperada de operação.",
      "Se a temperatura ultrapassar 70°C ou estiver 30°C acima da temperatura ambiente, inspecione e re-aperte o ponto de conexão.",
    ],
  },
  "P-002": {
    titulo: "Registrar pressão de fornecimento e retorno (§9.2.2)",
    passos: [
      "Acesse a Tela Principal do painel touch screen do QCP.",
      "Localize os sensores PT01 (pressão de fornecimento) e PT02 (pressão de retorno).",
      "Anote os valores exibidos — a pressão de retorno deve ser superior a 0,05 MPa.",
      "Se a pressão estiver abaixo de 0,05 MPa, acione a bomba de reposição para repor fluido.",
      "Registre os dados de pressão no formulário de manutenção preventiva.",
    ],
  },
  "P-003": {
    titulo: "Registrar vazão e verificar alarmes ativos (§9.2.2)",
    passos: [
      "Acesse a Tela Principal do painel touch screen.",
      "Verifique o valor de vazão exibido — deve estar dentro dos parâmetros normais.",
      "Acesse a tela 'Exibição de Alarmes' para verificar falhas ativas.",
      "Registre todas as anomalias encontradas no formulário de manutenção.",
      "Em caso de alarme, siga as instruções da seção 8 do manual para resolução.",
    ],
  },
  "P-004": {
    titulo: "Limpar filtro do duto de fornecimento de fluido (§9.3.1)",
    passos: [
      "Corte a alimentação principal do sistema (QFWCU).",
      "Feche as válvulas borboleta de manutenção nas duas extremidades do filtro.",
      "Abra a válvula de bola de drenagem abaixo do filtro — prepare recipiente limpo de 20 L.",
      "CUIDADO: o fluido drenado NÃO pode ser adicionado ao tanque sem tratamento.",
      "Remova a conexão de abraçadeira e retire o elemento filtrante pelo manípulo.",
      "Lave a tela interna com água limpa e enxágue bem antes de reutilizar.",
      "Reinstale a tela, aperte a abraçadeira e feche a válvula.",
      "Reenergize e verifique circulação normal sem vazamentos.",
    ],
  },
  "P-005": {
    titulo: "Verificar nível do tanque de fluido — container (§9.3.5)",
    passos: [
      "Localize o sensor de nível e as chaves de nível alto/baixo no tanque do container.",
      "Verifique o nível indicado na tela touch screen do QCP.",
      "Se o nível for inferior a 2/3 da capacidade, inicie reposição imediata.",
      "Para repor: conecte a mangueira externa à porta V104 e acione a bomba P11 em modo manual.",
      "Selecione 'Externo → C21' na interface para repor o tanque interno.",
      "Interrompa quando o nível atingir o patamar adequado.",
    ],
  },
  "P-006": {
    titulo: "Verificar nível do tanque de fluido — torre seca (§9.3.5)",
    passos: [
      "Verifique o nível do tanque da torre seca visualmente ou pela telemetria.",
      "Não permita que o nível zere — exceto no modo seco de inverno.",
      "No modo seco de inverno: drene o tanque para evitar congelamento e danos.",
      "Se o nível estiver baixo, verifique o funcionamento da válvula de boia automática.",
      "Reponha o nível se necessário via bomba de aspersão.",
    ],
  },
  "P-007": {
    titulo: "Limpar filtro de sucção da bomba de aspersão da torre seca (§9.3.1)",
    passos: [
      "Desligue a alimentação da torre seca.",
      "Localize o filtro de sucção da bomba de aspersão.",
      "Feche as válvulas de isolamento no trecho do filtro.",
      "Remova o elemento filtrante com cuidado.",
      "Lave o filtro com água limpa e enxágue bem.",
      "Reinstale o filtro e abra as válvulas de isolamento.",
      "Reenergize e verifique funcionamento normal da bomba de aspersão.",
    ],
  },
  "P-008": {
    titulo: "Inspecionar/limpar aletas do trocador de calor (§9.4.2)",
    passos: [
      "Corte a alimentação da torre seca antes de iniciar.",
      "CUIDADO: as aletas são extremamente afiadas — use luvas de proteção obrigatoriamente.",
      "Se houver pouco acúmulo: use pistola de ar comprimido para remover poeira.",
      "Se houver muita sujeira: use pistola de água profissional em jato coluna.",
      "Enxágue as aletas de CIMA para BAIXO — nunca no sentido contrário.",
      "Use apenas água limpa ou com aditivos profissionais para limpeza de ar-condicionado.",
      "Após limpeza, reenergize e verifique temperatura de operação.",
    ],
  },
  "P-009": {
    titulo: "Verificar ventiladores da torre seca (§9.4.5)",
    passos: [
      "ATENÇÃO: desconecte a alimentação principal antes de qualquer manutenção.",
      "Confirme ausência de objetos estranhos no ventilador — remova se houver.",
      "Verifique se as pás estão danificadas — se impossível reparar, substitua o ventilador.",
      "Ligue e ouça: ruídos de fricção metálica ou estridente indicam problema.",
      "Confirme que os parafusos de fixação estão apertados — torque de reinstalação: 13 N·m.",
      "Confirme que os terminais de fiação estão firmes — torque da caixa de bornes: 2,6 N·m.",
    ],
  },
  "P-010": {
    titulo: "Verificar água acumulada no quadro de controle elétrico (§9.4.4)",
    passos: [
      "Inspecione visualmente o interior do quadro de controle elétrico da torre seca.",
      "Se houver água acumulada, verifique se a porta de drenagem está entupida.",
      "Limpe a porta de drenagem e remova qualquer obstrução.",
      "Seque o interior do quadro com pano limpo e seco.",
      "Verifique a vedação da tampa para evitar nova entrada de água.",
    ],
  },
  "P-011": {
    titulo: "Lubrificar rolamentos do motor da bomba de circulação (§9.3.7)",
    passos: [
      "ATENÇÃO: ciclo de relubrificação a cada 2.000 h (≈83 dias de operação contínua).",
      "Use exclusivamente graxa Polyrex EM — PROIBIDO misturar marcas diferentes.",
      "Se outra marca for usada, remova completamente a graxa original dos rolamentos.",
      "Modelo de rolamento: DE: 7309B / NDE: 6309ZC3 — quantidade: 17.",
      "Desligue a bomba antes de iniciar a lubrificação.",
      "Aplique a graxa nos pontos de lubrificação dos rolamentos.",
      "Reenergize e verifique operação sem ruídos anormais.",
    ],
  },
  "P-012": {
    titulo: "Termovisão nas conexões e quadros QCP (§9.4.4)",
    passos: [
      "Use detector infravermelho portátil (termômetro a laser ou câmera termal).",
      "Verifique todas as conexões elétricas dos quadros QCP e QDC.",
      "Se temperatura ultrapassar 70°C ou estiver 30°C acima da temperatura ambiente, agir.",
      "Desligue o circuito correspondente ao ponto com temperatura elevada.",
      "Re-aperte o ponto de conexão: parafusos M16 = 100 N·m; M12 = 80 N·m.",
      "Reenergize e verifique novamente com o detector infravermelho.",
    ],
  },
  "P-013": {
    titulo: "Limpar porta de drenagem no topo da torre seca (§9.4.3)",
    passos: [
      "ATENÇÃO: cumpra os requisitos locais de proteção para trabalho em altura.",
      "Acesse o topo da torre seca usando a estrutura de escalada para manutenção.",
      "Inspecione a porta de drenagem superior — verifique se está entupida.",
      "Remova folhas, detritos e qualquer obstrução no topo da torre.",
      "Garanta que o escoamento de água está livre após a limpeza.",
      "Desça com segurança e registre a execução.",
    ],
  },
  "P-014": {
    titulo: "Limpar filtro Y do duto de reposição da estação de bombas (§9.3.1)",
    passos: [
      "Corte a alimentação principal (QFWCU) antes de iniciar.",
      "Feche as válvulas borboleta nas duas extremidades do filtro Y.",
      "Abra a válvula de bola de drenagem — prepare recipiente de 20 L limpo.",
      "CUIDADO: o fluido drenado NÃO pode ser adicionado ao tanque sem tratamento.",
      "Remova o elemento filtrante e lave com água limpa.",
      "Reinstale, aperte a abraçadeira e feche a válvula.",
      "Reenergize e verifique operação normal da bomba de reposição P11.",
    ],
  },
  "P-015": {
    titulo: "Testar pH do fluido refrigerante — valor entre 7 e 9 (§9.3.6)",
    passos: [
      "Colete uma amostra do fluido refrigerante circulante.",
      "Use fita indicadora de pH ou medidor digital calibrado.",
      "O pH deve estar entre 7 e 9. Abaixo de 7 não é recomendado para uso.",
      "Se disponível, adicione indicador de pH ao fluido — abaixo de 6,8 o fluido muda de cor.",
      "Se o pH estiver fora da faixa, consulte o fornecedor para adição de inibidores de corrosão.",
      "Registre o valor de pH medido e a data no formulário de manutenção.",
    ],
  },
  "P-016": {
    titulo: "Inspecionar e reapertar terminais e parafusos elétricos do QCP (§9.3.3)",
    passos: [
      "ATENÇÃO: desligue a alimentação principal (QFWCU) antes de tocar nos componentes.",
      "Abra o painel do QCP com cuidado.",
      "Inspecione visualmente todos os terminais e parafusos de crimpagem internos.",
      "Verifique sinais de aquecimento, deformação ou oxidação nos terminais.",
      "Re-aperte parafusos soltos: M16 = 100 N·m; M12 = 80 N·m.",
      "Feche o painel e reenergize verificando operação normal.",
    ],
  },
  "P-017": {
    titulo: "Inspecionar rede de tubulações quanto a vazamentos (§9.3.2)",
    passos: [
      "Realize inspeção visual de toda a rede de tubulações do sistema.",
      "Prepare solução de sabão ou detergente.",
      "Aplique a solução nos pontos suspeitos — onde houver bolhas indica vazamento.",
      "Verifique especialmente: conexões de conector rápido, flanges, abraçadeiras, roscas e soldas.",
      "Se encontrar vazamento: PARE a operação imediatamente → repare → reponha fluido.",
      "Após reparo, faça teste de pressão: 7 bar por 30 minutos sem queda superior a 5%.",
    ],
  },
  "P-018": {
    titulo: "Rastrear e registrar parâmetros do fluido refrigerante (§9.3.6 / Tabela 9.1)",
    passos: [
      "Colete uma amostra representativa do fluido refrigerante circulante.",
      "Envie para análise laboratorial ou use kit de teste completo.",
      "Verifique: cor, aparência (sem odor, sedimentos ou sólidos em suspensão).",
      "Verifique pH entre 7 e 9; alcalinidade de reserva ≥ 4 mL; dureza total < 120 mg/L.",
      "Verifique metais: Al³⁺, Fe²⁺, Cu²⁺ todos < 50 mg/L — aumento indica corrosão.",
      "Registre todos os parâmetros e compare com o período anterior.",
      "Se necessário, adicione inibidores de corrosão conforme recomendação do fornecedor.",
    ],
  },
  "P-019": {
    titulo: "Inspeção geral de todos os componentes e sistemas (§9.4.6)",
    passos: [
      "Inspecione todos os subsistemas: estação de bombas, torre seca, QCP, QDC, manifold.",
      "Verifique ruídos anormais em bombas, ventiladores e componentes mecânicos.",
      "Inspecione todas as conexões elétricas e hidráulicas.",
      "Verifique estado dos filtros e substitua se necessário.",
      "Confira parâmetros na tela touch screen: temperatura, pressão, vazão.",
      "Registre anomalias e abra OS corretiva se necessário.",
    ],
  },
  "P-020": {
    titulo: "Drenar e substituir fluido refrigerante do sistema (~1.500 L) (§9.3.4)",
    passos: [
      "ATENÇÃO: prepare volume de armazenamento mínimo de 1.600 L antes de iniciar.",
      "Localize a válvula de descarga V202.",
      "Conecte a mangueira de drenagem à válvula de bola de descarga com abraçadeira.",
      "Guie a mangueira para o recipiente de armazenamento fora do equipamento.",
      "Abra a válvula V202 para iniciar a drenagem do sistema.",
      "Após drenagem completa, feche V202.",
      "Reabasteça o sistema com fluido novo conforme procedimento §7.3 do manual.",
      "Ligue a bomba de circulação e verifique pressão estática entre 1,0 e 1,5 bar.",
    ],
  },
};

export function findChecklistItemsByIds(ids: string[]) {
  const wanted = new Set(ids);
  return CHECKLIST_PREVENTIVA.filter((item) => wanted.has(item.id));
}

export function checklistItemLabel(itemId: string) {
  const item = CHECKLIST_POR_ID[itemId];
  return item ? `${item.id} · ${item.descricao}` : itemId;
}

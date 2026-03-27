"use client"

import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

// ─────────────────────────────────────────────
// PALETA CORPORATIVA — Radius / AXIA
// Base neutra com laranja Radius como acento
// ─────────────────────────────────────────────
type Color = [number, number, number]
const C = {
  // Acento Radius (usado com moderação)
  orange:      [234, 88,  12]  as Color,   // laranja Radius — só destaques
  orangeLight: [251, 146, 60]  as Color,

  // Neutros corporativos (base do design)
  charcoal:    [28,  28,  28]  as Color,   // títulos / headers
  dark:        [51,  51,  51]  as Color,   // texto corrido
  slate:       [80,  90, 105]  as Color,   // subttítulos
  muted:       [120, 125, 135] as Color,   // labels auxiliares
  border:      [220, 222, 226] as Color,   // linhas e divisores
  surface:     [248, 248, 249] as Color,   // fundos de cards (cinza claríssimo)
  white:       [255, 255, 255] as Color,

  // Semânticas (mantidas)
  green:       [22,  163, 74]  as Color,
  red:         [220, 38,  38]  as Color,
  yellow:      [202, 138,  4]  as Color,
  blue:        [37,  99, 235]  as Color,
  amber:       [217, 119,  6]  as Color,
}

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────
export type OSReportData = {
  id: string
  numero: string
  titulo: string
  descricao: string
  motivoOS: string
  tipoAtividade: string
  status: string
  prioridade: string
  subsistema: string
  componenteTag?: string | null
  containerId?: string | null
  dataEmissaoAxia: string
  dataLimiteSLA: string
  prazoSLAHoras: number
  slaVencido: boolean
  sla: {
    statusLabel: string
    statusColor: "green" | "yellow" | "orange" | "red"
    tempoFormatado: string
    percentualDecorrido: number
    referenciaManual: string
    isCorretiva: boolean
    atuacaoHoras?: number | null
    dataLimiteAtuacao?: string | null
  }
  dataProgramada?: string | null
  dataInicio?: string | null
  dataConclusao?: string | null
  createdAt: string
  responsavel?: { nome: string; cargo: string } | null
  abertoPor: { nome: string }
  checklistItems: Array<{
    itemId: string
    descricao: string
    periodicidade: string
    subsistema: string
    referencia: string
    status: "PENDENTE" | "OK" | "NAO_APLICAVEL" | "REQUER_ATENCAO"
    observacao?: string | null
    atualizadoEm?: string | null
    assetNome?: string | null
    assetCodigo?: string | null
    assetFotoUrl?: string | null
  }>
  comentarios: Array<{ texto: string; usuario: string; createdAt: string }>
  historico: Array<{
    statusDe?: string | null
    statusPara: string
    observacao?: string | null
    usuario: string
    createdAt: string
  }>
  anexos: Array<{ id: string; nome: string; url: string; tipo: string; tamanho: number }>
}

// ─────────────────────────────────────────────
// HELPERS DE FORMATAÇÃO
// ─────────────────────────────────────────────
function fmt(iso: string | null | undefined) {
  if (!iso) return "—"
  const d = new Date(iso)
  if (isNaN(d.getTime())) return "—"
  return d.toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}
function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—"
  const d = new Date(iso)
  if (isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("pt-BR")
}
function fmtMonthYear(iso: string | null | undefined) {
  if (!iso) return "—"
  const d = new Date(iso)
  if (isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }).toUpperCase()
}
function statusLabel(s: string) {
  const m: Record<string, string> = {
    ABERTA: "Aberta", EM_ANDAMENTO: "Em andamento",
    AGUARDANDO_PECA: "Aguardando peça", PAUSADA: "Pausada",
    CONCLUIDA: "Concluída", CANCELADA: "Cancelada",
  }
  return m[s] ?? s
}
function prioridadeLabel(p: string) {
  return ({ CRITICA: "Crítica", ALTA: "Alta", MEDIA: "Média", BAIXA: "Baixa" })[p] ?? p
}
function checklistStatusLabel(s: string) {
  return ({ PENDENTE: "Pendente", OK: "OK", NAO_APLICAVEL: "N/A", REQUER_ATENCAO: "Atenção" })[s] ?? s
}
function checklistStatusColor(s: string): Color {
  if (s === "OK") return C.green
  if (s === "REQUER_ATENCAO") return C.orange
  if (s === "NAO_APLICAVEL") return C.muted
  return C.red
}
function atividadeLabel(a: string) {
  const m: Record<string, string> = {
    MANUTENCAO_PREVENTIVA_GERAL: "Manutenção Preventiva Geral",
    FALHA_ENERGIA: "Falha de energia",
    FALHA_BOMBA_CIRCULACAO: "Falha bomba circulação",
    FALHA_VENTILADOR_EXAUSTAO: "Falha ventilador exaustão",
    FALHA_BOMBA_REPOSICAO: "Falha bomba reposição",
    ALARME_VAZAMENTO: "Alarme de vazamento",
    ALARME_ALTA_TEMPERATURA: "Alarme alta temperatura",
    ALARME_ALTA_PRESSAO: "Alarme alta pressão",
    ALARME_BAIXA_PRESSAO: "Alarme baixa pressão",
    ALARME_BAIXA_VAZAO: "Alarme baixa vazão",
    ALARME_CONDENSACAO: "Alarme de condensação",
    FALHA_VEDACAO_BOMBA: "Falha vedação bomba",
    FALHA_VENTILADOR_TORRE: "Falha ventilador torre",
    SUBSTITUICAO_VALVULA_EXAUSTAO: "Substituição válvula exaustão",
    SUBSTITUICAO_VENTILADOR_TORRE: "Substituição ventilador torre",
    OUTRO: "Outro",
  }
  return m[a] ?? a
}
function tipoLabel(a: string) {
  return a === "MANUTENCAO_PREVENTIVA_GERAL" ? "PREVENTIVA" : "CORRETIVA"
}

// ─────────────────────────────────────────────
// CARREGAMENTO DE IMAGENS
// ─────────────────────────────────────────────
async function loadSvgAsPng(url: string): Promise<{ dataUrl: string; aspect: number } | null> {
  try {
    const svgText = await fetch(url).then((r) => r.text())
    const blob = new Blob([svgText], { type: "image/svg+xml" })
    const objUrl = URL.createObjectURL(blob)

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        const canvas = document.createElement("canvas")
        canvas.width  = img.width  || 600
        canvas.height = img.height || 200
        const ctx = canvas.getContext("2d")!
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)
        URL.revokeObjectURL(objUrl)
        resolve(canvas.toDataURL("image/png"))
      }
      img.onerror = () => { URL.revokeObjectURL(objUrl); reject(new Error("svg load failed")) }
      img.src = objUrl
    })

    const aspect = await new Promise<number>((resolve) => {
      const img = new Image()
      img.onload = () => resolve(img.width && img.height ? img.width / img.height : 3.2)
      img.onerror = () => resolve(3.2)
      img.src = dataUrl
    })

    return { dataUrl, aspect }
  } catch {
    return null
  }
}

async function urlToDataURL(url: string): Promise<string> {
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const blob = await res.blob()
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error("FileReader error"))
    reader.readAsDataURL(blob)
  })
}
function detectFormat(d: string): "PNG" | "JPEG" { return /^data:image\/png/i.test(d) ? "PNG" : "JPEG" }
function stripPrefix(d: string) { return d.replace(/^data:image\/\w+;base64,/, "") }
async function imageDims(d: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ w: img.width, h: img.height })
    img.onerror = () => resolve({ w: 1200, h: 900 })
    img.src = d
  })
}

// ─────────────────────────────────────────────
// GERAÇÃO DE TEXTO POR IA
// ─────────────────────────────────────────────
async function generateConsolidatedSummary(data: OSReportData): Promise<{
  resumoExecutivo: string
  conclusaoTecnica: string
  impactoOperacional: string
}> {
  const tipoVisita = tipoLabel(data.tipoAtividade)
  const totalChecklist = data.checklistItems.length
  const okItems = data.checklistItems.filter((i) => i.status === "OK").length
  const atencaoItems = data.checklistItems.filter((i) => i.status === "REQUER_ATENCAO").length
  const pendItems = data.checklistItems.filter((i) => i.status === "PENDENTE").length
  const ocorrencias = data.comentarios.length

  const prompt = `Você é o redator técnico da Radius Mining, responsável por elaborar relatórios de O&M enviados ao cliente AXIA.

Gere um relatório técnico profissional com base nos dados abaixo, para ser entregue formalmente ao cliente.

=== DADOS DA VISITA ===
Tipo de manutenção: ${tipoVisita}
Número da OS: ${data.numero}
Título: ${data.titulo}
Subsistema: ${data.subsistema}
Container: ${data.containerId ?? "não especificado"}
Data de emissão: ${fmtDate(data.dataEmissaoAxia)}
Data de conclusão: ${fmtDate(data.dataConclusao)}
Responsável técnico: ${data.responsavel?.nome ?? "não informado"}
Descrição técnica: ${data.descricao}
Motivo / causa raiz: ${data.motivoOS}

=== CHECKLIST ===
Total de itens inspecionados: ${totalChecklist}
Itens OK: ${okItems}
Itens com atenção: ${atencaoItems}
Itens pendentes: ${pendItems}
Percentual de conformidade: ${totalChecklist > 0 ? Math.round((okItems / totalChecklist) * 100) : 0}%

=== OCORRÊNCIAS ===
Total de ocorrências registradas: ${ocorrencias}
${data.comentarios.slice(0, 5).map((c) => `- ${c.texto}`).join("\n")}

=== INSTRUÇÕES DE ESCRITA ===
Escreva exclusivamente em português técnico formal.
NÃO mencione nomes de sistemas internos, dashboards ou plataformas de software.
Use linguagem de relatório técnico enviado ao cliente.
Seja objetivo, preciso e profissional.
Trate o destinatário como "cliente" ou "AXIA".
Use "equipe técnica da Radius Mining" como sujeito das ações.

Retorne APENAS um JSON válido (sem markdown, sem texto antes ou depois):
{
  "resumoExecutivo": "3 a 5 parágrafos resumindo a visita, condições do sistema, atividades, resultados e status final",
  "conclusaoTecnica": "2 a 3 parágrafos com análise técnica, estado atual do sistema, recomendações e próximos passos",
  "impactoOperacional": "1 a 2 parágrafos descrevendo o impacto da manutenção na operação, tempo de indisponibilidade se houver, e resultado esperado com as ações executadas"
}`

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    })

    if (!response.ok) throw new Error(`API error ${response.status}`)
    const apiData = await response.json()
    const text = apiData.content?.map((b: { type: string; text?: string }) => b.text ?? "").join("") ?? ""
    const clean = text.replace(/```json|```/g, "").trim()
    return JSON.parse(clean)
  } catch {
    return {
      resumoExecutivo:
        `A equipe técnica da Radius Mining realizou visita técnica de ${tipoVisita.toLowerCase()} no container de mineração ${data.containerId ?? ""} localizado em Casa Nova – BA, conforme programação de O&M acordada com a AXIA.\n\nDurante a visita foram inspecionados ${totalChecklist} itens do subsistema ${data.subsistema}, com ${okItems} itens em conformidade (${totalChecklist > 0 ? Math.round((okItems / totalChecklist) * 100) : 0}% de conformidade). ${atencaoItems > 0 ? `Foram identificados ${atencaoItems} itens que requerem atenção e estão devidamente registrados neste relatório.` : "Todos os itens avaliados apresentaram conformidade satisfatória."}\n\nAs atividades descritas neste relatório foram concluídas em ${fmtDate(data.dataConclusao)}, com registro fotográfico e de checklist completo disponibilizados ao cliente.`,
      conclusaoTecnica:
        `Com base nas atividades realizadas durante esta visita técnica, o container de mineração encontra-se em condições operacionais ${atencaoItems > 0 ? "com pontos de atenção a serem monitorados" : "satisfatórias"}, tendo sido executadas todas as manutenções previstas na programação.\n\nRecomenda-se o monitoramento contínuo dos parâmetros operacionais e o acompanhamento dos itens identificados como "Requer Atenção" na próxima visita técnica programada. A equipe da Radius Mining permanece à disposição da AXIA para esclarecimentos adicionais.`,
      impactoOperacional:
        `A manutenção executada contribui diretamente para a continuidade operacional e eficiência do container de mineração, reduzindo o risco de falhas não programadas e preservando a disponibilidade do sistema. As ações corretivas e preventivas realizadas garantem conformidade com os padrões técnicos estabelecidos contratualmente.`,
    }
  }
}

// ─────────────────────────────────────────────
// GERADOR PRINCIPAL DO PDF
// ─────────────────────────────────────────────
export async function generateOSPDF(data: OSReportData) {
  const doc = new jsPDF({ unit: "mm", format: "a4" })
  const W = doc.internal.pageSize.width
  const H = doc.internal.pageSize.height
  const MARGIN = 13

  // Carrega logos em paralelo com geração de textos IA
  const [radiusLogoResult, creativaLogoResult, aiTexts] = await Promise.all([
    loadSvgAsPng("/logo-radius.svg"),
    loadSvgAsPng("/logo-criativa.svg"),
    generateConsolidatedSummary(data),
  ])

  const radiusPng: string | null = radiusLogoResult?.dataUrl ?? null
  const radiusAspect: number     = radiusLogoResult?.aspect  ?? 3.2
  const criativaPng: string | null = creativaLogoResult?.dataUrl ?? null
  const criativaAspect: number     = creativaLogoResult?.aspect  ?? 3.5

  const competencia = fmtMonthYear(data.dataConclusao ?? data.dataEmissaoAxia ?? data.createdAt)
  const tipoVisita  = tipoLabel(data.tipoAtividade)
  const geradoEm    = new Date().toLocaleString("pt-BR")

  // ══════════════════════════════════════════
  // HELPERS DE LAYOUT
  // ══════════════════════════════════════════

  function drawHeader(pageTitle: string) {
    // Fundo branco
    doc.setFillColor(...C.white)
    doc.rect(0, 0, W, 20, "F")
    // Linha laranja fina no topo (acento Radius)
    doc.setFillColor(...C.orange)
    doc.rect(0, 0, W, 1.5, "F")
    // Linha divisória inferior (cinza)
    doc.setFillColor(...C.border)
    doc.rect(0, 20, W, 0.3, "F")

    // Logo Radius
    if (radiusPng) {
      const lH = 11
      const lW = lH * radiusAspect
      doc.addImage(radiusPng, "PNG", MARGIN, 4.5, lW, lH, undefined, "FAST")
    } else {
      doc.setFontSize(10); doc.setFont("helvetica", "bold")
      doc.setTextColor(...C.charcoal)
      doc.text("RADIUS MINING", MARGIN, 13)
    }

    // Título da página (direita) — cinza escuro, sem laranja
    doc.setFontSize(8); doc.setFont("helvetica", "bold")
    doc.setTextColor(...C.charcoal)
    doc.text(pageTitle.toUpperCase(), W - MARGIN, 10, { align: "right" })
    doc.setFontSize(7); doc.setFont("helvetica", "normal")
    doc.setTextColor(...C.muted)
    doc.text(data.numero, W - MARGIN, 16, { align: "right" })
  }

  function drawFooter() {
    const total = doc.getNumberOfPages()
    // p=1 é a capa (sem footer padrão), p>=2 recebem footer
    for (let p = 2; p <= total; p++) {
      doc.setPage(p)

      // Linha divisória fina cinza
      doc.setDrawColor(...C.border)
      doc.setLineWidth(0.4)
      doc.line(MARGIN, H - 12, W - MARGIN, H - 12)

      // Logo Criativa + texto (esquerda)
      if (criativaPng) {
        const fH = 4.5
        const fW = fH * criativaAspect
        doc.addImage(criativaPng, "PNG", MARGIN, H - 9.5, fW, fH, undefined, "FAST")
        doc.setFontSize(6); doc.setFont("helvetica", "normal")
        doc.setTextColor(...C.muted)
        doc.text("Relatório gerado por Sinapse Criativa", MARGIN + fW + 1.5, H - 6.5)
      } else {
        doc.setFontSize(6); doc.setFont("helvetica", "normal")
        doc.setTextColor(...C.muted)
        doc.text("Relatório gerado por Sinapse Criativa", MARGIN, H - 6.5)
      }

      // Paginação (direita)
      doc.setFontSize(6.5); doc.setFont("helvetica", "normal")
      doc.setTextColor(...C.muted)
      doc.text(`Página ${p - 1} de ${total - 1}`, W - MARGIN, H - 6.5, { align: "right" })
    }
  }

  function sectionBar(y: number, title: string): number {
    // Barra vertical laranja fina (acento Radius, sutil)
    doc.setFillColor(...C.orange)
    doc.rect(MARGIN, y, 2, 7, "F")
    doc.setFontSize(8.5); doc.setFont("helvetica", "bold")
    doc.setTextColor(...C.charcoal)
    doc.text(title.toUpperCase(), MARGIN + 5, y + 5.2)
    // Linha divisória cinza
    doc.setDrawColor(...C.border)
    doc.setLineWidth(0.3)
    doc.line(MARGIN + 5, y + 7.5, W - MARGIN, y + 7.5)
    return y + 12
  }

  function pill(x: number, y: number, text: string, bg: Color, tc: Color = C.white) {
    const pad = 2.5
    const tw = doc.getTextWidth(text)
    doc.setFillColor(...bg)
    doc.roundedRect(x, y - 3.5, tw + pad * 2, 5, 1, 1, "F")
    doc.setTextColor(...tc)
    doc.setFontSize(7); doc.setFont("helvetica", "bold")
    doc.text(text, x + pad, y)
  }

  function infoCard(x: number, y: number, w: number, label: string, value: string, accentColor: Color = C.charcoal) {
    doc.setFillColor(...C.surface)
    doc.roundedRect(x, y, w, 14, 1.5, 1.5, "F")
    doc.setDrawColor(...C.border)
    doc.setLineWidth(0.3)
    doc.roundedRect(x, y, w, 14, 1.5, 1.5, "S")
    // Barra superior fina (acento neutro por padrão)
    doc.setFillColor(...accentColor)
    doc.roundedRect(x, y, w, 1.2, 1.5, 1.5, "F")
    doc.rect(x, y + 1.2, w, 0, "F")
    doc.setFontSize(6); doc.setFont("helvetica", "normal")
    doc.setTextColor(...C.muted)
    doc.text(label.toUpperCase(), x + 3, y + 6)
    doc.setFontSize(8.5); doc.setFont("helvetica", "bold")
    doc.setTextColor(...C.charcoal)
    const lines = doc.splitTextToSize(value, w - 6)
    doc.text(lines[0] ?? "—", x + 3, y + 11)
  }

  // ══════════════════════════════════════════
  // CAPA — fundo branco, identidade corporativa
  // ══════════════════════════════════════════

  // Fundo totalmente branco
  doc.setFillColor(...C.white)
  doc.rect(0, 0, W, H, "F")

  // Linha de acento laranja no topo (fina)
  doc.setFillColor(...C.orange)
  doc.rect(0, 0, W, 3, "F")

  // Logo Radius — centralizada, área superior
  const logoY = 28
  if (radiusPng) {
    const lH = 22
    const lW = lH * radiusAspect
    doc.addImage(radiusPng, "PNG", (W - lW) / 2, logoY, lW, lH, undefined, "FAST")
  } else {
    doc.setFontSize(20); doc.setFont("helvetica", "bold")
    doc.setTextColor(...C.charcoal)
    doc.text("RADIUS MINING", W / 2, logoY + 16, { align: "center" })
  }

  // Linha divisória fina abaixo da logo
  doc.setDrawColor(...C.border)
  doc.setLineWidth(0.5)
  doc.line(MARGIN + 20, logoY + 28, W - MARGIN - 20, logoY + 28)

  // Título principal
  const tY = logoY + 42
  doc.setFontSize(15); doc.setFont("helvetica", "bold")
  doc.setTextColor(...C.charcoal)
  const tituloLines = doc.splitTextToSize(
    "RELATÓRIO DE O&M DO CONTAINER DE MINERAÇÃO DO P&D CASA NOVA",
    W - 40
  )
  doc.text(tituloLines, W / 2, tY, { align: "center" })

  // Linha decorativa laranja (fina, moderada)
  const lineY = tY + tituloLines.length * 7.5 + 5
  doc.setFillColor(...C.orange)
  doc.rect(W / 2 - 22, lineY, 44, 0.7, "F")

  // Competência
  doc.setFontSize(10); doc.setFont("helvetica", "normal")
  doc.setTextColor(...C.slate)
  doc.text("Competência: " + competencia, W / 2, lineY + 9, { align: "center" })

  // Cards de info — fundo cinza claríssimo, sem laranja pesado
  const cardY = lineY + 18
  const cardW3 = (W - MARGIN * 2 - 9) / 3

  function coverCard(x: number, y: number, w: number, label: string, value: string) {
    doc.setFillColor(...C.surface)
    doc.roundedRect(x, y, w, 14, 1.5, 1.5, "F")
    doc.setDrawColor(...C.border)
    doc.setLineWidth(0.3)
    doc.roundedRect(x, y, w, 14, 1.5, 1.5, "S")
    doc.setFontSize(6); doc.setFont("helvetica", "normal")
    doc.setTextColor(...C.muted)
    doc.text(label.toUpperCase(), x + 3, y + 5.5)
    doc.setFontSize(8.5); doc.setFont("helvetica", "bold")
    doc.setTextColor(...C.charcoal)
    const lines = doc.splitTextToSize(value, w - 6)
    doc.text(lines[0] ?? "—", x + 3, y + 11)
  }

  coverCard(MARGIN,                     cardY, cardW3, "Cliente",   "AXIA")
  coverCard(MARGIN + cardW3 + 4.5,      cardY, cardW3, "Operação",  "Radius Mining")
  coverCard(MARGIN + (cardW3 + 4.5) * 2, cardY, cardW3, "Local",   "Casa Nova – BA")

  const card2Y = cardY + 19
  const cardW2 = (W - MARGIN * 2 - 6) / 2
  coverCard(MARGIN,              card2Y, cardW2, "Tipo de Manutenção", tipoVisita)
  coverCard(MARGIN + cardW2 + 6, card2Y, cardW2, "Número da OS",       data.numero)

  // OS Título
  doc.setFontSize(8); doc.setFont("helvetica", "normal")
  doc.setTextColor(...C.slate)
  const osTitleLines = doc.splitTextToSize(data.titulo, W - MARGIN * 2)
  doc.text(osTitleLines.slice(0, 2), W / 2, card2Y + 33, { align: "center" })

  // Pills de status/prioridade
  const statusColors: Record<string, Color> = {
    CONCLUIDA: C.green, EM_ANDAMENTO: C.blue, ABERTA: C.orange,
    AGUARDANDO_PECA: C.amber, PAUSADA: C.muted, CANCELADA: C.red,
  }
  const prioColors: Record<string, Color> = {
    CRITICA: C.red, ALTA: C.orange, MEDIA: C.amber, BAIXA: C.green,
  }
  const pillY = card2Y + 42
  const labelStatus = statusLabel(data.status)
  const labelPrio   = prioridadeLabel(data.prioridade)
  const sw1 = doc.getTextWidth(labelStatus) + 5
  const sw2 = doc.getTextWidth(labelPrio)   + 5
  const totalPillW = sw1 + sw2 + 6
  pill((W - totalPillW) / 2,            pillY, labelStatus, statusColors[data.status] ?? C.muted)
  pill((W - totalPillW) / 2 + sw1 + 6, pillY, labelPrio,   prioColors[data.prioridade] ?? C.muted)

  // Responsável
  if (data.responsavel) {
    doc.setFontSize(8); doc.setFont("helvetica", "bold")
    doc.setTextColor(...C.charcoal)
    doc.text(data.responsavel.nome, W / 2, pillY + 13, { align: "center" })
    doc.setFont("helvetica", "normal"); doc.setTextColor(...C.muted)
    doc.text(data.responsavel.cargo.toLowerCase(), W / 2, pillY + 19, { align: "center" })
  }

  // ── Rodapé da capa ──
  // Linha divisória fina
  doc.setDrawColor(...C.border)
  doc.setLineWidth(0.4)
  doc.line(MARGIN, H - 24, W - MARGIN, H - 24)

  // Logo Criativa + texto (esquerda, discreto)
  if (criativaPng) {
    const fH = 5.5
    const fW = fH * criativaAspect
    doc.addImage(criativaPng, "PNG", MARGIN, H - 19, fW, fH, undefined, "FAST")
    doc.setFontSize(6.5); doc.setFont("helvetica", "normal")
    doc.setTextColor(...C.muted)
    doc.text("Relatório gerado por Sinapse Criativa", MARGIN + fW + 2, H - 15.5)
  } else {
    doc.setFontSize(6.5); doc.setFont("helvetica", "normal")
    doc.setTextColor(...C.muted)
    doc.text("Relatório gerado por Sinapse Criativa", MARGIN, H - 15.5)
  }

  // Data geração (direita)
  doc.setFontSize(6.5); doc.setFont("helvetica", "normal")
  doc.setTextColor(...C.muted)
  doc.text(`Gerado em ${geradoEm}`, W - MARGIN, H - 15.5, { align: "right" })

  // Linha laranja base (muito fina)
  doc.setFillColor(...C.orange)
  doc.rect(0, H - 6, W, 6, "F")
  doc.setFontSize(7); doc.setFont("helvetica", "bold")
  doc.setTextColor(...C.white)
  doc.text("DOCUMENTO CONFIDENCIAL – USO RESTRITO AXIA", W / 2, H - 2.5, { align: "center" })

  // ══════════════════════════════════════════
  // PÁGINA 1 — VISÃO GERAL DA VISITA
  // ══════════════════════════════════════════
  doc.addPage()
  drawHeader("Visão Geral da Visita")
  let y = 26

  y = sectionBar(y, "1. Visão Geral da Visita")

  const colW = (W - MARGIN * 2 - 6) / 2
  const infoH = 13

  // Grid de informações
  infoCard(MARGIN,            y, colW, "Data da Visita",     fmtDate(data.dataConclusao), C.charcoal)
  infoCard(MARGIN + colW + 6, y, colW, "Local da Operação",  "Casa Nova – BA", C.charcoal)
  y += infoH + 3

  infoCard(MARGIN,            y, colW, "Cliente",            "AXIA", C.charcoal)
  infoCard(MARGIN + colW + 6, y, colW, "Operação",           "Radius Mining", C.charcoal)
  y += infoH + 3

  infoCard(MARGIN,            y, colW, "Tipo de Manutenção", tipoVisita, C.charcoal)
  infoCard(MARGIN + colW + 6, y, colW, "Subsistema",         data.subsistema, C.charcoal)
  y += infoH + 3

  infoCard(MARGIN,            y, colW, "Container / TAG",    data.containerId ?? data.componenteTag ?? "—", C.charcoal)
  infoCard(MARGIN + colW + 6, y, colW, "Técnico Responsável", data.responsavel?.nome ?? "—", C.charcoal)
  y += infoH + 6

  // ── Resumo Executivo ──
  y = sectionBar(y, "2. Resumo Executivo")

  const resumoParas = aiTexts.resumoExecutivo.split("\n").filter(Boolean)
  for (const para of resumoParas) {
    if (y > H - 30) { doc.addPage(); drawHeader("Resumo Executivo"); y = 28; }
    doc.setFontSize(8.5); doc.setFont("helvetica", "normal")
    doc.setTextColor(...C.dark)
    const lines = doc.splitTextToSize(para, W - MARGIN * 2)
    doc.text(lines, MARGIN, y)
    y += lines.length * 4.5 + 3
  }

  // ══════════════════════════════════════════
  // PÁGINA 2 — ATIVIDADES + OCORRÊNCIAS
  // ══════════════════════════════════════════
  doc.addPage()
  drawHeader("Atividades e Ocorrências")
  y = 26

  // ── Atividades Realizadas (Checklist agrupado) ──
  if (data.checklistItems.length > 0) {
    y = sectionBar(y, "3. Atividades Realizadas")

    const total    = data.checklistItems.length
    const ok       = data.checklistItems.filter((i) => i.status === "OK").length
    const atencao  = data.checklistItems.filter((i) => i.status === "REQUER_ATENCAO").length
    const pendente = data.checklistItems.filter((i) => i.status === "PENDENTE").length
    const pct      = total > 0 ? Math.round((ok / total) * 100) : 0

    // Minigrid resumo
    const mCardW = (W - MARGIN * 2 - 9) / 4
    ;[
      { label: "Itens Inspecionados", value: String(total),    color: C.charcoal },
      { label: "Conformes (OK)",      value: String(ok),       color: C.green },
      { label: "Requer Atenção",      value: String(atencao),  color: C.orange },
      { label: "Pendentes",           value: String(pendente), color: C.red },
    ].forEach((s, i) => {
      const cx = MARGIN + i * (mCardW + 3)
      doc.setFillColor(...C.surface)
      doc.roundedRect(cx, y, mCardW, 16, 1.5, 1.5, "F")
      doc.setFillColor(...s.color)
      doc.roundedRect(cx, y, mCardW, 1.5, 1.5, 1.5, "F")
      doc.rect(cx, y + 1.5, mCardW, 0, "F")
      doc.setFontSize(13); doc.setFont("helvetica", "bold")
      doc.setTextColor(...s.color)
      doc.text(s.value, cx + mCardW / 2, y + 10.5, { align: "center" })
      doc.setFontSize(6); doc.setFont("helvetica", "normal")
      doc.setTextColor(...C.muted)
      doc.text(s.label, cx + mCardW / 2, y + 14.5, { align: "center" })
    })
    y += 20

    // Barra de progresso
    doc.setFontSize(7.5); doc.setFont("helvetica", "bold")
    doc.setTextColor(...C.charcoal)
    doc.text(`Conformidade Geral: ${pct}%`, MARGIN, y + 3.5)
    doc.setFillColor(...C.border)
    doc.roundedRect(MARGIN + 46, y, W - MARGIN * 2 - 46, 4, 1, 1, "F")
    const barFill = (pct / 100) * (W - MARGIN * 2 - 46)
    doc.setFillColor(...(pct >= 90 ? C.green : atencao > 0 ? C.orange : C.amber))
    if (barFill > 0) doc.roundedRect(MARGIN + 46, y, barFill, 4, 1, 1, "F")
    y += 9

    // Tabela por subsistema
    const grupos: Record<string, typeof data.checklistItems> = {}
    for (const item of data.checklistItems) { (grupos[item.subsistema] ??= []).push(item) }

    for (const [sub, items] of Object.entries(grupos)) {
      if (y > H - 45) { doc.addPage(); drawHeader("Atividades (cont.)"); y = 26; }

      doc.setFillColor(...C.surface)
      doc.rect(MARGIN, y, W - MARGIN * 2, 6, "F")
      doc.setFillColor(...C.charcoal)
      doc.rect(MARGIN, y, 2, 6, "F")
      doc.setFontSize(7.5); doc.setFont("helvetica", "bold")
      doc.setTextColor(...C.charcoal)
      doc.text(sub.toUpperCase(), MARGIN + 5, y + 4.2)
      const subOK = items.filter((i) => i.status === "OK").length
      doc.setTextColor(...C.muted)
      doc.text(`${subOK}/${items.length} OK`, W - MARGIN - 3, y + 4.2, { align: "right" })
      y += 7

      autoTable(doc, {
        startY: y,
        head: [["ID", "Descrição / Ativo", "Periodicidade", "Status", "Observação"]],
        body: items.map((item) => [
          item.itemId,
          `${item.descricao}${item.assetNome ? `
Ativo: ${item.assetNome}${item.assetCodigo ? ` (${item.assetCodigo})` : ""}` : ""}`,
          item.periodicidade,
          checklistStatusLabel(item.status),
          item.observacao || "—",
        ]),
        theme: "plain",
        headStyles: {
          fillColor: C.charcoal, textColor: C.white,
          fontSize: 6.5, fontStyle: "bold",
        },
        styles: { fontSize: 7, cellPadding: [1.5, 2], overflow: "linebreak" },
        columnStyles: {
          0: { cellWidth: 12 },
          1: { cellWidth: 72 },
          2: { cellWidth: 22 },
          3: { cellWidth: 18 },
        },
        margin: { left: MARGIN, right: MARGIN },
        didParseCell(hookData) {
          if (hookData.section === "body" && hookData.column.index === 3) {
            const s = items[hookData.row.index]?.status ?? ""
            hookData.cell.styles.textColor = checklistStatusColor(s)
            hookData.cell.styles.fontStyle  = "bold"
          }
        },
      })
      y = (doc as any).lastAutoTable.finalY + 4
    }
  }

  // ── Ocorrências Identificadas ──
  if (data.comentarios.length > 0) {
    if (y > H - 50) { doc.addPage(); drawHeader("Ocorrências"); y = 26; }
    y = sectionBar(y, "4. Ocorrências Identificadas")

    for (const [idx, c] of data.comentarios.entries()) {
      if (y > H - 32) { doc.addPage(); drawHeader("Ocorrências (cont.)"); y = 26; }

      doc.setFillColor(...C.surface)
      doc.roundedRect(MARGIN, y, W - MARGIN * 2, 18, 1.5, 1.5, "F")
      doc.setDrawColor(...C.border)
      doc.setLineWidth(0.3)
      doc.roundedRect(MARGIN, y, W - MARGIN * 2, 18, 1.5, 1.5, "S")
      doc.setFillColor(...C.charcoal)
      doc.roundedRect(MARGIN, y, 2, 18, 1.5, 1.5, "F")

      doc.setFontSize(7); doc.setFont("helvetica", "bold")
      doc.setTextColor(...C.muted)
      doc.text(`#${String(idx + 1).padStart(2, "0")}`, MARGIN + 5, y + 5.5)
      doc.setTextColor(...C.charcoal)
      doc.text(c.usuario, MARGIN + 14, y + 5.5)
      doc.setFont("helvetica", "normal"); doc.setTextColor(...C.muted)
      doc.text(fmt(c.createdAt), W - MARGIN - 3, y + 5.5, { align: "right" })

      doc.setFontSize(8); doc.setFont("helvetica", "normal")
      doc.setTextColor(...C.dark)
      const lines = doc.splitTextToSize(c.texto, W - MARGIN * 2 - 12)
      doc.text(lines.slice(0, 2), MARGIN + 5, y + 12)
      y += 22
    }
    y += 2
  }

  // ══════════════════════════════════════════
  // PÁGINA 3 — IMPACTO + CONCLUSÃO
  // ══════════════════════════════════════════
  doc.addPage()
  drawHeader("Impacto Operacional e Conclusão")
  y = 26

  // ── Impacto Operacional ──
  y = sectionBar(y, "5. Impacto Operacional")

  const impactoParas = aiTexts.impactoOperacional.split("\n").filter(Boolean)
  for (const para of impactoParas) {
    if (y > H - 30) { doc.addPage(); drawHeader("Impacto Operacional"); y = 28; }
    doc.setFontSize(8.5); doc.setFont("helvetica", "normal")
    doc.setTextColor(...C.dark)
    const lines = doc.splitTextToSize(para, W - MARGIN * 2)
    doc.text(lines, MARGIN, y)
    y += lines.length * 4.5 + 3
  }

  // SLA (apenas corretivas)
  if (data.sla.isCorretiva) {
    y += 2
    if (y > H - 40) { doc.addPage(); drawHeader("SLA"); y = 26; }

    const slaColors: Record<string, Color> = {
      green: C.green, yellow: C.amber, orange: C.orange, red: C.red,
    }
    const slaColor = slaColors[data.sla.statusColor] ?? C.muted

    doc.setFillColor(...C.surface)
    doc.roundedRect(MARGIN, y, W - MARGIN * 2, 22, 2, 2, "F")
    doc.setFillColor(...slaColor)
    doc.roundedRect(MARGIN, y, W - MARGIN * 2, 2, 2, 2, "F")
    doc.rect(MARGIN, y + 2, W - MARGIN * 2, 0, "F")

    doc.setFontSize(7); doc.setFont("helvetica", "bold")
    doc.setTextColor(...C.muted); doc.text("STATUS SLA", MARGIN + 4, y + 8)
    doc.setFontSize(10); doc.setTextColor(...slaColor)
    doc.text(data.sla.statusLabel, MARGIN + 4, y + 15)

    doc.setFontSize(7); doc.setTextColor(...C.muted); doc.text("TEMPO DECORRIDO", W / 2, y + 8, { align: "center" })
    doc.setFontSize(10); doc.setTextColor(...C.charcoal)
    doc.text(data.sla.tempoFormatado, W / 2, y + 15, { align: "center" })

    doc.setFontSize(7); doc.setTextColor(...C.muted); doc.text("REFERÊNCIA", W - MARGIN - 4, y + 8, { align: "right" })
    doc.setFontSize(8.5); doc.setTextColor(...C.charcoal)
    doc.text(data.sla.referenciaManual, W - MARGIN - 4, y + 15, { align: "right" })
    y += 28
  }

  // ── Conclusão Técnica ──
  if (y > H - 50) { doc.addPage(); drawHeader("Conclusão Técnica"); y = 26; }
  y = sectionBar(y, "7. Conclusão Técnica")

  const conclusaoParas = aiTexts.conclusaoTecnica.split("\n").filter(Boolean)
  for (const para of conclusaoParas) {
    if (y > H - 30) { doc.addPage(); drawHeader("Conclusão Técnica"); y = 28; }
    doc.setFontSize(8.5); doc.setFont("helvetica", "normal")
    doc.setTextColor(...C.dark)
    const lines = doc.splitTextToSize(para, W - MARGIN * 2)
    doc.text(lines, MARGIN, y)
    y += lines.length * 4.5 + 3
  }

  // Assinatura / fechamento
  y += 6
  if (y > H - 40) { doc.addPage(); drawHeader("Assinatura"); y = 26; }

  doc.setFillColor(...C.surface)
  doc.roundedRect(MARGIN, y, W - MARGIN * 2, 26, 2, 2, "F")
  doc.setDrawColor(...C.border)
  doc.setLineWidth(0.3)
  doc.roundedRect(MARGIN, y, W - MARGIN * 2, 26, 2, 2, "S")
  // Barra lateral laranja fina (acento)
  doc.setFillColor(...C.orange)
  doc.roundedRect(MARGIN, y, 2, 26, 2, 2, "F")

  doc.setFontSize(8); doc.setFont("helvetica", "bold")
  doc.setTextColor(...C.charcoal)
  doc.text("Equipe Técnica – Radius Mining", MARGIN + 4, y + 10)
  doc.setFont("helvetica", "normal"); doc.setTextColor(...C.muted)
  doc.text("Operação: P&D Casa Nova · Cliente: AXIA", MARGIN + 4, y + 16)
  doc.setFontSize(7); doc.text(`Relatório emitido em ${geradoEm}`, MARGIN + 4, y + 22)

  if (data.responsavel) {
    doc.setFontSize(8); doc.setFont("helvetica", "bold")
    doc.setTextColor(...C.charcoal)
    doc.text(data.responsavel.nome, W - MARGIN - 4, y + 10, { align: "right" })
    doc.setFont("helvetica", "normal"); doc.setTextColor(...C.muted)
    doc.text(data.responsavel.cargo.toLowerCase(), W - MARGIN - 4, y + 16, { align: "right" })
  }
  y += 32

  // ── Histórico de Status ──
  if (data.historico.length > 0) {
    if (y > H - 45) { doc.addPage(); drawHeader("Histórico de Status"); y = 26; }
    y = sectionBar(y, "Histórico de Status da OS")

    autoTable(doc, {
      startY: y,
      head: [["Data", "Status Anterior", "Status Atual", "Usuário", "Observação"]],
      body: data.historico.map((h) => [
        fmt(h.createdAt),
        h.statusDe ? statusLabel(h.statusDe) : "—",
        statusLabel(h.statusPara),
        h.usuario,
        h.observacao || "—",
      ]),
      theme: "striped",
      headStyles: { fillColor: C.charcoal, textColor: C.white, fontSize: 7, fontStyle: "bold" },
      alternateRowStyles: { fillColor: C.surface },
      styles: { fontSize: 7, cellPadding: [1.5, 2] },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 28 },
        2: { cellWidth: 28 },
        3: { cellWidth: 28 },
      },
      margin: { left: MARGIN, right: MARGIN },
    })
    y = (doc as any).lastAutoTable.finalY + 4
  }

  // ══════════════════════════════════════════
  // REGISTRO FOTOGRÁFICO
  // ══════════════════════════════════════════
  const imagens = data.anexos.filter((a) => a.tipo.startsWith("image/"))
  const pdfsAnexos = data.anexos.filter((a) => a.tipo === "application/pdf")

  if (imagens.length > 0) {
    doc.addPage()
    drawHeader("Registro Fotográfico")
    y = 26
    y = sectionBar(y, "6. Registro Fotográfico")

    // Grid 2 colunas para imagens
    const imgColW = (W - MARGIN * 2 - 4) / 2
    let col = 0

    for (const img of imagens) {
      if (col === 0 && y > H - 80) {
        doc.addPage(); drawHeader("Registro Fotográfico (cont.)"); y = 26
      }

      const imgX = MARGIN + col * (imgColW + 4)
      const imgY = y

      try {
        const proxyUrl = `/api/files/anexo?src=${encodeURIComponent(img.url)}&filename=${encodeURIComponent(img.nome)}&inline=1`
        const dataUrl = await urlToDataURL(proxyUrl)
        const fmtImg  = detectFormat(dataUrl)
        const clean   = stripPrefix(dataUrl)
        const dims    = await imageDims(dataUrl)
        const maxH    = 58
        const scale   = Math.min(imgColW / dims.w, maxH / dims.h)
        const iw = dims.w * scale
        const ih = dims.h * scale
        const ix = imgX + (imgColW - iw) / 2

        // Moldura
        doc.setFillColor(...C.border)
        doc.roundedRect(imgX, imgY, imgColW, ih + 8, 1.5, 1.5, "F")
        doc.addImage(clean, fmtImg, ix, imgY + 3, iw, ih - 3, undefined, "FAST")

        // Legenda
        doc.setFontSize(6.5); doc.setFont("helvetica", "normal")
        doc.setTextColor(...C.muted)
        const nomeFit = doc.splitTextToSize(img.nome, imgColW - 4)
        doc.text(nomeFit[0], imgX + 2, imgY + ih + 6)

        if (col === 0) {
          col = 1
        } else {
          col = 0
          y += ih + 14
        }
      } catch {
        doc.setFontSize(7.5); doc.setTextColor(...C.red)
        doc.text("Imagem indisponível", imgX + 3, imgY + 10)
        col = col === 0 ? 1 : 0
        if (col === 0) y += 20
      }
    }
    if (col === 1) y += 70 // fecha última linha de imagens incompleta
  }

  if (pdfsAnexos.length > 0) {
    if (y > H - 40) { doc.addPage(); drawHeader("Anexos PDF"); y = 26; }
    y = sectionBar(y, "Documentos PDF Anexados")
    doc.setFontSize(8); doc.setFont("helvetica", "normal")
    doc.setTextColor(...C.muted)
    doc.text(
      "Os arquivos PDF listados abaixo estão disponíveis no sistema de O&M e podem ser solicitados à equipe Radius Mining.",
      MARGIN, y, { maxWidth: W - MARGIN * 2 }
    )
    y += 10
    for (const p of pdfsAnexos) {
      doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(...C.charcoal)
      doc.text(`• ${p.nome}`, MARGIN + 3, y)
      y += 6
    }
  }

  // ══════════════════════════════════════════
  // FOOTER EM TODAS AS PÁGINAS (p ≥ 2)
  // ══════════════════════════════════════════
  drawFooter()

  return doc
}
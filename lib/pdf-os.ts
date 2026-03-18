"use client"

import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

type Color = [number, number, number]
const C = {
  navy:        [30, 27, 75]    as Color,
  purple:      [139, 31, 169]  as Color,
  purpleLight: [167, 139, 250] as Color,
  surface:     [249, 248, 255] as Color,
  muted:       [107, 114, 128] as Color,
  green:       [22, 163, 74]   as Color,
  red:         [220, 38, 38]   as Color,
  orange:      [234, 88, 12]   as Color,
  yellow:      [202, 138, 4]   as Color,
  white:       [255, 255, 255] as Color,
  black:       [10, 10, 10]    as Color,
  border:      [229, 231, 235] as Color,
}

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

function fmt(iso: string | null | undefined) {
  if (!iso) return "—"
  const d = new Date(iso)
  if (isNaN(d.getTime())) return "—"
  return d.toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" })
}
function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—"
  const d = new Date(iso)
  if (isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("pt-BR")
}
function statusLabel(s: string) {
  const m: Record<string,string> = { ABERTA:"Aberta", EM_ANDAMENTO:"Em andamento", AGUARDANDO_PECA:"Aguardando peça", PAUSADA:"Pausada", CONCLUIDA:"Concluída", CANCELADA:"Cancelada" }
  return m[s] ?? s
}
function prioridadeLabel(p: string) {
  return ({ CRITICA:"Crítica", ALTA:"Alta", MEDIA:"Média", BAIXA:"Baixa" })[p] ?? p
}
function checklistStatusLabel(s: string) {
  return ({ PENDENTE:"Pendente", OK:"OK", NAO_APLICAVEL:"N/A", REQUER_ATENCAO:"Atenção" })[s] ?? s
}
function checklistStatusColor(s: string): Color {
  if (s === "OK") return C.green
  if (s === "REQUER_ATENCAO") return C.orange
  if (s === "NAO_APLICAVEL") return C.muted
  return C.red
}
function atividadeLabel(a: string) {
  const m: Record<string,string> = {
    MANUTENCAO_PREVENTIVA_GERAL:"Manutenção Preventiva Geral",
    FALHA_ENERGIA:"Falha de energia", FALHA_BOMBA_CIRCULACAO:"Falha bomba circulação",
    FALHA_VENTILADOR_EXAUSTAO:"Falha ventilador exaustão", FALHA_BOMBA_REPOSICAO:"Falha bomba reposição",
    ALARME_VAZAMENTO:"Alarme de vazamento", ALARME_ALTA_TEMPERATURA:"Alarme alta temperatura",
    ALARME_ALTA_PRESSAO:"Alarme alta pressão", ALARME_BAIXA_PRESSAO:"Alarme baixa pressão",
    ALARME_BAIXA_VAZAO:"Alarme baixa vazão", ALARME_CONDENSACAO:"Alarme de condensação",
    FALHA_VEDACAO_BOMBA:"Falha vedação bomba", FALHA_VENTILADOR_TORRE:"Falha ventilador torre",
    SUBSTITUICAO_VALVULA_EXAUSTAO:"Substituição válvula exaustão",
    SUBSTITUICAO_VENTILADOR_TORRE:"Substituição ventilador torre", OUTRO:"Outro",
  }
  return m[a] ?? a
}
function tipoLabel(a: string) {
  return a === "MANUTENCAO_PREVENTIVA_GERAL" ? "PREVENTIVA" : "CORRETIVA"
}

// ── Fix TypeScript TS2322: retorna Promise<{ dataUrl; aspect } | null> ──
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

    // Calcula aspect ratio real a partir do data URL gerado
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

export async function generateOSPDF(data: OSReportData) {
  const doc = new jsPDF({ unit: "mm", format: "a4" })
  const W = doc.internal.pageSize.width
  const H = doc.internal.pageSize.height
  const MARGIN = 12

  const logoResult = await loadSvgAsPng("/logo-radius.svg")
  const logoPng: string | null = logoResult ? logoResult.dataUrl : null
  const logoAspect: number    = logoResult ? logoResult.aspect  : 3.2

  function addHeader(pageTitle: string) {
    doc.setFillColor(...C.white)
    doc.rect(0, 0, W, 22, "F")
    doc.setDrawColor(...C.border)
    doc.setLineWidth(0.3)
    doc.line(0, 22, W, 22)
    doc.setFillColor(...C.purple)
    doc.rect(0, 21.5, W, 1.5, "F")

    if (logoPng) {
      const hH = 12
      const hW = hH * logoAspect
      doc.addImage(logoPng, "PNG", MARGIN, (22 - hH) / 2, hW, hH, undefined, "FAST")
    } else {
      doc.setTextColor(...C.navy)
      doc.setFontSize(11)
      doc.setFont("helvetica", "bold")
      doc.text("RADIUS SINAPSE", MARGIN, 14)
    }

    doc.setFontSize(7)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(...C.muted)
    doc.text("O&M · Bitcoin Mining · ANTSPACE HK3", MARGIN + 30, 19)

    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...C.navy)
    doc.text(pageTitle.toUpperCase(), W - MARGIN, 14, { align: "right" })
    doc.setFontSize(7)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(...C.purple)
    doc.text(data.numero, W - MARGIN, 19, { align: "right" })
  }

  function addFooter() {
    const total = doc.getNumberOfPages()
    for (let p = 2; p <= total; p++) {
      doc.setPage(p)
      doc.setDrawColor(...C.purple)
      doc.setLineWidth(0.3)
      doc.line(MARGIN, H - 14, W - MARGIN, H - 14)
      doc.setFontSize(7)
      doc.setTextColor(...C.muted)
      doc.text(`Página ${p - 1} de ${total - 1}`, W - MARGIN, H - 8, { align: "right" })
      doc.text(`© ${new Date().getFullYear()} Radius Mining · Documento confidencial`, MARGIN, H - 8)
    }
  }

  function sectionTitle(y: number, title: string): number {
    doc.setFillColor(...C.navy)
    doc.rect(MARGIN, y, W - MARGIN * 2, 6, "F")
    doc.setFontSize(8)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...C.white)
    doc.text(title.toUpperCase(), MARGIN + 3, y + 4.2)
    return y + 9
  }

  function pill(x: number, y: number, text: string, bg: Color, tc: Color = C.white) {
    const pad = 2.5
    const tw = doc.getTextWidth(text)
    doc.setFillColor(...bg)
    doc.roundedRect(x, y - 3.5, tw + pad * 2, 5, 1, 1, "F")
    doc.setTextColor(...tc)
    doc.setFontSize(7)
    doc.setFont("helvetica", "bold")
    doc.text(text, x + pad, y)
  }

  // ══════════════════════════════════════════════════════════════════════
  // CAPA — fundo totalmente branco
  // ══════════════════════════════════════════════════════════════════════

  // Fundo branco em toda a página
  doc.setFillColor(...C.white)
  doc.rect(0, 0, W, H, "F")

  // Logo centralizada no topo
  const logoY = 24
  if (logoPng) {
    const logoH = 28
    const logoW = logoH * logoAspect
    doc.addImage(logoPng, "PNG", (W - logoW) / 2, logoY, logoW, logoH, undefined, "FAST")
  } else {
    doc.setFontSize(22)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...C.navy)
    doc.text("RADIUS MINING", W / 2, logoY + 18, { align: "center" })
  }

  // Linha separadora sutil abaixo da logo
  doc.setDrawColor(...C.border)
  doc.setLineWidth(0.4)
  doc.line(MARGIN, logoY + 34, W - MARGIN, logoY + 34)

  // Conteúdo centralizado abaixo da logo
  const contentY = logoY + 46

  const tipo = tipoLabel(data.tipoAtividade)
  doc.setFontSize(20)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...C.navy)
  doc.text("RELATÓRIO DE MANUTENÇÃO", W / 2, contentY, { align: "center" })

  doc.setFontSize(13)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(...C.purple)
  doc.text(tipo + " · RADIUS", W / 2, contentY + 10, { align: "center" })

  // Linha decorativa roxa
  doc.setDrawColor(...C.purple)
  doc.setLineWidth(0.6)
  doc.line(W / 2 - 35, contentY + 15, W / 2 + 35, contentY + 15)

  // Badge número OS
  doc.setFillColor(...C.navy)
  const numW = 80
  doc.roundedRect((W - numW) / 2, contentY + 20, numW, 11, 2.5, 2.5, "F")
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...C.white)
  doc.text(data.numero, W / 2, contentY + 28, { align: "center" })

  // Título da OS
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(...C.muted)
  const tituloLines = doc.splitTextToSize(data.titulo, W - 50)
  doc.text(tituloLines.slice(0, 2), W / 2, contentY + 38, { align: "center" })

  // Responsável
  if (data.responsavel) {
    doc.setFontSize(8)
    doc.setTextColor(...C.navy)
    doc.setFont("helvetica", "bold")
    doc.text(data.responsavel.nome, W / 2, contentY + 52, { align: "center" })
    doc.setFont("helvetica", "normal")
    doc.setTextColor(...C.muted)
    doc.text(data.responsavel.cargo.toLowerCase(), W / 2, contentY + 58, { align: "center" })
  }

  // Rodapé da capa
  doc.setFontSize(7.5)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(...C.muted)
  doc.text(
    `Gerado em ${new Date().toLocaleString("pt-BR")}`,
    W / 2, H - 18, { align: "center" }
  )
  doc.setFillColor(...C.purple)
  doc.rect(0, H - 10, W, 10, "F")
  doc.setFontSize(7)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(...C.white)
  doc.text("© " + new Date().getFullYear() + " Radius Mining · Documento confidencial", W / 2, H - 4, { align: "center" })

  // ══════════════════════════════════════════════════════════════════════
  // PÁGINA 1 — Identificação
  // ══════════════════════════════════════════════════════════════════════
  doc.addPage()
  addHeader("Relatório de OS")
  let y = 30

  // Card hero
  doc.setFillColor(...C.surface)
  doc.roundedRect(MARGIN, y, W - MARGIN * 2, 28, 2, 2, "F")
  doc.setDrawColor(...C.purple)
  doc.setLineWidth(0.5)
  doc.roundedRect(MARGIN, y, W - MARGIN * 2, 28, 2, 2, "S")

  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(...C.muted)
  doc.text("NÚMERO DA OS", MARGIN + 4, y + 6)
  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...C.navy)
  doc.text(data.numero, MARGIN + 4, y + 13)
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(...C.black)
  const tituloL = doc.splitTextToSize(data.titulo, W - MARGIN * 2 - 8)
  doc.text(tituloL[0], MARGIN + 4, y + 20)

  const statusColors: Record<string, Color> = {
    CONCLUIDA: C.green, EM_ANDAMENTO: [37, 99, 235] as Color, ABERTA: C.orange,
    AGUARDANDO_PECA: C.yellow, PAUSADA: C.muted, CANCELADA: C.red,
  }
  const prioColors: Record<string, Color> = { CRITICA: C.red, ALTA: C.orange, MEDIA: C.yellow, BAIXA: C.green }
  pill(MARGIN + 4,  y + 26, statusLabel(data.status), statusColors[data.status] ?? C.muted)
  pill(MARGIN + 38, y + 26, prioridadeLabel(data.prioridade), prioColors[data.prioridade] ?? C.muted)
  pill(MARGIN + 60, y + 26, atividadeLabel(data.tipoAtividade).slice(0, 30), C.navy)
  y += 33

  y = sectionTitle(y, "Identificação")

  autoTable(doc, {
    startY: y,
    body: [
      ["Subsistema",  data.subsistema],
      ["TAG",         data.componenteTag || "—"],
      ["Container",   data.containerId || "—"],
      ["Abertura",    fmt(data.createdAt)],
      ["Aberto por",  data.abertoPor.nome],
    ],
    theme: "plain",
    styles: { fontSize: 8, cellPadding: [1.5, 2] },
    columnStyles: { 0: { fontStyle: "bold", textColor: C.muted, cellWidth: 32 } },
    margin: { left: MARGIN, right: W / 2 + 2 },
  })
  const afterIdY = (doc as any).lastAutoTable.finalY

  autoTable(doc, {
    startY: y,
    body: [
      ["Responsável",  data.responsavel?.nome || "—"],
      ["Cargo",        data.responsavel?.cargo?.toLowerCase() || "—"],
      ["Programada",   fmtDate(data.dataProgramada)],
      ["Início real",  fmt(data.dataInicio)],
      ["Conclusão",    fmt(data.dataConclusao)],
    ],
    theme: "plain",
    styles: { fontSize: 8, cellPadding: [1.5, 2] },
    columnStyles: { 0: { fontStyle: "bold", textColor: C.muted, cellWidth: 32 } },
    margin: { left: W / 2 + 2, right: MARGIN },
  })
  y = Math.max(afterIdY, (doc as any).lastAutoTable.finalY) + 4

  y = sectionTitle(y, "Descrição e Motivo")
  autoTable(doc, {
    startY: y,
    body: [
      ["Descrição", data.descricao],
      ["Motivo / Causa raiz", data.motivoOS],
    ],
    theme: "plain",
    styles: { fontSize: 8, cellPadding: [1.5, 2], overflow: "linebreak" },
    columnStyles: { 0: { fontStyle: "bold", textColor: C.muted, cellWidth: 38 } },
    margin: { left: MARGIN, right: MARGIN },
  })
  y = (doc as any).lastAutoTable.finalY + 4

  if (data.historico.length > 0) {
    if (y > H - 50) { doc.addPage(); addHeader("Histórico"); y = 30; }
    y = sectionTitle(y, "Histórico de Status")
    autoTable(doc, {
      startY: y,
      head: [["Data", "De", "Para", "Usuário", "Observação"]],
      body: data.historico.map((h) => [
        fmt(h.createdAt),
        h.statusDe ? statusLabel(h.statusDe) : "—",
        statusLabel(h.statusPara),
        h.usuario,
        h.observacao || "—",
      ]),
      theme: "striped",
      headStyles: { fillColor: C.navy, textColor: C.white, fontSize: 7, fontStyle: "bold" },
      styles: { fontSize: 7, cellPadding: [1.5, 2] },
      columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: 22 }, 2: { cellWidth: 22 }, 3: { cellWidth: 28 } },
      margin: { left: MARGIN, right: MARGIN },
    })
    y = (doc as any).lastAutoTable.finalY + 4
  }

  // ══════════════════════════════════════════════════════════════════════
  // CHECKLIST
  // ══════════════════════════════════════════════════════════════════════
  if (data.checklistItems.length > 0) {
    doc.addPage()
    addHeader("Checklist Preventivo")
    y = 30

    const total    = data.checklistItems.length
    const ok       = data.checklistItems.filter((i) => i.status === "OK").length
    const atencao  = data.checklistItems.filter((i) => i.status === "REQUER_ATENCAO").length
    const pendente = data.checklistItems.filter((i) => i.status === "PENDENTE").length
    const pct      = Math.round((ok / total) * 100)

    const cardW = (W - MARGIN * 2 - 9) / 4
    ;[
      { label: "Total",    value: String(total),    color: C.navy },
      { label: "OK",       value: String(ok),       color: C.green },
      { label: "Atenção",  value: String(atencao),  color: C.orange },
      { label: "Pendente", value: String(pendente), color: C.red },
    ].forEach((s, i) => {
      const cx = MARGIN + i * (cardW + 3)
      doc.setFillColor(...C.surface)
      doc.roundedRect(cx, y, cardW, 18, 1.5, 1.5, "F")
      doc.setDrawColor(...s.color)
      doc.setLineWidth(0.4)
      doc.roundedRect(cx, y, cardW, 18, 1.5, 1.5, "S")
      doc.setFontSize(14)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(...s.color)
      doc.text(s.value, cx + cardW / 2, y + 11, { align: "center" })
      doc.setFontSize(7)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(...C.muted)
      doc.text(s.label, cx + cardW / 2, y + 16, { align: "center" })
    })

    y += 21
    doc.setFontSize(8)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...C.navy)
    doc.text(`Progresso: ${pct}% concluído`, MARGIN, y + 3)
    doc.setFillColor(229, 231, 235)
    doc.roundedRect(MARGIN + 50, y, W - MARGIN * 2 - 50, 4, 1, 1, "F")
    const barFill = (pct / 100) * (W - MARGIN * 2 - 50)
    doc.setFillColor(...(pct === 100 ? C.green : atencao > 0 ? C.orange : C.purple))
    if (barFill > 0) doc.roundedRect(MARGIN + 50, y, barFill, 4, 1, 1, "F")
    y += 10

    const grupos: Record<string, typeof data.checklistItems> = {}
    for (const item of data.checklistItems) { (grupos[item.subsistema] ??= []).push(item) }

    for (const [sub, items] of Object.entries(grupos)) {
      if (y > H - 40) { doc.addPage(); addHeader("Checklist (cont.)"); y = 30; }
      doc.setFillColor(243, 244, 246)
      doc.rect(MARGIN, y, W - MARGIN * 2, 6, "F")
      doc.setFontSize(7.5)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(...C.navy)
      doc.text(sub.toUpperCase(), MARGIN + 3, y + 4.2)
      const subOK = items.filter((i) => i.status === "OK").length
      doc.setTextColor(...C.muted)
      doc.text(`${subOK}/${items.length}`, W - MARGIN - 3, y + 4.2, { align: "right" })
      y += 8

      autoTable(doc, {
        startY: y,
        head: [["ID", "Descrição", "Period.", "Status", "Observação"]],
        body: items.map((item) => [
          item.itemId, item.descricao, item.periodicidade,
          checklistStatusLabel(item.status), item.observacao || "—",
        ]),
        theme: "plain",
        headStyles: { fillColor: C.navy, textColor: C.white, fontSize: 6.5, fontStyle: "bold" },
        styles: { fontSize: 7, cellPadding: [1.5, 2], overflow: "linebreak" },
        columnStyles: { 0: { cellWidth: 12 }, 1: { cellWidth: 72 }, 2: { cellWidth: 20 }, 3: { cellWidth: 18 } },
        margin: { left: MARGIN, right: MARGIN },
        didParseCell(hookData) {
          if (hookData.section === "body" && hookData.column.index === 3) {
            const s = items[hookData.row.index]?.status ?? ""
            hookData.cell.styles.textColor = checklistStatusColor(s)
            hookData.cell.styles.fontStyle = "bold"
          }
        },
      })
      y = (doc as any).lastAutoTable.finalY + 4
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // COMENTÁRIOS
  // ══════════════════════════════════════════════════════════════════════
  if (data.comentarios.length > 0) {
    doc.addPage()
    addHeader("Comentários")
    y = 30
    y = sectionTitle(y, `Comentários (${data.comentarios.length})`)

    for (const c of data.comentarios) {
      if (y > H - 30) { doc.addPage(); addHeader("Comentários (cont.)"); y = 30; }
      doc.setFillColor(...C.surface)
      doc.roundedRect(MARGIN, y, W - MARGIN * 2, 16, 1.5, 1.5, "F")
      doc.setFontSize(7)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(...C.navy)
      doc.text(c.usuario, MARGIN + 3, y + 5)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(...C.muted)
      doc.text(fmt(c.createdAt), W - MARGIN - 3, y + 5, { align: "right" })
      doc.setFontSize(8)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(30, 30, 30)
      const lines = doc.splitTextToSize(c.texto, W - MARGIN * 2 - 6)
      doc.text(lines.slice(0, 2), MARGIN + 3, y + 11)
      y += 20
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // IMAGENS
  // ══════════════════════════════════════════════════════════════════════
  const imagens = data.anexos.filter((a) => a.tipo.startsWith("image/"))
  const pdfs    = data.anexos.filter((a) => a.tipo === "application/pdf")

  for (const img of imagens) {
    doc.addPage()
    addHeader("Anexo — Imagem")
    doc.setFontSize(8)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...C.navy)
    doc.text(img.nome, MARGIN, 30)
    try {
      const proxyUrl = `/api/files/anexo?src=${encodeURIComponent(img.url)}&filename=${encodeURIComponent(img.nome)}&inline=1`
      const dataUrl = await urlToDataURL(proxyUrl)
      const fmtImg  = detectFormat(dataUrl)
      const clean   = stripPrefix(dataUrl)
      const dims    = await imageDims(dataUrl)
      const usableW = W - MARGIN * 2
      const usableH = H - 60
      const scale   = Math.min(usableW / dims.w, usableH / dims.h)
      const iw = dims.w * scale
      const ih = dims.h * scale
      const ix = MARGIN + (usableW - iw) / 2
      doc.addImage(clean, fmtImg, ix, 34, iw, ih, undefined, "FAST")
    } catch (e) {
      console.error("Erro ao carregar imagem:", e)
      doc.setFontSize(9)
      doc.setTextColor(...C.red)
      doc.text("Não foi possível carregar esta imagem.", MARGIN, 50)
    }
  }

  if (pdfs.length > 0) {
    doc.addPage()
    addHeader("Anexos — PDFs")
    y = 30
    y = sectionTitle(y, "Documentos PDF anexados")
    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(...C.muted)
    doc.text("Os arquivos PDF estão disponíveis no sistema e não são incorporados neste relatório.", MARGIN, y + 5)
    y += 12
    for (const p of pdfs) {
      doc.setFontSize(8)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(...C.navy)
      doc.text(`• ${p.nome}`, MARGIN + 3, y)
      y += 6
    }
  }

  addFooter()
  return doc
}
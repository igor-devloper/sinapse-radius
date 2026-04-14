"use client"

import jsPDF from "jspdf"

// ─────────────────────────────────────────────
// PALETA CORPORATIVA – Radius / AXIA
// Base neutra com laranja Radius como acento
// ─────────────────────────────────────────────
type Color = [number, number, number]
const C = {
  orange:      [234, 88,  12]  as Color,
  orangeLight: [251, 146, 60]  as Color,
  navy:        [35, 32, 92]    as Color,
  navySoft:    [48, 57, 120]   as Color,
  navyMuted:   [92, 109, 165]  as Color,
  bluePale:    [236, 241, 252] as Color,
  charcoal:    [28,  28,  28]  as Color,
  dark:        [51,  51,  51]  as Color,
  slate:       [80,  90, 105]  as Color,
  muted:       [120, 125, 135] as Color,
  border:      [220, 222, 226] as Color,
  surface:     [248, 248, 249] as Color,
  white:       [255, 255, 255] as Color,
  green:       [22,  163, 74]  as Color,
  red:         [220, 38,  38]  as Color,
  yellow:      [202, 138,  4]  as Color,
  blue:        [37,  99, 235]  as Color,
  amber:       [217, 119,  6]  as Color,
  corporate:   [31, 41, 55]    as Color,
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
  conclusaoManual?: string | null
  topicosCorretiva?: Array<{
    id: string
    titulo: string
    observacao?: string | null
    ordem: number
    fotos?: Array<{ id: string; nome: string; url: string; tipo: string; tamanho: number }>
  }>
  checklistItems: Array<{
    itemId: string
    descricao: string
    periodicidade: string
    subsistema: string
    referencia: string
    status: "PENDENTE" | "CONFORME" | "NAO_APLICAVEL" | "NAO_CONFORME" | "CONFORME_COM_RESSALVAS"
    observacao?: string | null
    atualizadoEm?: string | null
    assetNome?: string | null
    assetCodigo?: string | null
    assetFotoUrl?: string | null
    fotos?: Array<{ id: string; nome: string; url: string; tipo: string; tamanho: number }>
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
function fixMojibake(value: string) {
  let text = value
  for (let i = 0; i < 2; i++) {
    if (!/[Ãâ]/.test(text)) break
    try {
      text = decodeURIComponent(
        Array.from(text, (char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`).join("")
      )
    } catch {
      break
    }
  }
  return text
}
function checklistStatusLabel(s: string) {
  return ({
    PENDENTE: "Pendente",
    CONFORME: "Conforme",
    NAO_APLICAVEL: "N/A",
    NAO_CONFORME: "Não conforme",
    CONFORME_COM_RESSALVAS: "Conforme com ressalvas",
  })[s] ?? s
}
function checklistStatusColor(s: string): Color {
  if (s === "CONFORME") return [34, 84, 61]
  if (s === "CONFORME_COM_RESSALVAS") return [55, 65, 81]
  if (s === "NAO_CONFORME") return [146, 64, 14]
  if (s === "NAO_APLICAVEL") return C.muted
  return C.muted
}
function tipoLabel(a: string) {
  return a === "MANUTENCAO_PREVENTIVA_GERAL" ? "PREVENTIVA" : "CORRETIVA"
}

const FISCAL_FIXO_NOME = "José Bione de Melo Filho"
const FISCAL_FIXO_CARGO = "Engenheiro da AXIA"

function buildIntroducao(data: OSReportData, tipoVisita: string) {
  const dataConclusao = fmtDate(data.dataConclusao)
  if (data.sla.isCorretiva) {
    return [
      `A equipe técnica da Radius Mining executou a OS ${data.numero} no contexto de manutenção corretiva, com atendimento ao cliente AXIA na operação de Casa Nova - BA.`,
      `A atuação teve foco no subsistema ${data.subsistema}, contemplando diagnóstico da falha, execução das intervenções corretivas previstas no escopo e registro das evidências de campo no presente relatório.`,
      `A manutenção ${dataConclusao !== "—" ? `foi concluída em ${dataConclusao}` : "permaneceu em execução até o fechamento deste relatório"}, em conformidade com o escopo técnico definido para esta ordem de serviço.`,
    ]
  }

  return [
    `A equipe técnica da Radius Mining executou a OS ${data.numero} no contexto de ${tipoVisita.toLowerCase()}, com atendimento ao cliente AXIA na operação de Casa Nova - BA.`,
    `A visita teve foco no subsistema ${data.subsistema}, com verificação dos itens planejados, registro das evidências de campo e consolidação dos resultados no presente relatório.`,
    `A atividade foi concluída em ${dataConclusao}, conforme o escopo definido para esta ordem de serviço.`,
  ]
}

function buildObrigacoesExecutante(data: OSReportData) {
  const totalChecklist = data.checklistItems.length
  if (data.sla.isCorretiva) {
    return [
      "Executar as intervenções corretivas aplicáveis com rastreabilidade por atividade registrada.",
      "Registrar evidências fotográficas e observações técnicas de forma objetiva e auditável.",
      "Descrever cada tópico executado com título, observação de campo e documentação visual compatível com o escopo atendido.",
      `Consolidar os resultados da visita, incluindo ${totalChecklist} tópicos técnicos registrados nesta OS, para validação do fiscal responsável.`,
    ]
  }
  return [
    "Executar o checklist preventivo/corretivo aplicável com rastreabilidade por item inspecionado.",
    "Registrar evidências fotográficas e observações técnicas de forma objetiva e auditável.",
    "Classificar cada item conforme status operacional (Conforme, Não conforme, Conforme com ressalvas, Pendente ou N/A) de maneira coerente com o campo.",
    `Consolidar os resultados da visita, incluindo ${totalChecklist} itens avaliados nesta OS, para validação do fiscal responsável.`,
  ]
}

function buildCorretivaResumo(data: OSReportData) {
  return [
    {
      titulo: "Motivo da OS",
      texto: data.motivoOS?.trim() || "Motivo da ordem de serviço não informado.",
    },
    {
      titulo: "Descrição da intervenção",
      texto: data.descricao?.trim() || "Descrição técnica da manutenção não informada.",
    },
  ]
}

// ─────────────────────────────────────────────
// CARREGAMENTO DE IMAGENS
// ─────────────────────────────────────────────
const FISCAL_FIXO_NOME_LIMPO = "José Bione de Melo Filho"

function buildIntroducaoLimpa(data: OSReportData, tipoVisita: string) {
  const dataConclusao = fmtDate(data.dataConclusao)
  if (data.sla.isCorretiva) {
    return [
      `A equipe técnica da Radius Mining executou a OS ${data.numero} no contexto de manutenção corretiva, com atendimento ao cliente AXIA na operação de Casa Nova - BA.`,
      `A atuação teve foco no subsistema ${data.subsistema}, contemplando diagnóstico da falha, execução das intervenções corretivas previstas no escopo e registro das evidências de campo no presente relatório.`,
      `A manutenção ${dataConclusao !== "—" ? `foi concluída em ${dataConclusao}` : "permaneceu em execução até o fechamento deste relatório"}, em conformidade com o escopo técnico definido para esta ordem de serviço.`,
    ]
  }

  return [
    `A equipe técnica da Radius Mining executou a OS ${data.numero} no contexto de ${tipoVisita.toLowerCase()}, com atendimento ao cliente AXIA na operação de Casa Nova - BA.`,
    `A visita teve foco no subsistema ${data.subsistema}, com verificação dos itens planejados, registro das evidências de campo e consolidação dos resultados no presente relatório.`,
    `A atividade foi concluída em ${dataConclusao}, conforme o escopo definido para esta ordem de serviço.`,
  ]
}

function buildObrigacoesExecutanteLimpa(data: OSReportData) {
  const totalChecklist = data.checklistItems.length
  if (data.sla.isCorretiva) {
    return [
      "Executar as intervenções corretivas aplicáveis com rastreabilidade por atividade registrada.",
      "Registrar evidências fotográficas e observações técnicas de forma objetiva e auditável.",
      "Descrever cada tópico executado com título, observação de campo e documentação visual compatível com o escopo atendido.",
      `Consolidar os resultados da visita, incluindo ${totalChecklist} tópicos técnicos registrados nesta OS, para validação do fiscal responsável.`,
    ]
  }

  return [
    "Executar o checklist preventivo/corretivo aplicável com rastreabilidade por item inspecionado.",
    "Registrar evidências fotográficas e observações técnicas de forma objetiva e auditável.",
    "Classificar cada item conforme status operacional (Conforme, Não conforme, Conforme com ressalvas, Pendente ou N/A) de maneira coerente com o campo.",
    `Consolidar os resultados da visita, incluindo ${totalChecklist} itens avaliados nesta OS, para validação do fiscal responsável.`,
  ]
}

function buildCorretivaResumoLimpo(data: OSReportData) {
  return [
    {
      titulo: "Motivo da OS",
      texto: data.motivoOS?.trim() || "Motivo da ordem de serviço não informado.",
    },
    {
      titulo: "Descrição da intervenção",
      texto: data.descricao?.trim() || "Descrição técnica da manutenção não informada.",
    },
  ]
}

const PDF_FISCAL_FIXO_NOME = "José Bione de Melo Filho"

function buildPdfIntroducao(data: OSReportData, tipoVisita: string) {
  const dataConclusao = fmtDate(data.dataConclusao)
  if (data.sla.isCorretiva) {
    return [
      `A equipe técnica da Radius Mining executou a OS ${data.numero} no contexto de manutenção corretiva, com atendimento ao cliente AXIA na operação de Casa Nova - BA.`,
      `A atuação teve foco no subsistema ${data.subsistema}, contemplando diagnóstico da falha, execução das intervenções corretivas previstas no escopo e registro das evidências de campo no presente relatório.`,
      `A manutenção ${dataConclusao !== "—" ? `foi concluída em ${dataConclusao}` : "permaneceu em execução até o fechamento deste relatório"}, em conformidade com o escopo técnico definido para esta ordem de serviço.`,
    ]
  }

  return [
    `A equipe técnica da Radius Mining executou a OS ${data.numero} no contexto de ${tipoVisita.toLowerCase()}, com atendimento ao cliente AXIA na operação de Casa Nova - BA.`,
    `A visita teve foco no subsistema ${data.subsistema}, com verificação dos itens planejados, registro das evidências de campo e consolidação dos resultados no presente relatório.`,
    `A atividade foi concluída em ${dataConclusao}, conforme o escopo definido para esta ordem de serviço.`,
  ]
}

function buildPdfObrigacoesExecutante(data: OSReportData) {
  const totalChecklist = data.checklistItems.length
  if (data.sla.isCorretiva) {
    return [
      "Executar as intervenções corretivas aplicáveis com rastreabilidade por atividade registrada.",
      "Registrar evidências fotográficas e observações técnicas de forma objetiva e auditável.",
      "Descrever cada tópico executado com título, observação de campo e documentação visual compatível com o escopo atendido.",
      `Consolidar os resultados da visita, incluindo ${totalChecklist} tópicos técnicos registrados nesta OS, para validação do fiscal responsável.`,
    ]
  }

  return [
    "Executar o checklist preventivo/corretivo aplicável com rastreabilidade por item inspecionado.",
    "Registrar evidências fotográficas e observações técnicas de forma objetiva e auditável.",
    "Classificar cada item conforme status operacional (Conforme, Não conforme, Conforme com ressalvas, Pendente ou N/A) de maneira coerente com o campo.",
    `Consolidar os resultados da visita, incluindo ${totalChecklist} itens avaliados nesta OS, para validação do fiscal responsável.`,
  ]
}

function buildPdfCorretivaResumo(data: OSReportData) {
  return [
    {
      titulo: "Motivo da OS",
      texto: data.motivoOS?.trim() || "Motivo da ordem de serviço não informado.",
    },
    {
      titulo: "Descrição da intervenção",
      texto: data.descricao?.trim() || "Descrição técnica da manutenção não informada.",
    },
  ]
}

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

async function loadImageAsDataUrl(url: string): Promise<{ dataUrl: string; aspect: number } | null> {
  try {
    const dataUrl = await urlToDataURL(url)
    const aspect = await new Promise<number>((resolve) => {
      const img = new Image()
      img.onload = () => resolve(img.width && img.height ? img.width / img.height : 3)
      img.onerror = () => resolve(3)
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
function getCanvasExportFormat(dataUrl: string) {
  return /^data:image\/png/i.test(dataUrl)
    ? { mime: "image/png", quality: undefined, fmt: "PNG" as const }
    : { mime: "image/jpeg", quality: 0.92, fmt: "JPEG" as const }
}
function getPhotoLayoutKind(width: number, height: number): "single" | "double" {
  const aspect = width / Math.max(height, 1)
  if (aspect >= 1.15) return "single"
  if (aspect <= 0.72) return "single"
  return "double"
}

/**
 * Lê a orientação EXIF de um JPEG e retorna o grau de rotação necessário
 * para deixar a imagem "em pé" (0, 90, 180 ou 270).
 */
function getExifRotation(base64: string): number {
  try {
    // Decodifica somente os primeiros bytes para encontrar APP1/EXIF
    const binary = atob(base64.substring(0, 65536))
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

    // Verifica SOI marker
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return 0

    let offset = 2
    while (offset < bytes.length - 4) {
      if (bytes[offset] !== 0xff) break
      const marker = bytes[offset + 1]
      const segLen = (bytes[offset + 2] << 8) | bytes[offset + 3]

      if (marker === 0xe1) {
        // APP1 – verifica "Exif\0\0"
        const exifHeader = String.fromCharCode(...bytes.slice(offset + 4, offset + 10))
        if (exifHeader.startsWith("Exif")) {
          const tiffOffset = offset + 10
          const littleEndian = bytes[tiffOffset] === 0x49

          const read16 = (o: number) =>
            littleEndian
              ? (bytes[tiffOffset + o] | (bytes[tiffOffset + o + 1] << 8))
              : ((bytes[tiffOffset + o] << 8) | bytes[tiffOffset + o + 1])
          const read32 = (o: number) =>
            littleEndian
              ? (bytes[tiffOffset + o] |
                 (bytes[tiffOffset + o + 1] << 8) |
                 (bytes[tiffOffset + o + 2] << 16) |
                 (bytes[tiffOffset + o + 3] << 24))
              : ((bytes[tiffOffset + o] << 24) |
                 (bytes[tiffOffset + o + 1] << 16) |
                 (bytes[tiffOffset + o + 2] << 8) |
                 bytes[tiffOffset + o + 3])

          const ifdOffset = read32(4)
          const numEntries = read16(ifdOffset)

          for (let i = 0; i < numEntries; i++) {
            const entryOffset = ifdOffset + 2 + i * 12
            const tag = read16(entryOffset)
            if (tag === 0x0112) {
              // Orientation tag
              const orientation = read16(entryOffset + 8)
              const rotMap: Record<number, number> = {
                1: 0, 3: 180, 6: 90, 8: 270,
                2: 0, 4: 180, 5: 90, 7: 270,
              }
              return rotMap[orientation] ?? 0
            }
          }
        }
      }
      offset += 2 + segLen
    }
  } catch {
    // silencioso
  }
  return 0
}

/**
 * Recebe um dataURL de imagem, aplica a rotação EXIF via canvas e
 * retorna { dataUrl, width, height } já corrigidos.
 */
async function getImageDisplaySize(
  dataUrl: string
): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const width = img.naturalWidth || img.width || 800
      const height = img.naturalHeight || img.height || 600
      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")!

      ctx.drawImage(img, 0, 0, width, height)

      const exportFormat = getCanvasExportFormat(dataUrl)
      resolve({
        dataUrl: canvas.toDataURL(exportFormat.mime, exportFormat.quality),
        width,
        height,
      })
    }
    img.onerror = () => resolve({ dataUrl, width: 800, height: 600 })
    img.src = dataUrl
  })
}

// ─────────────────────────────────────────────
// GERAÇÃO DE TEXTO POR IA
// ─────────────────────────────────────────────
async function generateConsolidatedSummary(data: OSReportData): Promise<{
  impactoOperacional: string
}> {
  const tipoVisita = tipoLabel(data.tipoAtividade)
  const totalChecklist = data.checklistItems.length
  const okItems = data.checklistItems.filter((i) => i.status === "CONFORME").length
  const atencaoItems = data.checklistItems.filter((i) => i.status === "NAO_CONFORME").length
  const ressalvaItems = data.checklistItems.filter((i) => i.status === "CONFORME_COM_RESSALVAS").length
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
Data de Conclusão: ${fmtDate(data.dataConclusao)}
Responsável técnico: ${data.responsavel?.nome ?? "não informado"}
Descrição Técnica: ${data.descricao}
Motivo / causa raiz: ${data.motivoOS}

=== EXECUÇÃO ===
Quantidade de registros técnicos: ${totalChecklist}
Itens conformes: ${okItems}
Itens com ressalvas: ${ressalvaItems}
Itens não conformes: ${atencaoItems}
Itens pendentes: ${pendItems}
Percentual de conformidade: ${totalChecklist > 0 ? Math.round(((okItems + ressalvaItems) / totalChecklist) * 100) : 0}%

=== OCORRÊNCIAS ===
Total de Ocorrências registradas: ${ocorrencias}
${data.comentarios.slice(0, 5).map((c) => `- ${c.texto}`).join("\n")}

=== CONCLUSÃO MANUAL DO RESPONSÁVEL ===
${data.conclusaoManual?.trim() ? data.conclusaoManual : "Não informada."}

=== INSTRUÇÕES DE ESCRITA ===
Escreva exclusivamente em português técnico formal.
NÃO mencione nomes de sistemas internos, dashboards ou plataformas de software.
Use linguagem de relatório técnico enviado ao cliente.
Seja objetivo, preciso e profissional.
Trate o destinatário como "cliente" ou "AXIA".
Use "equipe técnica da Radius Mining" como sujeito das ações.
Não use termos coloquiais, ambíguos ou sem lastro técnico.
Quando houver risco, pendência ou desvio, descreva impacto operacional e ação recomendada.

Retorne APENAS um JSON válido (sem markdown, sem texto antes ou depois):
{
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
    if (data.sla.isCorretiva) {
      return {
        impactoOperacional:
          `A manutenção corretiva executada atuou diretamente sobre a falha registrada no subsistema ${data.subsistema}, com foco em restabelecer a condição operacional do sistema e reduzir o risco de recorrência da anomalia observada. As intervenções registradas nesta OS contribuíram para recompor a confiabilidade do conjunto atendido e suportar a continuidade da operação sob os critérios técnicos aplicáveis.\n\nPermanece como recomendação o acompanhamento do comportamento do equipamento após a intervenção, com atenção a alarmes, desvios de processo e eventuais evidências de reincidência, de modo a assegurar estabilidade operacional e resposta tempestiva caso novos sintomas sejam identificados.`,
      }
    }
    return {
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
  const originalText = doc.text.bind(doc) as (...args: any[]) => any
  const originalSplitTextToSize = doc.splitTextToSize.bind(doc) as (...args: any[]) => any
  doc.text = ((text: string | string[], ...args: any[]) => {
    const normalized = Array.isArray(text) ? text.map(fixMojibake) : fixMojibake(text)
    return originalText(normalized, ...args)
  }) as typeof doc.text
  doc.splitTextToSize = ((text: string, size: number, options?: any) => {
    return originalSplitTextToSize(fixMojibake(text), size, options)
  }) as typeof doc.splitTextToSize
  const W = doc.internal.pageSize.width
  const H = doc.internal.pageSize.height
  const MARGIN = 13

  const [radiusLogoResult, creativaLogoResult, aiSummary] = await Promise.all([
    loadImageAsDataUrl("/logo-radius-bco.png"),
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
    void pageTitle
    doc.setFillColor(...C.navy)
    doc.rect(0, 0, W, 20, "F")
    doc.setFillColor(...C.navySoft)
    doc.rect(0, 20, W, 0.6, "F")

    if (radiusPng) {
      const lH = 11
      const lW = lH * radiusAspect
      doc.addImage(radiusPng, "PNG", MARGIN, 4.5, lW, lH, undefined, "FAST")
    } else {
      doc.setFontSize(10); doc.setFont("helvetica", "bold")
      doc.setTextColor(...C.white)
      doc.text("RADIUS MINING", MARGIN, 13)
    }

    doc.setFontSize(7); doc.setFont("helvetica", "normal")
    doc.setTextColor(...C.white)
    doc.text(data.numero, W - MARGIN, 16, { align: "right" })
  }

  function drawFooter() {
    const total = doc.getNumberOfPages()
    for (let p = 2; p <= total; p++) {
      doc.setPage(p)

      doc.setDrawColor(...C.border)
      doc.setLineWidth(0.4)
      doc.line(MARGIN, H - 12, W - MARGIN, H - 12)

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

      doc.setFontSize(6.5); doc.setFont("helvetica", "normal")
      doc.setTextColor(...C.muted)
      doc.text(`Página ${p - 1} de ${total - 1}`, W - MARGIN, H - 6.5, { align: "right" })
    }
  }

  function sectionBar(y: number, title: string): number {
    doc.setFontSize(9); doc.setFont("helvetica", "bold")
    doc.setTextColor(...C.navy)
    doc.text(title.toUpperCase(), MARGIN, y + 5.2)
    doc.setDrawColor(...C.navyMuted)
    doc.setLineWidth(0.5)
    doc.line(MARGIN, y + 7.5, W - MARGIN, y + 7.5)
    return y + 12
  }

  // ══════════════════════════════════════════
  // CAPA
  // ══════════════════════════════════════════
  doc.setFillColor(...C.white)
  doc.rect(0, 0, W, H, "F")

  const logoY = 44
  if (radiusPng) {
    doc.setFillColor(...C.navy)
    doc.roundedRect(58, logoY - 2, W - 116, 24, 5, 5, "F")
    const lH = 13
    const lW = lH * radiusAspect
    doc.addImage(radiusPng, "PNG", (W - lW) / 2, logoY + 3.5, lW, lH, undefined, "FAST")
  }

  const capaTituloY = logoY + 42
  doc.setFontSize(17); doc.setFont("helvetica", "bold")
  doc.setTextColor(...C.navy)
  const tituloCapa = doc.splitTextToSize(`RELATÓRIO DE MANUTENÇÃO ${tipoVisita}`, W - 46)
  doc.text(tituloCapa, W / 2, capaTituloY, { align: "center" })

  doc.setFontSize(12); doc.setFont("helvetica", "bold")
  doc.setTextColor(...C.navySoft)
  doc.text(competencia, W / 2, capaTituloY + tituloCapa.length * 7 + 8, { align: "center" })

  doc.setFontSize(8); doc.setFont("helvetica", "normal")
  doc.setTextColor(...C.slate)
  doc.text(`${data.numero}`, W / 2, capaTituloY + tituloCapa.length * 7 + 16, { align: "center" })

  doc.setDrawColor(...C.navyMuted)
  doc.setLineWidth(0.4)
  doc.line(MARGIN + 42, capaTituloY + tituloCapa.length * 7 + 24, W - MARGIN - 42, capaTituloY + tituloCapa.length * 7 + 24)

  doc.setFontSize(8); doc.setFont("helvetica", "normal")
  doc.setTextColor(...C.navyMuted)
  doc.text("Responsável Técnico", W / 2, capaTituloY + tituloCapa.length * 7 + 34, { align: "center" })
  doc.setFontSize(10); doc.setFont("helvetica", "bold")
  doc.setTextColor(...C.navy)
  doc.text(data.responsavel?.nome ?? "Não informado", W / 2, capaTituloY + tituloCapa.length * 7 + 41, { align: "center" })

  doc.setDrawColor(...C.navyMuted)
  doc.setLineWidth(0.4)
  doc.line(MARGIN, H - 24, W - MARGIN, H - 24)

  doc.setFontSize(6.5); doc.setFont("helvetica", "normal")
  doc.setTextColor(...C.navyMuted)
  doc.text(`Gerado em ${geradoEm}`, W - MARGIN, H - 15.5, { align: "right" })

  // ══════════════════════════════════════════
  // PÁGINA 1 – INTRODUÇÃO + OBRIGAÇÕES
  // ══════════════════════════════════════════
  doc.addPage()
  drawHeader("Introdução da Visita")
  let y = 26

  y = sectionBar(y, "1. Introdução")

  for (const para of buildPdfIntroducao(data, tipoVisita)) {
    if (y > H - 30) { doc.addPage(); drawHeader("Introdução"); y = 28; }
    doc.setFontSize(8.5); doc.setFont("helvetica", "normal")
    doc.setTextColor(...C.dark)
    const lines = doc.splitTextToSize(para, W - MARGIN * 2)
    doc.text(lines, MARGIN, y)
    y += lines.length * 4.5 + 2.5
  }

  if (data.sla.isCorretiva) {
    if (y > H - 80) { doc.addPage(); drawHeader("Dados da OS Corretiva"); y = 26; }
    y += 3
    y = sectionBar(y, "2. Dados da OS Corretiva")

    for (const bloco of buildPdfCorretivaResumo(data)) {
      const textoLines = doc.splitTextToSize(bloco.texto, W - MARGIN * 2 - 10)
      const boxH = Math.max(18, 10 + textoLines.length * 4.2)

      if (y + boxH > H - 24) {
        doc.addPage()
        drawHeader("Dados da OS Corretiva")
        y = 26
        y = sectionBar(y, "2. Dados da OS Corretiva")
      }

      doc.setFillColor(...C.bluePale)
      doc.roundedRect(MARGIN, y, W - MARGIN * 2, boxH, 2, 2, "F")
      doc.setDrawColor(...C.navyMuted)
      doc.setLineWidth(0.25)
      doc.roundedRect(MARGIN, y, W - MARGIN * 2, boxH, 2, 2, "S")

      doc.setFontSize(7.2); doc.setFont("helvetica", "bold")
      doc.setTextColor(...C.navy)
      doc.text(bloco.titulo.toUpperCase(), MARGIN + 4, y + 5)

      doc.setFontSize(8); doc.setFont("helvetica", "normal")
      doc.setTextColor(...C.dark)
      doc.text(textoLines, MARGIN + 4, y + 10)
      y += boxH + 4
    }
  }

  if (y > H - 55) { doc.addPage(); drawHeader("Obrigações do Executante"); y = 26; }
  y += 3
  y = sectionBar(y, data.sla.isCorretiva ? "3. Obrigações do Executante" : "2. Obrigações do Executante")

  for (const obrigacao of buildPdfObrigacoesExecutante(data)) {
    if (y > H - 22) { doc.addPage(); drawHeader("Obrigações do Executante"); y = 26; }
    doc.setFontSize(8.2); doc.setFont("helvetica", "normal")
    doc.setTextColor(...C.dark)
    const lines = doc.splitTextToSize(`• ${obrigacao}`, W - MARGIN * 2 - 2)
    doc.text(lines, MARGIN + 1, y)
    y += lines.length * 4.4 + 1.8
  }

  // ══════════════════════════════════════════
  // PÁGINA 2 – ATIVIDADES + OCORRÊNCIAS
  // ══════════════════════════════════════════
  doc.addPage()
  drawHeader("Atividades Realizadas")
  y = 26

  if (data.checklistItems.length > 0) {
    y = sectionBar(y, "4. Atividades Realizadas")

    const total    = data.checklistItems.length
    const ok       = data.checklistItems.filter((i) => i.status === "CONFORME").length
    const ressalva = data.checklistItems.filter((i) => i.status === "CONFORME_COM_RESSALVAS").length
    const atencao  = data.checklistItems.filter((i) => i.status === "NAO_CONFORME").length
    const pendente = data.checklistItems.filter((i) => i.status === "PENDENTE").length
    const naoAplicavel = data.checklistItems.filter((i) => i.status === "NAO_APLICAVEL").length
    const pct      = total > 0 ? Math.round(((ok + ressalva) / total) * 100) : 0

    y += 8

    const grupos: Record<string, typeof data.checklistItems> = {}
    for (const item of data.checklistItems) { (grupos[item.subsistema] ??= []).push(item) }

    // Pré-carrega todas as fotos de checklist em paralelo
    type FotoCarregada = {
      itemId: string
      dataUrl: string
      fmt: "PNG" | "JPEG"
      clean: string
      w: number
      h: number
      nome: string
    }

    const todasFotos: FotoCarregada[] = (
      await Promise.all(
        data.checklistItems.flatMap((item) =>
          (item.fotos ?? []).map(async (foto) => {
            try {
              const proxyUrl = `/api/files/anexo?src=${encodeURIComponent(foto.url)}&filename=${encodeURIComponent(foto.nome)}&inline=1`
              const rawDataUrl = await urlToDataURL(proxyUrl)
              const { dataUrl, width, height } = await getImageDisplaySize(rawDataUrl)
              return {
                itemId: item.itemId,
                dataUrl,
                fmt: detectFormat(dataUrl) as "PNG" | "JPEG",
                clean: stripPrefix(dataUrl),
                w: width,
                h: height,
                nome: foto.nome,
              } satisfies FotoCarregada
            } catch {
              return null
            }
          })
        )
      )
    ).filter((f): f is FotoCarregada => f !== null)

    // Mapa: itemId → fotos carregadas
    const fotosPorItem: Record<string, FotoCarregada[]> = {}
    for (const f of todasFotos) {
      (fotosPorItem[f.itemId] ??= []).push(f)
    }

    const gruposEntries = Object.entries(grupos)
    for (const [subIndex, [sub, items]] of gruposEntries.entries()) {
      if (y > H - 45) { doc.addPage(); drawHeader("Atividades (cont.)"); y = 26; }

      doc.setFillColor(...C.surface)
      doc.rect(MARGIN, y, W - MARGIN * 2, 6, "F")
      doc.setFillColor(...C.charcoal)
      doc.rect(MARGIN, y, 2, 6, "F")
      doc.setFontSize(7.5); doc.setFont("helvetica", "bold")
      doc.setTextColor(...C.charcoal)
      doc.text(`4.${subIndex + 1} ${sub.toUpperCase()}`, MARGIN + 5, y + 4.2)
      const subOK = items.filter((i) => i.status === "CONFORME").length
      doc.setTextColor(...C.muted)
      doc.text(`${subOK}/${items.length} Conformes`, W - MARGIN - 3, y + 4.2, { align: "right" })
      y += 7

      for (const item of items) {
        const itemFotos = fotosPorItem[item.itemId] ?? []
        const statusLbl = checklistStatusLabel(item.status)
        const statusClr = checklistStatusColor(item.status)

        if (y > H - 30) { doc.addPage(); drawHeader("Atividades (cont.)"); y = 26; }

        doc.setFillColor(...C.border)
        doc.rect(MARGIN, y, W - MARGIN * 2, 0.3, "F")

        doc.setFontSize(7.5); doc.setFont("helvetica", "normal")
        doc.setTextColor(...C.dark)
        const descLines = doc.splitTextToSize(item.descricao, W - MARGIN * 2 - 50)
        doc.text(descLines[0], MARGIN + 4, y + 4.5)

        doc.setFontSize(6); doc.setFont("helvetica", "normal")
        doc.setTextColor(...C.muted)
        doc.text(item.periodicidade, W - MARGIN - 40, y + 4.5, { align: "right" })

        doc.setFontSize(6.5); doc.setFont("helvetica", "bold")
        doc.setTextColor(...statusClr)
        doc.text(statusLbl, W - MARGIN - 3, y + 4.5, { align: "right" })

        y += 10

        if (item.observacao) {
          if (y > H - 20) { doc.addPage(); drawHeader("Atividades (cont.)"); y = 26; }
          const obsLines = doc.splitTextToSize(item.observacao, W - MARGIN * 2 - 12)
          const obsH = Math.max(12, 6 + obsLines.length * 3.6)
          if (y + obsH > H - 18) { doc.addPage(); drawHeader("Atividades (cont.)"); y = 26; }
          doc.setFillColor(...C.surface)
          doc.roundedRect(MARGIN, y, W - MARGIN * 2, obsH, 1, 1, "F")
          doc.setDrawColor(...C.border)
          doc.setLineWidth(0.2)
          doc.roundedRect(MARGIN, y, W - MARGIN * 2, obsH, 1, 1, "S")
          doc.setFontSize(6.5); doc.setFont("helvetica", "bold")
          doc.setTextColor(...C.corporate)
          doc.text("OBSERVAÇÃO DE CAMPO", MARGIN + 4, y + 4.2)
          doc.setFontSize(7); doc.setFont("helvetica", "normal")
          doc.setTextColor(...C.dark)
          doc.text(obsLines, MARGIN + 4, y + 8.2)
          y += obsH + 2
        }

        // Fotos do item (layout responsivo conforme proporÃ§Ã£o visÃ­vel da imagem)
        if (itemFotos.length > 0) {
          const FOTO_GAP     = 4
          const CAPTION_H_F  = 6
          const MAX_FOTO_H   = 70
          const COL_W        = (W - MARGIN * 2 - FOTO_GAP) / 2

          let fi = 0
          while (fi < itemFotos.length) {
            const foto = itemFotos[fi]
            const layoutKind = getPhotoLayoutKind(foto.w, foto.h)

            if (layoutKind === "single") {
              const scale = Math.min((W - MARGIN * 2) / foto.w, MAX_FOTO_H / foto.h)
              const fw = foto.w * scale
              const fh = foto.h * scale
              const neededH = fh + CAPTION_H_F + 4

              if (y + neededH > H - 18) { doc.addPage(); drawHeader("Atividades (cont.)"); y = 26; }

              const fx = MARGIN + ((W - MARGIN * 2) - fw) / 2
              doc.setFillColor(...C.border)
              doc.roundedRect(fx - 1, y - 1, fw + 2, fh + 2, 1, 1, "F")
              doc.addImage(foto.clean, foto.fmt, fx, y, fw, fh, undefined, "FAST")

              doc.setFontSize(6.5); doc.setFont("helvetica", "normal")
              doc.setTextColor(...C.muted)
              const cap = doc.splitTextToSize(foto.nome, W - MARGIN * 2)
              doc.text(cap[0], W / 2, y + fh + 4, { align: "center" })

              y += fh + CAPTION_H_F + 4
              fi++
            } else {
              const fotoA = itemFotos[fi]
              const fotoB = itemFotos[fi + 1] && getPhotoLayoutKind(itemFotos[fi + 1].w, itemFotos[fi + 1].h) === "double"
                ? itemFotos[fi + 1]
                : null

              const scaleA = Math.min(COL_W / fotoA.w, MAX_FOTO_H / fotoA.h)
              const fwA = fotoA.w * scaleA
              const fhA = fotoA.h * scaleA

              let fwB = 0, fhB = 0
              if (fotoB) {
                const scaleB = Math.min(COL_W / fotoB.w, MAX_FOTO_H / fotoB.h)
                fwB = fotoB.w * scaleB
                fhB = fotoB.h * scaleB
              }

              const rowH = Math.max(fhA, fhB || 0)
              const neededH = rowH + CAPTION_H_F + 4

              if (y + neededH > H - 18) { doc.addPage(); drawHeader("Atividades (cont.)"); y = 26; }

              const fxA = MARGIN + (COL_W - fwA) / 2
              doc.setFillColor(...C.border)
              doc.roundedRect(fxA - 1, y - 1, fwA + 2, fhA + 2, 1, 1, "F")
              doc.addImage(fotoA.clean, fotoA.fmt, fxA, y, fwA, fhA, undefined, "FAST")
              doc.setFontSize(6.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...C.muted)
              const capA = doc.splitTextToSize(fotoA.nome, COL_W - 4)
              doc.text(capA[0], fxA + fwA / 2, y + fhA + 4, { align: "center" })

              if (fotoB) {
                const fxB = MARGIN + COL_W + FOTO_GAP + (COL_W - fwB) / 2
                doc.setFillColor(...C.border)
                doc.roundedRect(fxB - 1, y - 1, fwB + 2, fhB + 2, 1, 1, "F")
                doc.addImage(fotoB.clean, fotoB.fmt, fxB, y, fwB, fhB, undefined, "FAST")
                const capB = doc.splitTextToSize(fotoB.nome, COL_W - 4)
                doc.text(capB[0], fxB + fwB / 2, y + fhB + 4, { align: "center" })
                fi++
              }

              y += rowH + CAPTION_H_F + 4
              fi++
            }
          }
          y += 2
        }

        doc.setDrawColor(...C.border)
        doc.setLineWidth(0.2)
        doc.line(MARGIN + 2, y, W - MARGIN, y)
        y += 3
      }
    }
  }

  if (data.comentarios.length > 0) {
    if (y > H - 50) { doc.addPage(); drawHeader("Ocorrências"); y = 26; }
    y = sectionBar(y, "5. Ocorrências Identificadas")

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
  // PÁGINA 3 – IMPACTO + CONCLUSÃO
  // ══════════════════════════════════════════
  doc.addPage()
  drawHeader("Impacto Operacional e Conclusão")
  y = 26

  y = sectionBar(y, "6. Impacto Operacional")

  const impactoParas = aiSummary.impactoOperacional.split("\n").filter(Boolean)
  for (const para of impactoParas) {
    if (y > H - 30) { doc.addPage(); drawHeader("Impacto Operacional"); y = 28; }
    doc.setFontSize(8.5); doc.setFont("helvetica", "normal")
    doc.setTextColor(...C.dark)
    const lines = doc.splitTextToSize(para, W - MARGIN * 2)
    doc.text(lines, MARGIN, y)
    y += lines.length * 4.5 + 3
  }

  // if (data.sla.isCorretiva) {
  //   y += 2
  //   if (y > H - 40) { doc.addPage(); drawHeader("SLA"); y = 26; }

  //   const slaColors: Record<string, Color> = {
  //     green: [34, 84, 61], yellow: [196, 138, 24], orange: [217, 119, 6], red: [185, 28, 28],
  //   }
  //   const slaColor = slaColors[data.sla.statusColor] ?? C.muted

  //   doc.setFillColor(...C.bluePale)
  //   doc.roundedRect(MARGIN, y, W - MARGIN * 2, 22, 2, 2, "F")
  //   doc.setDrawColor(...C.navyMuted)
  //   doc.setLineWidth(0.3)
  //   doc.roundedRect(MARGIN, y, W - MARGIN * 2, 22, 2, 2, "S")

  //   doc.setFontSize(7); doc.setFont("helvetica", "bold")
  //   doc.setTextColor(...C.navyMuted); doc.text("STATUS SLA", MARGIN + 4, y + 8)
  //   doc.setFontSize(10); doc.setTextColor(...slaColor)
  //   doc.text(data.sla.statusLabel, MARGIN + 4, y + 15)

  //   doc.setFontSize(7); doc.setTextColor(...C.navyMuted); doc.text("TEMPO DECORRIDO", W / 2, y + 8, { align: "center" })
  //   doc.setFontSize(10); doc.setTextColor(...C.navy)
  //   doc.text(data.sla.tempoFormatado, W / 2, y + 15, { align: "center" })

  //   doc.setFontSize(7); doc.setTextColor(...C.navyMuted); doc.text("REFERÊNCIA", W - MARGIN - 4, y + 8, { align: "right" })
  //   doc.setFontSize(8.5); doc.setTextColor(...C.navy)
  //   doc.text(data.sla.referenciaManual, W - MARGIN - 4, y + 15, { align: "right" })
  //   y += 28
  // }

  if (y > H - 50) { doc.addPage(); drawHeader("Conclusão Técnica"); y = 26; }
  y = sectionBar(y, "7. Conclusão Técnica")

  const textoConclusaoTecnica = data.conclusaoManual?.trim() || "Conclusão técnica não informada."
  doc.setFontSize(8.5); doc.setFont("helvetica", "normal")
  doc.setTextColor(...C.dark)
  const linhasConclusaoManual = doc.splitTextToSize(textoConclusaoTecnica, W - MARGIN * 2)
  doc.text(linhasConclusaoManual, MARGIN, y)
  y += linhasConclusaoManual.length * 4.5 + 4

  y += 6
  if (y > H - 40) { doc.addPage(); drawHeader("Assinatura"); y = 26; }

  doc.setFillColor(...C.navy)
  doc.roundedRect(MARGIN, y, W - MARGIN * 2, 42, 2, 2, "F")
  doc.setDrawColor(...C.navySoft)
  doc.setLineWidth(0.4)
  doc.roundedRect(MARGIN, y, W - MARGIN * 2, 42, 2, 2, "S")

  doc.setFontSize(8); doc.setFont("helvetica", "bold")
  doc.setTextColor(...C.white)
  doc.text("Identificações", MARGIN + 4, y + 8)

  doc.setFontSize(7.3); doc.setFont("helvetica", "normal")
  doc.setTextColor(...C.white)
  doc.text(`Fiscal: ${PDF_FISCAL_FIXO_NOME}`, MARGIN + 4, y + 15)
  doc.text(`Técnico Executante: ${data.abertoPor?.nome ?? "Não informado"}`, MARGIN + 4, y + 21)
  doc.text(`Responsável Técnico: ${data.responsavel?.nome ?? "Não informado"}`, MARGIN + 4, y + 27)

  doc.setFontSize(7); doc.setTextColor(...C.white)
  // doc.text(`Relatório emitido em ${geradoEm}`, MARGIN + 4, y + 35)
  doc.text("Operação: P&D Casa Nova - Cliente: AXIA", MARGIN + 4, y + 39)

  if (radiusPng) {
    const logoH = 12
    const logoW = logoH * radiusAspect
    doc.addImage(radiusPng, "PNG", W - MARGIN - logoW - 2, y + 12, logoW, logoH, undefined, "FAST")
  }

  y += 48

  // ══════════════════════════════════════════
  // REGISTRO FOTOGRÁFICO – fotos aparecem inline junto a cada item
  // do checklist. Aqui mantemos apenas anexos PDF avulsos da OS.
  // ══════════════════════════════════════════
  const imagens = data.anexos.filter((a) => a.tipo.startsWith("image/"))
  const pdfsAnexos = data.anexos.filter((a) => a.tipo === "application/pdf")

  if (imagens.length > 0) {
    const PHOTO_MARGIN_TOP = 26
    const PHOTO_MARGIN_BOT = 18
    const USABLE_W = W - MARGIN * 2
    const CAPTION_H = 10
    const GAP = 6

    function fitDims(
      imgW: number, imgH: number,
      maxW: number, maxH: number
    ): { w: number; h: number } {
      const scale = Math.min(maxW / imgW, maxH / imgH)
      return { w: imgW * scale, h: imgH * scale }
    }

    type LoadedImage = {
      nome: string
      dataUrl: string
      fmt: "PNG" | "JPEG"
      clean: string
      w: number
      h: number
      layoutKind: "single" | "double"
    }

    const loadedImages: Array<LoadedImage | null> = await Promise.all(
      imagens.map(async (img) => {
        try {
          const proxyUrl = `/api/files/anexo?src=${encodeURIComponent(img.url)}&filename=${encodeURIComponent(img.nome)}&inline=1`
          const rawDataUrl = await urlToDataURL(proxyUrl)
          const { dataUrl, width, height } = await getImageDisplaySize(rawDataUrl)
          return {
            nome: img.nome,
            dataUrl,
            fmt: detectFormat(dataUrl) as "PNG" | "JPEG",
            clean: stripPrefix(dataUrl),
            w: width,
            h: height,
            layoutKind: getPhotoLayoutKind(width, height),
          }
        } catch {
          return null
        }
      })
    )

    type PageSlot =
      | { type: "single"; img: LoadedImage }
      | { type: "double"; left: LoadedImage; right: LoadedImage }
      | { type: "error";  nome: string }

    const slots: PageSlot[] = []
    const queue = loadedImages.slice()

    while (queue.length > 0) {
      const item = queue.shift()
      if (!item) { slots.push({ type: "error", nome: "desconhecido" }); continue; }

      if (item.layoutKind === "single") {
        slots.push({ type: "single", img: item })
      } else {
        const nextIdx = queue.findIndex((q) => q !== null && q.layoutKind === "double")
        if (nextIdx !== -1) {
          const pair = queue.splice(nextIdx, 1)[0]!
          slots.push({ type: "double", left: item, right: pair })
        } else {
          slots.push({ type: "single", img: item })
        }
      }
    }

    let firstPhotoPage = true
    for (const slot of slots) {
      doc.addPage()
      if (firstPhotoPage) {
        drawHeader("Anexos Fotográficos da OS")
        firstPhotoPage = false
        y = PHOTO_MARGIN_TOP
        y = sectionBar(y, "Anexos Fotográficos da OS")
      } else {
        drawHeader("Anexos Fotográficos (cont.)")
        y = PHOTO_MARGIN_TOP
      }

      const availableH = H - y - PHOTO_MARGIN_BOT - CAPTION_H

      if (slot.type === "error") {
        doc.setFontSize(8); doc.setTextColor(...C.red)
        doc.text("Imagem indisponível", MARGIN, y + 10)
        continue
      }

      if (slot.type === "single") {
        const { img } = slot
        const { w: rw, h: rh } = fitDims(img.w, img.h, USABLE_W, availableH)
        const imgX = MARGIN + (USABLE_W - rw) / 2
        const imgY = y + (availableH - rh) / 2
        doc.setFillColor(...C.border)
        doc.roundedRect(imgX - 1.5, imgY - 1.5, rw + 3, rh + 3, 2, 2, "F")
        doc.addImage(img.clean, img.fmt, imgX, imgY, rw, rh, undefined, "FAST")
        doc.setFontSize(7.5); doc.setFont("helvetica", "normal")
        doc.setTextColor(...C.muted)
        const nomeFit = doc.splitTextToSize(img.nome, USABLE_W)
        doc.text(nomeFit[0], W / 2, imgY + rh + 7, { align: "center" })
      }

      if (slot.type === "double") {
        const colMaxW = (USABLE_W - GAP) / 2
        const { left, right } = slot
        const leftFit  = fitDims(left.w,  left.h,  colMaxW, availableH)
        const rightFit = fitDims(right.w, right.h, colMaxW, availableH)
        const leftX  = MARGIN + (colMaxW - leftFit.w)  / 2
        const rightX = MARGIN + colMaxW + GAP + (colMaxW - rightFit.w) / 2
        const photoY = y
        doc.setFillColor(...C.border)
        doc.roundedRect(leftX - 1.5,  photoY - 1.5, leftFit.w  + 3, leftFit.h  + 3, 2, 2, "F")
        doc.roundedRect(rightX - 1.5, photoY - 1.5, rightFit.w + 3, rightFit.h + 3, 2, 2, "F")
        doc.addImage(left.clean,  left.fmt,  leftX,  photoY, leftFit.w,  leftFit.h,  undefined, "FAST")
        doc.addImage(right.clean, right.fmt, rightX, photoY, rightFit.w, rightFit.h, undefined, "FAST")
        doc.setFontSize(7.5); doc.setFont("helvetica", "normal")
        doc.setTextColor(...C.muted)
        const maxLegW = colMaxW - 4
        const leftCaption  = doc.splitTextToSize(left.nome,  maxLegW)
        const rightCaption = doc.splitTextToSize(right.nome, maxLegW)
        doc.text(leftCaption[0],  leftX  + leftFit.w  / 2, photoY + leftFit.h  + 6, { align: "center" })
        doc.text(rightCaption[0], rightX + rightFit.w / 2, photoY + rightFit.h + 6, { align: "center" })
      }
    }
  }

  // Anexos PDF
  if (pdfsAnexos.length > 0) {
    doc.addPage()
    drawHeader("Anexos PDF")
    y = 26
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

"use client"

import { useState } from "react"
import { FileText, Loader2 } from "lucide-react"
import { generateOSPDF } from "@/lib/pdf-os"

type Props = {
  osId: string
  numero: string
  status: string
}

export function DownloadRelatorioButton({ osId, numero, status }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState("")

  // Exibir apenas para OS concluídas
  if (status !== "CONCLUIDA") return null

  async function handleDownload() {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/os/${osId}/relatorio`)
      if (!res.ok) {
        const j = await res.json().catch(() => null)
        throw new Error(j?.error ?? "Erro ao buscar dados do relatório")
      }
      const json = await res.json()
      const data = json?.data ?? json

      const doc = await generateOSPDF(data)

      // Nome do arquivo: relatorio-om-AXIA_<numero>.pdf
      doc.save(`relatorio-om-AXIA_${numero}.pdf`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao gerar PDF"
      setError(msg)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleDownload}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all shadow-md hover:shadow-lg active:scale-95"
        style={{
          background: loading
            ? "#9ca3af"
            : "linear-gradient(135deg, #E65A14 0%, #D28200 100%)",
        }}
        title="Gerar Relatório de O&M — AXIA"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Gerando relatório...
          </>
        ) : (
          <>
            <FileText className="w-4 h-4" />
            Exportar Relatório O&amp;M
          </>
        )}
      </button>
      {error && <p className="text-xs text-red-500 max-w-xs text-right">{error}</p>}
    </div>
  )
}
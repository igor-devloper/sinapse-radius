"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, FileText, Image as ImageIcon, File, Trash2, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface Anexo {
  id: string;
  nome: string;
  url: string;
  tipo: string;
  tamanho: number;
  createdAt: Date;
}

function FileIcon({ tipo }: { tipo: string }) {
  if (tipo.startsWith("image/")) return <ImageIcon className="w-5 h-5 text-blue-500" />;
  if (tipo === "application/pdf") return <FileText className="w-5 h-5 text-red-500" />;
  return <File className="w-5 h-5 text-gray-400" />;
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

export function AnexosOS({
  osId, anexos: inicial, canUpload,
}: {
  osId: string; anexos: Anexo[]; canUpload: boolean;
}) {
  const router = useRouter();
  const [anexos, setAnexos] = useState(inicial);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData(); fd.append("file", file);
        const res = await fetch(`/api/os/${osId}/anexos`, { method: "POST", body: fd });
        if (res.ok) {
          const { anexo } = await res.json();
          setAnexos((prev) => [...prev, anexo]);
        }
      }
    } finally {
      setUploading(false);
    }
  }

  async function remover(id: string) {
    const res = await fetch(`/api/os/${osId}/anexos?anexoId=${id}`, { method: "DELETE" });
    if (res.ok) setAnexos((prev) => prev.filter((a) => a.id !== id));
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false); upload(e.dataTransfer.files);
  }, [osId]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">Anexos ({anexos.length})</h3>
        {canUpload && (
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            style={{ background: "#F3E8FF", color: "#6B21A8" }}>
            <Upload className="w-3.5 h-3.5" />
            {uploading ? "Enviando..." : "Adicionar"}
          </button>
        )}
      </div>

      {/* Drop zone — apenas se pode fazer upload */}
      {canUpload && (
        <>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={cn(
              "mx-4 my-3 border-2 border-dashed rounded-xl px-4 py-5 flex flex-col items-center gap-2 cursor-pointer transition-all",
              dragOver ? "border-purple-400 bg-purple-50" : "border-gray-100 hover:border-purple-200 hover:bg-gray-50"
            )}
          >
            <Upload className={cn("w-5 h-5", dragOver ? "text-purple-600" : "text-gray-300")} />
            <p className="text-xs text-gray-400">Arraste arquivos ou clique para adicionar</p>
          </div>
          <input ref={fileRef} type="file" multiple className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
            onChange={(e) => upload(e.target.files)} />
        </>
      )}

      {/* Lista */}
      {anexos.length === 0 ? (
        <p className="px-5 py-4 text-sm text-gray-400">Nenhum anexo.</p>
      ) : (
        <div className="divide-y divide-gray-50">
          {anexos.map((a) => (
            <div key={a.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors group">
              <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
                <FileIcon tipo={a.tipo} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-800 truncate">{a.nome}</p>
                <p className="text-xs text-gray-400">{formatBytes(a.tamanho)}</p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <a href={a.url} download={a.nome}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="Baixar">
                  <Download className="w-3.5 h-3.5 text-gray-500" />
                </a>
                {canUpload && (
                  <button onClick={() => remover(a.id)}
                    className="p-1.5 hover:bg-red-50 rounded-lg transition-colors" title="Remover">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
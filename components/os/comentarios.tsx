"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";

interface Comentario {
  id: string;
  texto: string;
  createdAt: Date;
  usuario: { id: string; nome: string; avatarUrl: string | null };
}

export function ComentariosOS({ osId, comentarios }: { osId: string; comentarios: Comentario[] }) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(false);

  async function enviar() {
    if (!texto.trim()) return;
    setLoading(true);
    await fetch(`/api/os/${osId}/comentarios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto }),
    });
    setTexto("");
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
      <div className="px-5 py-4 border-b border-gray-50">
        <h3 className="text-sm font-medium text-gray-700">Comentários ({comentarios.length})</h3>
      </div>
      <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
        {comentarios.length === 0 && (
          <p className="px-5 py-4 text-sm text-gray-400">Nenhum comentário ainda.</p>
        )}
        {comentarios.map((c) => (
          <div key={c.id} className="px-5 py-3.5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-gray-800">{c.usuario.nome}</span>
              <span className="text-xs text-gray-400">
                {new Date(c.createdAt).toLocaleString("pt-BR")}
              </span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{c.texto}</p>
          </div>
        ))}
      </div>
      <div className="px-5 py-3.5 border-t border-gray-50 flex gap-3">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && enviar()}
          placeholder="Adicionar comentário..."
          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
        />
        <button
          onClick={enviar}
          disabled={loading || !texto.trim()}
          className="bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white px-3 py-2 rounded-lg transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Cargo = "ADMIN" | "SUPERVISOR" | "TECNICO" | "VISUALIZADOR";

export function AlterarCargoForm({ usuarioId, cargoAtual, ativo }: { usuarioId: string; cargoAtual: string; ativo: boolean }) {
  const [cargo, setCargo] = useState(cargoAtual);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function salvar() {
    setLoading(true);
    await fetch("/api/admin/usuarios", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuarioId, cargo }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={cargo}
        onChange={(e) => setCargo(e.target.value)}
        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-violet-300"
      >
        <option value="ADMIN">Admin</option>
        <option value="SUPERVISOR">Supervisor</option>
        <option value="TECNICO">Técnico</option>
        <option value="VISUALIZADOR">Visualizador</option>
      </select>
      <button
        onClick={salvar}
        disabled={loading || cargo === cargoAtual}
        className="text-xs px-3 py-1.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "..." : "Salvar"}
      </button>
    </div>
  );
}

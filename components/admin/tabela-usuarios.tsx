"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Usuario {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  ativo: boolean;
  avatarUrl: string | null;
  _count: { ordensResponsavel: number; ordensAberta: number };
}

const cargoOptions = ["ADMIN", "SUPERVISOR", "TECNICO", "VISUALIZADOR"];
const cargoColor: Record<string, string> = {
  ADMIN: "bg-violet-100 text-violet-700",
  SUPERVISOR: "bg-blue-100 text-blue-700",
  TECNICO: "bg-orange-100 text-orange-700",
  VISUALIZADOR: "bg-gray-100 text-gray-600",
};

export function TabelaUsuarios({ usuarios }: { usuarios: Usuario[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function atualizarCargo(usuarioId: string, cargo: string) {
    setLoading(usuarioId);
    await fetch("/api/admin/usuarios", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuarioId, cargo }),
    });
    setLoading(null);
    router.refresh();
  }

  async function toggleAtivo(usuarioId: string, ativo: boolean) {
    setLoading(usuarioId);
    await fetch("/api/admin/usuarios", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuarioId, ativo: !ativo }),
    });
    setLoading(null);
    router.refresh();
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/60">
            <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Usuário</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Cargo</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">OS responsável</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {usuarios.map((u) => (
            <tr key={u.id} className={`${!u.ativo ? "opacity-50" : ""}`}>
              <td className="px-5 py-3.5">
                <div>
                  <p className="font-medium text-gray-900">{u.nome}</p>
                  <p className="text-xs text-gray-400">{u.email}</p>
                </div>
              </td>
              <td className="px-5 py-3.5">
                <select
                  value={u.cargo}
                  disabled={loading === u.id}
                  onChange={(e) => atualizarCargo(u.id, e.target.value)}
                  className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer ${cargoColor[u.cargo]}`}
                >
                  {cargoOptions.map((c) => (
                    <option key={c} value={c}>{c.toLowerCase()}</option>
                  ))}
                </select>
              </td>
              <td className="px-5 py-3.5 text-xs text-gray-600">
                {u._count.ordensResponsavel} como responsável
              </td>
              <td className="px-5 py-3.5">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.ativo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {u.ativo ? "Ativo" : "Inativo"}
                </span>
              </td>
              <td className="px-5 py-3.5">
                <button
                  onClick={() => toggleAtivo(u.id, u.ativo)}
                  disabled={loading === u.id}
                  className="text-xs text-gray-500 hover:text-gray-800 underline transition-colors"
                >
                  {u.ativo ? "Desativar" : "Ativar"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

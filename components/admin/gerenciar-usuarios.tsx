"use client";

import { useState, useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

type Cargo = "ADMIN" | "SUPERVISOR" | "TECNICO" | "VISUALIZADOR";

type Usuario = {
  id: string;
  nome: string;
  email: string;
  cargo: Cargo;
  ativo: boolean;
  avatarUrl: string | null;
  _count: { ordensResponsavel: number; ordensAberta: number };
};

const cargoColor: Record<Cargo, string> = {
  ADMIN:        "bg-violet-100 text-violet-700",
  SUPERVISOR:   "bg-blue-100 text-blue-700",
  TECNICO:      "bg-teal-100 text-teal-700",
  VISUALIZADOR: "bg-gray-100 text-gray-600",
};

const cargoLabel: Record<Cargo, string> = {
  ADMIN:        "Admin",
  SUPERVISOR:   "Supervisor",
  TECNICO:      "Técnico",
  VISUALIZADOR: "Visualizador",
};

async function atualizarUsuario(usuarioId: string, cargo: Cargo, ativo?: boolean) {
  const res = await fetch("/api/admin/usuarios", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usuarioId, cargo, ativo }),
  });
  if (!res.ok) throw new Error("Erro ao atualizar");
  return res.json();
}

export function GerenciarUsuarios({ usuarios: usuariosInicial }: { usuarios: Usuario[] }) {
  const [usuarios, setUsuarios] = useState(usuariosInicial);
  const [isPending, startTransition] = useTransition();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  function handleChangeCargo(usuarioId: string, novoCargo: Cargo) {
    const usuario = usuarios.find((u) => u.id === usuarioId);
    if (!usuario) return;

    setLoadingId(usuarioId);
    startTransition(async () => {
      try {
        await atualizarUsuario(usuarioId, novoCargo);
        setUsuarios((prev) =>
          prev.map((u) => (u.id === usuarioId ? { ...u, cargo: novoCargo } : u))
        );
        toast.success("Cargo atualizado", {
          description: `${usuario.nome} agora é ${cargoLabel[novoCargo]}.`,
        });
      } catch {
        toast.error("Erro ao atualizar cargo", {
          description: "Não foi possível salvar a alteração. Tente novamente.",
        });
      } finally {
        setLoadingId(null);
      }
    });
  }

  function handleToggleAtivo(usuarioId: string, ativo: boolean) {
    const usuario = usuarios.find((u) => u.id === usuarioId);
    if (!usuario) return;

    setLoadingId(usuarioId + "-ativo");
    startTransition(async () => {
      try {
        await atualizarUsuario(usuarioId, usuario.cargo, ativo);
        setUsuarios((prev) =>
          prev.map((u) => (u.id === usuarioId ? { ...u, ativo } : u))
        );
        toast.success(ativo ? "Usuário ativado" : "Usuário desativado", {
          description: `${usuario.nome} foi ${ativo ? "reativado" : "desativado"} com sucesso.`,
        });
      } catch {
        toast.error("Erro ao alterar status", {
          description: "Não foi possível alterar o status do usuário.",
        });
      } finally {
        setLoadingId(null);
      }
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-base font-medium text-gray-800">
          Usuários do sistema <span className="text-gray-400 font-normal">({usuarios.length})</span>
        </h2>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-50">
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Usuário</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">E-mail</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Cargo</th>
              <th className="text-center px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">OS resp.</th>
              <th className="text-center px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Ativo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {usuarios.map((usuario) => (
              <tr key={usuario.id} className={`transition-colors ${!usuario.ativo ? "opacity-50" : "hover:bg-gray-50/50"}`}>
                {/* Avatar + nome */}
                <td className="px-6 py-3.5">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={usuario.avatarUrl ?? undefined} />
                      <AvatarFallback className="bg-violet-100 text-violet-600 text-xs font-medium">
                        {usuario.nome.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-gray-800">{usuario.nome}</span>
                  </div>
                </td>

                {/* Email */}
                <td className="px-6 py-3.5">
                  <span className="text-gray-500 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-gray-300" />
                    {usuario.email}
                  </span>
                </td>

                {/* Cargo select */}
                <td className="px-6 py-3.5">
                  <div className="flex items-center gap-2">
                    {loadingId === usuario.id && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-500" />
                    )}
                    <Select
                      defaultValue={usuario.cargo}
                      onValueChange={(val) => handleChangeCargo(usuario.id, val as Cargo)}
                      disabled={loadingId === usuario.id}
                    >
                      <SelectTrigger className={`w-36 h-7 text-xs border-0 font-medium ${cargoColor[usuario.cargo]}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
                        <SelectItem value="TECNICO">Técnico</SelectItem>
                        <SelectItem value="VISUALIZADOR">Visualizador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </td>

                {/* Contagem OS */}
                <td className="px-6 py-3.5 text-center">
                  <span className="text-gray-600">
                    {usuario._count.ordensResponsavel}
                    <span className="text-gray-300 text-xs ml-1">resp.</span>
                  </span>
                </td>

                {/* Toggle ativo */}
                <td className="px-6 py-3.5 text-center">
                  <Switch
                    checked={usuario.ativo}
                    disabled={loadingId === usuario.id + "-ativo"}
                    onCheckedChange={(val) => handleToggleAtivo(usuario.id, val)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
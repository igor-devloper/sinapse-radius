// app/(app)/ordens/page.tsx
import { prisma } from "@/lib/prisma";
import { calcularSLA } from "@/lib/sla-manual";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SLABadge } from "@/components/os/sla-badge";
import { OSFiltros } from "@/components/os/os-filtros";
import { NovaOSButton } from "@/components/os/nova-os-button";
import { auth } from "@clerk/nextjs/server";
import { ATIVIDADE_LABEL } from "@/lib/sla-manual";

const statusMap: Record<string, { label: string; class: string }> = {
  ABERTA:          { label: "Aberta",          class: "bg-orange-100 text-orange-700" },
  EM_ANDAMENTO:    { label: "Em andamento",     class: "bg-violet-100 text-violet-700" },
  AGUARDANDO_PECA: { label: "Aguardando peça",  class: "bg-yellow-100 text-yellow-700" },
  PAUSADA:         { label: "Pausada",          class: "bg-gray-100 text-gray-600" },
  CONCLUIDA:       { label: "Concluída",        class: "bg-green-100 text-green-700" },
  CANCELADA:       { label: "Cancelada",        class: "bg-red-100 text-red-600" },
};

const prioridadeMap: Record<string, { label: string; dot: string }> = {
  CRITICA: { label: "Crítica", dot: "bg-red-500" },
  ALTA:    { label: "Alta",    dot: "bg-orange-400" },
  MEDIA:   { label: "Média",   dot: "bg-yellow-400" },
  BAIXA:   { label: "Baixa",   dot: "bg-green-400" },
};

export default async function OrdensPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string; prioridade?: string; tipo?: string; q?: string; page?: string;
  }>;
}) {
  const { userId } = await auth();

  const [usuario, tecnicos] = await Promise.all([
    prisma.usuario.findUnique({
      where: { clerkId: userId! },
      select: { cargo: true },
    }),
    // ✅ busca técnicos aqui para passar ao modal
    prisma.usuario.findMany({
      where: { ativo: true, cargo: { in: ["TECNICO", "SUPERVISOR", "ADMIN"] } },
      select: { id: true, nome: true, cargo: true },
      orderBy: { nome: "asc" },
    }),
  ]);

  const params = await searchParams;
  const page = parseInt(params.page ?? "1");
  const limit = 15;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (params.status)    where.status = params.status;
  if (params.prioridade) where.prioridade = params.prioridade;
  if (params.tipo)      where.tipoAtividade = params.tipo;
  if (params.q) {
    where.OR = [
      { titulo:    { contains: params.q, mode: "insensitive" } },
      { numero:    { contains: params.q, mode: "insensitive" } },
      { subsistema:{ contains: params.q, mode: "insensitive" } },
    ];
  }

  const [total, ordens] = await Promise.all([
    prisma.ordemServico.count({ where }),
    prisma.ordemServico.findMany({
      where,
      include: {
        responsavel: { select: { nome: true } },
        abertoPor:   { select: { nome: true } },
      },
      orderBy: [{ prioridade: "asc" }, { dataEmissaoAxia: "asc" }],
      skip,
      take: limit,
    }),
  ]);

  const pages = Math.ceil(total / limit);
  const podeAbrirOS = ["ADMIN", "SUPERVISOR", "TECNICO"].includes(usuario?.cargo ?? "");

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Ordens de Serviço</h1>
          <p className="text-sm text-gray-500 mt-1">{total} OS encontradas</p>
        </div>
        {/* ✅ passa tecnicos para o botão */}
        {podeAbrirOS && <NovaOSButton tecnicos={tecnicos} />}
      </div>

      <OSFiltros />

      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Número</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Título / Subsistema</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Atividade</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Prioridade</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">SLA</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Responsável</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ordens.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400 text-sm">
                    Nenhuma OS encontrada.
                  </td>
                </tr>
              )}
              {ordens.map((os) => {
                const sla = calcularSLA(os.dataEmissaoAxia, os.tipoAtividade);
                const status = statusMap[os.status];
                const prioridade = prioridadeMap[os.prioridade];
                return (
                  <tr key={os.id} className="hover:bg-gray-50/70 transition-colors group">
                    <td className="px-6 py-4">
                      <Link href={`/ordens/${os.id}`} className="font-mono text-xs text-violet-600 hover:underline">
                        {os.numero}
                      </Link>
                    </td>
                    <td className="px-4 py-4 max-w-xs">
                      <Link href={`/ordens/${os.id}`} className="block">
                        <p className="text-sm font-medium text-gray-900 truncate group-hover:text-violet-700 transition-colors">
                          {os.titulo}
                        </p>
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          {os.subsistema}
                          {os.componenteTag && <span className="ml-1 text-gray-300">· {os.componenteTag}</span>}
                        </p>
                      </Link>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                        {ATIVIDADE_LABEL[os.tipoAtividade] ?? os.tipoAtividade}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="flex items-center gap-1.5 text-xs text-gray-600">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${prioridade.dot}`} />
                        {prioridade.label}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.class}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <SLABadge sla={sla} compact />
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-xs text-gray-600">
                        {os.responsavel?.nome.split(" ")[0] ?? <span className="text-gray-300">—</span>}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <p className="text-xs text-gray-400">Página {page} de {pages} · {total} resultados</p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={`/ordens?page=${page - 1}`} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                  Anterior
                </Link>
              )}
              {page < pages && (
                <Link href={`/ordens?page=${page + 1}`} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                  Próxima
                </Link>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
} 
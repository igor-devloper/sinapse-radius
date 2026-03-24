// app/(app)/ordens/page.tsx
import { prisma } from "@/lib/prisma";
import { calcularSLA, ATIVIDADE_CORRETIVA_LABEL } from "@/lib/sla-manual";
import Link from "next/link";
import { SLABadge } from "@/components/os/sla-badge";
import { OSFiltros } from "@/components/os/os-filtros";
import { GanttOS } from "@/components/os/gantt-os";
import { auth } from "@clerk/nextjs/server";
import { Button } from "@/components/ui/button";
import { Plus, Clock, AlertTriangle, CheckCircle2, Zap } from "lucide-react";
import { isBefore, startOfMonth } from "date-fns";

const statusMap: Record<string, { label: string; class: string }> = {
  ABERTA:          { label: "Aberta",          class: "bg-orange-100 text-orange-700" },
  EM_ANDAMENTO:    { label: "Em andamento",     class: "bg-violet-100 text-violet-700" },
  AGUARDANDO_PECA: { label: "Aguardando peça",  class: "bg-yellow-100 text-yellow-700" },
  PAUSADA:         { label: "Pausada",          class: "bg-gray-100 text-gray-600" },
  CONCLUIDA:       { label: "Concluída",        class: "bg-green-100 text-green-700" },
  CANCELADA:       { label: "Cancelada",        class: "bg-red-100 text-red-600" },
};

const prioridadeMap: Record<string, { label: string; dot: string; ring: string }> = {
  CRITICA: { label: "Crítica", dot: "bg-red-500",    ring: "ring-1 ring-red-200" },
  ALTA:    { label: "Alta",    dot: "bg-orange-400", ring: "ring-1 ring-orange-200" },
  MEDIA:   { label: "Média",   dot: "bg-yellow-400", ring: "" },
  BAIXA:   { label: "Baixa",   dot: "bg-green-400",  ring: "" },
};

function isAtrasada(os: { status: string; dataProgramada: Date | null }): boolean {
  if (!os.dataProgramada) return false;
  if (["CONCLUIDA", "CANCELADA"].includes(os.status)) return false;
  return isBefore(new Date(os.dataProgramada), startOfMonth(new Date()));
}

export default async function OrdensPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string; prioridade?: string; tipoOS?: string; q?: string; page?: string; view?: string;
  }>;
}) {
  const { userId } = await auth();

  const [usuario] = await Promise.all([
    prisma.usuario.findUnique({
      where: { clerkId: userId! },
      select: { cargo: true },
    }),
  ]);

  const params = await searchParams;
  const page = parseInt(params.page ?? "1");
  const limit = 20;
  const skip = (page - 1) * limit;
  const view = params.view ?? "cards";

  const where: Record<string, unknown> = {};
  if (params.status) where.status = params.status;
  if (params.prioridade) where.prioridade = params.prioridade;
  if (params.tipoOS) where.tipoOS = params.tipoOS;
  if (params.q) {
    where.OR = [
      { titulo:     { contains: params.q, mode: "insensitive" } },
      { numero:     { contains: params.q, mode: "insensitive" } },
      { subsistema: { contains: params.q, mode: "insensitive" } },
    ];
  }

  const [total, ordens, statsRaw] = await Promise.all([
    prisma.ordemServico.count({ where }),
    prisma.ordemServico.findMany({
      where,
      include: {
        responsavel: { select: { nome: true } },
        abertoPor:   { select: { nome: true } },
      },
      orderBy: [{ prioridade: "asc" }, { createdAt: "desc" }],
      skip,
      take: limit,
    }),
    // Busca todas para Gantt e stats sem filtros pesados
    prisma.ordemServico.findMany({
      where: { tipoOS: "PREVENTIVA" },
      select: {
        id: true, numero: true, titulo: true, status: true,
        periodicidadePreventiva: true, dataProgramada: true,
        dataConclusao: true, tipoOS: true,
      },
      orderBy: { dataProgramada: "asc" },
    }),
  ]);

  // Stats rápidos
  const atrasadas = ordens.filter((o) => isAtrasada(o)).length;
  const emAndamento = ordens.filter((o) => o.status === "EM_ANDAMENTO").length;
  const abertas = ordens.filter((o) => o.status === "ABERTA").length;
  const concluidas = ordens.filter((o) => o.status === "CONCLUIDA").length;

  const pages = Math.ceil(total / limit);
  const podeAbrirOS = ["ADMIN", "SUPERVISOR", "TECNICO"].includes(usuario?.cargo ?? "");

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ordens de Serviço</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} OS encontradas</p>
        </div>
        {podeAbrirOS && (
          <a href="/ordens/nova">
            <Button className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition-colors shadow-sm">
              <Plus className="w-4 h-4" /> Nova OS
            </Button>
          </a>
        )}
      </div>

      {/* Cards de produtividade */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={`rounded-2xl p-4 border ${atrasadas > 0 ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-100"}`}>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className={`w-4 h-4 ${atrasadas > 0 ? "text-red-500" : "text-gray-400"}`} />
            <span className={`text-xs font-semibold uppercase tracking-wide ${atrasadas > 0 ? "text-red-600" : "text-gray-500"}`}>Atrasadas</span>
          </div>
          <p className={`text-3xl font-bold ${atrasadas > 0 ? "text-red-600" : "text-gray-400"}`}>{atrasadas}</p>
        </div>
        <div className="rounded-2xl p-4 border bg-violet-50 border-violet-100">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-violet-500" />
            <span className="text-xs font-semibold uppercase tracking-wide text-violet-600">Em andamento</span>
          </div>
          <p className="text-3xl font-bold text-violet-600">{emAndamento}</p>
        </div>
        <div className="rounded-2xl p-4 border bg-orange-50 border-orange-100">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-orange-500" />
            <span className="text-xs font-semibold uppercase tracking-wide text-orange-600">Abertas</span>
          </div>
          <p className="text-3xl font-bold text-orange-500">{abertas}</p>
        </div>
        <div className="rounded-2xl p-4 border bg-green-50 border-green-100">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-xs font-semibold uppercase tracking-wide text-green-600">Concluídas</span>
          </div>
          <p className="text-3xl font-bold text-green-500">{concluidas}</p>
        </div>
      </div>

      <OSFiltros />

      {/* Gantt */}
      <GanttOS ordens={statsRaw as Parameters<typeof GanttOS>[0]["ordens"]} />

      {/* Lista de OS — Cards mobile-first */}
      <div className="space-y-3">
        {ordens.length === 0 && (
          <div className="text-center py-14 text-gray-400 text-sm bg-white rounded-2xl border border-gray-100 shadow-sm">
            Nenhuma OS encontrada com os filtros aplicados.
          </div>
        )}
        {ordens.map((os) => {
          const sla =
            os.tipoOS === "CORRETIVA" && os.dataEmissaoAxia && os.tipoAtividadeCorretiva
              ? calcularSLA(os.dataEmissaoAxia, os.tipoAtividadeCorretiva)
              : null;
          const status = statusMap[os.status];
          const prioridade = prioridadeMap[os.prioridade];
          const atrasada = isAtrasada(os);
          const isPreventiva = os.tipoOS === "PREVENTIVA";

          return (
            <Link
              key={os.id}
              href={`/ordens/${os.id}`}
              className={`block bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all group ${
                atrasada ? "border-red-200 bg-red-50/30" : "border-gray-100 hover:border-violet-200"
              }`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Top row */}
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className="font-mono text-xs text-violet-600 font-semibold">{os.numero}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.class}`}>
                        {status.label}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${
                        isPreventiva ? "bg-purple-100 text-purple-700" : "bg-orange-100 text-orange-700"
                      }`}>
                        {isPreventiva ? "Preventiva" : "Corretiva"}
                      </span>
                      {atrasada && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-red-100 text-red-700 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Atrasada
                        </span>
                      )}
                    </div>

                    {/* Título */}
                    <p className={`text-sm font-semibold leading-tight mb-1 ${atrasada ? "text-red-800" : "text-gray-900 group-hover:text-violet-700"} transition-colors`}>
                      {os.titulo}
                    </p>

                    {/* Subsistema + info */}
                    <p className="text-xs text-gray-500 mb-2">
                      {os.subsistema}
                      {os.componenteTag && <span className="ml-1 text-gray-400">· {os.componenteTag}</span>}
                      {os.containerId && <span className="ml-1 text-gray-400">· {os.containerId}</span>}
                    </p>

                    {/* Prioridade + responsável */}
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className={`flex items-center gap-1 ${prioridade.ring} px-1.5 py-0.5 rounded`}>
                        <span className={`w-2 h-2 rounded-full ${prioridade.dot} shrink-0`} />
                        {prioridade.label}
                      </span>
                      {os.responsavel && (
                        <span className="text-gray-400">{os.responsavel.nome.split(" ")[0]}</span>
                      )}
                      {os.tipoAtividadeCorretiva && (
                        <span className="text-gray-400 truncate max-w-[120px]">
                          {ATIVIDADE_CORRETIVA_LABEL[os.tipoAtividadeCorretiva] ?? os.tipoAtividadeCorretiva}
                        </span>
                      )}
                      {os.periodicidadePreventiva && (
                        <span className="text-purple-500">{os.periodicidadePreventiva}</span>
                      )}
                    </div>
                  </div>

                  {/* SLA ou arrow */}
                  <div className="shrink-0 flex flex-col items-end gap-2">
                    {sla ? (
                      <SLABadge sla={sla} compact />
                    ) : (
                      <span className="text-gray-200 group-hover:text-violet-300 transition-colors text-lg">›</span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Paginação */}
      {pages > 1 && (
        <div className="flex items-center justify-between px-1">
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
    </div>
  );
}
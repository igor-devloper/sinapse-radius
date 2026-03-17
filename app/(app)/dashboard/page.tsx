import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { calcularSLA, formatarDataCurta } from "@/lib/sla-manual";
import { subDays } from "date-fns";
import {
  ClipboardList, AlertTriangle, CheckCircle2, Clock,
  TrendingUp, Zap, CalendarClock, ShieldAlert
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { SLABadge } from "@/components/os/sla-badge";

export default async function DashboardPage() {
  const { userId } = await auth();
  const usuario = await prisma.usuario.findUnique({ where: { clerkId: userId! } });

  const agora = new Date();
  const ha30dias = subDays(agora, 30);
  const em7dias = subDays(agora, -7);

  const [
    totalOS,
    osAbertas,
    osEmAndamento,
    osConcluidas,
    osCriticas,
    osUltimos30dias,
    osProximas7dias,
    todasAtivas,
  ] = await Promise.all([
    prisma.ordemServico.count(),
    prisma.ordemServico.count({ where: { status: "ABERTA" } }),
    prisma.ordemServico.count({ where: { status: "EM_ANDAMENTO" } }),
    prisma.ordemServico.count({ where: { status: "CONCLUIDA" } }),
    prisma.ordemServico.count({ where: { prioridade: "CRITICA", status: { notIn: ["CONCLUIDA", "CANCELADA"] } } }),
    prisma.ordemServico.count({ where: { createdAt: { gte: ha30dias } } }),
    prisma.ordemServico.count({ where: { dataProgramada: { gte: agora, lte: em7dias }, status: { notIn: ["CONCLUIDA", "CANCELADA"] } } }),
    prisma.ordemServico.findMany({
      where: { status: { notIn: ["CONCLUIDA", "CANCELADA"] } },
      select: { id: true, dataEmissaoAxia: true, tipoAtividade: true },
    }),
  ]);

  const osSLAVencido = todasAtivas.filter((os) => calcularSLA(os.dataEmissaoAxia, os.tipoAtividade).vencido).length;

  // Últimas OS abertas
  const ultimasOS = await prisma.ordemServico.findMany({
    where: { status: { not: "CANCELADA" } },
    include: { responsavel: { select: { nome: true } } },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  // Próximas manutenções (dataProgramada futura)
  const proximasManutencoes = await prisma.ordemServico.findMany({
    where: { dataProgramada: { gte: agora }, status: { notIn: ["CONCLUIDA", "CANCELADA"] } },
    include: { responsavel: { select: { nome: true } } },
    orderBy: { dataProgramada: "asc" },
    take: 5,
  });

  const cards = [
    { label: "Total de OS", value: totalOS, icon: ClipboardList, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "OS Abertas", value: osAbertas, icon: Clock, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Em andamento", value: osEmAndamento, icon: TrendingUp, color: "text-violet-600", bg: "bg-violet-50" },
    { label: "Concluídas", value: osConcluidas, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
    { label: "Críticas ativas", value: osCriticas, icon: Zap, color: "text-red-600", bg: "bg-red-50" },
    { label: "SLA vencido", value: osSLAVencido, icon: ShieldAlert, color: "text-red-700", bg: "bg-red-100" },
    { label: "Abertas (30 dias)", value: osUltimos30dias, icon: TrendingUp, color: "text-teal-600", bg: "bg-teal-50" },
    { label: "Prog. próx. 7 dias", value: osProximas7dias, icon: CalendarClock, color: "text-indigo-600", bg: "bg-indigo-50" },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Saudação */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Bom dia, {usuario?.nome.split(" ")[0]} 👋
        </h1>
        <p className="text-sm text-gray-500 mt-1">Visão geral das Ordens de Serviço</p>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Card key={card.label} className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`${card.bg} p-2.5 rounded-xl`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
                <p className="text-xs text-gray-500">{card.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Últimas OS */}
        <div className="lg:col-span-2">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium text-gray-800 flex items-center justify-between">
                Últimas OS
                <Link href="/ordens" className="text-xs text-violet-600 font-normal hover:underline">
                  Ver todas →
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-50">
                {ultimasOS.map((os) => {
                  const sla = calcularSLA(os.dataEmissaoAxia, os.tipoAtividade);
                  return (
                    <Link
                      key={os.id}
                      href={`/ordens/${os.id}`}
                      className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-sm font-medium text-gray-900 truncate">{os.titulo}</span>
                        <span className="text-xs text-gray-400">{os.numero} · {os.subsistema}{os.componenteTag ? ` · ${os.componenteTag}` : ""}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-4">
                        <SLABadge sla={sla} compact />
                        <StatusBadge status={os.status} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Próximas manutenções */}
        <div>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium text-gray-800 flex items-center justify-between">
                Próximas manutenções
                <Link href="/calendario" className="text-xs text-violet-600 font-normal hover:underline">
                  Calendário →
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {proximasManutencoes.length === 0 ? (
                <p className="px-6 py-4 text-sm text-gray-400">Nenhuma manutenção programada</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {proximasManutencoes.map((os) => (
                    <Link
                      key={os.id}
                      href={`/ordens/${os.id}`}
                      className="flex flex-col px-6 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-sm font-medium text-gray-800 truncate">{os.titulo}</span>
                      <span className="text-xs text-gray-400 mt-0.5">
                        📅 {os.dataProgramada ? formatarDataCurta(os.dataProgramada) : "—"}
                        {os.responsavel && ` · ${os.responsavel.nome.split(" ")[0]}`}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; class: string }> = {
    ABERTA: { label: "Aberta", class: "bg-orange-100 text-orange-700" },
    EM_ANDAMENTO: { label: "Em andamento", class: "bg-violet-100 text-violet-700" },
    AGUARDANDO_PECA: { label: "Aguard. peça", class: "bg-yellow-100 text-yellow-700" },
    PAUSADA: { label: "Pausada", class: "bg-gray-100 text-gray-600" },
    CONCLUIDA: { label: "Concluída", class: "bg-green-100 text-green-700" },
    CANCELADA: { label: "Cancelada", class: "bg-red-100 text-red-600" },
  };
  const s = map[status] ?? { label: status, class: "bg-gray-100 text-gray-600" };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.class}`}>
      {s.label}
    </span>
  );
}
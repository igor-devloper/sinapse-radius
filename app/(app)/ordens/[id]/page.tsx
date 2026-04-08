import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { calcularSLA, formatarDataBR, formatarDataCurta, ATIVIDADE_CORRETIVA_LABEL } from "@/lib/sla-manual";
import { PERIODICIDADE_LABEL, PERIODICIDADE_COR } from "@/lib/checklist-preventiva";
import { SLABadge } from "@/components/os/sla-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Calendar, Clock, CheckCircle2, AlertTriangle, FileText,
  Tag, Server, Cpu, ArrowLeft, CalendarRange, Layers,
} from "lucide-react";
import { AtualizarStatusOS } from "@/components/os/atualizar-status";
import { ComentariosOS } from "@/components/os/comentarios";
import { HistoricoTimeline } from "@/components/os/historico-timeline";
import { AnexosOS } from "@/components/os/anexos-os";
import { ChecklistPreventiva } from "@/components/os/checklist-preventiva";
import { DownloadRelatorioButton } from "@/components/os/download-relatorio-button";
import { EditarDatasOS } from "@/components/os/editar-datas-os";
import { ConclusaoRelatorio } from "@/components/os/conclusao-relatorio";
import Link from "next/link";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { decodeConclusao, isConclusaoComentario } from "@/lib/os-conclusao";
import { getAllAssetBindingsForChecklistItems } from "@/lib/assets";

const db = prisma as any;

const prioridadeMap: Record<string, { label: string; class: string; dot: string }> = {
  CRITICA: { label: "Crítica", class: "bg-red-100 text-red-700 border-red-200",         dot: "bg-red-500" },
  ALTA:    { label: "Alta",    class: "bg-orange-100 text-orange-700 border-orange-200", dot: "bg-orange-400" },
  MEDIA:   { label: "Média",  class: "bg-yellow-100 text-yellow-700 border-yellow-200",  dot: "bg-yellow-400" },
  BAIXA:   { label: "Baixa",  class: "bg-green-100 text-green-700 border-green-200",    dot: "bg-green-500" },
};
const statusMap: Record<string, { label: string; class: string; dot: string }> = {
  ABERTA:          { label: "Aberta",        class: "bg-orange-100 text-orange-700 border-orange-200",   dot: "bg-orange-400" },
  EM_ANDAMENTO:    { label: "Em andamento",  class: "bg-blue-100 text-blue-700 border-blue-200",         dot: "bg-blue-500" },
  AGUARDANDO_PECA: { label: "Aguard. peça", class: "bg-yellow-100 text-yellow-700 border-yellow-200",    dot: "bg-yellow-400" },
  PAUSADA:         { label: "Pausada",       class: "bg-gray-100 text-gray-600 border-gray-200",         dot: "bg-gray-400" },
  CONCLUIDA:       { label: "Concluída",     class: "bg-green-100 text-green-700 border-green-200",      dot: "bg-green-500" },
  CANCELADA:       { label: "Cancelada",     class: "bg-red-100 text-red-600 border-red-200",            dot: "bg-red-400" },
};

export default async function OSDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  const usuario = await prisma.usuario.findUnique({
    where: { clerkId: userId! }, select: { cargo: true },
  });

  const osId = (await params).id;

  const os = await prisma.ordemServico.findUnique({
    where: { id: osId },
    include: {
      responsavel: { select: { id: true, nome: true, email: true, cargo: true, avatarUrl: true } },
      abertoPor:   { select: { id: true, nome: true, email: true } },
      comentarios: {
        include: { usuario: { select: { id: true, nome: true, avatarUrl: true } } },
        orderBy: { createdAt: "asc" },
      },
      historicoOS: {
        include: { usuario: { select: { id: true, nome: true } } },
        orderBy: { createdAt: "asc" },
      },
      anexos: { orderBy: { createdAt: "asc" } },
      checklistItems: {
        include: {
          asset: { select: { id: true, nome: true, codigo: true, fotoUrl: true } },
          anexos: { orderBy: { createdAt: "asc" } },
        },
        orderBy: [{ subsistema: "asc" }, { itemId: "asc" }],
      },
    },
  });

  if (!os) notFound();

  // ── Detectar se esta OS possui miners vinculados ──────────────────────────
  //
  // NOVO CRITÉRIO: verificamos diretamente se existem registros em MinerCheckOS
  // para esta OS. Esses registros são criados automaticamente no POST /api/os
  // quando há MinerInstances vinculadas ao containerId (ou ao parque ASIC).
  //
  // Isso elimina a dependência da periodicidade "MENSAL" e garante que
  // qualquer OS (preventiva ou corretiva) com miners seja detectada corretamente.
  const minerCheckCount = await db.minerCheckOS.count({ where: { osId: os.id } });
  const hasMinerChecklist = minerCheckCount > 0;

  // Busca o assetId do modelo ASIC principal para passar ao componente
  // (usado apenas como referência visual — o carregamento real vem dos checks)
  let asicAssetId: string | null = null;
  if (hasMinerChecklist) {
    const firstCheck = await db.minerCheckOS.findFirst({
      where: { osId: os.id },
      select: { minerInstance: { select: { assetId: true } } },
    });
    asicAssetId = firstCheck?.minerInstance?.assetId ?? null;
  }

  const sla =
    os.tipoOS === "CORRETIVA" && os.dataEmissaoAxia && os.tipoAtividadeCorretiva
      ? calcularSLA(os.dataEmissaoAxia, os.tipoAtividadeCorretiva)
      : null;

  const prioridade = prioridadeMap[os.prioridade];
  const status = statusMap[os.status];
  const canEdit = ["ADMIN", "SUPERVISOR", "TECNICO"].includes(usuario?.cargo ?? "");
  const isPreventiva = os.tipoOS === "PREVENTIVA";
  const isConcluida = os.status === "CONCLUIDA";
  const conclusaoComentario = [...os.comentarios]
    .reverse()
    .find((c) => isConclusaoComentario(c.texto));
  const conclusaoManual = conclusaoComentario ? decodeConclusao(conclusaoComentario.texto) : "";
  const comentariosVisiveis = os.comentarios.filter((c) => !isConclusaoComentario(c.texto));

  const periodicidades: string[] =
    (os.periodicidadesSelecionadas && os.periodicidadesSelecionadas.length > 0)
      ? os.periodicidadesSelecionadas
      : os.periodicidadePreventiva
        ? [os.periodicidadePreventiva]
        : [];

  const itemIds = Array.from(new Set(os.checklistItems.map((item) => String(item.itemId))));
  const allAssetBindings = await getAllAssetBindingsForChecklistItems(itemIds);
  const checklistItemsComTodosAtivos = os.checklistItems.map((item) => {
    const fromBindings = allAssetBindings.get(String(item.itemId)) ?? [];
    const merged = [...fromBindings];

    if (item.asset?.id && !merged.some((a) => a.assetId === String(item.asset?.id))) {
      merged.push({
        assetId: String(item.asset.id),
        assetNome: item.asset.nome ?? null,
        assetCodigo: item.asset.codigo ?? null,
        assetFotoUrl: item.asset.fotoUrl ?? null,
      });
    }

    return {
      ...item,
      fotos: (item.anexos ?? [])
        .filter((a) => String(a.tipo || "").startsWith("image/"))
        .map((a) => ({
          id: String(a.id),
          nome: String(a.nome),
          url: String(a.url),
          tipo: String(a.tipo),
        })),
      assets: merged.map((a) => ({
        nome: a.assetNome,
        codigo: a.assetCodigo,
        fotoUrl: a.assetFotoUrl,
      })),
    };
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link href="/ordens" className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <span className="text-sm text-gray-400">Ordens de Serviço</span>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-mono text-gray-600">{os.numero}</span>
      </div>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Top color stripe */}
        <div className="h-1.5 w-full" style={{
          background: os.status === "CONCLUIDA"
            ? "linear-gradient(90deg,#22c55e,#16a34a)"
            : os.status === "CANCELADA"
            ? "linear-gradient(90deg,#f87171,#dc2626)"
            : isPreventiva
            ? "linear-gradient(90deg,#8B1FA9,#1E1B4B)"
            : "linear-gradient(90deg,#f97316,#ea580c)"
        }} />

        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3 min-w-0">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold border ${status.class}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                  {status.label}
                </span>
                <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium border ${prioridade.class}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${prioridade.dot}`} />
                  {prioridade.label}
                </span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${isPreventiva ? "bg-purple-50 text-purple-700 border-purple-100" : "bg-orange-50 text-orange-700 border-orange-100"}`}>
                  {isPreventiva ? "Preventiva" : "Corretiva"}
                </span>
                {isPreventiva && periodicidades.map((per) => {
                  const cor = PERIODICIDADE_COR[per] ?? { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-200" };
                  return (
                    <span key={per} className={cn("text-xs px-2.5 py-1 rounded-full font-semibold border", cor.bg, cor.text, cor.border)}>
                      {PERIODICIDADE_LABEL[per] ?? per}
                    </span>
                  );
                })}
                {/* Badge visual para OS com miners */}
                {hasMinerChecklist && (
                  <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold border bg-cyan-50 text-cyan-700 border-cyan-200">
                    <Cpu className="w-3 h-3" />
                    {minerCheckCount} Miners
                  </span>
                )}
              </div>

              <h1 className="text-xl font-bold text-gray-900 leading-tight">{os.titulo}</h1>

              <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
                <span className="flex items-center gap-1.5"><Server className="w-3.5 h-3.5 text-gray-400" />{os.subsistema}</span>
                {os.componenteTag && <span className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5 text-gray-400" />{os.componenteTag}</span>}
                {os.containerId && <span className="flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5 text-gray-400" />{os.containerId}</span>}
              </div>
            </div>

            <div className="flex flex-col items-end gap-3 shrink-0">
              {canEdit && <AtualizarStatusOS osId={os.id} statusAtual={os.status} />}
              <DownloadRelatorioButton osId={os.id} numero={os.numero} status={os.status} />
            </div>
          </div>

          {/* Multi-periodicidade banner */}
          {isPreventiva && periodicidades.length > 1 && (
            <div className="mt-4 flex items-start gap-3 bg-violet-50 border border-violet-200 rounded-xl px-4 py-3">
              <Layers className="w-5 h-5 text-violet-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-violet-800">Visita com {periodicidades.length} periodicidades</p>
                <div className="flex gap-1.5 flex-wrap mt-1.5">
                  {periodicidades.map((per) => {
                    const cor = PERIODICIDADE_COR[per] ?? { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-200" };
                    return (
                      <span key={per} className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full border", cor.bg, cor.text, cor.border)}>
                        {PERIODICIDADE_LABEL[per] ?? per}
                      </span>
                    );
                  })}
                </div>
                <p className="text-xs text-violet-600 mt-1">
                  O checklist abaixo reúne todos os itens de todas as periodicidades, sem duplicações.
                </p>
              </div>
            </div>
          )}

          {/* Conclusão banner */}
          {isConcluida && (
            <div className="mt-4 flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-800">OS Concluída</p>
                {os.dataConclusao && <p className="text-xs text-green-600">Finalizada em {formatarDataBR(os.dataConclusao)}</p>}
              </div>
              <p className="ml-auto text-xs text-green-600 font-medium">Relatório PDF disponível →</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Grid ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna principal */}
        <div className="lg:col-span-2 space-y-5">
          {sla && <SLABadge sla={sla} showProgress />}

          {isPreventiva ? (
            <ChecklistPreventiva
              osId={os.id}
              items={checklistItemsComTodosAtivos}
              canEdit={canEdit && !isConcluida}
              hasMinerChecklist={hasMinerChecklist}
              asicAssetId={asicAssetId}
              containerId={os.containerId}
            />
          ) : hasMinerChecklist ? (
            // OS corretiva com miners — exibe o checklist de miners direto
            <ChecklistPreventiva
              osId={os.id}
              items={[]}
              canEdit={canEdit && !isConcluida}
              hasMinerChecklist={hasMinerChecklist}
              asicAssetId={asicAssetId}
              containerId={os.containerId}
            />
          ) : (
            <Card className="border-gray-100 shadow-sm rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-400" /> Descrição e Motivo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Descrição</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{os.descricao}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Motivo / Causa raiz</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{os.motivoOS}</p>
                </div>
                {os.tipoAtividadeCorretiva && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Tipo de ocorrência</p>
                      <p className="text-sm text-gray-700">{ATIVIDADE_CORRETIVA_LABEL[os.tipoAtividadeCorretiva] ?? os.tipoAtividadeCorretiva}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          <AnexosOS osId={os.id} anexos={os.anexos} canUpload={canEdit && !isConcluida} />
          <ConclusaoRelatorio osId={os.id} initialTexto={conclusaoManual} canEdit={canEdit} />
          <ComentariosOS osId={os.id} comentarios={comentariosVisiveis} />
        </div>

        {/* Coluna lateral */}
        <div className="space-y-4">
          {/* Datas */}
          <Card className="border-gray-100 shadow-sm rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <CalendarRange className="w-4 h-4 text-gray-400" /> Datas da visita
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {os.tipoOS === "CORRETIVA" && os.dataEmissaoAxia && (
                <>
                  <InfoRow icon={Clock} label="Emissão OS Axia" value={formatarDataBR(os.dataEmissaoAxia)} highlight />
                  {sla && (
                    <>
                      <InfoRow icon={AlertTriangle} label="Prazo SLA resolução" value={formatarDataBR(sla.dataLimiteSLA)} danger />
                      {sla.dataLimiteAtuacao && (
                        <InfoRow icon={AlertTriangle} label="Prazo SLA atuação" value={formatarDataBR(sla.dataLimiteAtuacao)} warn />
                      )}
                    </>
                  )}
                  <Separator />
                </>
              )}
              <InfoRow icon={Calendar} label="Início da visita" value={os.dataProgramada ? formatarDataCurta(os.dataProgramada) : "—"} />
              {os.dataFimProgramada && (
                <InfoRow icon={Calendar} label="Fim da visita" value={formatarDataCurta(os.dataFimProgramada)} />
              )}
              <InfoRow icon={Calendar} label="Abertura sistema" value={formatarDataBR(os.createdAt)} />
            </CardContent>
          </Card>

          {/* Execução */}
          {canEdit ? (
            <Card className="border-gray-100 shadow-sm rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center justify-between">
                  Execução real
                  <span className="text-xs text-gray-400 font-normal">clique para editar</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <EditarDatasOS osId={os.id} dataInicio={os.dataInicio} dataConclusao={os.dataConclusao} status={os.status} />
              </CardContent>
            </Card>
          ) : (
            <Card className="border-gray-100 shadow-sm rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-700">Execução real</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow icon={Clock} label="Início real" value={os.dataInicio ? formatarDataBR(os.dataInicio) : "—"} />
                <InfoRow icon={CheckCircle2} label="Conclusão" value={os.dataConclusao ? formatarDataBR(os.dataConclusao) : "—"} highlight={!!os.dataConclusao} />
              </CardContent>
            </Card>
          )}

          {/* Equipe */}
          <Card className="border-gray-100 shadow-sm rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700">Equipe</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-gray-400 mb-1.5">Aberto por</p>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: "#1E1B4B" }}>
                    {os.abertoPor.nome.charAt(0)}
                  </div>
                  <p className="text-sm font-medium text-gray-800">{os.abertoPor.nome}</p>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-gray-400 mb-1.5">Responsável técnico</p>
                {os.responsavel ? (
                  <div className="flex items-center gap-2">
                    {os.responsavel.avatarUrl ? (
                      <div className="relative w-7 h-7 rounded-full overflow-hidden shrink-0">
                        <Image src={os.responsavel.avatarUrl} alt={os.responsavel.nome} fill className="object-cover" unoptimized sizes="28px" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: "#8B1FA9" }}>
                        {os.responsavel.nome.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-800">{os.responsavel.nome}</p>
                      <p className="text-xs text-purple-600 capitalize">{os.responsavel.cargo.toLowerCase()}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">Não atribuído</p>
                )}
              </div>
            </CardContent>
          </Card>

          <HistoricoTimeline historico={os.historicoOS} />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, highlight, danger, warn }: {
  icon: React.ElementType; label: string; value: string;
  highlight?: boolean; danger?: boolean; warn?: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className={`text-sm ${highlight ? "font-bold text-purple-800" : danger ? "font-semibold text-red-700" : warn ? "font-semibold text-orange-700" : "text-gray-700"}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

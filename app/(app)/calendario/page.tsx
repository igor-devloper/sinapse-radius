import { prisma } from "@/lib/prisma";
import { CalendarioOS } from "@/components/calendario/calendario-os";

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const agora = new Date();
  const mesParam = (await searchParams).mes ?? agora.toISOString().substring(0, 7);
  const [ano, mes] = mesParam.split("-").map(Number);
  const dataRef = new Date(ano, mes - 1, 1);
  const inicio = new Date(ano, mes - 1, 1);
  const fim = new Date(ano, mes, 0, 23, 59, 59);

  const osProgramadas = await prisma.ordemServico.findMany({
    where: { dataProgramada: { gte: inicio, lte: fim } },
    select: {
      id: true,
      numero: true,
      titulo: true,
      tipoAtividade: true,
      prioridade: true,
      status: true,
      dataProgramada: true,
      subsistema: true,
      componenteTag: true,
      containerId: true,
      dataEmissaoAxia: true,
      dataLimiteSLA: true,
      responsavel: { select: { nome: true } },
    },
    orderBy: { dataProgramada: "asc" },
  });

  const osVencendoNoMes = await prisma.ordemServico.findMany({
    where: {
      dataLimiteSLA: { gte: inicio, lte: fim },
      status: { notIn: ["CONCLUIDA", "CANCELADA"] },
    },
    select: { id: true, numero: true, titulo: true, dataLimiteSLA: true, prioridade: true, tipoAtividade: true },
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Calendário de Manutenções</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          OS programadas e vencimentos de SLA
        </p>
      </div>
      <CalendarioOS
        mesAtual={mesParam}
        osProgramadas={osProgramadas}
        osVencendoNoMes={osVencendoNoMes}
      />
    </div>
  );
}
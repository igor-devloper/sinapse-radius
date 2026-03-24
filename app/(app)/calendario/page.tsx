import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { CalendarioOS } from "@/components/calendario/calendario-os";
import { getCalendarioData } from "@/lib/calendario-service";

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const agora = new Date();
  const mesParam =
    (await searchParams).mes ??
    agora.toISOString().substring(0, 7);

  // 🔥 agora sem fetch — direto no service
  const data = await getCalendarioData(mesParam);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Calendário de Preventivas
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Cronograma de manutenções preventivas — itens tracejados estão
          previstos no cronograma mas ainda não têm OS cadastrada
        </p>
      </div>

      <CalendarioOS
        mesAtual={mesParam}
        eventosPorDia={data.eventosPorDia}
        resumoPorPeriodicidade={data.resumoPorPeriodicidade}
        totalOSProgramadas={data.totalOSProgramadas}
      />
    </div>
  );
}
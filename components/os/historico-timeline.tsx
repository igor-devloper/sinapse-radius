import { Circle } from "lucide-react";

interface HistoricoItem {
  id: string;
  statusDe: string | null;
  statusPara: string;
  observacao: string | null;
  createdAt: Date;
  usuario: { nome: string };
}

const statusLabel: Record<string, string> = {
  ABERTA: "Aberta",
  EM_ANDAMENTO: "Em andamento",
  AGUARDANDO_PECA: "Aguardando peça",
  PAUSADA: "Pausada",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
};

export function HistoricoTimeline({ historico }: { historico: HistoricoItem[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
      <div className="px-5 py-4 border-b border-gray-50">
        <h3 className="text-sm font-medium text-gray-700">Histórico</h3>
      </div>
      <div className="px-5 py-3 space-y-4">
        {historico.map((h, i) => (
          <div key={h.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <Circle className="w-3 h-3 text-violet-400 mt-0.5 shrink-0 fill-violet-400" />
              {i < historico.length - 1 && <div className="w-px flex-1 bg-gray-100 mt-1" />}
            </div>
            <div className="pb-3 min-w-0">
              <p className="text-xs font-medium text-gray-800">
                {h.statusDe ? `${statusLabel[h.statusDe]} → ` : ""}{statusLabel[h.statusPara]}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{h.usuario.nome}</p>
              {h.observacao && <p className="text-xs text-gray-500 mt-0.5">{h.observacao}</p>}
              <p className="text-xs text-gray-300 mt-0.5">
                {new Date(h.createdAt).toLocaleString("pt-BR")}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

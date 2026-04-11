"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  CirclePause,
  Clock3,
  Loader2,
  RefreshCw,
  Wrench,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const statusOptions = [
  {
    value: "ABERTA",
    label: "Aberta",
    descricao: "OS aberta e aguardando início da atuação.",
    icon: Clock3,
    cardClass: "border-orange-200 bg-orange-50/80 text-orange-800",
    iconClass: "bg-orange-100 text-orange-700",
  },
  {
    value: "EM_ANDAMENTO",
    label: "Em andamento",
    descricao: "Equipe atuando e registrando evidências da execução.",
    icon: Wrench,
    cardClass: "border-blue-200 bg-blue-50/80 text-blue-800",
    iconClass: "bg-blue-100 text-blue-700",
  },
  {
    value: "AGUARDANDO_PECA",
    label: "Aguardando peça",
    descricao: "Execução pausada até disponibilidade de componente ou insumo.",
    icon: AlertTriangle,
    cardClass: "border-yellow-200 bg-yellow-50/80 text-yellow-800",
    iconClass: "bg-yellow-100 text-yellow-700",
  },
  {
    value: "PAUSADA",
    label: "Pausada",
    descricao: "Atividade interrompida temporariamente por decisão operacional.",
    icon: CirclePause,
    cardClass: "border-slate-200 bg-slate-50/90 text-slate-800",
    iconClass: "bg-slate-100 text-slate-700",
  },
  {
    value: "CONCLUIDA",
    label: "Concluída",
    descricao: "Serviço finalizado e pronto para relatório final.",
    icon: CheckCircle2,
    cardClass: "border-green-200 bg-green-50/80 text-green-800",
    iconClass: "bg-green-100 text-green-700",
  },
  {
    value: "CANCELADA",
    label: "Cancelada",
    descricao: "OS encerrada sem continuidade da execução.",
    icon: XCircle,
    cardClass: "border-red-200 bg-red-50/80 text-red-800",
    iconClass: "bg-red-100 text-red-700",
  },
] as const;

const statusMap = Object.fromEntries(statusOptions.map((status) => [status.value, status]));

export function AtualizarStatusOS({ osId, statusAtual }: { osId: string; statusAtual: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const statusAtualInfo = statusMap[statusAtual] ?? statusOptions[0];

  async function atualizar(novoStatus: string) {
    if (novoStatus === statusAtual) {
      setOpen(false);
      return;
    }

    setLoading(true);
    try {
      await fetch(`/api/os/${osId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus }),
      });
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={() => setOpen(true)}
        disabled={loading}
        className="h-auto min-h-11 rounded-2xl border-gray-200 bg-white px-4 py-2 text-left shadow-sm hover:bg-gray-50"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", statusAtualInfo.iconClass)}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">
              Status da OS
            </span>
            <span className="block truncate text-sm font-semibold text-gray-800">
              {loading ? "Atualizando..." : statusAtualInfo.label}
            </span>
          </span>
          <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-gray-400" />
        </span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[calc(100%-1.5rem)] rounded-3xl border border-gray-100 p-0 sm:max-w-xl" showCloseButton={false}>
          <DialogHeader className="border-b border-gray-100 px-5 py-4 sm:px-6">
            <DialogTitle className="text-base font-semibold text-gray-900">Alterar status da OS</DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              Escolha o novo estágio da ordem de serviço. O status atual fica destacado.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[75vh] overflow-y-auto p-4 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {statusOptions.map((status) => {
                const Icon = status.icon;
                const isCurrent = status.value === statusAtual;

                return (
                  <button
                    key={status.value}
                    type="button"
                    disabled={loading}
                    onClick={() => atualizar(status.value)}
                    className={cn(
                      "group w-full rounded-2xl border p-4 text-left transition-all",
                      "hover:-translate-y-0.5 hover:shadow-md disabled:pointer-events-none disabled:opacity-60",
                      status.cardClass,
                      isCurrent && "ring-2 ring-violet-500 ring-offset-2 ring-offset-white"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", status.iconClass)}>
                        <Icon className="h-5 w-5" />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold">{status.label}</span>
                          {isCurrent && (
                            <span className="rounded-full bg-violet-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
                              Atual
                            </span>
                          )}
                        </span>
                        <span className="mt-1 block text-xs leading-relaxed opacity-80">{status.descricao}</span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-gray-100 px-4 py-3 sm:px-5">
            <Button type="button" variant="outline" className="w-full rounded-2xl sm:w-auto" onClick={() => setOpen(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

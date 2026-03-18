"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, CheckCircle2, Pencil, X, Check } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  osId: string;
  dataInicio: Date | null;
  dataConclusao: Date | null;
  status: string;
}

function DateTimeInlineEditor({
  label,
  value,
  onSave,
  onClear,
  icon: Icon,
  iconClass,
  disabled,
}: {
  label: string;
  value: Date | null;
  onSave: (iso: string) => Promise<void>;
  onClear: () => Promise<void>;
  icon: React.ElementType;
  iconClass: string;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [calOpen, setCalOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(value ?? undefined);
  const [time, setTime] = useState(
    value
      ? `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`
      : format(new Date(), "HH:mm")
  );
  const [saving, setSaving] = useState(false);

  function handleDay(day: Date | undefined) {
    if (!day) return;
    setDate(day);
    setCalOpen(false);
  }

  async function handleSave() {
    if (!date) return;
    const [h, m] = time.split(":").map(Number);
    const dt = new Date(date);
    dt.setHours(h, m, 0, 0);
    setSaving(true);
    await onSave(dt.toISOString());
    setSaving(false);
    setEditing(false);
  }

  async function handleClear() {
    setSaving(true);
    await onClear();
    setSaving(false);
    setDate(undefined);
    setEditing(false);
  }

  if (!editing) {
    return (
      <div className="flex items-start gap-2.5">
        <Icon className={cn("w-3.5 h-3.5 mt-0.5 shrink-0", iconClass)} />
        <div className="flex-1">
          <p className="text-xs text-gray-400">{label}</p>
          <div className="flex items-center gap-2">
            <p className="text-sm text-gray-700 font-medium">
              {value
                ? format(value, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                : <span className="text-gray-400 font-normal italic">Não informado</span>}
            </p>
            {!disabled && (
              <button
                onClick={() => setEditing(true)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
              >
                <Pencil className="w-3 h-3 text-gray-400" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-3 space-y-2">
      <p className="text-xs font-semibold text-purple-700">{label}</p>
      <div className="flex gap-2">
        <Popover open={calOpen} onOpenChange={setCalOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(
                "flex-1 justify-start font-normal rounded-xl border-gray-200 bg-white text-sm h-9",
                !date && "text-muted-foreground"
              )}
            >
              {date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={date} onSelect={handleDay} locale={ptBR} initialFocus />
          </PopoverContent>
        </Popover>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="h-9 w-28 rounded-xl border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving || !date}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-white disabled:opacity-50 transition-colors"
          style={{ background: "#8B1FA9" }}
        >
          <Check className="w-3.5 h-3.5" />
          {saving ? "Salvando..." : "Salvar"}
        </button>
        {value && (
          <button
            onClick={handleClear}
            disabled={saving}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Limpar
          </button>
        )}
        <button
          onClick={() => setEditing(false)}
          className="text-xs text-gray-400 hover:text-gray-600 px-2"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

export function EditarDatasOS({ osId, dataInicio, dataConclusao, status }: Props) {
  const router = useRouter();
  const isConcluida = status === "CONCLUIDA";

  async function patch(body: Record<string, string | null>) {
    await fetch(`/api/os/${osId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    router.refresh();
  }

  return (
    <div className="space-y-3 group">
      <EditarDatasOS.Item
        label="Início real"
        value={dataInicio}
        icon={Clock}
        iconClass="text-blue-400"
        disabled={isConcluida}
        onSave={(iso) => patch({ dataInicio: iso })}
        onClear={() => patch({ dataInicio: null })}
      />
      <EditarDatasOS.Item
        label="Conclusão real"
        value={dataConclusao}
        icon={CheckCircle2}
        iconClass={dataConclusao ? "text-green-500" : "text-gray-400"}
        disabled={false}
        onSave={(iso) => patch({ dataConclusao: iso })}
        onClear={() => patch({ dataConclusao: null })}
      />
    </div>
  );
}

// Sub-componente interno reutilizável
EditarDatasOS.Item = DateTimeInlineEditor;
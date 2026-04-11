"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Save, Settings2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SUBSISTEMAS } from "@/lib/sla-manual";

export function EditarDadosBasicosOS({
  osId,
  subsistema,
  componenteTag,
}: {
  osId: string;
  subsistema: string;
  componenteTag?: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [novoSubsistema, setNovoSubsistema] = useState(subsistema || "Geral");
  const [novaTag, setNovaTag] = useState(componenteTag ?? "");

  async function salvar() {
    setSaving(true);
    try {
      await fetch(`/api/os/${osId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subsistema: novoSubsistema,
          componenteTag: novaTag || null,
        }),
      });
      setEditing(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Escopo técnico</p>
              <p className="mt-1 text-sm font-semibold text-gray-800">{subsistema}</p>
              <p className="mt-1 text-xs text-gray-500">
                TAG: {componenteTag?.trim() ? componenteTag : "Não informada"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
            >
              <Pencil className="w-3.5 h-3.5" />
              Editar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
          <Settings2 className="w-4 h-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-blue-900">Editar subsistema da OS</p>
          <p className="text-xs text-blue-700">Essa alteração também reflete no relatório final.</p>
        </div>
      </div>

      <div className="grid gap-3">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Subsistema</p>
          <Select value={novoSubsistema} onValueChange={setNovoSubsistema}>
            <SelectTrigger className="rounded-xl border-gray-200 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUBSISTEMAS.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">TAG do componente</p>
          <Input
            value={novaTag}
            onChange={(e) => setNovaTag(e.target.value)}
            placeholder="Ex.: P01, G04"
            className="rounded-xl border-gray-200 bg-white"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="button" onClick={salvar} disabled={saving} className="rounded-xl bg-blue-700 text-white hover:bg-blue-800">
          <Save className="w-4 h-4" />
          {saving ? "Salvando..." : "Salvar"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setNovoSubsistema(subsistema || "Geral");
            setNovaTag(componenteTag ?? "");
            setEditing(false);
          }}
          className="rounded-xl"
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}

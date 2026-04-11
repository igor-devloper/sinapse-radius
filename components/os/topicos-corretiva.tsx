"use client";

import { useState } from "react";
import { Camera, FileText, Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type FotoTopico = {
  id: string;
  nome: string;
  url: string;
  tipo: string;
};

type TopicoCorretivaItem = {
  id: string;
  titulo: string;
  observacao?: string | null;
  ordem: number;
  fotos: FotoTopico[];
};

export function TopicosCorretiva({
  osId,
  topicos: initialTopicos,
  canEdit,
}: {
  osId: string;
  topicos: TopicoCorretivaItem[];
  canEdit: boolean;
}) {
  const [topicos, setTopicos] = useState(initialTopicos);
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novaObservacao, setNovaObservacao] = useState("");
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [deletingFotoId, setDeletingFotoId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { titulo: string; observacao: string }>>(
    () =>
      Object.fromEntries(
        initialTopicos.map((topico) => [
          topico.id,
          { titulo: topico.titulo, observacao: topico.observacao ?? "" },
        ])
      )
  );

  function updateDraft(id: string, patch: Partial<{ titulo: string; observacao: string }>) {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        titulo: prev[id]?.titulo ?? "",
        observacao: prev[id]?.observacao ?? "",
        ...patch,
      },
    }));
  }

  async function criarTopico() {
    const titulo = novoTitulo.trim();
    if (!titulo) {
      toast.error("Informe o título do tópico.");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch(`/api/os/${osId}/topicos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo,
          observacao: novaObservacao.trim() || null,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error?.formErrors?.[0] ?? data?.error ?? "Não foi possível criar o tópico.");
        return;
      }

      const topico = normalizarTopico(data.topico);
      setTopicos((prev) => [...prev, topico]);
      setDrafts((prev) => ({
        ...prev,
        [topico.id]: { titulo: topico.titulo, observacao: topico.observacao ?? "" },
      }));
      setNovoTitulo("");
      setNovaObservacao("");
      toast.success("Tópico adicionado ao relatório.");
    } catch {
      toast.error("Erro ao criar tópico.");
    } finally {
      setCreating(false);
    }
  }

  async function salvarTopico(id: string) {
    const draft = drafts[id];
    const titulo = draft?.titulo?.trim() ?? "";
    if (!titulo) {
      toast.error("O tópico precisa ter um título.");
      return;
    }

    setSavingId(id);
    try {
      const res = await fetch(`/api/os/${osId}/topicos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo,
          observacao: draft?.observacao?.trim() || null,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error?.formErrors?.[0] ?? data?.error ?? "Não foi possível salvar o tópico.");
        return;
      }

      const atualizado = normalizarTopico(data.topico);
      setTopicos((prev) => prev.map((topico) => (topico.id === id ? atualizado : topico)));
      setDrafts((prev) => ({
        ...prev,
        [id]: { titulo: atualizado.titulo, observacao: atualizado.observacao ?? "" },
      }));
      toast.success("Tópico salvo.");
    } catch {
      toast.error("Erro ao salvar tópico.");
    } finally {
      setSavingId(null);
    }
  }

  async function excluirTopico(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/os/${osId}/topicos/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Não foi possível excluir o tópico.");
        return;
      }

      setTopicos((prev) => prev.filter((topico) => topico.id !== id));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      toast.success("Tópico removido.");
    } catch {
      toast.error("Erro ao excluir tópico.");
    } finally {
      setDeletingId(null);
    }
  }

  async function uploadFoto(topicoId: string, file: File) {
    setUploadingId(topicoId);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/os/${osId}/topicos/${topicoId}/anexos`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Não foi possível enviar a foto.");
        return;
      }

      setTopicos((prev) =>
        prev.map((topico) =>
          topico.id === topicoId
            ? {
                ...topico,
                fotos: [...topico.fotos, normalizarFoto(data.anexo)],
              }
            : topico
        )
      );
      toast.success("Foto adicionada ao tópico.");
    } catch {
      toast.error("Erro ao enviar foto.");
    } finally {
      setUploadingId(null);
    }
  }

  async function excluirFoto(topicoId: string, anexoId: string) {
    setDeletingFotoId(anexoId);
    try {
      const res = await fetch(`/api/os/${osId}/topicos/${topicoId}/anexos?anexoId=${anexoId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Não foi possível remover a foto.");
        return;
      }

      setTopicos((prev) =>
        prev.map((topico) =>
          topico.id === topicoId
            ? { ...topico, fotos: topico.fotos.filter((foto) => foto.id !== anexoId) }
            : topico
        )
      );
      toast.success("Foto removida.");
    } catch {
      toast.error("Erro ao remover foto.");
    } finally {
      setDeletingFotoId(null);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
        <FileText className="w-4 h-4 text-gray-400" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium text-gray-700">Tópicos da Manutenção Corretiva</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Cada tópico entra no relatório final com título, observações e fotos.
          </p>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {canEdit && (
          <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50/60 p-4 space-y-3">
            <div className="grid gap-3 md:grid-cols-[1.2fr_1fr]">
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Título</p>
                <Input
                  value={novoTitulo}
                  onChange={(e) => setNovoTitulo(e.target.value)}
                  placeholder="Ex.: Troca de bomba de circulação"
                  className="bg-white"
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Observações iniciais</p>
                <Textarea
                  value={novaObservacao}
                  onChange={(e) => setNovaObservacao(e.target.value)}
                  placeholder="Resumo do que foi feito ou encontrado"
                  className="min-h-[40px] bg-white"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={criarTopico}
              disabled={creating}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {creating ? "Adicionando..." : "Adicionar tópico"}
            </button>
          </div>
        )}

        {topicos.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-8 text-center">
            <p className="text-sm text-gray-500">Nenhum tópico cadastrado para esta corretiva.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {topicos.map((topico, index) => {
              const draft = drafts[topico.id] ?? {
                titulo: topico.titulo,
                observacao: topico.observacao ?? "",
              };

              return (
                <div key={topico.id} className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4 space-y-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-orange-100 px-2 text-xs font-bold text-orange-700">
                        {index + 1}
                      </span>
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Tópico do relatório
                      </p>
                    </div>
                    {canEdit && (
                      <button
                        type="button"
                        disabled={deletingId === topico.id}
                        onClick={() => excluirTopico(topico.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        {deletingId === topico.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        Excluir
                      </button>
                    )}
                  </div>

                  <div className="grid gap-3">
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Título</p>
                      <Input
                        value={draft.titulo}
                        onChange={(e) => updateDraft(topico.id, { titulo: e.target.value })}
                        readOnly={!canEdit}
                        className="bg-white read-only:bg-gray-100"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Observações</p>
                      <Textarea
                        value={draft.observacao}
                        onChange={(e) => updateDraft(topico.id, { observacao: e.target.value })}
                        readOnly={!canEdit}
                        placeholder="Descreva a atividade executada, achados e recomendações do tópico."
                        className="min-h-28 bg-white read-only:bg-gray-100"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Fotos do tópico
                        {topico.fotos.length > 0 && (
                          <span className="ml-1 font-medium text-blue-600">({topico.fotos.length})</span>
                        )}
                      </p>

                      {canEdit && (
                        <label
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors",
                            uploadingId === topico.id
                              ? "pointer-events-none border-gray-200 bg-gray-100 text-gray-400"
                              : "cursor-pointer border-blue-200 bg-white text-blue-700 hover:bg-blue-50"
                          )}
                        >
                          {uploadingId === topico.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Camera className="w-3.5 h-3.5" />
                          )}
                          {uploadingId === topico.id ? "Enviando..." : "Adicionar foto"}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="sr-only"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) void uploadFoto(topico.id, file);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      )}
                    </div>

                    {topico.fotos.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        {topico.fotos.map((foto) => (
                          <div
                            key={foto.id}
                            className="relative aspect-square overflow-hidden rounded-xl border border-gray-200 bg-white group"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={`/api/files/anexo?src=${encodeURIComponent(foto.url)}&filename=${encodeURIComponent(foto.nome)}&inline=1`}
                              alt={foto.nome}
                              className="h-full w-full object-cover"
                            />
                            {canEdit && (
                              <button
                                type="button"
                                disabled={deletingFotoId === foto.id}
                                onClick={() => excluirFoto(topico.id, foto.id)}
                                className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-100"
                              >
                                {deletingFotoId === foto.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <X className="w-3 h-3" />
                                )}
                              </button>
                            )}
                            <div className="absolute inset-x-0 bottom-0 bg-black/45 px-2 py-1">
                              <p className="truncate text-[10px] text-white">{foto.nome}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs italic text-gray-400">Nenhuma foto adicionada.</p>
                    )}
                  </div>

                  {canEdit && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => salvarTopico(topico.id)}
                        disabled={savingId === topico.id}
                        className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                      >
                        {savingId === topico.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {savingId === topico.id ? "Salvando..." : "Salvar tópico"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function normalizarTopico(topico: Record<string, unknown>): TopicoCorretivaItem {
  const anexos = Array.isArray(topico.anexos)
    ? topico.anexos
    : Array.isArray(topico.fotos)
      ? topico.fotos
      : [];

  return {
    id: String(topico.id),
    titulo: String(topico.titulo),
    observacao: topico.observacao ? String(topico.observacao) : "",
    ordem: Number(topico.ordem ?? 0),
    fotos: anexos
      .filter((foto): foto is Record<string, unknown> => Boolean(foto) && typeof foto === "object")
      .filter((foto) => String(foto.tipo || "").startsWith("image/"))
      .map(normalizarFoto),
  };
}

function normalizarFoto(foto: Record<string, unknown>): FotoTopico {
  return {
    id: String(foto.id),
    nome: String(foto.nome),
    url: String(foto.url),
    tipo: String(foto.tipo),
  };
}

"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Search,
  Plus,
  Loader2,
  Pencil,
  Trash2,
  Package2,
  RefreshCw,
  ImageIcon,
  Link2,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CHECKLIST_PREVENTIVA } from "@/lib/checklist-preventiva";

type AssetLinkRecord = {
  checklistItemId: string;
  itemCodigo: string;
  itemDescricao: string;
  itemSubsistema: string;
  itemPeriodicidade: string;
};

type AssetRecord = {
  id: string;
  nome: string;
  codigo: string;
  fotoUrl: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  checklistLinks: AssetLinkRecord[];
};

const CHECKLIST_GROUPS = CHECKLIST_PREVENTIVA.reduce<Record<string, typeof CHECKLIST_PREVENTIVA>>((acc, item) => {
  (acc[item.subsistema] ??= []).push(item);
  return acc;
}, {});

function formatDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function AssetThumbnail({ src, alt }: { src: string | null; alt: string }) {
  return (
    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border bg-muted/40">
      {src ? (
        <Image src={src} alt={alt} fill className="object-cover" sizes="80px" unoptimized />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
          <ImageIcon className="h-6 w-6" />
        </div>
      )}
    </div>
  );
}

function ChecklistSelector({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState<Record<string, boolean>>(() => {
    const state: Record<string, boolean> = {};
    Object.keys(CHECKLIST_GROUPS).forEach((group) => {
      state[group] = true;
    });
    return state;
  });

  const selected = React.useMemo(() => new Set(value), [value]);

  function toggle(itemId: string) {
    if (selected.has(itemId)) {
      onChange(value.filter((id) => id !== itemId));
      return;
    }
    onChange([...value, itemId]);
  }

  const q = query.trim().toLowerCase();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label>Vincular ao checklist</Label>
          <p className="text-xs text-muted-foreground">
            O ativo será herdado automaticamente pela OS quando o item selecionado entrar na visita preventiva.
          </p>
        </div>
        <Badge variant="secondary" className="rounded-lg px-2.5 py-1 text-[11px]">
          {value.length} vínculo{value.length === 1 ? "" : "s"}
        </Badge>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar item do checklist"
          className="pl-9"
        />
      </div>

      <div className="max-h-80 overflow-y-auto rounded-xl border border-border/60 bg-background">
        {Object.entries(CHECKLIST_GROUPS).map(([group, items]) => {
          const filtered = items.filter((item) => {
            if (!q) return true;
            const blob = `${item.id} ${item.descricao} ${item.periodicidade} ${item.subsistema}`.toLowerCase();
            return blob.includes(q);
          });
          if (filtered.length === 0) return null;

          const isOpen = open[group] ?? true;
          return (
            <div key={group} className="border-b last:border-b-0">
              <button
                type="button"
                onClick={() => setOpen((prev) => ({ ...prev, [group]: !isOpen }))}
                className="flex w-full items-center justify-between bg-muted/40 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                <span>{group}</span>
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {isOpen && (
                <div className="divide-y">
                  {filtered.map((item) => {
                    const checked = selected.has(item.id);
                    return (
                      <label key={item.id} className="flex cursor-pointer items-start gap-3 px-3 py-3 hover:bg-muted/30">
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 rounded border-gray-300"
                          checked={checked}
                          onChange={() => toggle(item.id)}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-[11px] font-semibold text-violet-700">{item.id}</span>
                            <Badge variant="outline" className="rounded-md px-2 py-0 text-[10px] font-medium">
                              {item.periodicidade}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm text-foreground">{item.descricao}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AtivosPageClient({
  initialAssets,
  canManage,
}: {
  initialAssets: AssetRecord[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [assets, setAssets] = React.useState<AssetRecord[]>(initialAssets);
  const [query, setQuery] = React.useState("");
  const [nome, setNome] = React.useState("");
  const [codigo, setCodigo] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [selectedChecklistIds, setSelectedChecklistIds] = React.useState<string[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editNome, setEditNome] = React.useState("");
  const [editCodigo, setEditCodigo] = React.useState("");
  const [editFile, setEditFile] = React.useState<File | null>(null);
  const [editChecklistIds, setEditChecklistIds] = React.useState<string[]>([]);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const filteredAssets = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter((asset) => {
      const links = asset.checklistLinks.map((link) => `${link.itemCodigo} ${link.itemDescricao}`).join(" ").toLowerCase();
      return (
        asset.nome.toLowerCase().includes(q) ||
        asset.codigo.toLowerCase().includes(q) ||
        links.includes(q)
      );
    });
  }, [assets, query]);

  async function refreshAssets(showToast = false) {
    try {
      setRefreshing(true);
      const res = await fetch("/api/assets", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao carregar ativos");
      setAssets(Array.isArray(data.assets) ? data.assets : []);
      router.refresh();
      if (showToast) toast.success("Lista de ativos atualizada");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao atualizar ativos");
    } finally {
      setRefreshing(false);
    }
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canManage) return;

    try {
      setSaving(true);
      const fd = new FormData();
      fd.append("nome", nome);
      fd.append("codigo", codigo);
      if (file) fd.append("file", file);
      selectedChecklistIds.forEach((id) => fd.append("checklistItemIds", id));

      const res = await fetch("/api/assets", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao criar ativo");

      toast.success("Ativo criado com sucesso");
      setNome("");
      setCodigo("");
      setFile(null);
      setSelectedChecklistIds([]);
      const input = document.getElementById("asset-file-input") as HTMLInputElement | null;
      if (input) input.value = "";
      await refreshAssets();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao criar ativo");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(asset: AssetRecord) {
    setEditingId(asset.id);
    setEditNome(asset.nome);
    setEditCodigo(asset.codigo);
    setEditFile(null);
    setEditChecklistIds(asset.checklistLinks.map((link) => link.checklistItemId));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditNome("");
    setEditCodigo("");
    setEditFile(null);
    setEditChecklistIds([]);
  }

  async function handleUpdate(assetId: string) {
    if (!canManage) return;
    try {
      setBusyId(assetId);
      const fd = new FormData();
      fd.append("nome", editNome);
      fd.append("codigo", editCodigo);
      if (editFile) fd.append("file", editFile);
      editChecklistIds.forEach((id) => fd.append("checklistItemIds", id));

      const res = await fetch(`/api/assets/${assetId}`, {
        method: "PATCH",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao atualizar ativo");

      toast.success("Ativo atualizado");
      cancelEdit();
      await refreshAssets();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao atualizar ativo");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(assetId: string, assetNome: string) {
    if (!canManage) return;
    const confirmed = window.confirm(`Excluir o ativo \"${assetNome}\"?`);
    if (!confirmed) return;

    try {
      setBusyId(assetId);
      const res = await fetch(`/api/assets/${assetId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao excluir ativo");
      toast.success("Ativo excluído");
      await refreshAssets();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao excluir ativo");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Ativos</h1>
          <p className="text-sm text-muted-foreground">
            Cadastre equipamentos e vincule o ativo diretamente aos itens do checklist preventivo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="h-9 rounded-lg px-3 text-xs font-medium">
            {assets.length} ativo{assets.length === 1 ? "" : "s"}
          </Badge>
          <Button variant="outline" className="gap-2" onClick={() => refreshAssets(true)} disabled={refreshing}>
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Atualizar
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[430px_minmax(0,1fr)]">
        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Novo ativo
            </CardTitle>
            <CardDescription>
              Crie um cadastro central e já vincule o equipamento aos itens que devem herdar esse ativo na OS.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!canManage ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Seu perfil pode visualizar os ativos, mas não pode criar, editar ou excluir.
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleCreate}>
                <div className="space-y-2">
                  <Label htmlFor="asset-nome">Nome do ativo</Label>
                  <Input id="asset-nome" placeholder="Ex.: Inversor Container A" value={nome} onChange={(e) => setNome(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="asset-codigo">Código do ativo</Label>
                  <Input id="asset-codigo" placeholder="Ex.: INV-CT-A01" value={codigo} onChange={(e) => setCodigo(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="asset-file-input">Foto do ativo</Label>
                  <Input id="asset-file-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                  <p className="text-xs text-muted-foreground">Opcional. Aceita JPG, PNG, WEBP e GIF com até 10 MB.</p>
                </div>

                <ChecklistSelector value={selectedChecklistIds} onChange={setSelectedChecklistIds} />

                <Button type="submit" className="w-full gap-2" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package2 className="h-4 w-4" />}
                  Salvar ativo
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-border/60 bg-card/80">
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome, código ou item do checklist" className="pl-9" />
              </div>
            </CardContent>
          </Card>

          {filteredAssets.length === 0 ? (
            <Card className="border-dashed border-border/70">
              <CardContent className="flex min-h-52 flex-col items-center justify-center gap-3 pt-6 text-center">
                <div className="rounded-full bg-muted p-3 text-muted-foreground">
                  <Package2 className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Nenhum ativo encontrado</p>
                  <p className="text-sm text-muted-foreground">{query ? "Tente ajustar a busca." : "Cadastre o primeiro equipamento para começar."}</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {filteredAssets.map((asset) => {
                const isEditing = editingId === asset.id;
                const isBusy = busyId === asset.id;
                return (
                  <Card key={asset.id} className="border-border/60 bg-card/80">
                    <CardContent className="pt-6">
                      {isEditing ? (
                        <div className="space-y-4">
                          <div className="flex items-start gap-4">
                            <AssetThumbnail src={asset.fotoUrl} alt={asset.nome} />
                            <div className="min-w-0 flex-1 space-y-3">
                              <div className="space-y-2">
                                <Label>Nome</Label>
                                <Input value={editNome} onChange={(e) => setEditNome(e.target.value)} />
                              </div>
                              <div className="space-y-2">
                                <Label>Código</Label>
                                <Input value={editCodigo} onChange={(e) => setEditCodigo(e.target.value)} />
                              </div>
                              <div className="space-y-2">
                                <Label>Nova foto</Label>
                                <Input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => setEditFile(e.target.files?.[0] ?? null)} />
                              </div>
                            </div>
                          </div>

                          <ChecklistSelector value={editChecklistIds} onChange={setEditChecklistIds} />

                          <div className="flex gap-2">
                            <Button className="flex-1" onClick={() => handleUpdate(asset.id)} disabled={isBusy}>
                              {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                            </Button>
                            <Button variant="outline" onClick={cancelEdit} disabled={isBusy}>Cancelar</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-start gap-4">
                            <AssetThumbnail src={asset.fotoUrl} alt={asset.nome} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-base font-semibold text-foreground">{asset.nome}</p>
                              <p className="mt-1 inline-flex rounded-lg bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">{asset.codigo}</p>
                              <p className="mt-3 text-xs text-muted-foreground">Cadastrado em {formatDate(asset.createdAt)}</p>
                            </div>
                          </div>

                          <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-foreground">
                              <Link2 className="h-3.5 w-3.5 text-violet-600" />
                              Itens vinculados do checklist
                            </div>
                            {asset.checklistLinks.length === 0 ? (
                              <p className="text-xs text-muted-foreground">Nenhum item vinculado ainda.</p>
                            ) : (
                              <div className="space-y-2">
                                {asset.checklistLinks.slice(0, 4).map((link) => (
                                  <div key={`${asset.id}-${link.checklistItemId}`} className="rounded-lg bg-background px-2.5 py-2">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-[11px] font-semibold text-violet-700">{link.itemCodigo}</span>
                                      <Badge variant="outline" className="rounded-md px-1.5 py-0 text-[10px]">{link.itemPeriodicidade}</Badge>
                                    </div>
                                    <p className="mt-1 text-xs text-foreground line-clamp-2">{link.itemDescricao}</p>
                                  </div>
                                ))}
                                {asset.checklistLinks.length > 4 && (
                                  <p className="text-[11px] text-muted-foreground">+{asset.checklistLinks.length - 4} vínculo(s) adicional(is)</p>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-2 border-t pt-4">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                              Herda para OS automaticamente
                            </div>
                            {canManage && (
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" className="gap-2" onClick={() => startEdit(asset)}>
                                  <Pencil className="h-4 w-4" /> Editar
                                </Button>
                                <Button size="sm" variant="outline" className="gap-2 text-red-600 hover:text-red-700" onClick={() => handleDelete(asset.id, asset.nome)} disabled={isBusy}>
                                  {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Excluir
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

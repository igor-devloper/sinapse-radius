type Props = {
  nome?: string | null;
  codigo?: string | null;
  fotoUrl?: string | null;
  compact?: boolean;
};

export function ChecklistItemAsset({ nome, codigo, fotoUrl, compact = false }: Props) {
  if (!nome && !codigo && !fotoUrl) return null;

  return (
    <div className={`rounded-xl border border-slate-200 bg-slate-50/70 ${compact ? "p-2.5" : "p-3"}`}>
      <div className="flex items-start gap-3">
        {fotoUrl ? (
          <img
            src={fotoUrl}
            alt={nome ?? codigo ?? "Ativo"}
            className={`${compact ? "w-14 h-14" : "w-16 h-16"} rounded-lg object-cover border border-slate-200 bg-white shrink-0`}
          />
        ) : (
          <div className={`${compact ? "w-14 h-14" : "w-16 h-16"} rounded-lg border border-dashed border-slate-300 bg-white flex items-center justify-center text-[10px] text-slate-400 shrink-0`}>
            Sem foto
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Ativo do item</p>
          <p className="text-sm font-semibold text-slate-800 break-words">{nome ?? "Ativo sem nome"}</p>
          <p className="text-xs text-slate-600 break-words">Código: <span className="font-mono">{codigo ?? "—"}</span></p>
        </div>
      </div>
    </div>
  );
}

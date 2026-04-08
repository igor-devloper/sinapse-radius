export const CONCLUSAO_PREFIX = "[CONCLUSAO_RELATORIO]";

export function encodeConclusao(texto: string) {
  return `${CONCLUSAO_PREFIX} ${texto}`.trim();
}

export function isConclusaoComentario(texto?: string | null) {
  return String(texto ?? "").startsWith(CONCLUSAO_PREFIX);
}

export function decodeConclusao(texto?: string | null) {
  const raw = String(texto ?? "");
  if (!isConclusaoComentario(raw)) return raw.trim();
  return raw.slice(CONCLUSAO_PREFIX.length).trim();
}


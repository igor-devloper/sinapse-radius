import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { parseSupabaseSrc, isSupabaseSrc } from "@/lib/storageSupabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return Response.json({ error: "Não autorizado" }, { status: 401 });

    const u = new URL(req.url);
    const src = u.searchParams.get("src") ?? "";
    const filename = u.searchParams.get("filename") ?? "arquivo";
    const inline = u.searchParams.get("inline") === "1";

    if (!src) return Response.json({ error: "src ausente" }, { status: 400 });

    let buf: Buffer;
    let contentType = "application/octet-stream";

    if (isSupabaseSrc(src)) {
      const parsed = parseSupabaseSrc(src);
      if (!parsed) return Response.json({ error: "src inválido" }, { status: 400 });

      const { data, error } = await supabaseAdmin.storage
        .from(parsed.bucket)
        .download(parsed.path);

      if (error || !data)
        return Response.json({ error: `download falhou: ${error?.message}` }, { status: 500 });

      buf = Buffer.from(await data.arrayBuffer());
      // Detecta tipo pelo path
      const ext = parsed.path.split(".").pop()?.toLowerCase();
      const mimes: Record<string, string> = {
        pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg",
        png: "image/png", webp: "image/webp", gif: "image/gif",
      };
      contentType = mimes[ext ?? ""] ?? "application/octet-stream";
    } else {
      return Response.json({ error: "Apenas src supabase suportado" }, { status: 400 });
    }

    return new Response(new Uint8Array(buf), {
      status: 200,
      headers: {
        "content-type": contentType,
        "content-disposition": `${inline ? "inline" : "attachment"}; filename="${encodeURIComponent(filename)}"`,
        "cache-control": "no-store",
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro";
    return Response.json({ error: msg }, { status: 500 });
  }
}
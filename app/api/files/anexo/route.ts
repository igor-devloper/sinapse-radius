import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { parseSupabaseSrc, isSupabaseSrc } from "@/lib/storageSupabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function parseSupabaseHttpSrc(src: string): { bucket: string; path: string } | null {
  try {
    const u = new URL(src);
    const segments = u.pathname.split("/").filter(Boolean);
    const objectIdx = segments.findIndex((s) => s === "object");
    if (objectIdx < 0) return null;

    // Formatos suportados:
    // /storage/v1/object/public/:bucket/:path
    // /storage/v1/object/sign/:bucket/:path
    // /storage/v1/object/authenticated/:bucket/:path
    const access = segments[objectIdx + 1];
    const bucket = segments[objectIdx + 2];
    const path = segments.slice(objectIdx + 3).join("/");

    if (!["public", "sign", "authenticated"].includes(access)) return null;
    if (!bucket || !path) return null;

    return { bucket, path: decodeURIComponent(path) };
  } catch {
    return null;
  }
}

async function downloadFromSupabase(bucket: string, path: string): Promise<{ buf: Buffer; contentType: string } | null> {
  const safeDecode = (value: string) => {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  };

  const pathCandidates = Array.from(
    new Set([
      path,
      path.replace(/^\/+/, ""),
      safeDecode(path),
      safeDecode(path).replace(/^\/+/, ""),
    ])
  ).filter(Boolean);

  for (const candidate of pathCandidates) {
    const { data, error } = await supabaseAdmin.storage.from(bucket).download(candidate);
    if (!error && data) {
      const buf = Buffer.from(await data.arrayBuffer());
      const ext = candidate.split(".").pop()?.toLowerCase();
      const mimes: Record<string, string> = {
        pdf: "application/pdf",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        webp: "image/webp",
        gif: "image/gif",
      };
      return { buf, contentType: mimes[ext ?? ""] ?? "application/octet-stream" };
    }
  }

  // Fallback por URL pública (quando download do SDK falha por parsing/path legacy)
  const publicUrl = supabaseAdmin.storage.from(bucket).getPublicUrl(path.replace(/^\/+/, "")).data.publicUrl;
  if (publicUrl) {
    const res = await fetch(publicUrl, { cache: "no-store" });
    if (res.ok) {
      const ab = await res.arrayBuffer();
      const ct = res.headers.get("content-type") || "application/octet-stream";
      return { buf: Buffer.from(ab), contentType: ct };
    }
  }

  return null;
}

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

    const parsed = isSupabaseSrc(src)
      ? parseSupabaseSrc(src)
      : parseSupabaseHttpSrc(src);

    if (parsed) {
      const downloaded = await downloadFromSupabase(parsed.bucket, parsed.path);
      if (!downloaded) {
        return Response.json(
          { error: `download falhou para bucket="${parsed.bucket}" path="${parsed.path}"` },
          { status: 500 }
        );
      }
      buf = downloaded.buf;
      contentType = downloaded.contentType;
    } else {
      return Response.json(
        { error: "src inválido. Use supabase://bucket/path ou URL de storage do Supabase." },
        { status: 400 }
      );
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

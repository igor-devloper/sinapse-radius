import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function normalizeSN(value: string) {
  return value
    .replace(/^M\s*SN[:\s-]*/i, "")
    .replace(/^SN[:\s-]*/i, "")
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9]/gi, "")
    .toUpperCase()
    .trim();
}

function isValidMinerSN(value: string) {
  const sn = normalizeSN(value);
  return /^[A-Z0-9]{10,30}$/.test(sn);
}

function extractSNFromText(rawText: string) {
  const text = rawText
    .replace(/[|]/g, "I")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\r/g, "\n");

  const compact = text.replace(/\s+/g, " ");

  const explicit1 = compact.match(/M\s*SN[:\s-]*([A-Z0-9]{10,30})/i);
  if (explicit1?.[1]) {
    const sn = normalizeSN(explicit1[1]);
    if (isValidMinerSN(sn)) return sn;
  }

  const explicit2 = compact.match(/\bSN[:\s-]*([A-Z0-9]{10,30})\b/i);
  if (explicit2?.[1]) {
    const sn = normalizeSN(explicit2[1]);
    if (isValidMinerSN(sn)) return sn;
  }

  const tokens = compact.match(/[A-Z0-9]{12,30}/g) ?? [];
  for (const token of tokens) {
    const sn = normalizeSN(token);
    if (isValidMinerSN(sn)) return sn;
  }

  return null;
}

export async function POST(req: NextRequest) {
  let worker: any = null;

  try {
    const body = await req.json();
    const imageBase64 = body?.imageBase64;

    if (!imageBase64 || typeof imageBase64 !== "string") {
      return NextResponse.json(
        { ok: false, error: "imageBase64 é obrigatório." },
        { status: 400 }
      );
    }

    const base64Data = imageBase64.includes(",")
      ? imageBase64.split(",")[1]
      : imageBase64;

    const imageBuffer = Buffer.from(base64Data, "base64");

    const { createWorker } = await import("tesseract.js");

    worker = await createWorker("eng", 1, {
      logger: () => {},
      // Workaround para Next.js
      workerPath:
        "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js",
      corePath:
        "https://cdn.jsdelivr.net/npm/tesseract.js-core@5",
      langPath:
        "https://tessdata.projectnaptha.com/4.0.0",
    });

    await worker.setParameters({
      tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:- ",
      preserve_interword_spaces: "1",
    });

    const result = await worker.recognize(imageBuffer);
    const rawText = result?.data?.text ?? "";

    const sn = extractSNFromText(rawText);

    if (sn) {
      return NextResponse.json({
        ok: true,
        sn,
        rawText,
        method: "ocr",
      });
    }

    return NextResponse.json({
      ok: false,
      sn: null,
      rawText,
      error: "SN não identificado no OCR.",
    });
  } catch (error) {
    console.error("Erro em /api/miners/scan-sn:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao processar OCR.",
      },
      { status: 500 }
    );
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch {
        // ignora erro no terminate
      }
    }
  }
}
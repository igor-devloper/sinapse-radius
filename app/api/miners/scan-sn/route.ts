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

  const patterns = [
    /M\s*SN[:\s-]*([A-Z0-9]{10,30})/i,
    /\bSN[:\s-]*([A-Z0-9]{10,30})\b/i,
    /\b([A-Z0-9]{14,24})\b/g,
  ];

  for (const pattern of patterns) {
    if (String(pattern).includes("/g")) {
      const matches = compact.match(pattern);
      if (!matches?.length) continue;

      for (const item of matches) {
        const normalized = normalizeSN(item);
        if (isValidMinerSN(normalized)) {
          return normalized;
        }
      }
      continue;
    }

    const match = compact.match(pattern);
    if (match?.[1]) {
      const normalized = normalizeSN(match[1]);
      if (isValidMinerSN(normalized)) {
        return normalized;
      }
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
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

    const worker = await createWorker("eng");

    try {
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
    } finally {
      await worker.terminate();
    }
  } catch (error) {
    console.error("Erro em /api/miners/scan-sn:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Erro interno ao processar OCR.",
      },
      { status: 500 }
    );
  }
}
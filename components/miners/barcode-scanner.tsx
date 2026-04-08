"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrowserCodeReader, BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";

type BarcodeScannerProps = {
  onScan: (value: string) => void;
  onClose?: () => void;
};

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
  return /^[A-Z0-9]{8,40}$/.test(sn);
}

function extractSNFromText(rawText: string) {
  const text = rawText.toUpperCase();

  const labeledMatch = text.match(/(?:M\s*SN|SN)\s*[:\-]?\s*([A-Z0-9\s-]{8,50})/i);
  if (labeledMatch?.[1]) {
    const labeled = normalizeSN(labeledMatch[1]);
    if (isValidMinerSN(labeled)) return labeled;
  }

  const candidates = text.match(/[A-Z0-9]{8,40}/g) ?? [];
  for (const candidate of candidates) {
    const normalized = normalizeSN(candidate);
    if (isValidMinerSN(normalized)) return normalized;
  }

  return "";
}

function pickBestCamera(devices: MediaDeviceInfo[]) {
  if (!devices.length) return undefined;

  const preferred = devices.find((d) =>
    /(back|rear|environment|traseira)/i.test(d.label)
  );

  return preferred?.deviceId ?? devices[0].deviceId;
}

export default function BarcodeScanner({
  onScan,
  onClose,
}: BarcodeScannerProps) {
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const stoppedRef = useRef(false);

  const [status, setStatus] = useState("Inicializando câmera...");
  const [error, setError] = useState("");
  const [lastRaw, setLastRaw] = useState("");
  const [ocring, setOcring] = useState(false);

  const hints = useMemo(() => {
    const map = new Map();
    map.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
    ]);
    map.set(DecodeHintType.TRY_HARDER, true);
    return map;
  }, []);

  const emitScan = useCallback((rawValue: string, origin: "camera" | "image" | "ocr") => {
    const normalized = normalizeSN(rawValue);
    setLastRaw(rawValue);

    if (!isValidMinerSN(normalized)) {
      setStatus(
        origin === "ocr"
          ? "OCR executado, mas não encontramos um SN válido."
          : "Leitura detectada, mas o formato do SN parece inválido."
      );
      return;
    }

    stoppedRef.current = true;
    setStatus(
      origin === "ocr"
        ? "SN extraído por OCR com sucesso."
        : "SN lido com sucesso."
    );

    controlsRef.current?.stop();
    onScan(normalized);
  }, [onScan]);

  useEffect(() => {
    let mounted = true;

    async function startScanner() {
      if (!videoRef.current) return;

      try {
        setError("");
        setStatus("Solicitando acesso à câmera...");

        const reader = new BrowserMultiFormatReader(hints, {
          delayBetweenScanAttempts: 80,
        });
        readerRef.current = reader;

        const devices = await BrowserCodeReader.listVideoInputDevices();
        const deviceId = pickBestCamera(devices);

        const controls = await reader.decodeFromVideoDevice(
          deviceId,
          videoRef.current,
          (result) => {
            if (!mounted || stoppedRef.current || !result) return;
            emitScan(result.getText(), "camera");
          }
        );

        controlsRef.current = controls;
        setStatus("Aponte a câmera para o código de barras do SN.");
      } catch (err) {
        console.error("Erro ao iniciar scanner:", err);
        if (!mounted) return;
        setError("Não foi possível iniciar a câmera. Use o upload de foto abaixo.");
        setStatus("Falha ao iniciar scanner ao vivo.");
      }
    }

    void startScanner();

    return () => {
      mounted = false;
      stoppedRef.current = true;
      controlsRef.current?.stop();
      readerRef.current = null;
      controlsRef.current = null;
    };
  }, [emitScan, hints]);

  async function runOCR(file: File) {
    setOcring(true);
    setStatus("Executando OCR da foto...");

    try {
      const { createWorker, PSM } = await import("tesseract.js");
      const worker = await createWorker("eng", 1, {
        logger: () => {},
      });

      try {
        await worker.setParameters({
          tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
          tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:- ",
        });

        const { data } = await worker.recognize(file);
        const rawText = String(data?.text ?? "");
        const candidate = extractSNFromText(rawText);

        if (!candidate) {
          setLastRaw(rawText.slice(0, 180));
          setStatus("OCR concluído, mas não foi possível identificar o SN.");
          return;
        }

        emitScan(candidate, "ocr");
      } finally {
        await worker.terminate();
      }
    } catch (err) {
      console.error("Erro no OCR:", err);
      setStatus("Falha ao executar OCR na imagem.");
    } finally {
      setOcring(false);
    }
  }

  async function handleImagePick(file: File | null) {
    if (!file) return;

    setError("");
    setStatus("Tentando ler código de barras da imagem...");

    const reader = new BrowserMultiFormatReader(hints);

    try {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Falha ao carregar imagem"));
        img.src = objectUrl;
      });

      try {
        const result = await reader.decodeFromImageElement(img);
        emitScan(result.getText(), "image");
      } catch {
        setStatus("Não detectamos código de barras. Tentando OCR...");
        await runOCR(file);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    } catch (err) {
      console.error("Erro ao processar imagem:", err);
      setStatus("Não foi possível processar a foto selecionada.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-white p-3">
        <p className="text-sm font-medium text-gray-800">Instruções</p>
        <p className="mt-1 text-sm text-gray-500">
          1) Tente pela câmera ao vivo. 2) Se falhar, envie uma foto da etiqueta para
          leitura automática por código de barras + OCR.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-black">
        <video ref={videoRef} className="h-[280px] w-full object-cover" autoPlay muted playsInline />
      </div>

      <div className="rounded-xl border bg-white p-3">
        <p className="text-sm font-medium text-gray-800">Upload de foto do SN</p>
        <label className="mt-2 inline-flex cursor-pointer items-center rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700">
          {ocring ? "Processando imagem..." : "Selecionar foto"}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            disabled={ocring}
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              void handleImagePick(file);
              e.currentTarget.value = "";
            }}
          />
        </label>
      </div>

      <div className="rounded-xl border bg-white p-3">
        <p className="text-sm font-medium text-gray-800">Status</p>
        <p className="mt-1 text-sm text-gray-500">{status}</p>

        {lastRaw ? (
          <p className="mt-2 break-all font-mono text-xs text-gray-500">
            Última leitura bruta: {lastRaw}
          </p>
        ) : null}

        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={onClose}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}


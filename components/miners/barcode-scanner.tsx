"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type BarcodeScannerProps = {
  onScan: (value: string) => void;
  onClose?: () => void;
};

type ScanApiResponse = {
  ok: boolean;
  sn?: string | null;
  rawText?: string;
  method?: "ocr" | "regex";
  error?: string;
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
  return /^[A-Z0-9]{10,30}$/.test(sn);
}

export default function BarcodeScanner({
  onScan,
  onClose,
}: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Inicializando câmera...");
  const [lastPreview, setLastPreview] = useState<string | null>(null);

  const hasBarcodeDetector = useMemo(() => {
    return typeof window !== "undefined" && "BarcodeDetector" in window;
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setError("");
      setStatus("Solicitando acesso à câmera...");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) return;

      video.srcObject = stream;
      await video.play();

      setReady(true);
      setStatus("Aponte para a etiqueta e clique em “Ler agora”.");
    } catch (err) {
      console.error(err);
      setError("Não foi possível acessar a câmera.");
      setStatus("Falha ao iniciar a câmera.");
    }
  }, []);

  useEffect(() => {
    startCamera();

    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  const captureROI = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return null;
    if (video.readyState < 2) return null;

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    if (!vw || !vh) return null;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;

    /**
     * ROI central mais “achatada”, pois a etiqueta costuma ficar em área horizontal
     * e o operador tende a centralizar a placa.
     */
    const cropW = Math.floor(vw * 0.72);
    const cropH = Math.floor(vh * 0.30);
    const cropX = Math.floor((vw - cropW) / 2);
    const cropY = Math.floor((vh - cropH) / 2);

    // amplia a área para melhorar barcode pequeno
    canvas.width = cropW * 2;
    canvas.height = cropH * 2;

    ctx.drawImage(
      video,
      cropX,
      cropY,
      cropW,
      cropH,
      0,
      0,
      canvas.width,
      canvas.height
    );

    // pré-processamento simples
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      let gray = 0.299 * r + 0.587 * g + 0.114 * b;

      // pequeno ganho de contraste
      if (gray > 165) gray = 255;
      else if (gray < 75) gray = 0;

      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }

    ctx.putImageData(imageData, 0, 0);

    return canvas;
  }, []);

  const tryBarcodeDetector = useCallback(async (canvas: HTMLCanvasElement) => {
    if (!hasBarcodeDetector) return null;

    try {
      // @ts-ignore
      const detector = new window.BarcodeDetector({
        formats: ["code_128", "code_39", "ean_13", "ean_8", "upc_a", "upc_e"],
      });

      // @ts-ignore
      const barcodes = await detector.detect(canvas);

      if (!barcodes?.length) return null;

      const raw = barcodes[0]?.rawValue?.trim();
      if (!raw) return null;

      const normalized = normalizeSN(raw);
      if (!isValidMinerSN(normalized)) return null;

      return normalized;
    } catch (err) {
      console.error("BarcodeDetector falhou:", err);
      return null;
    }
  }, [hasBarcodeDetector]);

  const tryBackendOCR = useCallback(async (canvas: HTMLCanvasElement) => {
    const base64 = canvas.toDataURL("image/jpeg", 0.95);

    const res = await fetch("/api/miners/scan-sn", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ imageBase64: base64 }),
    });

    const data = (await res.json()) as ScanApiResponse;

    if (!res.ok || !data?.ok || !data?.sn) {
      return null;
    }

    const normalized = normalizeSN(data.sn);
    if (!isValidMinerSN(normalized)) return null;

    return normalized;
  }, []);

  const handleReadNow = useCallback(async () => {
    if (busy) return;

    setBusy(true);
    setError("");
    setStatus("Capturando imagem...");

    try {
      const canvas = captureROI();

      if (!canvas) {
        setError("Não foi possível capturar o frame da câmera.");
        setStatus("Falha ao capturar imagem.");
        return;
      }

      setLastPreview(canvas.toDataURL("image/jpeg", 0.85));

      setStatus("Tentando ler o código de barras...");
      const barcodeSN = await tryBarcodeDetector(canvas);

      if (barcodeSN) {
        setStatus("SN lido por código de barras.");
        onScan(barcodeSN);
        return;
      }

      setStatus("Código de barras não encontrado. Tentando OCR...");
      const ocrSN = await tryBackendOCR(canvas);

      if (ocrSN) {
        setStatus("SN identificado por OCR.");
        onScan(ocrSN);
        return;
      }

      setError("Não consegui ler o SN. Tente aproximar mais a câmera e alinhar a etiqueta.");
      setStatus("Leitura não concluída.");
    } catch (err) {
      console.error(err);
      setError("Erro inesperado ao tentar ler o SN.");
      setStatus("Falha na leitura.");
    } finally {
      setBusy(false);
    }
  }, [busy, captureROI, onScan, tryBackendOCR, tryBarcodeDetector]);

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border bg-black">
        <video
          ref={videoRef}
          className="h-72 w-full object-cover"
          autoPlay
          muted
          playsInline
        />

        {/* Máscara visual da ROI */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[26%] w-[78%] rounded-xl border-2 border-lime-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.38)]" />
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <div className="rounded-xl border bg-white p-3 text-sm text-gray-700">
        <p className="font-medium">Instruções:</p>
        <p className="mt-1 text-gray-500">
          Centralize a etiqueta do miner dentro da moldura. Tente enquadrar a
          linha do SN e o código de barras ao mesmo tempo.
        </p>
      </div>

      {lastPreview && (
        <div className="rounded-xl border bg-white p-3">
          <p className="mb-2 text-xs font-medium text-gray-600">Prévia capturada</p>
          <img
            src={lastPreview}
            alt="Prévia da leitura"
            className="max-h-48 rounded-lg border object-contain"
          />
        </div>
      )}

      <div className="rounded-xl border bg-white p-3">
        <p className="text-sm font-medium text-gray-800">Status</p>
        <p className="mt-1 text-sm text-gray-500">{status}</p>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        {ready && !error ? (
          <p className="mt-2 text-xs text-emerald-600">
            Câmera pronta para leitura.
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleReadNow}
          disabled={!ready || busy}
          className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-green-700"
        >
          {busy ? "Lendo..." : "Ler agora"}
        </button>

        <button
          onClick={() => {
            stopCamera();
            startCamera();
          }}
          disabled={busy}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-50 hover:bg-gray-50"
        >
          Reiniciar câmera
        </button>

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
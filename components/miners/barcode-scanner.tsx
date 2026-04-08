"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

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

export default function BarcodeScanner({
  onScan,
  onClose,
}: BarcodeScannerProps) {
  const elementId = useId().replace(/:/g, "");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const startingRef = useRef(false);
  const stoppedRef = useRef(false);

  const [status, setStatus] = useState("Inicializando câmera...");
  const [error, setError] = useState("");
  const [lastRaw, setLastRaw] = useState("");

  const formatsToSupport = useMemo(
    () => [
      Html5QrcodeSupportedFormats.CODE_128,
      Html5QrcodeSupportedFormats.CODE_39,
      Html5QrcodeSupportedFormats.EAN_13,
      Html5QrcodeSupportedFormats.EAN_8,
      Html5QrcodeSupportedFormats.UPC_A,
      Html5QrcodeSupportedFormats.UPC_E,
    ],
    []
  );

  useEffect(() => {
    let mounted = true;

    async function startScanner() {
      if (startingRef.current) return;
      startingRef.current = true;

      try {
        setError("");
        setStatus("Abrindo câmera traseira...");

        const scanner = new Html5Qrcode(elementId, {
          verbose: false,
          formatsToSupport,
        });

        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (vw: number, vh: number) => {
              const width = Math.floor(vw * 0.8);
              const height = Math.floor(vh * 0.28);
              return {
                width: Math.max(260, Math.min(width, 900)),
                height: Math.max(90, Math.min(height, 260)),
              };
            },
            aspectRatio: 1.777,
            disableFlip: false,
          },
          (decodedText) => {
            if (!mounted || stoppedRef.current) return;

            setLastRaw(decodedText);

            const normalized = normalizeSN(decodedText);
            if (!isValidMinerSN(normalized)) {
              setStatus("Leitura detectada, mas o formato do SN parece inválido. Tente reenquadrar.");
              return;
            }

            stoppedRef.current = true;
            setStatus("SN lido com sucesso.");

            void scanner
              .stop()
              .catch(() => {})
              .finally(() => {
                onScan(normalized);
              });
          },
          () => {
            // ignora erros de frame para não poluir console/UI
          }
        );

        if (!mounted) return;
        setStatus("Aponte a câmera para a etiqueta do miner.");
      } catch (err) {
        console.error("Erro ao iniciar html5-qrcode:", err);
        if (!mounted) return;
        setError("Não foi possível iniciar a câmera/scanner.");
        setStatus("Falha ao iniciar o scanner.");
      } finally {
        startingRef.current = false;
      }
    }

    void startScanner();

    return () => {
      mounted = false;
      stoppedRef.current = true;

      const scanner = scannerRef.current;
      scannerRef.current = null;

      if (scanner) {
        void scanner
          .stop()
          .catch(() => {})
          .finally(() => {
            void scanner.clear();
          });
      }
    };
  }, [elementId, formatsToSupport, onScan]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-white p-3">
        <p className="text-sm font-medium text-gray-800">Instruções</p>
        <p className="mt-1 text-sm text-gray-500">
          Aproxime a câmera da etiqueta e tente enquadrar o código de barras dentro da área central.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-black">
        <div id={elementId} className="w-full" />
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
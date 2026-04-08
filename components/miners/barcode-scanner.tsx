"use client";

import { useEffect, useRef } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

export default function BarcodeScanner({
  onScan,
}: {
  onScan: (value: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const codeReader = new BrowserMultiFormatReader();

    let active = true;

    codeReader
      .decodeFromVideoDevice(undefined, videoRef.current!, (result, err) => {
        if (result && active) {
          onScan(result.getText());
        }
      })
      .catch(console.error);

    return () => {
      active = false;
    };
  }, [onScan]);

  return (
    <div className="rounded-xl overflow-hidden border">
      <video ref={videoRef} className="w-full h-64 object-cover" />
    </div>
  );
}
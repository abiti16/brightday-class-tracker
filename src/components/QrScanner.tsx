import { useEffect, useRef, useState } from "react";

export function QrScanner({ onScan }: { onScan: (text: string) => void }) {
  const cb = useRef(onScan);
  cb.current = onScan;
  const [err, setErr] = useState("");

  useEffect(() => {
    let scanner: { stop: () => Promise<void>; clear: () => void } | null = null;
    let cancelled = false;
    let last = "";
    let lastAt = 0;
    (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancelled) return;
      const s = new Html5Qrcode("qr-reader");
      try {
        await s.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 220 },
          (text) => {
            const now = Date.now();
            if (text === last && now - lastAt < 2500) return;
            last = text;
            lastAt = now;
            cb.current(text);
          },
          () => {},
        );
        scanner = s;
        if (cancelled) s.stop().then(() => s.clear()).catch(() => {});
      } catch {
        setErr("Could not open the camera. Please allow camera access and try again.");
      }
    })();
    return () => {
      cancelled = true;
      scanner?.stop().then(() => scanner?.clear()).catch(() => {});
    };
  }, []);

  return (
    <div>
      <div id="qr-reader" className="overflow-hidden rounded-lg" />
      {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
    </div>
  );
}

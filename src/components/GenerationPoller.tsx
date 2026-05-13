"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  jobId: string;
  onComplete: () => void;
  onFailed: (msg: string) => void;
}

const TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes

export default function GenerationPoller({ jobId, onComplete, onFailed }: Props) {
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState("Starting…");
  const [timedOut, setTimedOut] = useState(false);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    let stopped = false;
    startedAt.current = Date.now();

    async function poll() {
      while (!stopped) {
        await new Promise((r) => setTimeout(r, 3000));
        if (stopped) break;

        if (Date.now() - startedAt.current > TIMEOUT_MS) {
          setTimedOut(true);
          return;
        }

        try {
          const res = await fetch(`/api/jobs/${jobId}/status`);
          const data = await res.json();
          setProgress(data.progressPct ?? 0);
          setStep(data.currentStep ?? "Working…");
          if (data.status === "complete") { onComplete(); return; }
          if (data.status === "failed") { onFailed(data.error ?? "Generation failed."); return; }
        } catch {
          // network hiccup — keep polling
        }
      }
    }

    poll();
    return () => { stopped = true; };
  }, [jobId, onComplete, onFailed]);

  if (timedOut) {
    return (
      <div className="panel border-orange-300 bg-orange-50 space-y-2">
        <p className="font-bold text-orange-800">Generation is taking longer than expected</p>
        <p className="text-sm text-orange-700">
          This usually means the server timed out before Claude finished writing your script.
          Click "Try again" — the second attempt typically succeeds.
        </p>
        <button
          className="button-primary mt-2 text-sm"
          onClick={() => onFailed("Generation timed out. Please try again.")}
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="panel space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-bold text-[#17201b]">Generating your draft…</p>
        <p className="text-xs text-[#8a9690]">Typically 30–90 seconds</p>
      </div>
      <div className="h-2 w-full bg-[#d9ddd1]">
        <div
          className="h-2 bg-[#3f6f65] transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-sm text-[#59645d]">{step}</p>
      {progress === 0 && (
        <p className="text-xs text-[#8a9690]">
          Waiting for the generation server to pick up your job…
        </p>
      )}
    </div>
  );
}

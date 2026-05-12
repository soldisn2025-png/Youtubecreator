"use client";

import { useEffect, useState } from "react";

interface Props {
  jobId: string;
  onComplete: () => void;
  onFailed: (msg: string) => void;
}

export default function GenerationPoller({ jobId, onComplete, onFailed }: Props) {
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState("Starting…");

  useEffect(() => {
    let stopped = false;
    async function poll() {
      while (!stopped) {
        await new Promise((r) => setTimeout(r, 3000));
        if (stopped) break;
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

  return (
    <div className="panel space-y-3">
      <p className="font-bold text-[#17201b]">Generating your draft…</p>
      <div className="h-2 w-full bg-[#d9ddd1]">
        <div
          className="h-2 bg-[#3f6f65] transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-sm text-[#59645d]">{step}</p>
      <p className="text-xs text-[#8a9690]">
        Note: Generation requires the background worker to be running. If progress stays at 0%, the worker may not be active.
      </p>
    </div>
  );
}

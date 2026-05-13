"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  renderJobId: string;
  onComplete: (outputUrl: string) => void;
  onFailed: (msg: string) => void;
}

export default function RenderPoller({ renderJobId, onComplete, onFailed }: Props) {
  const [progress, setProgress] = useState(0);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function poll() {
      try {
        const res = await fetch(`/api/render-jobs/${renderJobId}/status`);
        const data = await res.json();
        if (data.done) {
          if (interval.current) clearInterval(interval.current);
          if (data.error) onFailed(data.error);
          else onComplete(data.outputUrl ?? "");
        } else {
          setProgress(data.progress ?? 0);
        }
      } catch {
        // network blip — keep polling
      }
    }

    poll();
    interval.current = setInterval(poll, 5000);
    return () => { if (interval.current) clearInterval(interval.current); };
  }, [renderJobId, onComplete, onFailed]);

  return (
    <div className="panel space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-bold text-[#17201b]">Rendering your video…</p>
        <p className="text-xs text-[#8a9690]">2–5 minutes</p>
      </div>
      <div className="h-2 w-full overflow-hidden bg-[#d9ddd1]">
        <div
          className="h-2 bg-[#3f6f65] transition-all duration-500"
          style={{ width: `${Math.max(progress, 5)}%` }}
        />
      </div>
      <p className="text-sm text-[#59645d]">{progress}% complete — generating voiceover and compositing scenes…</p>
    </div>
  );
}

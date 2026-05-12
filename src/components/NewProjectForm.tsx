"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const VOICE_OPTIONS = [
  { label: "Warm female", value: "nova" },
  { label: "Clear male", value: "onyx" },
  { label: "Calm narrator", value: "shimmer" },
];

const TONE_OPTIONS = ["Warm and practical", "Professional", "Encouraging"];

export default function NewProjectForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [duration, setDuration] = useState(3);
  const [form, setForm] = useState({
    topic: "",
    outline: "",
    audience: "",
    callToAction: "",
    tone: TONE_OPTIONS[0],
    ttsVoice: "nova",
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const title = form.topic.slice(0, 80) || "Untitled project";
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          topic: form.topic,
          outline: form.outline,
          audience: form.audience,
          callToAction: form.callToAction,
          tone: form.tone,
          ttsVoice: form.ttsVoice,
          targetLengthMin: duration,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create project.");
      router.push(`/projects/${data.project.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <>
      <button className="button-primary" onClick={() => setOpen(true)}>
        + New project
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/40">
          <div className="h-full w-full max-w-lg overflow-y-auto bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#d9ddd1] px-6 py-4">
              <h2 className="panel-title">New project</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-2xl text-[#59645d] hover:text-[#17201b]"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-1 px-6 py-5">
              <label className="field-label" htmlFor="np-topic">Topic *</label>
              <input
                id="np-topic"
                className="field"
                placeholder="e.g. Helping parents understand ABA goals"
                value={form.topic}
                onChange={(e) => set("topic", e.target.value)}
                required
              />

              <label className="field-label" htmlFor="np-audience">Audience *</label>
              <input
                id="np-audience"
                className="field"
                placeholder="e.g. Parents of children with autism"
                value={form.audience}
                onChange={(e) => set("audience", e.target.value)}
                required
              />

              <label className="field-label" htmlFor="np-outline">Bullet notes / outline *</label>
              <textarea
                id="np-outline"
                className="field min-h-[100px]"
                placeholder={"- Key point 1\n- Key point 2\n- Key point 3"}
                value={form.outline}
                onChange={(e) => set("outline", e.target.value)}
                required
              />

              <label className="field-label" htmlFor="np-cta">Call to action *</label>
              <input
                id="np-cta"
                className="field"
                placeholder="e.g. Subscribe for more ABA tips"
                value={form.callToAction}
                onChange={(e) => set("callToAction", e.target.value)}
                required
              />

              <label className="field-label">Duration</label>
              <div className="segmented">
                <button
                  type="button"
                  className={duration === 3 ? "segment-active" : ""}
                  onClick={() => setDuration(3)}
                >
                  3 min
                </button>
                <button
                  type="button"
                  className={duration === 5 ? "segment-active" : ""}
                  onClick={() => setDuration(5)}
                >
                  5 min
                </button>
              </div>

              <label className="field-label" htmlFor="np-voice">Voice</label>
              <select
                id="np-voice"
                className="field"
                value={form.ttsVoice}
                onChange={(e) => set("ttsVoice", e.target.value)}
              >
                {VOICE_OPTIONS.map((v) => (
                  <option key={v.value} value={v.value}>{v.label}</option>
                ))}
              </select>

              <label className="field-label" htmlFor="np-tone">Tone</label>
              <select
                id="np-tone"
                className="field"
                value={form.tone}
                onChange={(e) => set("tone", e.target.value)}
              >
                {TONE_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              {error && (
                <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>
              )}

              <div className="mt-6 flex gap-3">
                <button
                  type="submit"
                  className="button-primary flex-1"
                  disabled={loading}
                >
                  {loading ? "Creating…" : "Create project"}
                </button>
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => setOpen(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

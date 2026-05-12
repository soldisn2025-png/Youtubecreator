import Link from "next/link";

const sampleScenes = [
  {
    title: "What ABA support means",
    asset: "Photo",
    duration: "00:42",
    status: "Ready",
    caption: "ABA can help families practice everyday skills in small steps.",
  },
  {
    title: "A calm home practice example",
    asset: "Clip",
    duration: "00:55",
    status: "Needs review",
    caption: "Use one clear instruction, wait, then praise the attempt.",
  },
  {
    title: "What to ask your care team",
    asset: "Photo",
    duration: "00:48",
    status: "Missing asset",
    caption: "Ask what goal is being practiced and how progress is measured.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f6f7f2] text-[#17201b]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-5 md:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-[#d9ddd1] pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#3f6f65]">
              YouTube Creator
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#17201b] md:text-4xl">
              Build an autism and ABA video draft
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="button-secondary" href="/api/auth/signin">
              Sign in
            </Link>
            <button className="button-primary">Create draft</button>
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[360px_1fr]">
          <aside className="space-y-4">
            <div className="panel">
              <div className="flex items-center justify-between">
                <h2 className="panel-title">1. Start here</h2>
                <span className="pill-good">Simple flow</span>
              </div>
              <label className="field-label" htmlFor="topic">
                Topic
              </label>
              <input
                id="topic"
                className="field"
                placeholder="Example: helping with transitions"
                defaultValue="Helping parents understand ABA goals"
              />
              <label className="field-label" htmlFor="notes">
                Bullet notes
              </label>
              <textarea
                id="notes"
                className="field min-h-32"
                defaultValue={
                  "- Explain ABA in parent-friendly words\n- Show one simple home example\n- Remind parents to ask questions"
                }
              />
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="upload-tile">
                  <span className="upload-icon">+</span>
                  Photos
                </div>
                <div className="upload-tile">
                  <span className="upload-icon">+</span>
                  Clips
                </div>
                <div className="upload-tile">
                  <span className="upload-icon">+</span>
                  Intro image
                </div>
                <div className="upload-tile">
                  <span className="upload-icon">+</span>
                  Outro image
                </div>
              </div>
            </div>

            <div className="panel">
              <h2 className="panel-title">2. Video settings</h2>
              <div className="segmented">
                <button className="segment-active">3 min</button>
                <button>5 min</button>
              </div>
              <label className="field-label" htmlFor="voice">
                Voice
              </label>
              <select id="voice" className="field">
                <option>Warm female</option>
                <option>Clear male</option>
                <option>Calm narrator</option>
              </select>
              <label className="field-label" htmlFor="tone">
                Tone
              </label>
              <select id="tone" className="field">
                <option>Warm and practical</option>
                <option>Professional</option>
                <option>Encouraging</option>
              </select>
            </div>
          </aside>

          <section className="space-y-5">
            <div className="panel">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="panel-title">Draft progress</h2>
                  <p className="muted">
                    The app writes the script, creates voiceover, renders scenes, and waits for your approval.
                  </p>
                </div>
                <span className="pill-warn">Human review required</span>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-5">
                {["Upload notes", "Add media", "Create draft", "Review scenes", "Export"].map(
                  (step, index) => (
                    <div className="step" key={step}>
                      <span>{index + 1}</span>
                      {step}
                    </div>
                  ),
                )}
              </div>
            </div>

            <div className="panel">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="panel-title">Scene editor</h2>
                  <p className="muted">
                    Edit one scene at a time. The final upload button stays locked until every scene is approved.
                  </p>
                </div>
                <button className="button-secondary">Regenerate selected scene</button>
              </div>

              <div className="mt-5 space-y-3">
                <div className="scene-card scene-fixed">
                  <div className="scene-thumb">Intro</div>
                  <div className="min-w-0 flex-1">
                    <div className="scene-heading">
                      <h3>Opening title image</h3>
                      <span className="pill-good">Fixed</span>
                    </div>
                    <p className="muted">5 seconds. Image can be swapped, but the card stays first.</p>
                  </div>
                </div>

                {sampleScenes.map((scene, index) => (
                  <div className="scene-card" key={scene.title}>
                    <div className="scene-thumb">{scene.asset}</div>
                    <div className="min-w-0 flex-1">
                      <div className="scene-heading">
                        <h3>
                          {index + 1}. {scene.title}
                        </h3>
                        <span className={scene.status === "Ready" ? "pill-good" : "pill-warn"}>
                          {scene.status}
                        </span>
                      </div>
                      <p className="caption-line">{scene.caption}</p>
                      <div className="scene-actions">
                        <span>{scene.duration}</span>
                        <button>Edit words</button>
                        <button>Swap media</button>
                        <button>Approve</button>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="scene-card scene-fixed">
                  <div className="scene-thumb">Outro</div>
                  <div className="min-w-0 flex-1">
                    <div className="scene-heading">
                      <h3>Closing image and next step</h3>
                      <span className="pill-good">Fixed</span>
                    </div>
                    <p className="muted">8 seconds. Used for final call-to-action.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="panel">
                <h2 className="panel-title">Export package</h2>
                <p className="muted">
                  Includes final video, title ideas, description with chapters, hashtags, script, and missing media notes.
                </p>
                <button className="button-primary mt-4">Export after approval</button>
              </div>
              <div className="panel">
                <h2 className="panel-title">Private YouTube upload</h2>
                <p className="muted">
                  Optional. Uploads as private only after final approval so you can publish manually in YouTube Studio.
                </p>
                <button className="button-secondary mt-4">Locked until approved</button>
              </div>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

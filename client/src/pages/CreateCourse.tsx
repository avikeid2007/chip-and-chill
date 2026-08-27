import { useState } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import { useAuth } from "../api/AuthContext";
import type { AuthResponse } from "../api/auth";
import { apiFetch } from "../api/client";

interface HoleSeed {
  holeNumber: number;
  par: number;
  yardageWhite: number;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

function defaultHoles(count: number): HoleSeed[] {
  return Array.from({ length: count }, (_, i) => ({
    holeNumber: i + 1,
    par: 4,
    yardageWhite: 380,
  }));
}

export default function CreateCourse() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [type, setType] = useState<"Course" | "Range">("Course");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  );
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [holeCount, setHoleCount] = useState<9 | 18>(9);
  const [holes, setHoles] = useState<HoleSeed[]>(defaultHoles(9));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!user) {
    return (
      <div className="min-h-screen">
        <div className="bg-gradient-to-br from-fairway to-turf"><NavBar /></div>
        <div className="max-w-sm mx-auto px-8 py-16 text-center text-ink-soft text-sm">
          You need to be logged in to create a course.
        </div>
      </div>
    );
  }

  function changeHoleCount(count: 9 | 18) {
    setHoleCount(count);
    if (holes.length < count) {
      // extend with defaults
      setHoles((prev) => [
        ...prev,
        ...defaultHoles(count).slice(prev.length).map((h, i) => ({
          ...h,
          holeNumber: prev.length + i + 1,
        })),
      ]);
    } else {
      setHoles((prev) => prev.slice(0, count));
    }
  }

  function updateHole(index: number, field: "par" | "yardageWhite", value: number) {
    setHoles((prev) => prev.map((h, i) => (i === index ? { ...h, [field]: value } : h)));
  }

  async function handleLogoUpload(file: File) {
    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API_BASE}/api/onboarding/logo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${user!.token}` },
        body: form,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Upload failed (${res.status})`);
      }
      const data = await res.json();
      setLogoUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Logo upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Course name is required.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const auth = await apiFetch<AuthResponse>("/api/onboarding/course", {
        method: "POST",
        body: JSON.stringify({
          name,
          type,
          address: address || null,
          description: description || null,
          timezone,
          logoUrl,
          holes: type === "Range" ? [] : holes,
        }),
      }, user!.token);

      // Swap in the fresh token (now carries the new tenant_id claim).
      login(auth);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create course.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen">
      <div className="bg-gradient-to-br from-fairway to-turf">
        <NavBar />
      </div>
      <div className="max-w-2xl mx-auto px-8 py-16">
        <div className="text-mono text-xs tracking-widest uppercase text-turf mb-3">Onboarding</div>
        <h1 className="text-3xl font-semibold tracking-tight text-fairway mb-2">Create your course</h1>
        <p className="text-sm text-ink-soft mb-8">
          Set up your golf course or driving range. You'll be its admin and can edit everything later.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Logo */}
          <div className="bg-white border border-[#E4E8E3] rounded-md p-5">
            <label className="block text-xs font-medium text-ink-soft mb-3">Course logo (optional)</label>
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <img
                  src={`${API_BASE}${logoUrl}`}
                  alt="Course logo"
                  className="w-16 h-16 rounded-md object-contain border border-[#E4E8E3] bg-white"
                />
              ) : (
                <div className="w-16 h-16 rounded-md border border-dashed border-[#C9D1C7] flex items-center justify-center text-ink-soft text-xl">
                  ⛳
                </div>
              )}
              <div>
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.gif,.webp,.svg"
                  onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])}
                  className="text-sm"
                />
                {uploading && <p className="text-xs text-ink-soft mt-1">Uploading…</p>}
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => setLogoUrl(null)}
                    className="text-xs text-[#C0533F] hover:underline mt-1"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Basics */}
          <div className="bg-white border border-[#E4E8E3] rounded-md p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-ink-soft mb-1.5">Course name *</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Cedar Ridge Golf Club"
                className="w-full border border-[#E4E8E3] rounded-md px-4 py-2.5 text-sm outline-none focus:border-turf transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-soft mb-1.5">Type</label>
              <div className="flex gap-2">
                {(["Course", "Range"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${
                      type === t
                        ? "bg-fairway text-white border-fairway"
                        : "border-[#E4E8E3] text-ink-soft hover:border-turf"
                    }`}
                  >
                    {t === "Course" ? "Golf Course" : "Driving Range"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-soft mb-1.5">Address</label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="City, State"
                className="w-full border border-[#E4E8E3] rounded-md px-4 py-2.5 text-sm outline-none focus:border-turf transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-soft mb-1.5">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="A short description golfers will see on your course page…"
                className="w-full border border-[#E4E8E3] rounded-md px-4 py-2.5 text-sm outline-none focus:border-turf transition-colors resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-soft mb-1.5">Timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="border border-[#E4E8E3] rounded-md px-3 py-2 text-sm"
              >
                {Intl.supportedValuesOf("timeZone").map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Holes */}
          {type === "Course" && (
            <div className="bg-white border border-[#E4E8E3] rounded-md overflow-hidden">
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <h2 className="font-semibold text-fairway text-sm">Hole details</h2>
                <div className="flex gap-1.5">
                  {([9, 18] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => changeHoleCount(c)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                        holeCount === c
                          ? "bg-fairway text-white border-fairway"
                          : "border-[#E4E8E3] text-ink-soft hover:border-turf"
                      }`}
                    >
                      {c} holes
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-[50px_80px_110px_1fr] text-mono text-xs uppercase tracking-wide text-ink-soft bg-[#FAFBF9] border-y border-[#EEF1ED] px-5 py-2.5">
                <span>Hole</span><span>Par</span><span>Yardage</span><span></span>
              </div>
              {holes.map((h, i) => (
                <div key={h.holeNumber} className="grid grid-cols-[50px_80px_110px_1fr] items-center px-5 py-2 border-b border-[#EEF1ED] last:border-b-0">
                  <span className="text-mono font-semibold text-turf text-sm">{h.holeNumber}</span>
                  <select
                    value={h.par}
                    onChange={(e) => updateHole(i, "par", Number(e.target.value))}
                    className="w-16 border border-[#E4E8E3] rounded-md px-2 py-1.5 text-sm text-mono mr-2"
                  >
                    <option value={3}>3</option>
                    <option value={4}>4</option>
                    <option value={5}>5</option>
                  </select>
                  <input
                    type="number"
                    min={0}
                    value={h.yardageWhite}
                    onChange={(e) => updateHole(i, "yardageWhite", Number(e.target.value))}
                    className="w-24 border border-[#E4E8E3] rounded-md px-2 py-1.5 text-sm text-mono"
                  />
                  <span className="text-xs text-ink-soft pl-3">yds · white tees</span>
                </div>
              ))}
              <div className="px-5 py-3 bg-[#FAFBF9] text-xs text-ink-soft">
                Total par: <span className="font-semibold text-fairway">{holes.reduce((s, h) => s + h.par, 0)}</span>
                {" · "}Total yardage:{" "}
                <span className="font-semibold text-fairway">
                  {holes.reduce((s, h) => s + h.yardageWhite, 0).toLocaleString()} yds
                </span>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={saving || uploading}
            className="w-full bg-gold text-fairway px-6 py-3 rounded-[3px] font-semibold text-sm disabled:opacity-60"
          >
            {saving ? "Creating…" : "Create course"}
          </button>
        </form>
      </div>
    </div>
  );
}

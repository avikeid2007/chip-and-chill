import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { useAuth } from "../api/AuthContext";
import { courseApi } from "../api/course";
import NoCourse from "../components/NoCourse";

interface HoleForm {
  holeNumber: number;
  par: number;
  yardageWhite: number;
}

export default function CourseEditor() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [holes, setHoles] = useState<HoleForm[]>([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.tenantId) return;
    (async () => {
      try {
        const tenant = await courseApi.getTenant(user.tenantId!);
        setName(tenant.name);
        setDescription(tenant.description ?? "");
        const h = await courseApi.getHoles(user.tenantId!);
        setHoles(
          h.map((hole) => ({
            holeNumber: hole.holeNumber,
            par: hole.par,
            yardageWhite: hole.yardageWhite,
          }))
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load course info.");
      }
    })();
  }, [user]);

  function updateHole(index: number, field: "par" | "yardageWhite", value: number) {
    setHoles((prev) => prev.map((h, i) => (i === index ? { ...h, [field]: value } : h)));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.tenantId) return;
    setError(null);
    try {
      await courseApi.updateTenant(
        user.tenantId,
        { name, description },
        user.token
      );
      await courseApi.saveHoles(
        user.tenantId,
        holes.map((h) => ({
          id: crypto.randomUUID(),
          tenantId: user.tenantId!,
          holeNumber: h.holeNumber,
          par: h.par,
          yardageWhite: h.yardageWhite,
        })),
        user.token
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    }
  }

  if (!user?.tenantId) {
    return (
      <AdminLayout>
        <NoCourse />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="text-mono text-xs tracking-widest uppercase text-turf mb-3">Course admin</div>
      <h1 className="text-3xl font-semibold tracking-tight text-fairway mb-8">Course info editor</h1>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <form onSubmit={handleSave} className="space-y-8">
        <div className="bg-white border border-[#E4E8E3] rounded-md p-6 space-y-4">
          <h2 className="font-semibold text-fairway text-sm">Basic info</h2>
          <div>
            <label className="block text-xs font-medium text-ink-soft mb-1.5">Course name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-[#E4E8E3] rounded-md px-4 py-2.5 text-sm outline-none focus:border-turf transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-soft mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full border border-[#E4E8E3] rounded-md px-4 py-2.5 text-sm outline-none focus:border-turf transition-colors resize-none"
            />
          </div>
        </div>

        <div className="bg-white border border-[#E4E8E3] rounded-md overflow-hidden">
          <h2 className="font-semibold text-fairway text-sm px-6 pt-6 pb-4">Hole-by-hole</h2>
          <div className="grid grid-cols-3 text-mono text-xs uppercase tracking-wide text-ink-soft bg-[#FAFBF9] border-y border-[#EEF1ED] px-6 py-2.5">
            <span>Hole</span><span>Par</span><span>Yardage (white)</span>
          </div>
          {holes.map((h, i) => (
            <div key={h.holeNumber} className="grid grid-cols-3 items-center px-6 py-2.5 border-b border-[#EEF1ED] last:border-b-0">
              <span className="text-mono font-semibold text-turf text-sm">{h.holeNumber}</span>
              <input
                type="number"
                min={3}
                max={5}
                value={h.par}
                onChange={(e) => updateHole(i, "par", Number(e.target.value))}
                className="w-16 border border-[#E4E8E3] rounded-md px-2 py-1.5 text-sm text-mono"
              />
              <input
                type="number"
                value={h.yardageWhite}
                onChange={(e) => updateHole(i, "yardageWhite", Number(e.target.value))}
                className="w-24 border border-[#E4E8E3] rounded-md px-2 py-1.5 text-sm text-mono"
              />
            </div>
          ))}
        </div>

        <button type="submit" className="bg-gold text-fairway px-6 py-2.5 rounded-[3px] font-semibold text-sm">
          {saved ? "Saved ✓" : "Save changes"}
        </button>
      </form>
    </AdminLayout>
  );
}

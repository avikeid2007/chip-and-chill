import { useEffect, useState, useRef } from "react";
import AdminLayout from "../components/AdminLayout";
import { useAuth } from "../api/AuthContext";
import { courseApi } from "../api/course";
import NoCourse from "../components/NoCourse";

interface ExtendedHoleForm {
  holeNumber: number;
  par: number;
  handicapIndex: number;
  yardageBlack?: number | null;
  yardageBlue?: number | null;
  yardageWhite: number;
  yardageGold?: number | null;
  yardageRed?: number | null;
  notes?: string | null;
}

const ALL_AMENITIES = [
  "Driving Range",
  "Putting Green",
  "Chipping & Bunker Practice",
  "TrackMan Launch Monitors",
  "Pro Shop & Club Fitting",
  "GPS Electric Carts",
  "Push / Pull Carts",
  "Caddie Service",
  "Clubhouse Restaurant & Bar",
  "19th Hole Lounge",
  "Locker Rooms & Showers",
  "PGA Professional Lessons",
  "Night Golf / Floodlights",
];

export default function CourseEditor() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [architect, setArchitect] = useState("");
  const [yearBuilt, setYearBuilt] = useState<string>("");
  const [courseType, setCourseType] = useState("Championship Links");
  const [courseRating, setCourseRating] = useState<string>("");
  const [slopeRating, setSlopeRating] = useState<string>("");
  const [greensGrass, setGreensGrass] = useState("Bentgrass");
  const [fairwaysGrass, setFairwaysGrass] = useState("Bermuda");
  const [dressCode, setDressCode] = useState("Collared shirts required. Soft spikes only.");
  const [spikePolicy, setSpikePolicy] = useState("Non-metal / soft spikes only.");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  const [holes, setHoles] = useState<ExtendedHoleForm[]>([]);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.tenantId) return;
    (async () => {
      try {
        const tenant = await courseApi.getTenant(user.tenantId!);
        setName(tenant.name || "");
        setAddress(tenant.address || "");
        setDescription(tenant.description ?? "");
        setCoverImageUrl(tenant.coverImageUrl || "");
        setArchitect(tenant.architect || "");
        setYearBuilt(tenant.yearBuilt ? String(tenant.yearBuilt) : "");
        setCourseType(tenant.courseType || "Championship Links");
        setCourseRating(tenant.courseRating ? String(tenant.courseRating) : "74.2");
        setSlopeRating(tenant.slopeRating ? String(tenant.slopeRating) : "138");
        setGreensGrass(tenant.greensGrass || "Bentgrass");
        setFairwaysGrass(tenant.fairwaysGrass || "Bermuda");
        setDressCode(tenant.dressCode || "Collared shirts required. Soft spikes only.");
        setSpikePolicy(tenant.spikePolicy || "Non-metal / soft spikes only.");
        setPhone(tenant.phone || "");
        setEmail(tenant.email || "");
        setWebsite(tenant.website || "");

        if (tenant.amenities) {
          setSelectedAmenities(tenant.amenities.split(",").map((a) => a.trim()).filter(Boolean));
        } else {
          setSelectedAmenities(["Driving Range", "Putting Green", "Pro Shop", "GPS Electric Carts", "Clubhouse Restaurant & Bar"]);
        }

        const h = await courseApi.getHoles(user.tenantId!);
        if (h.length > 0) {
          setHoles(
            h.map((hole) => ({
              holeNumber: hole.holeNumber,
              par: hole.par,
              handicapIndex: hole.handicapIndex || hole.holeNumber,
              yardageBlack: hole.yardageBlack || (hole.yardageWhite + 30),
              yardageBlue: hole.yardageBlue || (hole.yardageWhite + 15),
              yardageWhite: hole.yardageWhite,
              yardageGold: hole.yardageGold || (hole.yardageWhite - 25),
              yardageRed: hole.yardageRed || (hole.yardageWhite - 55),
              notes: hole.notes || "",
            }))
          );
        } else {
          generateDefault18Holes();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load course info.");
      }
    })();
  }, [user]);

  function generateDefault18Holes() {
    const defaultPars = [4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5, 4];
    const defaultWhites = [380, 410, 165, 520, 395, 425, 185, 540, 400, 390, 175, 530, 415, 375, 430, 190, 555, 420];
    const defaultStrokeIndexes = [7, 3, 15, 1, 11, 5, 17, 9, 13, 8, 16, 2, 6, 14, 4, 18, 10, 12];

    const generated: ExtendedHoleForm[] = defaultPars.map((par, i) => {
      const white = defaultWhites[i];
      return {
        holeNumber: i + 1,
        par,
        handicapIndex: defaultStrokeIndexes[i],
        yardageBlack: white + 30,
        yardageBlue: white + 15,
        yardageWhite: white,
        yardageGold: white - 25,
        yardageRed: white - 55,
        notes: `Hole #${i + 1} pro tip: Favor center of fairway. Strategic green guarded by front bunkers.`,
      };
    });
    setHoles(generated);
  }

  function updateHole<K extends keyof ExtendedHoleForm>(index: number, field: K, value: ExtendedHoleForm[K]) {
    setHoles((prev) => prev.map((h, i) => (i === index ? { ...h, [field]: value } : h)));
  }

  function toggleAmenity(amenity: string) {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user?.tenantId || !user?.token) return;

    setUploadingCover(true);
    setError(null);
    try {
      const res = await courseApi.uploadCover(user.tenantId, file, user.token);
      setCoverImageUrl(res.url);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload cover banner.");
    } finally {
      setUploadingCover(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.tenantId || !user?.token) return;
    setError(null);

    try {
      await courseApi.updateTenant(
        user.tenantId,
        {
          name,
          address,
          description,
          coverImageUrl,
          architect,
          yearBuilt: yearBuilt ? parseInt(yearBuilt, 10) : undefined,
          courseType,
          courseRating: courseRating ? parseFloat(courseRating) : undefined,
          slopeRating: slopeRating ? parseInt(slopeRating, 10) : undefined,
          greensGrass,
          fairwaysGrass,
          amenities: selectedAmenities.join(", "),
          dressCode,
          spikePolicy,
          phone,
          email,
          website,
        },
        user.token
      );

      await courseApi.saveHoles(
        user.tenantId,
        holes.map((h) => ({
          holeNumber: h.holeNumber,
          par: h.par,
          handicapIndex: h.handicapIndex,
          yardageBlack: h.yardageBlack,
          yardageBlue: h.yardageBlue,
          yardageWhite: h.yardageWhite,
          yardageGold: h.yardageGold,
          yardageRed: h.yardageRed,
          notes: h.notes,
        })),
        user.token
      );

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save course changes.");
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
      <div className="max-w-5xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-turf font-bold">Facility Management</div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-fairway tracking-tight">
              Course Information & 18-Hole Architecture
            </h1>
            <p className="text-xs text-fairway/70 mt-0.5">
              Customize course designer, grass types, slope rating, amenities, policies, and hole yardage matrix.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`/courses/${user.tenantId}`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 bg-white border border-sand-dark text-fairway text-xs font-bold rounded-xl hover:bg-mist transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <span>👁️</span> Public View ↗
            </a>
          </div>
        </div>

        {/* Global Alerts */}
        {saved && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between animate-fadeIn">
            <span>✓ Championship course specs & 18-hole matrix saved successfully!</span>
            <button onClick={() => setSaved(false)}>✕</button>
          </div>
        )}
        {error && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center justify-between animate-fadeIn">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-8">
          {/* Section 1: Basic Club Info & Media */}
          <div className="bg-white rounded-3xl border border-sand-dark p-6 sm:p-8 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-fairway pb-3 border-b border-gray-100 flex items-center gap-2">
              <span>🏛️</span> General Club Information & Media
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Course Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-fairway"
                  placeholder="Pine Hollow Championship Golf Club"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Address / Location
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-fairway"
                  placeholder="100 Championship Links Way, Monterey, CA"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                Course Description & History
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-fairway"
                placeholder="A magnificent 18-hole championship layout designed to challenge players of all skill levels..."
              />
            </div>

            {/* Cover Banner Upload */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                Scenic Cover Banner Image
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={coverImageUrl}
                  onChange={(e) => setCoverImageUrl(e.target.value)}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-gray-900 focus:ring-2 focus:ring-fairway"
                  placeholder="https://images.unsplash.com/... or upload banner"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition-colors whitespace-nowrap"
                >
                  {uploadingCover ? "Uploading..." : "📷 Upload Photo"}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCoverUpload}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Architecture & Playing Specs */}
          <div className="bg-white rounded-3xl border border-sand-dark p-6 sm:p-8 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-fairway pb-3 border-b border-gray-100 flex items-center gap-2">
              <span>📐</span> Architecture, Grass Types & Ratings
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Course Architect / Designer
                </label>
                <input
                  type="text"
                  value={architect}
                  onChange={(e) => setArchitect(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-fairway"
                  placeholder="e.g. Pete Dye / Jack Nicklaus"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Year Established
                </label>
                <input
                  type="number"
                  value={yearBuilt}
                  onChange={(e) => setYearBuilt(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-fairway"
                  placeholder="e.g. 1928"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Course Style / Type
                </label>
                <select
                  value={courseType}
                  onChange={(e) => setCourseType(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-fairway cursor-pointer"
                >
                  <option value="Championship Links">🌊 Championship Links</option>
                  <option value="Parkland">🌲 Parkland</option>
                  <option value="Desert">🏜️ Desert Layout</option>
                  <option value="Heathland">🌾 Heathland</option>
                  <option value="Resort">🏖️ Resort Style</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Course Rating (USGA)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={courseRating}
                  onChange={(e) => setCourseRating(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-fairway"
                  placeholder="74.2"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Slope Rating (USGA)
                </label>
                <input
                  type="number"
                  value={slopeRating}
                  onChange={(e) => setSlopeRating(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-fairway"
                  placeholder="138"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Greens Grass
                </label>
                <input
                  type="text"
                  value={greensGrass}
                  onChange={(e) => setGreensGrass(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-fairway"
                  placeholder="Penncross Bentgrass"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Fairways Grass
                </label>
                <input
                  type="text"
                  value={fairwaysGrass}
                  onChange={(e) => setFairwaysGrass(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-fairway"
                  placeholder="Tifway 419 Bermuda"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Amenities & Policies */}
          <div className="bg-white rounded-3xl border border-sand-dark p-6 sm:p-8 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-fairway pb-3 border-b border-gray-100 flex items-center gap-2">
              <span>⛳</span> Clubhouse Amenities & Club Policies
            </h3>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                Available Facility Amenities (Check all that apply)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {ALL_AMENITIES.map((amenity) => {
                  const isChecked = selectedAmenities.includes(amenity);
                  return (
                    <label
                      key={amenity}
                      className={`flex items-center gap-2.5 p-3 rounded-2xl border text-xs font-bold cursor-pointer transition-colors ${
                        isChecked
                          ? "bg-emerald-50/80 border-turf text-fairway shadow-sm"
                          : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleAmenity(amenity)}
                        className="rounded text-turf focus:ring-turf"
                      />
                      <span>{amenity}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Dress Code Policy
                </label>
                <input
                  type="text"
                  value={dressCode}
                  onChange={(e) => setDressCode(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-fairway"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Spike Policy
                </label>
                <input
                  type="text"
                  value={spikePolicy}
                  onChange={(e) => setSpikePolicy(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-fairway"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">Pro Shop Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-fairway"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">Pro Shop Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-fairway"
                  placeholder="proshop@golfclub.com"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">Website</label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-fairway"
                  placeholder="https://golfclub.com"
                />
              </div>
            </div>
          </div>

          {/* Section 4: 18-Hole Matrix & Stroke Index Editor */}
          <div className="bg-white rounded-3xl border border-sand-dark p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-fairway flex items-center gap-2">
                  <span>🗺️</span> 18-Hole Architecture & Tee Matrix
                </h3>
                <p className="text-xs text-gray-500">Fine-tune pars, stroke index (1–18), tee yardages, and strategy tips.</p>
              </div>

              <button
                type="button"
                onClick={generateDefault18Holes}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold transition-colors"
              >
                ⚡ Reset to Standard 18 Holes
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs border-collapse">
                <thead>
                  <tr className="bg-fairway text-white text-[10px] font-bold uppercase">
                    <th className="py-3 px-2 rounded-l-xl">Hole</th>
                    <th className="py-3 px-2">Par</th>
                    <th className="py-3 px-2">Stroke Index</th>
                    <th className="py-3 px-2">⚫ Black (Yds)</th>
                    <th className="py-3 px-2">🔵 Blue (Yds)</th>
                    <th className="py-3 px-2 bg-fairway/80">⚪ White (Yds)</th>
                    <th className="py-3 px-2">🟡 Gold (Yds)</th>
                    <th className="py-3 px-2">🔴 Red (Yds)</th>
                    <th className="py-3 px-3 text-left rounded-r-xl">Strategy Tip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {holes.map((h, i) => (
                    <tr key={h.holeNumber} className="hover:bg-gray-50/80">
                      <td className="py-2.5 px-2 font-mono font-black text-fairway">#{h.holeNumber}</td>
                      <td className="py-2.5 px-2">
                        <select
                          value={h.par}
                          onChange={(e) => updateHole(i, "par", parseInt(e.target.value, 10))}
                          className="w-14 bg-gray-50 border border-gray-200 rounded-lg p-1 text-xs font-bold text-center text-turf focus:ring-1 focus:ring-fairway"
                        >
                          <option value={3}>3</option>
                          <option value={4}>4</option>
                          <option value={5}>5</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-2">
                        <input
                          type="number"
                          min={1}
                          max={18}
                          value={h.handicapIndex}
                          onChange={(e) => updateHole(i, "handicapIndex", parseInt(e.target.value, 10) || 1)}
                          className="w-12 bg-gray-50 border border-gray-200 rounded-lg p-1 text-xs font-mono font-bold text-center focus:ring-1 focus:ring-fairway"
                        />
                      </td>
                      <td className="py-2.5 px-2">
                        <input
                          type="number"
                          value={h.yardageBlack || ""}
                          onChange={(e) => updateHole(i, "yardageBlack", parseInt(e.target.value, 10) || null)}
                          className="w-16 bg-gray-50 border border-gray-200 rounded-lg p-1 text-xs font-mono text-center focus:ring-1 focus:ring-fairway"
                          placeholder="420"
                        />
                      </td>
                      <td className="py-2.5 px-2">
                        <input
                          type="number"
                          value={h.yardageBlue || ""}
                          onChange={(e) => updateHole(i, "yardageBlue", parseInt(e.target.value, 10) || null)}
                          className="w-16 bg-gray-50 border border-gray-200 rounded-lg p-1 text-xs font-mono text-center focus:ring-1 focus:ring-fairway"
                          placeholder="400"
                        />
                      </td>
                      <td className="py-2.5 px-2 bg-emerald-50/50">
                        <input
                          type="number"
                          value={h.yardageWhite}
                          onChange={(e) => updateHole(i, "yardageWhite", parseInt(e.target.value, 10) || 380)}
                          className="w-16 bg-white border border-emerald-300 rounded-lg p-1 text-xs font-mono font-bold text-center focus:ring-1 focus:ring-fairway"
                          placeholder="380"
                        />
                      </td>
                      <td className="py-2.5 px-2">
                        <input
                          type="number"
                          value={h.yardageGold || ""}
                          onChange={(e) => updateHole(i, "yardageGold", parseInt(e.target.value, 10) || null)}
                          className="w-16 bg-gray-50 border border-gray-200 rounded-lg p-1 text-xs font-mono text-center focus:ring-1 focus:ring-fairway"
                          placeholder="350"
                        />
                      </td>
                      <td className="py-2.5 px-2">
                        <input
                          type="number"
                          value={h.yardageRed || ""}
                          onChange={(e) => updateHole(i, "yardageRed", parseInt(e.target.value, 10) || null)}
                          className="w-16 bg-gray-50 border border-gray-200 rounded-lg p-1 text-xs font-mono text-center focus:ring-1 focus:ring-fairway"
                          placeholder="320"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-left">
                        <input
                          type="text"
                          value={h.notes || ""}
                          onChange={(e) => updateHole(i, "notes", e.target.value)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-800 focus:ring-1 focus:ring-fairway"
                          placeholder="Layout tip / hazard notes..."
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="submit"
              className="px-8 py-3.5 bg-fairway text-white font-extrabold text-sm rounded-2xl hover:bg-fairway/90 transition-all shadow-lg"
            >
              {saved ? "Saved ✓" : "Save All Course Changes"}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}

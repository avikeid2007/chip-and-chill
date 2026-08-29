import { useState, useEffect, useRef } from "react";
import NavBar from "../components/NavBar";
import { useAuth } from "../api/AuthContext";
import { usersApi } from "../api/users";
import type { UserProfile } from "../api/users";

export default function Profile() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"personal" | "game" | "bag" | "safety" | "security">("personal");

  // Form states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [homeClubName, setHomeClubName] = useState("");

  // Game Specs
  const [handedness, setHandedness] = useState("Right-Handed");
  const [preferredTee, setPreferredTee] = useState("White");
  const [averageScore, setAverageScore] = useState("80-89");
  const [playFrequency, setPlayFrequency] = useState("Weekly");

  // In the Bag
  const [driver, setDriver] = useState("");
  const [irons, setIrons] = useState("");
  const [putter, setPutter] = useState("");
  const [golfBall, setGolfBall] = useState("");

  // Safety & Alerts
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [smsAlertsEnabled, setSmsAlertsEnabled] = useState(true);
  const [marketingEnabled, setMarketingEnabled] = useState(false);

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saved, setSaved] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.token) return;
    setLoading(true);
    usersApi
      .me(user.token)
      .then((data) => {
        setProfile(data);
        setFirstName(data.firstName || "");
        setLastName(data.lastName || "");
        setPhoneNumber(data.phoneNumber || "");
        setAvatarUrl(data.avatarUrl || null);
        setBio(data.bio || "");
        setCity(data.city || "");
        setCountry(data.country || "");
        setHomeClubName(data.homeClubName || "");
        setHandedness(data.handedness || "Right-Handed");
        setPreferredTee(data.preferredTee || "White");
        setAverageScore(data.averageScore || "80-89");
        setPlayFrequency(data.playFrequency || "Weekly");
        setDriver(data.driver || "");
        setIrons(data.irons || "");
        setPutter(data.putter || "");
        setGolfBall(data.golfBall || "");
        setEmergencyContactName(data.emergencyContactName || "");
        setEmergencyContactPhone(data.emergencyContactPhone || "");
        setSmsAlertsEnabled(data.smsAlertsEnabled ?? true);
        setMarketingEnabled(data.marketingEnabled ?? false);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load profile."))
      .finally(() => setLoading(false));
  }, [user?.token]);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user?.token) return;

    setUploadingAvatar(true);
    setError(null);
    try {
      const res = await usersApi.uploadAvatar(file, user.token);
      setAvatarUrl(res.url);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload avatar image.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.token) return;
    setSaving(true);
    setError(null);

    try {
      const updated = await usersApi.updateMe(
        {
          firstName,
          lastName,
          phoneNumber,
          avatarUrl,
          bio,
          city,
          country,
          homeClubName,
          handedness,
          preferredTee,
          averageScore,
          playFrequency,
          driver,
          irons,
          putter,
          golfBall,
          emergencyContactName,
          emergencyContactPhone,
          smsAlertsEnabled,
          marketingEnabled,
        },
        user.token
      );
      setProfile(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.token) return;
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }

    setSaving(true);
    try {
      await usersApi.changePassword({ currentPassword, newPassword }, user.token);
      setPasswordSaved(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSaved(false), 3000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Failed to change password.");
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F7F9F6]">
        <div className="bg-gradient-to-br from-fairway to-turf text-white">
          <NavBar />
        </div>
        <div className="max-w-md mx-auto px-6 py-20 text-center">
          <div className="text-4xl mb-3">🔒</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Sign in to view your Passport</h2>
          <p className="text-xs text-gray-500 mb-6">
            You need an active golfer account to manage your profile and equipment.
          </p>
          <a
            href="/login"
            className="px-6 py-3 bg-fairway text-white text-xs font-bold rounded-xl shadow hover:bg-fairway/90 transition-colors"
          >
            Log In Now →
          </a>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F9F6]">
        <div className="bg-gradient-to-br from-fairway to-turf text-white">
          <NavBar />
        </div>
        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 w-full">
          <div className="bg-white rounded-3xl border border-sand-dark p-8 h-48 animate-pulse mb-8" />
          <div className="bg-white rounded-3xl border border-sand-dark p-8 h-96 animate-pulse" />
        </main>
      </div>
    );
  }

  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : "Recently";

  return (
    <div className="min-h-screen bg-[#F7F9F6] text-gray-900 font-sans flex flex-col pb-28 md:pb-12">
      <div className="bg-gradient-to-br from-fairway to-turf text-white">
        <NavBar />
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 w-full flex-1">
        {/* Golfer Passport Header Card */}
        <div className="bg-white rounded-3xl border border-sand-dark shadow-sm p-6 sm:p-8 mb-8 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
            {/* Avatar with upload overlay */}
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div className="w-24 h-24 rounded-3xl overflow-hidden border-4 border-emerald-50 bg-fairway flex items-center justify-center text-white text-3xl font-black shadow-md">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{(firstName || user.firstName || "?").charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="absolute inset-0 bg-black/40 rounded-3xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-xs font-bold">📷 Change</span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              {uploadingAvatar && (
                <div className="absolute inset-0 bg-black/60 rounded-3xl flex items-center justify-center text-white text-[10px] font-bold">
                  Uploading...
                </div>
              )}
            </div>

            {/* Identity Details */}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                <h1 className="text-2xl sm:text-3xl font-black text-fairway tracking-tight">
                  {firstName || lastName ? `${firstName} ${lastName}`.trim() : user.email}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-turf/10 text-turf text-[11px] font-extrabold uppercase tracking-wider">
                  {user.role}
                </span>
                {profile?.handicapIndex !== undefined && profile?.handicapIndex !== null && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-extrabold font-mono">
                    WHS HCP: {profile.handicapIndex > 0 ? `+${profile.handicapIndex.toFixed(1)}` : profile.handicapIndex.toFixed(1)}
                  </span>
                )}
              </div>

              <p className="text-xs text-gray-500 mb-2">
                {profile?.bio || "Passionate golfer tracking game improvements and tee times."}
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-gray-600 font-medium">
                {city && <span>📍 {city}{country ? `, ${country}` : ""}</span>}
                {homeClubName && <span>⛳ {homeClubName}</span>}
                <span>📅 Member since {memberSince}</span>
              </div>
            </div>
          </div>

          {/* Career Snapshot Stats Ribbon */}
          {profile?.careerStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-gray-100">
              <div className="bg-[#F8FAF7] p-3.5 rounded-2xl border border-gray-200/70 text-center">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Rounds Played</span>
                <span className="text-2xl font-black text-fairway font-mono">{profile.careerStats.totalRounds}</span>
              </div>
              <div className="bg-[#F8FAF7] p-3.5 rounded-2xl border border-gray-200/70 text-center">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Best Score</span>
                <span className="text-2xl font-black text-turf font-mono">
                  {profile.careerStats.bestRoundScore !== null && profile.careerStats.bestRoundScore !== undefined ? profile.careerStats.bestRoundScore : "—"}
                </span>
              </div>
              <div className="bg-[#F8FAF7] p-3.5 rounded-2xl border border-gray-200/70 text-center">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Tournaments</span>
                <span className="text-2xl font-black text-fairway font-mono">{profile.careerStats.tournamentsPlayed}</span>
              </div>
              <div className="bg-[#F8FAF7] p-3.5 rounded-2xl border border-gray-200/70 text-center">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Range Sessions</span>
                <span className="text-2xl font-black text-fairway font-mono">{profile.careerStats.rangeSessionsBooked}</span>
              </div>
            </div>
          )}
        </div>

        {/* Global Success / Error Alerts */}
        {saved && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold mb-6 flex items-center justify-between animate-fadeIn">
            <span>✓ Profile passport successfully updated!</span>
            <button onClick={() => setSaved(false)}>✕</button>
          </div>
        )}
        {error && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold mb-6 flex items-center justify-between animate-fadeIn">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
          {[
            { key: "personal", label: "👤 Personal & Identity" },
            { key: "game", label: "🎯 Game & Preferences" },
            { key: "bag", label: "🏌️ In The Bag (Equipment)" },
            { key: "safety", label: "🚨 Safety & Alerts" },
            { key: "security", label: "🔒 Security & Password" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? "bg-fairway text-white shadow-md"
                  : "bg-white border border-sand-dark text-gray-700 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Personal & Identity */}
        {activeTab === "personal" && (
          <form onSubmit={handleSaveProfile} className="bg-white rounded-3xl border border-sand-dark p-6 sm:p-8 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-fairway pb-3 border-b border-gray-100">
              Personal Information & Location
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">First Name</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-fairway"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Last Name</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-fairway"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Email Address</label>
                <input
                  type="email"
                  disabled
                  value={user.email}
                  className="w-full bg-gray-100 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-fairway"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Golfer Bio / Tagline</label>
              <textarea
                rows={2}
                placeholder="e.g. Chasing single-digit handicap. Weekend golfer at Pine Valley."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-fairway"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">City</label>
                <input
                  type="text"
                  placeholder="e.g. San Francisco"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-fairway"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Country</label>
                <input
                  type="text"
                  placeholder="e.g. United States"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-fairway"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Home Golf Club</label>
                <input
                  type="text"
                  placeholder="e.g. Pine Hollow Links"
                  value={homeClubName}
                  onChange={(e) => setHomeClubName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-fairway"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-fairway text-white rounded-2xl text-xs font-bold shadow hover:bg-fairway/90 transition-colors disabled:opacity-50"
              >
                {saving ? "Saving Changes..." : "Save Personal Info"}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Game & Preferences */}
        {activeTab === "game" && (
          <form onSubmit={handleSaveProfile} className="bg-white rounded-3xl border border-sand-dark p-6 sm:p-8 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-fairway pb-3 border-b border-gray-100">
              Golf Game Profile & Preferences
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Handedness</label>
                <select
                  value={handedness}
                  onChange={(e) => setHandedness(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-fairway cursor-pointer"
                >
                  <option value="Right-Handed">🖐️ Right-Handed</option>
                  <option value="Left-Handed">🖐️ Left-Handed</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Preferred Tee Box</label>
                <select
                  value={preferredTee}
                  onChange={(e) => setPreferredTee(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-fairway cursor-pointer"
                >
                  <option value="Black">⚫ Black (Championship / Back Tees)</option>
                  <option value="Blue">🔵 Blue (Tournament Tees)</option>
                  <option value="White">⚪ White (Standard Member Tees)</option>
                  <option value="Gold">🟡 Gold (Senior Tees)</option>
                  <option value="Red">🔴 Red (Forward Tees)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Typical Average 18-Hole Score</label>
                <select
                  value={averageScore}
                  onChange={(e) => setAverageScore(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-fairway cursor-pointer"
                >
                  <option value="Under 75">🏆 Scratch / Elite (&lt; 75)</option>
                  <option value="75-82">⛳ Single Digit (75 - 82)</option>
                  <option value="83-90">🏌️ Mid Handicapper (83 - 90)</option>
                  <option value="91-100">🎯 Breaking 100 (91 - 100)</option>
                  <option value="100+">🌱 Recreational / Beginner (100+)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Play Frequency</label>
                <select
                  value={playFrequency}
                  onChange={(e) => setPlayFrequency(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-fairway cursor-pointer"
                >
                  <option value="Multiple Times a Week">🔥 Multiple Times a Week</option>
                  <option value="Weekly">⛳ Once a Week</option>
                  <option value="Bi-weekly">📅 Every 2 Weeks</option>
                  <option value="Monthly">☕ Once a Month</option>
                  <option value="Casual">🏖️ Occasional / Holidays</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-fairway text-white rounded-2xl text-xs font-bold shadow hover:bg-fairway/90 transition-colors disabled:opacity-50"
              >
                {saving ? "Saving Changes..." : "Save Game Preferences"}
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: In The Bag */}
        {activeTab === "bag" && (
          <form onSubmit={handleSaveProfile} className="bg-white rounded-3xl border border-sand-dark p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-bold text-fairway">In The Bag Equipment Specifications</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Share what clubs and ball you play. Visible on your scorecards and tournament profiles.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">🏌️ Driver</label>
                <input
                  type="text"
                  placeholder="e.g. TaylorMade Qi10 9.0° (Ventus Blue 6S)"
                  value={driver}
                  onChange={(e) => setDriver(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-fairway"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">⛳ Irons Set</label>
                <input
                  type="text"
                  placeholder="e.g. Titleist T100 (4-PW, Dynamic Gold S300)"
                  value={irons}
                  onChange={(e) => setIrons(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-fairway"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">🪄 Putter</label>
                <input
                  type="text"
                  placeholder="e.g. Scotty Cameron Newport 2 / 34 inch"
                  value={putter}
                  onChange={(e) => setPutter(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-fairway"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">⚪ Preferred Golf Ball</label>
                <input
                  type="text"
                  placeholder="e.g. Titleist Pro V1x / TaylorMade TP5"
                  value={golfBall}
                  onChange={(e) => setGolfBall(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-fairway"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-fairway text-white rounded-2xl text-xs font-bold shadow hover:bg-fairway/90 transition-colors disabled:opacity-50"
              >
                {saving ? "Saving Changes..." : "Save Equipment"}
              </button>
            </div>
          </form>
        )}

        {/* Tab 4: Safety & Alerts */}
        {activeTab === "safety" && (
          <form onSubmit={handleSaveProfile} className="bg-white rounded-3xl border border-sand-dark p-6 sm:p-8 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-fairway pb-3 border-b border-gray-100">
              Emergency Contact & Notifications
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">🚨 Emergency Contact Name</label>
                <input
                  type="text"
                  placeholder="e.g. Jane Doe (Spouse / Partner)"
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-fairway"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">📞 Emergency Contact Phone</label>
                <input
                  type="tel"
                  placeholder="+1 (555) 999-8888"
                  value={emergencyContactPhone}
                  onChange={(e) => setEmergencyContactPhone(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-fairway"
                />
              </div>
            </div>

            <div className="pt-2 space-y-3">
              <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="checkbox"
                  checked={smsAlertsEnabled}
                  onChange={(e) => setSmsAlertsEnabled(e.target.checked)}
                  className="mt-0.5 rounded text-turf focus:ring-turf"
                />
                <div>
                  <p className="text-xs font-bold text-gray-900">📲 Tee Time SMS Alerts & Weather Updates</p>
                  <p className="text-[11px] text-gray-500">Receive 2-hour departure reminders and lightning warnings via text message.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="checkbox"
                  checked={marketingEnabled}
                  onChange={(e) => setMarketingEnabled(e.target.checked)}
                  className="mt-0.5 rounded text-turf focus:ring-turf"
                />
                <div>
                  <p className="text-xs font-bold text-gray-900">🏆 Club Tournaments & Special Invitations</p>
                  <p className="text-[11px] text-gray-500">Stay informed on upcoming scrambles, shootouts, and demo days.</p>
                </div>
              </label>
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-fairway text-white rounded-2xl text-xs font-bold shadow hover:bg-fairway/90 transition-colors disabled:opacity-50"
              >
                {saving ? "Saving Changes..." : "Save Preferences"}
              </button>
            </div>
          </form>
        )}

        {/* Tab 5: Security & Password */}
        {activeTab === "security" && (
          <form onSubmit={handlePasswordChange} className="bg-white rounded-3xl border border-sand-dark p-6 sm:p-8 shadow-sm space-y-6 max-w-xl">
            <h3 className="text-base font-bold text-fairway pb-3 border-b border-gray-100">
              Account Security & Password
            </h3>

            {passwordSaved && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold animate-fadeIn">
                ✓ Password changed successfully!
              </div>
            )}
            {passwordError && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold animate-fadeIn">
                ⚠️ {passwordError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-fairway"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-fairway"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-fairway"
              />
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-fairway text-white rounded-2xl text-xs font-bold shadow hover:bg-fairway/90 transition-colors disabled:opacity-50"
              >
                {saving ? "Updating Password..." : "Change Password"}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}

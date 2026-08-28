import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import NoCourse from "../components/NoCourse";
import { useAuth } from "../api/AuthContext";
import { courseApi } from "../api/course";
import { SUPPORTED_CURRENCIES, DEFAULT_CURRENCY, DEFAULT_CURRENCY_SYMBOL } from "../utils/currency";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const PRESET_COLORS = ["#1F4B3F", "#2E6F5E", "#C9A227", "#C0533F", "#2B5C86", "#5B4B8A"];

function parseErrorMessage(raw: string, fallback: string): string {
  try {
    const parsed = JSON.parse(raw);
    return parsed?.message || fallback;
  } catch {
    return raw || fallback;
  }
}

export default function BrandingSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState("#1F4B3F");
  const [subdomain, setSubdomain] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [currencySymbol, setCurrencySymbol] = useState(DEFAULT_CURRENCY_SYMBOL);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.tenantId) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const tenant = await courseApi.getTenant(user.tenantId!);
        setLogoUrl(tenant.logoUrl ?? null);
        setPrimaryColor(tenant.primaryColor ?? "#1F4B3F");
        setSubdomain(tenant.subdomain ?? "");
        setCustomDomain(tenant.customDomain ?? "");
        setCurrency(tenant.currency ?? DEFAULT_CURRENCY);
        setCurrencySymbol(tenant.currencySymbol ?? DEFAULT_CURRENCY_SYMBOL);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load branding.");
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  async function handleLogoUpload(file: File) {
    if (!user) return;
    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API_BASE}/api/onboarding/logo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${user.token}` },
        body: form,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(parseErrorMessage(text, `Upload failed (${res.status})`));
      }
      const data = await res.json();
      setLogoUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Logo upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.tenantId) return;
    setError(null);
    setSaving(true);
    try {
      await courseApi.updateTenant(
        user.tenantId,
        {
          logoUrl: logoUrl ?? "",
          primaryColor,
          subdomain: subdomain.trim(),
          customDomain: customDomain.trim() || undefined,
          currency,
          currencySymbol,
        },
        user.token
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save branding.");
    } finally {
      setSaving(false);
    }
  }

  if (!user?.tenantId) {
    return (
      <AdminLayout>
        <NoCourse />
      </AdminLayout>
    );
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="text-sm text-ink-soft">Loading…</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="text-mono text-xs tracking-widest uppercase text-turf mb-3">Settings</div>
      <h1 className="text-2xl font-semibold tracking-tight text-fairway mb-2">Branding &amp; Domain</h1>
      <p className="text-sm text-ink-soft mb-8">
        Customize how your course looks across the platform and configure custom domains.
      </p>

      {error && (
        <div className="bg-[#FBEAE6] border border-[#E9C4BA] text-[#8C3A28] text-sm rounded-md px-4 py-3 mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 max-w-xl">
        {/* Logo */}
        <div className="bg-white border border-[#E4E8E3] rounded-md p-5">
          <label className="block text-xs font-medium text-ink-soft mb-3">Logo</label>
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

        {/* Color theme */}
        <div className="bg-white border border-[#E4E8E3] rounded-md p-5">
          <label className="block text-xs font-medium text-ink-soft mb-3">Brand color</label>
          <div className="flex items-center gap-3 flex-wrap">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setPrimaryColor(c)}
                className={`w-9 h-9 rounded-full border-2 transition-transform ${
                  primaryColor.toLowerCase() === c.toLowerCase()
                    ? "border-fairway scale-110"
                    : "border-transparent hover:scale-105"
                }`}
                style={{ backgroundColor: c }}
                aria-label={`Use ${c}`}
              />
            ))}
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-9 h-9 rounded-full border border-[#E4E8E3] cursor-pointer p-0 bg-transparent"
              aria-label="Custom color"
            />
            <span className="text-xs font-mono text-ink-soft ml-1">{primaryColor}</span>
          </div>
        </div>

        {/* Subdomain */}
        <div className="bg-white border border-[#E4E8E3] rounded-md p-5">
          <label className="block text-xs font-medium text-ink-soft mb-1.5">Platform Subdomain</label>
          <div className="flex items-center">
            <input
              value={subdomain}
              onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="yourcourse"
              className="border border-[#E4E8E3] rounded-l-md px-4 py-2.5 text-sm outline-none focus:border-turf transition-colors flex-1 font-mono"
            />
            <span className="border border-l-0 border-[#E4E8E3] rounded-r-md px-4 py-2.5 text-sm text-ink-soft bg-mist">
              .chipandchill.com
            </span>
          </div>
          <p className="text-xs text-ink-soft mt-2">
            Your golfers can access your dedicated tee sheet at {subdomain || "yourcourse"}.chipandchill.com
          </p>
        </div>

        {/* Custom Domain */}
        <div className="bg-white border border-[#E4E8E3] rounded-md p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-ink-soft mb-1.5">Custom Domain (White-Label)</label>
            <input
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value.toLowerCase().trim())}
              placeholder="e.g. play.pinehillgolf.com or tee.yourclub.com"
              className="w-full border border-[#E4E8E3] rounded-md px-4 py-2.5 text-sm outline-none focus:border-turf transition-colors font-mono"
            />
          </div>
          <div className="bg-mist p-3.5 rounded border border-sand text-xs space-y-1.5">
            <p className="font-semibold text-fairway">DNS Setup Instructions:</p>
            <p className="text-ink-soft">
              Point a <strong>CNAME</strong> record for your custom domain to <code className="bg-white px-1.5 py-0.5 rounded border font-mono text-fairway">cname.chipandchill.com</code>.
            </p>
          </div>
        </div>

        {/* Course Currency */}
        <div className="bg-white border border-[#E4E8E3] rounded-md p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-xs font-medium text-ink-soft mb-1">Course Currency</label>
              <p className="text-xs text-fairway/70">
                Determines how green fees, pricing rules, and online checkout receipts are displayed.
              </p>
            </div>
            <div className="px-3 py-1 bg-sand/60 border border-sand-dark rounded text-xs font-mono font-semibold text-fairway">
              Active Symbol: {currencySymbol}
            </div>
          </div>
          <select
            value={currency}
            onChange={(e) => {
              const opt = SUPPORTED_CURRENCIES.find((c) => c.code === e.target.value);
              setCurrency(e.target.value);
              setCurrencySymbol(opt?.symbol || "₹");
            }}
            className="border border-[#E4E8E3] rounded-md px-3.5 py-2.5 text-sm bg-white w-full font-medium text-fairway outline-none focus:border-turf"
          >
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-gold text-fairway px-6 py-2.5 rounded-[3px] font-semibold text-sm disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          {saved && <span className="text-sm text-turf">Saved ✓</span>}
        </div>
      </form>
    </AdminLayout>
  );
}

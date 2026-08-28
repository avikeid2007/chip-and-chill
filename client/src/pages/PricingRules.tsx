import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { useAuth } from "../api/AuthContext";
import { pricingApi } from "../api/pricing";
import { courseApi } from "../api/course";
import { toDateInput, toSlotIsoString } from "../utils/time";
import type { CreatePricingRuleDto, PricePreviewResult } from "../api/pricing";
import type { PricingRule, PricingDays } from "../types";

const DAY_OPTIONS: { label: string; value: PricingDays }[] = [
  { label: "All Days (Everyday)", value: "All" },
  { label: "Weekdays (Mon – Fri)", value: "Weekday" },
  { label: "Weekends (Sat & Sun)", value: "Weekend" },
  { label: "Monday only", value: "Monday" },
  { label: "Tuesday only", value: "Tuesday" },
  { label: "Wednesday only", value: "Wednesday" },
  { label: "Thursday only", value: "Thursday" },
  { label: "Friday only", value: "Friday" },
  { label: "Saturday only", value: "Saturday" },
  { label: "Sunday only", value: "Sunday" },
];

export default function PricingRules() {
  const { user } = useAuth();
  const token = user?.token || null;
  const tenantId = user?.tenantId;

  const [rules, setRules] = useState<PricingRule[]>([]);
  const [currencySymbol, setCurrencySymbol] = useState("₹");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null);
  const [formName, setFormName] = useState("");
  const [formDays, setFormDays] = useState<PricingDays>("All");
  const [formStartTime, setFormStartTime] = useState("");
  const [formEndTime, setFormEndTime] = useState("");
  const [formPrice, setFormPrice] = useState("50");
  const [formPriority, setFormPriority] = useState("1");
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Price Simulator State
  const [simDate, setSimDate] = useState(() => toDateInput(new Date()));
  const [simTime, setSimTime] = useState("09:00");
  const [simBasePrice, setSimBasePrice] = useState("50");
  const [simResult, setSimResult] = useState<PricePreviewResult | null>(null);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    courseApi.getTenant(tenantId).then((t) => {
      if (t.currencySymbol) setCurrencySymbol(t.currencySymbol);
    }).catch(() => {});
    loadRules();
  }, [tenantId]);

  async function loadRules() {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await pricingApi.getRules(tenantId, token);
      setRules(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load pricing rules.");
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingRule(null);
    setFormName("");
    setFormDays("Weekend");
    setFormStartTime("07:00");
    setFormEndTime("12:00");
    setFormPrice("65");
    setFormPriority("2");
    setFormActive(true);
    setModalOpen(true);
  }

  function openEditModal(rule: PricingRule) {
    setEditingRule(rule);
    setFormName(rule.name);
    setFormDays(rule.days);
    setFormStartTime(rule.startTime || "");
    setFormEndTime(rule.endTime || "");
    setFormPrice(rule.price.toString());
    setFormPriority(rule.priority.toString());
    setFormActive(rule.isActive);
    setModalOpen(true);
  }

  async function handleSaveRule(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId) return;
    setSaving(true);

    try {
      const payload: CreatePricingRuleDto = {
        name: formName,
        days: formDays,
        startTime: formStartTime || null,
        endTime: formEndTime || null,
        price: parseFloat(formPrice) || 50,
        priority: parseInt(formPriority) || 1,
        isActive: formActive,
      };

      if (editingRule) {
        await pricingApi.updateRule(tenantId, editingRule.id, payload, token);
      } else {
        await pricingApi.createRule(tenantId, payload, token);
      }

      setModalOpen(false);
      await loadRules();
    } catch (err: any) {
      alert(err?.message || "Failed to save rule.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteRule(id: string) {
    if (!tenantId) return;
    if (!confirm("Are you sure you want to delete this pricing rule?")) return;

    try {
      await pricingApi.deleteRule(tenantId, id, token);
      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      alert(err?.message || "Failed to delete rule.");
    }
  }

  async function handleToggleActive(rule: PricingRule) {
    if (!tenantId) return;
    try {
      await pricingApi.updateRule(tenantId, rule.id, { isActive: !rule.isActive }, token);
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, isActive: !r.isActive } : r))
      );
    } catch (err: any) {
      alert(err?.message || "Failed to update status.");
    }
  }

  async function runSimulation() {
    if (!tenantId) return;
    setSimulating(true);
    try {
      const slotTimeIso = toSlotIsoString(simDate, simTime);
      const base = parseFloat(simBasePrice) || 50;
      const res = await pricingApi.previewPrice(tenantId, slotTimeIso, base);
      setSimResult(res);
    } catch (err: any) {
      alert(err?.message || "Failed to preview price.");
    } finally {
      setSimulating(false);
    }
  }

  if (!tenantId) {
    return (
      <AdminLayout>
        <div className="bg-white rounded-2xl p-10 text-center border border-sand-dark">
          <p className="text-fairway text-lg font-medium">No course linked to your account.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display font-bold text-3xl text-fairway">Pricing Rules Engine</h1>
            <p className="text-fairway/70 text-sm mt-1">
              Configure dynamic rates for weekends, peak morning hours, twilight discounts, and special seasons.
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="px-5 py-2.5 rounded-xl bg-fairway text-white font-medium hover:bg-fairway-dark transition-colors flex items-center gap-2 shadow-sm text-sm"
          >
            <span>+</span> Add Pricing Rule
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Simulator Card */}
        <div className="bg-white rounded-2xl p-6 border border-sand-dark shadow-sm">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="text-2xl">⚡</span>
            <div>
              <h2 className="font-display font-semibold text-lg text-fairway">
                Live Price Simulator
              </h2>
              <p className="text-xs text-fairway/60">
                Test which pricing rule will take effect for any upcoming date and tee time.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-fairway/70 mb-1">Date</label>
              <input
                type="date"
                value={simDate}
                onChange={(e) => setSimDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-sand-dark text-fairway text-sm focus:outline-none focus:ring-2 focus:ring-fairway"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-fairway/70 mb-1">Time</label>
              <input
                type="time"
                value={simTime}
                onChange={(e) => setSimTime(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-sand-dark text-fairway text-sm focus:outline-none focus:ring-2 focus:ring-fairway font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-fairway/70 mb-1">
                Base Fallback Price ({currencySymbol})
              </label>
              <input
                type="number"
                value={simBasePrice}
                onChange={(e) => setSimBasePrice(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-sand-dark text-fairway text-sm focus:outline-none focus:ring-2 focus:ring-fairway font-mono"
              />
            </div>
            <button
              onClick={runSimulation}
              disabled={simulating}
              className="py-2.5 px-4 rounded-lg bg-gold text-fairway font-semibold hover:bg-gold-light transition-colors text-sm flex items-center justify-center gap-1.5"
            >
              {simulating ? "Calculating..." : "Test Dynamic Price"}
            </button>
          </div>

          {simResult && (
            <div className="mt-5 p-4 rounded-xl bg-mist border border-sand flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-fairway/60">
                    Calculated Rate:
                  </span>
                  <span className="text-2xl font-display font-bold text-fairway">
                    {currencySymbol}{simResult.calculatedPrice.toFixed(2)}
                  </span>
                  <span className="text-xs text-fairway/50">per golfer</span>
                </div>
                <p className="text-xs text-fairway/70">
                  {simResult.matchedRuleName ? (
                    <>
                      Matched Rule: <span className="font-semibold text-fairway">{simResult.matchedRuleName}</span>
                    </>
                  ) : (
                    "No rule triggered (applied base rate)"
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-1 rounded-full bg-sand font-medium text-fairway">
                  Day: {new Date(`${simDate}T12:00:00`).toLocaleDateString("en-US", { weekday: "long" })}
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-fairway/10 text-fairway font-mono">
                  {simTime}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Rules Table / Cards */}
        <div className="bg-white rounded-2xl border border-sand-dark shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-sand flex items-center justify-between">
            <h2 className="font-display font-semibold text-lg text-fairway">Active Rules Hierarchy</h2>
            <span className="text-xs text-fairway/60">
              Rules with higher priority evaluate first.
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-fairway/50 text-sm">Loading pricing rules...</div>
          ) : rules.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="text-4xl">🏷️</div>
              <p className="text-fairway font-medium">No custom pricing rules configured yet.</p>
              <p className="text-xs text-fairway/60 max-w-md mx-auto">
                By default, all tee slots will use their base price. Add rules above to create weekend surges or twilight discounts.
              </p>
              <button
                onClick={openCreateModal}
                className="mt-2 px-4 py-2 rounded-lg bg-fairway text-white text-xs font-medium hover:bg-fairway-dark"
              >
                Create your first rule
              </button>
            </div>
          ) : (
            <div className="divide-y divide-sand">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className={`p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                    !rule.isActive ? "bg-sand/20 opacity-60" : "hover:bg-mist/50"
                  }`}
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="font-display font-bold text-fairway text-base">{rule.name}</h3>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-fairway/10 text-fairway font-medium">
                        {rule.days}
                      </span>
                      {rule.startTime || rule.endTime ? (
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-sand text-fairway font-mono">
                          {rule.startTime || "00:00"} – {rule.endTime || "23:59"}
                        </span>
                      ) : (
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-sand text-fairway/70">
                          All Day
                        </span>
                      )}
                      <span className="text-xs px-2 py-0.5 rounded bg-sand/60 text-fairway/60">
                        Priority: {rule.priority}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-fairway/60">
                      <span>Rate: <strong className="text-fairway text-sm font-semibold">{currencySymbol}{rule.price.toFixed(2)}</strong></span>
                      <span>•</span>
                      <span>Created {new Date(rule.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <button
                      onClick={() => handleToggleActive(rule)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                        rule.isActive
                          ? "bg-green-100 text-green-800 hover:bg-green-200"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      {rule.isActive ? "Active" : "Disabled"}
                    </button>
                    <button
                      onClick={() => openEditModal(rule)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-sand-dark text-fairway hover:bg-sand transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-sand-dark animate-in fade-in zoom-in duration-150">
            <h3 className="font-display font-bold text-xl text-fairway mb-4">
              {editingRule ? "Edit Pricing Rule" : "Create Pricing Rule"}
            </h3>

            <form onSubmit={handleSaveRule} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-fairway/70 uppercase mb-1">
                  Rule Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Weekend Morning Prime, Twilight Discount"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-sand-dark text-fairway text-sm focus:outline-none focus:ring-2 focus:ring-fairway"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-fairway/70 uppercase mb-1">
                  Applicable Days
                </label>
                <select
                  value={formDays}
                  onChange={(e) => setFormDays(e.target.value as PricingDays)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-sand-dark text-fairway text-sm focus:outline-none focus:ring-2 focus:ring-fairway bg-white"
                >
                  {DAY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-fairway/70 uppercase mb-1">
                    Start Time (optional)
                  </label>
                  <input
                    type="time"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-sand-dark text-fairway text-sm font-mono focus:outline-none focus:ring-2 focus:ring-fairway"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-fairway/70 uppercase mb-1">
                    End Time (optional)
                  </label>
                  <input
                    type="time"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-sand-dark text-fairway text-sm font-mono focus:outline-none focus:ring-2 focus:ring-fairway"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-fairway/70 uppercase mb-1">
                    Price per Golfer ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-sand-dark text-fairway text-sm font-mono focus:outline-none focus:ring-2 focus:ring-fairway"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-fairway/70 uppercase mb-1">
                    Priority (Higher = Overrides)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-sand-dark text-fairway text-sm font-mono focus:outline-none focus:ring-2 focus:ring-fairway"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="formActive"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="rounded border-sand-dark text-fairway focus:ring-fairway"
                />
                <label htmlFor="formActive" className="text-sm font-medium text-fairway">
                  Enable this rule immediately
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-sand">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-lg border border-sand-dark text-fairway text-sm hover:bg-sand transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-lg bg-fairway text-white text-sm font-medium hover:bg-fairway-dark transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingRule ? "Update Rule" : "Create Rule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

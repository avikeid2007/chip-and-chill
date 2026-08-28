import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import NavBar from "../components/NavBar";
import { tournamentApi } from "../api/tournament";
import { courseApi } from "../api/course";
import { useAuth } from "../api/AuthContext";
import { formatTime } from "../utils/time";
import type { TournamentSummary, TournamentFormat } from "../types";

const FORMAT_LABELS: Record<TournamentFormat, string> = {
  StrokePlay: "Stroke Play",
  Stableford: "Stableford (Points)",
  Scramble: "Team Scramble",
  MatchPlay: "Match Play",
};

export default function Tournaments() {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([]);
  const [currencySymbol, setCurrencySymbol] = useState("₹");
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState("OpenGolf Club");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Registration Modal State
  const [regModalOpen, setRegModalOpen] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<TournamentSummary | null>(null);
  const [regName, setRegName] = useState(user ? `${user.firstName} ${user.lastName}` : "");
  const [regEmail, setRegEmail] = useState(user ? user.email : "");
  const [regHandicap, setRegHandicap] = useState("12.4");
  const [registering, setRegistering] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user?.tenantId) {
      setTenantId(user.tenantId);
    } else {
      courseApi.list().then((list) => {
        if (list.length > 0) setTenantId(list[0].id);
      }).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    if (!tenantId) return;
    courseApi.getTenant(tenantId).then((t) => {
      setTenantName(t.name);
      if (t.currencySymbol) setCurrencySymbol(t.currencySymbol);
    }).catch(() => {});

    loadTournaments();
  }, [tenantId]);

  async function loadTournaments() {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await tournamentApi.getTournaments(tenantId);
      setTournaments(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load tournaments.");
    } finally {
      setLoading(false);
    }
  }

  function openRegisterModal(t: TournamentSummary) {
    setSelectedTournament(t);
    setSuccessMessage(null);
    setRegModalOpen(true);
  }

  async function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId || !selectedTournament) return;
    setRegistering(true);
    setError(null);

    try {
      const reg = await tournamentApi.register(tenantId, selectedTournament.id, {
        golferName: regName,
        golferEmail: regEmail,
        handicapIndex: parseFloat(regHandicap) || undefined,
      });

      // If paid entry fee, auto-confirm sandbox payment for demo flow
      if (selectedTournament.entryFee > 0) {
        await tournamentApi.confirmSandboxPayment(tenantId, selectedTournament.id, reg.id);
      }

      setSuccessMessage(`✓ Successfully registered for ${selectedTournament.name}!`);
      loadTournaments();
      setTimeout(() => {
        setRegModalOpen(false);
      }, 1500);
    } catch (err: any) {
      alert(err?.message || "Registration failed.");
    } finally {
      setRegistering(false);
    }
  }

  const filtered = tournaments.filter((t) => {
    if (statusFilter === "all") return true;
    return t.status.toLowerCase() === statusFilter.toLowerCase();
  });

  return (
    <div className="min-h-screen bg-[#FAFBF9]">
      <div className="bg-gradient-to-br from-fairway to-turf">
        <NavBar />
        <div className="px-8 md:px-14 pb-14 pt-8 max-w-6xl mx-auto text-white">
          <div className="text-mono text-xs tracking-widest uppercase text-sand mb-2 flex items-center gap-2">
            <span>🏆 Tournaments &amp; Championships</span>
            <span>·</span>
            <span>{tenantName}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-semibold tracking-tight leading-tight mb-3">
            Compete, climb the board,<br />win the cup.
          </h1>
          <p className="text-white/80 max-w-xl text-sm leading-relaxed">
            Register for open club championships, weekly scrambles, and medal play tournaments with real-time live scoring.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 md:px-14 py-10 space-y-8">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-sand pb-4">
          <div className="flex gap-2">
            {[
              { id: "all", label: "All Events" },
              { id: "upcoming", label: "Upcoming" },
              { id: "inprogress", label: "Live Now" },
              { id: "completed", label: "Past Results" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
                  statusFilter === tab.id
                    ? "bg-fairway text-white"
                    : "bg-white text-fairway/70 hover:bg-sand/40 border border-sand"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <span className="text-xs text-fairway/60 font-mono">
            {filtered.length} {filtered.length === 1 ? "event" : "events"} found
          </span>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Tournaments Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card p-6 h-64 animate-pulse bg-white rounded-2xl border border-sand" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-sand-dark p-12 text-center space-y-3">
            <div className="text-4xl">⛳</div>
            <h3 className="font-display font-semibold text-lg text-fairway">No tournaments found</h3>
            <p className="text-xs text-fairway/60 max-w-sm mx-auto">
              Check back soon for new club events or check upcoming weekly scrambles.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((t) => {
              const startDate = new Date(t.startDate);
              const isLive = t.status === "InProgress";
              const isCompleted = t.status === "Completed";
              const isFull = t.registeredCount >= t.maxParticipants;
              const fillPercent = Math.min(100, Math.round((t.registeredCount / t.maxParticipants) * 100));

              return (
                <div
                  key={t.id}
                  className="bg-white rounded-2xl border border-sand-dark p-6 shadow-sm flex flex-col justify-between hover:border-turf transition-all hover:shadow-md group relative overflow-hidden"
                >
                  {isLive && (
                    <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider animate-pulse">
                      ● Live Tournament
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-fairway/10 text-fairway">
                        {FORMAT_LABELS[t.format]}
                      </span>
                      <span className="text-xs font-mono text-fairway/60">
                        {startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-display font-bold text-xl text-fairway group-hover:text-turf transition-colors">
                        {t.name}
                      </h3>
                      {t.description && (
                        <p className="text-xs text-fairway/70 mt-1 line-clamp-2 leading-relaxed">
                          {t.description}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 py-3 border-y border-sand text-xs">
                      <div>
                        <span className="text-fairway/60 uppercase text-[10px] font-semibold block">Entry Fee</span>
                        <span className="font-display font-bold text-base text-fairway">
                          {t.entryFee > 0 ? `${currencySymbol}${t.entryFee.toFixed(0)}` : "Free Entry"}
                        </span>
                      </div>
                      <div>
                        <span className="text-fairway/60 uppercase text-[10px] font-semibold block">Start Time</span>
                        <span className="font-mono font-medium text-fairway">
                          {formatTime(t.startDate)}
                        </span>
                      </div>
                    </div>

                    {/* Capacity Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-mono text-fairway/70">
                        <span>Players</span>
                        <span>{t.registeredCount} / {t.maxParticipants}</span>
                      </div>
                      <div className="w-full bg-sand/40 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isFull ? "bg-red-500" : "bg-turf"
                          }`}
                          style={{ width: `${fillPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-6 flex items-center gap-2 pt-2">
                    <Link
                      to={`/tournaments/${t.id}`}
                      className="flex-1 py-2.5 rounded-xl border border-sand-dark text-fairway font-medium text-xs text-center hover:bg-mist transition-colors"
                    >
                      {isLive || isCompleted ? "View Leaderboard →" : "Event Details →"}
                    </Link>

                    {!isCompleted && !isFull && (
                      <button
                        onClick={() => openRegisterModal(t)}
                        className="py-2.5 px-4 rounded-xl bg-gold text-fairway font-semibold text-xs hover:bg-gold-light transition-colors"
                      >
                        Register
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Registration Modal */}
      {regModalOpen && selectedTournament && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-sand-dark animate-in fade-in zoom-in duration-150 space-y-5">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-turf font-bold">
                Tournament Registration
              </div>
              <h3 className="font-display font-bold text-2xl text-fairway mt-1">
                {selectedTournament.name}
              </h3>
              <p className="text-xs text-fairway/70 mt-1">
                {FORMAT_LABELS[selectedTournament.format]} · {new Date(selectedTournament.startDate).toLocaleDateString()}
              </p>
            </div>

            {successMessage ? (
              <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm font-medium text-center">
                {successMessage}
              </div>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-fairway/70 uppercase mb-1">
                    Golfer Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Rory McIlroy"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-sand-dark text-fairway text-sm focus:outline-none focus:ring-2 focus:ring-fairway"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-fairway/70 uppercase mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="rory@example.com"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-sand-dark text-fairway text-sm focus:outline-none focus:ring-2 focus:ring-fairway"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-fairway/70 uppercase mb-1">
                    Handicap Index (Optional)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={regHandicap}
                    onChange={(e) => setRegHandicap(e.target.value)}
                    placeholder="e.g. 8.5"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-sand-dark text-fairway text-sm font-mono focus:outline-none focus:ring-2 focus:ring-fairway"
                  />
                </div>

                <div className="p-3.5 rounded-xl bg-mist border border-sand flex items-center justify-between text-xs">
                  <span className="font-semibold text-fairway">Total Due:</span>
                  <span className="font-display font-bold text-base text-fairway">
                    {selectedTournament.entryFee > 0
                      ? `${currencySymbol}${selectedTournament.entryFee.toFixed(2)}`
                      : "Free Registration"}
                  </span>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setRegModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-sand-dark text-fairway font-medium text-xs hover:bg-sand/30 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={registering}
                    className="flex-1 py-2.5 rounded-xl bg-fairway text-white font-semibold text-xs hover:bg-fairway-dark transition-colors disabled:opacity-50"
                  >
                    {registering ? "Confirming..." : "Complete & Pay"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

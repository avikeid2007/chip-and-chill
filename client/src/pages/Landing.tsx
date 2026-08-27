import { useEffect, useState } from "react";
import NavBar from "../components/NavBar";
import TeeTicker from "../components/TeeTicker";
import Scorecard from "../components/Scorecard";
import Leaderboard from "../components/Leaderboard";
import { apiFetch } from "../api/client";
import type { TeeSlot, ScorecardHole, LeaderboardEntry } from "../types";

const demoSlots: TeeSlot[] = [
  { id: "1", time: "7:10a", playersBooked: 2, playersMax: 4, price: 45, status: "open" },
  { id: "2", time: "7:40a", playersBooked: 1, playersMax: 4, price: 45, status: "open" },
  { id: "3", time: "8:10a", playersBooked: 3, playersMax: 4, price: 45, status: "low" },
  { id: "4", time: "8:40a", playersBooked: 4, playersMax: 4, price: 45, status: "full" },
  { id: "5", time: "9:10a", playersBooked: 4, playersMax: 4, price: 52, status: "low" },
];

const demoHoles: ScorecardHole[] = [
  { hole: 1, par: 4, score: 4 },
  { hole: 2, par: 3, score: 2 },
  { hole: 3, par: 5, score: 5 },
  { hole: 4, par: 4, score: 5 },
  { hole: 5, par: 4, score: 4 },
  { hole: 6, par: 3, score: 3 },
  { hole: 7, par: 4, score: 3 },
  { hole: 8, par: 5, score: 5 },
  { hole: 9, par: 4, score: 5 },
];

const demoLeaderboard: LeaderboardEntry[] = [
  { rank: 1, player: "Marcus Webb", thru: 14, toPar: -5 },
  { rank: 2, player: "Dana Osei", thru: 15, toPar: -3 },
  { rank: 3, player: "Sam Petrov", thru: 13, toPar: 1 },
  { rank: 4, player: "Chris Amaro", thru: 16, toPar: 2 },
];

export default function Landing() {
  const [heroCourseName, setHeroCourseName] = useState("Pine Hollow");
  const [heroSlots, setHeroSlots] = useState<TeeSlot[] | null>(null);

  // Show a real course's live tee sheet in the hero when one is available;
  // fall back to the illustrative demo data otherwise.
  useEffect(() => {
    (async () => {
      try {
        const tenants = await apiFetch<{ id: string; name: string }[]>("/api/tenants");
        if (tenants.length === 0) return;
        const today = new Date().toISOString().slice(0, 10);
        for (const tenant of tenants) {
          const slots = await apiFetch<
            { id: string; startTime: string; maxPlayers: number; playersBooked: number; price: number; status: string }[]
          >(`/api/tenants/${tenant.id}/tee-slots?date=${today}`);
          if (slots.length > 0) {
            setHeroCourseName(tenant.name);
            setHeroSlots(
              slots.slice(0, 5).map((s) => ({
                id: s.id,
                time: new Date(s.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
                playersBooked: s.playersBooked,
                playersMax: s.maxPlayers,
                price: s.price,
                status: (s.status === "blocked" ? "full" : s.status) as TeeSlot["status"],
              }))
            );
            return;
          }
        }
      } catch {
        /* fall back to demo data below */
      }
    })();
  }, []);

  return (
    <div>
      <div className="relative bg-gradient-to-br from-fairway to-turf text-white overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, white 0.5px, transparent 0.5px), radial-gradient(circle at 70% 60%, white 0.5px, transparent 0.5px)",
            backgroundSize: "3px 3px, 4px 4px",
          }}
        />
        <NavBar />
        <div className="relative z-10 px-8 md:px-14 pb-20 pt-10 grid md:grid-cols-[1.1fr_0.9fr] gap-10 items-center max-w-7xl mx-auto">
          <div>
            <div className="text-mono text-xs tracking-widest uppercase text-sand mb-4 flex items-center gap-2.5 before:content-[''] before:w-6 before:h-px before:bg-sand">
              Open source · self-hosted or hosted
            </div>
            <h1 className="text-4xl md:text-5xl font-semibold leading-tight tracking-tight mb-5">
              The tee sheet,<br />run <em className="italic text-sand font-normal">your</em> way.
            </h1>
            <p className="text-base opacity-80 max-w-md mb-7">
              Booking, scorecards, and course management for golf courses and driving ranges — free, open source, and built for the way courses actually run.
            </p>
            <div className="flex gap-3.5">
              <button className="bg-gold text-fairway px-5 py-2.5 rounded-[3px] font-semibold text-sm">Get Started</button>
              <button className="border border-white/35 text-white px-5 py-2.5 rounded-[3px] font-medium text-sm">View on GitHub</button>
            </div>
          </div>
          <TeeTicker courseName={heroCourseName} slots={heroSlots ?? demoSlots} />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 md:px-14 py-20">
        <div className="text-mono text-xs tracking-widest uppercase text-turf mb-3">Example round</div>
        <h2 className="text-3xl font-semibold tracking-tight text-fairway mb-3">A scorecard that looks like one.</h2>
        <p className="text-ink-soft max-w-xl mb-11">
          Not a form. Not a list. Every round renders as a real 18-hole grid — birdies circled, totals bold, just like the card in your pocket.
        </p>

        <Scorecard courseName="Pine Hollow Golf Club" date="Aug 24, 2026" teeBox="White Tees" holes={demoHoles} />

        <div className="grid md:grid-cols-2 gap-6 mt-11">
          <div>
            <div className="text-mono text-xs tracking-widest uppercase text-turf mb-2">Coming soon</div>
            <h3 className="text-lg font-semibold text-fairway mb-4">Tournament leaderboards</h3>
            <Leaderboard entries={demoLeaderboard} />
          </div>
          <div>
            <div className="text-mono text-xs tracking-widest uppercase text-turf mb-2">Example golfer</div>
            <h3 className="text-lg font-semibold text-fairway mb-4">Handicap trend over a season</h3>
            <div className="bg-white rounded-md border border-[#E4E8E3] p-6">
              <div className="flex items-baseline gap-2.5 mb-5">
                <span className="font-display text-4xl font-semibold text-fairway">14.2</span>
                <span className="text-mono text-turf text-sm">↓ 1.3 this season</span>
              </div>
              <div className="flex items-end gap-1.5 h-16">
                {[70, 85, 60, 55, 40, 35].map((h, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-t-sm ${i < 2 ? "bg-sand/50" : i < 4 ? "bg-turf-light/70" : "bg-turf"}`}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="bg-fairway text-white/60 text-center py-8 text-mono text-xs">
        CHIP &amp; CHILL — CHIPANDCHILL.COM — BUILT FOR COURSES, BY GOLFERS
      </footer>
    </div>
  );
}

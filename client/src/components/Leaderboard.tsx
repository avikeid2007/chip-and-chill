import type { LeaderboardEntry } from "../types";

export default function Leaderboard({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <div className="bg-white rounded-md border border-[#E4E8E3] overflow-hidden">
      {entries.map((e) => (
        <div
          key={e.rank}
          className={`grid grid-cols-[50px_1fr_90px_80px] items-center px-5 py-3.5 border-b border-[#EEF1ED] last:border-b-0 text-sm ${
            e.rank === 1 ? "bg-gradient-to-r from-[#F0F7F2] to-white" : ""
          }`}
        >
          <span className={`text-mono font-bold ${e.rank === 1 ? "text-gold" : "text-turf"}`}>{e.rank}</span>
          <span className="font-medium">{e.player}</span>
          <span className="text-mono text-xs text-ink-soft">Thru {e.thru}</span>
          <span className={`text-mono font-bold text-right ${e.toPar <= 0 ? "text-turf" : "text-[#C0533F]"}`}>
            {e.toPar === 0 ? "E" : e.toPar > 0 ? `+${e.toPar}` : e.toPar}
          </span>
        </div>
      ))}
    </div>
  );
}

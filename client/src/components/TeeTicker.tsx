import type { TeeSlot } from "../types";

const dotColor: Record<TeeSlot["status"], string> = {
  open: "bg-emerald-400",
  low: "bg-gold",
  full: "bg-red-400",
  blocked: "bg-gray-400",
};

interface TeeTickerProps {
  courseName: string;
  slots: TeeSlot[];
  currencySymbol?: string;
  onSelect?: (slot: TeeSlot) => void;
}

export default function TeeTicker({ courseName, slots, currencySymbol = "₹", onSelect }: TeeTickerProps) {
  return (
    <div className="bg-white/6 border border-white/14 rounded-md backdrop-blur-sm overflow-hidden">
      <div className="flex justify-between items-center px-4 py-3.5 border-b border-white/12">
        <span className="text-mono text-xs tracking-wider uppercase opacity-70 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
          {courseName} — Today
        </span>
        <span className="text-mono text-xs tracking-wider uppercase opacity-70">18 holes</span>
      </div>
      {slots.map((slot) => (
        <button
          key={slot.id}
          onClick={() => onSelect?.(slot)}
          className="w-full grid grid-cols-[70px_1fr_60px_36px] items-center px-4 py-3 border-b border-white/7 last:border-b-0 text-sm hover:bg-white/6 transition-colors text-left"
        >
          <span className={`text-mono font-medium ${slot.status === "full" ? "opacity-60" : ""}`}>{slot.time}</span>
          <span className="text-xs opacity-75">
            {slot.status === "full" ? "Full — waitlist available" : `${slot.playersBooked} of ${slot.playersMax} players`}
          </span>
          <span className="text-mono text-right text-sand">{currencySymbol}{slot.price}</span>
          <span className={`w-2 h-2 rounded-full justify-self-end ${dotColor[slot.status]}`} />
        </button>
      ))}
    </div>
  );
}

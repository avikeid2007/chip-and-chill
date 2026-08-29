import { useState, useMemo } from "react";
import type { TournamentDetail, TournamentRegistration } from "../types";
import { formatTime } from "../utils/time";

interface TournamentPrintCollateralModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: TournamentDetail;
  tenantName: string;
}

type CollateralMode = "scorecards" | "cart-signs" | "starter-sheet";
type LayoutDensity = "2-up" | "1-up";

export default function TournamentPrintCollateralModal({
  isOpen,
  onClose,
  tournament,
  tenantName,
}: TournamentPrintCollateralModalProps) {
  const [activeMode, setActiveMode] = useState<CollateralMode>("scorecards");
  const [selectedFlight, setSelectedFlight] = useState<string>("all");
  const [layoutDensity, setLayoutDensity] = useState<LayoutDensity>("2-up");

  // Group registrations into paired groups
  const pairingsMap = useMemo(() => {
    const map = new Map<number, TournamentRegistration[]>();
    const active = tournament.registrations.filter((r) => r.status !== "Withdrawn");

    active.forEach((r) => {
      const gNum = r.pairingGroup || 1;
      const list = map.get(gNum) || [];
      list.push(r);
      map.set(gNum, list);
    });
    return map;
  }, [tournament]);

  const sortedGroupKeys = useMemo(() => {
    return Array.from(pairingsMap.keys()).sort((a, b) => a - b);
  }, [pairingsMap]);

  // Unique flights
  const availableFlights = useMemo(() => {
    const set = new Set<string>();
    tournament.registrations.forEach((r) => {
      if (r.flight && r.flight.trim().length > 0) {
        set.add(r.flight.trim());
      }
    });
    return Array.from(set);
  }, [tournament]);

  // Filter groups if a flight filter is applied
  const filteredGroups = useMemo(() => {
    if (selectedFlight === "all") return sortedGroupKeys;
    return sortedGroupKeys.filter((gNum) => {
      const players = pairingsMap.get(gNum) || [];
      return players.some((p) => p.flight === selectedFlight);
    });
  }, [sortedGroupKeys, pairingsMap, selectedFlight]);

  // Chunk groups into pages (2 per page for 2-up, 1 per page for 1-up)
  const pagedGroups = useMemo(() => {
    const chunkSize = layoutDensity === "2-up" ? 2 : 1;
    const pages: number[][] = [];
    for (let i = 0; i < filteredGroups.length; i += chunkSize) {
      pages.push(filteredGroups.slice(i, i + chunkSize));
    }
    return pages;
  }, [filteredGroups, layoutDensity]);

  if (!isOpen) return null;

  function handlePrint() {
    window.print();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto print:z-auto print-modal-backdrop">
      {/* High-Precision Scoped Print Styles */}
      <style>{`
        @media print {
          @page {
            size: portrait;
            margin: 8mm 8mm 8mm 8mm;
          }
          html, body {
            height: auto !important;
            overflow: visible !important;
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Hide everything in the body except the active print canvas */
          body > * {
            visibility: hidden !important;
          }
          .print-modal-backdrop, .print-modal-backdrop * {
            visibility: visible !important;
          }
          .print-modal-backdrop {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
            overflow: visible !important;
            display: block !important;
          }
          .print-modal-card {
            border: none !important;
            box-shadow: none !important;
            max-height: none !important;
            height: auto !important;
            overflow: visible !important;
            width: 100% !important;
            max-width: 100% !important;
            border-radius: 0 !important;
            display: block !important;
            background: #fff !important;
          }
          .print-canvas-area {
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
            padding: 0 !important;
            background: #fff !important;
          }
          .print-no-show {
            display: none !important;
          }
          
          /* Page Container to Guarantee Exact 2-Up or 1-Up Pages */
          .print-page-wrapper {
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            box-sizing: border-box !important;
            padding-bottom: 2mm !important;
            min-height: 260mm !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
          }
          .print-page-wrapper:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }

          .print-card-item {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            border: 2px solid #000000 !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-sizing: border-box !important;
          }

          .print-cut-separator {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            border-top: 1px dashed #666666 !important;
            text-align: center !important;
            font-size: 8px !important;
            font-family: monospace !important;
            color: #444444 !important;
            margin: 6px 0 !important;
            padding-top: 2px !important;
          }

          /* Starter Sheet Table Repeat Headers */
          .print-table-manifest thead {
            display: table-header-group !important;
          }
          .print-table-manifest tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-3xl border border-sand-dark shadow-2xl w-full max-w-5xl flex flex-col max-h-[92vh] overflow-hidden print-modal-card">
        {/* Modal Top Action Bar (Hidden during @media print) */}
        <div className="p-4 sm:p-5 border-b border-sand flex items-center justify-between flex-wrap gap-4 bg-mist print-no-show">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🖨️</span>
            <div>
              <h2 className="font-display font-bold text-lg text-fairway">
                Print Tournament Collateral Suite
              </h2>
              <p className="text-xs text-fairway/60">
                {tournament.name} · {tournament.registrations.length} Golfers · {tenantName}
              </p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center p-1 bg-white rounded-2xl border border-sand-dark text-xs font-bold shadow-xs">
            <button
              onClick={() => setActiveMode("scorecards")}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                activeMode === "scorecards"
                  ? "bg-fairway text-white shadow-xs"
                  : "text-fairway/60 hover:text-fairway"
              }`}
            >
              📝 Paper Scorecards
            </button>
            <button
              onClick={() => setActiveMode("cart-signs")}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                activeMode === "cart-signs"
                  ? "bg-fairway text-white shadow-xs"
                  : "text-fairway/60 hover:text-fairway"
              }`}
            >
              ⛳ Cart Signs
            </button>
            <button
              onClick={() => setActiveMode("starter-sheet")}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                activeMode === "starter-sheet"
                  ? "bg-fairway text-white shadow-xs"
                  : "text-fairway/60 hover:text-fairway"
              }`}
            >
              📋 Starter Tee Sheet
            </button>
          </div>

          {/* Controls: Density, Flight, and Print */}
          <div className="flex items-center gap-2 flex-wrap">
            {activeMode !== "starter-sheet" && (
              <div className="flex items-center bg-white rounded-xl border border-sand p-0.5 text-xs font-semibold">
                <button
                  onClick={() => setLayoutDensity("2-up")}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    layoutDensity === "2-up"
                      ? "bg-fairway text-white font-bold"
                      : "text-fairway/60 hover:text-fairway"
                  }`}
                  title="Print 2 per page with cut line (Saves 50% paper)"
                >
                  📄 2-Up (Half-Sheet)
                </button>
                <button
                  onClick={() => setLayoutDensity("1-up")}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    layoutDensity === "1-up"
                      ? "bg-fairway text-white font-bold"
                      : "text-fairway/60 hover:text-fairway"
                  }`}
                  title="Print 1 large scorecard per full page"
                >
                  📄 1-Up (Full Page)
                </button>
              </div>
            )}

            {availableFlights.length > 0 && (
              <select
                value={selectedFlight}
                onChange={(e) => setSelectedFlight(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-sand text-xs font-semibold text-fairway bg-white"
              >
                <option value="all">All Flights ({sortedGroupKeys.length} Groups)</option>
                {availableFlights.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-gold text-fairway font-bold text-xs hover:bg-gold-light transition-colors shadow-sm flex items-center gap-1.5"
            >
              <span>🖨️</span> Print ({pagedGroups.length} {pagedGroups.length === 1 ? "Page" : "Pages"})
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-sand/40 hover:bg-sand flex items-center justify-center text-fairway text-xs font-bold transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Printable Canvas Area */}
        <div className="flex-1 p-6 overflow-y-auto bg-gray-100 print-canvas-area">
          {/* ========================================================================= */}
          {/* 1. OFFICIAL PAPER SCORECARDS (Chunked into Pages to Prevent Page Slicing) */}
          {/* ========================================================================= */}
          {activeMode === "scorecards" && (
            <div className="space-y-6">
              {pagedGroups.map((pageGroupKeys, pIdx) => (
                <div
                  key={pIdx}
                  className="print-page-wrapper bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-300 print:border-none print:shadow-none print:rounded-none print:p-0 space-y-4"
                >
                  {pageGroupKeys.map((gNum, cardIdx) => {
                    const players = pairingsMap.get(gNum) || [];
                    const firstPlayer = players[0];
                    const teeTimeStr = firstPlayer?.teeTime
                      ? formatTime(firstPlayer.teeTime)
                      : "TBD";

                    return (
                      <div key={gNum} className="space-y-3">
                        <div
                          className={`print-card-item p-3.5 sm:p-4 rounded-xl space-y-2.5 ${
                            layoutDensity === "1-up" ? "min-h-[460px] flex flex-col justify-between" : ""
                          }`}
                        >
                          {/* Card Header */}
                          <div className="flex items-center justify-between border-b-2 border-black pb-1.5">
                            <div>
                              <span className="text-[10px] font-mono uppercase font-black tracking-wider block text-black">
                                {tenantName} · OFFICIAL TOURNAMENT SCORECARD
                              </span>
                              <h2 className="font-display font-black text-base sm:text-lg text-black tracking-tight">
                                {tournament.name}
                              </h2>
                            </div>
                            <div className="text-right font-mono text-xs text-black">
                              <span className="font-black px-2 py-0.5 bg-black text-white rounded text-[11px] uppercase mr-1.5">
                                GROUP {gNum}
                              </span>
                              <span className="font-bold">⏰ {teeTimeStr}</span>
                              {tournament.roundsCount > 1 && (
                                <span className="ml-1.5 font-semibold">· Round {tournament.currentRound}</span>
                              )}
                            </div>
                          </div>

                          {/* 18-Hole Official Table Grid */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-center border-collapse border border-black text-[11px] font-mono">
                              <thead>
                                <tr className="bg-gray-100 font-bold border-b border-black text-[10px]">
                                  <th className="border border-black p-1 text-left w-36">HOLE</th>
                                  {Array.from({ length: 9 }).map((_, i) => (
                                    <th key={i + 1} className="border border-black p-1 w-6">{i + 1}</th>
                                  ))}
                                  <th className="border border-black p-1 w-8 bg-gray-200 font-black">OUT</th>
                                  {Array.from({ length: 9 }).map((_, i) => (
                                    <th key={i + 10} className="border border-black p-1 w-6">{i + 10}</th>
                                  ))}
                                  <th className="border border-black p-1 w-8 bg-gray-200 font-black">IN</th>
                                  <th className="border border-black p-1 w-10 bg-gray-300 font-black">TOT</th>
                                  <th className="border border-black p-1 w-8 font-black">NET</th>
                                </tr>
                                <tr className="bg-gray-50 border-b border-black text-[9px]">
                                  <td className="border border-black p-1 text-left font-bold">PAR</td>
                                  {[4, 4, 3, 5, 4, 4, 3, 4, 5].map((p, i) => (
                                    <td key={i} className="border border-black p-1">{p}</td>
                                  ))}
                                  <td className="border border-black p-1 font-bold bg-gray-200">36</td>
                                  {[4, 4, 3, 5, 4, 4, 3, 4, 5].map((p, i) => (
                                    <td key={i} className="border border-black p-1">{p}</td>
                                  ))}
                                  <td className="border border-black p-1 font-bold bg-gray-200">36</td>
                                  <td className="border border-black p-1 font-black bg-gray-300">72</td>
                                  <td className="border border-black p-1 font-bold">—</td>
                                </tr>
                              </thead>
                              <tbody>
                                {players.map((p) => {
                                  const hcp = p.handicapIndex || 0;
                                  return (
                                    <tr key={p.id} className="h-8 sm:h-9 border-b border-black">
                                      <td className="border border-black p-1 text-left">
                                        <div className="font-bold truncate text-[11px] leading-tight text-black">
                                          {p.golferName}
                                        </div>
                                        <div className="text-[9px] text-gray-700 font-sans leading-none">
                                          HCP {p.handicapIndex ? p.handicapIndex.toFixed(1) : "0"} · {p.flight || "General"}
                                        </div>
                                      </td>
                                      {Array.from({ length: 9 }).map((_, i) => (
                                        <td key={i} className="border border-black p-1 relative">
                                          {hcp >= i + 1 && (
                                            <span className="absolute top-0.5 right-0.5 text-[7px] text-black font-black">●</span>
                                          )}
                                        </td>
                                      ))}
                                      <td className="border border-black p-1 bg-gray-100 font-bold" />
                                      {Array.from({ length: 9 }).map((_, i) => (
                                        <td key={i + 9} className="border border-black p-1 relative">
                                          {hcp >= i + 10 && (
                                            <span className="absolute top-0.5 right-0.5 text-[7px] text-black font-black">●</span>
                                          )}
                                        </td>
                                      ))}
                                      <td className="border border-black p-1 bg-gray-100 font-bold" />
                                      <td className="border border-black p-1 bg-gray-200 font-black" />
                                      <td className="border border-black p-1 font-bold" />
                                    </tr>
                                  );
                                })}
                                {/* Blank rows if less than 4 players */}
                                {Array.from({ length: Math.max(0, 4 - players.length) }).map((_, idx) => (
                                  <tr key={idx} className="h-8 sm:h-9 border-b border-black">
                                    <td className="border border-black p-1 text-left text-gray-400 italic text-[10px]">
                                      Marker / Golfer
                                    </td>
                                    {Array.from({ length: 22 }).map((_, i) => (
                                      <td key={i} className="border border-black p-1" />
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Signatures Footer */}
                          <div className="flex items-center justify-between pt-1 text-[9px] font-mono text-black">
                            <div>Scorer Signature: ____________________________</div>
                            <div>Attest / Marker Signature: ____________________________</div>
                          </div>
                        </div>

                        {/* Cut Line between 2 Scorecards on the same page */}
                        {layoutDensity === "2-up" && cardIdx === 0 && pageGroupKeys.length > 1 && (
                          <div className="print-cut-separator">
                            ✂️ - - - - - - - - - - - - - - - - - - - - - - - - - - - - Cut Along Line - - - - - - - - - - - - - - - - - - - - - - - - - - - - ✂️
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {/* ========================================================================= */}
          {/* 2. GOLF CART SIGNS (Chunked into Pages to Prevent Page Slicing)          */}
          {/* ========================================================================= */}
          {activeMode === "cart-signs" && (
            <div className="space-y-6">
              {pagedGroups.map((pageGroupKeys, pIdx) => (
                <div
                  key={pIdx}
                  className="print-page-wrapper bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-300 print:border-none print:shadow-none print:rounded-none print:p-0 space-y-4"
                >
                  {pageGroupKeys.map((gNum, cardIdx) => {
                    const players = pairingsMap.get(gNum) || [];
                    const firstPlayer = players[0];
                    const teeTimeStr = firstPlayer?.teeTime
                      ? formatTime(firstPlayer.teeTime)
                      : "TBD";

                    return (
                      <div key={gNum} className="space-y-3">
                        <div
                          className={`print-card-item p-5 rounded-xl flex flex-col justify-between ${
                            layoutDensity === "1-up" ? "min-h-[460px]" : "min-h-[220px]"
                          }`}
                        >
                          {/* Header */}
                          <div className="flex items-start justify-between border-b-2 border-black pb-2">
                            <div>
                              <span className="text-[10px] font-mono uppercase tracking-widest text-black/70 font-bold block">
                                {tenantName}
                              </span>
                              <h1 className="font-display font-black text-xl sm:text-2xl text-black tracking-tight">
                                {tournament.name}
                              </h1>
                              <span className="text-xs font-semibold text-black/70">
                                {new Date(tournament.startDate).toLocaleDateString("en-US", {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                            </div>

                            <div className="text-right">
                              <span className="px-3 py-1 bg-black text-white font-mono font-black text-sm rounded uppercase inline-block">
                                GROUP #{gNum}
                              </span>
                              <div className="text-lg font-mono font-black text-black mt-1">
                                ⏰ {teeTimeStr}
                              </div>
                              <span className="text-[10px] font-mono text-black/70 font-bold block">
                                STARTING HOLE #1
                              </span>
                            </div>
                          </div>

                          {/* Golfers in Cart */}
                          <div className="grid grid-cols-2 gap-3 my-2">
                            {players.map((p, idx) => (
                              <div
                                key={p.id}
                                className="bg-gray-50 p-2.5 rounded-lg border border-black/30 flex items-center justify-between"
                              >
                                <div>
                                  <span className="text-[9px] font-mono font-bold text-black/50 block">
                                    GOLFER #{idx + 1}
                                  </span>
                                  <span className="font-display font-bold text-sm text-black block">
                                    {p.golferName}
                                  </span>
                                  <span className="text-[10px] font-semibold text-black/70">
                                    {p.flight || "Championship Field"}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className="text-[8px] font-mono uppercase text-black/50 block font-bold">
                                    HCP
                                  </span>
                                  <span className="font-mono font-black text-sm text-black">
                                    {p.handicapIndex !== null && p.handicapIndex !== undefined
                                      ? p.handicapIndex.toFixed(1)
                                      : "SCR"}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Footer Guidelines */}
                          <div className="border-t border-black/20 pt-1.5 flex items-center justify-between text-[9px] text-black/70 font-mono">
                            <span>⛳ Keep pace with group ahead · Repair ball marks</span>
                            <span>OpenGolf Operations</span>
                          </div>
                        </div>

                        {/* Cut Line */}
                        {layoutDensity === "2-up" && cardIdx === 0 && pageGroupKeys.length > 1 && (
                          <div className="print-cut-separator">
                            ✂️ - - - - - - - - - - - - - - - - - - - - - - - - - - - - Cut Along Line - - - - - - - - - - - - - - - - - - - - - - - - - - - - ✂️
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {/* ========================================================================= */}
          {/* 3. STARTER BOX MASTER TEE SHEET                                           */}
          {/* ========================================================================= */}
          {activeMode === "starter-sheet" && (
            <div className="bg-white border-2 border-black p-6 rounded-xl shadow-sm print:border-none print:shadow-none print:p-0">
              {/* Header */}
              <div className="border-b-2 border-black pb-3 mb-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono uppercase font-bold text-gray-700 block">
                    {tenantName} · OFFICIAL STARTER MANIFEST
                  </span>
                  <h1 className="font-display font-black text-2xl text-black">
                    {tournament.name}
                  </h1>
                  <span className="text-xs font-mono text-gray-800">
                    {new Date(tournament.startDate).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })} {tournament.roundsCount > 1 ? `· Round ${tournament.currentRound}` : ""}
                  </span>
                </div>
                <div className="text-right font-mono text-xs">
                  <span className="font-bold text-sm block">Field: {tournament.registrations.length} Players</span>
                  <span>{sortedGroupKeys.length} Groups Scheduled</span>
                </div>
              </div>

              {/* Manifest Table with Repeatable Header in Print */}
              <table className="w-full text-left border-collapse border border-black text-xs font-mono print-table-manifest">
                <thead>
                  <tr className="bg-gray-100 border-b border-black uppercase text-[10px]">
                    <th className="p-2 border border-black text-center w-16">Group</th>
                    <th className="p-2 border border-black text-center w-24">Tee Time</th>
                    <th className="p-2 border border-black text-center w-16">Hole</th>
                    <th className="p-2 border border-black">Golfers in Pairing</th>
                    <th className="p-2 border border-black w-28">Division</th>
                    <th className="p-2 border border-black text-center w-16">HCP</th>
                    <th className="p-2 border border-black text-center w-20">Checked In</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGroups.map((gNum) => {
                    const players = pairingsMap.get(gNum) || [];
                    const teeTimeStr = players[0]?.teeTime
                      ? formatTime(players[0].teeTime)
                      : "TBD";

                    return players.map((p, pIdx) => (
                      <tr key={p.id} className="border-b border-gray-400">
                        {pIdx === 0 && (
                          <>
                            <td
                              rowSpan={players.length}
                              className="p-2 border border-black text-center font-bold bg-gray-50"
                            >
                              #{gNum}
                            </td>
                            <td
                              rowSpan={players.length}
                              className="p-2 border border-black text-center font-black text-sm"
                            >
                              {teeTimeStr}
                            </td>
                            <td
                              rowSpan={players.length}
                              className="p-2 border border-black text-center font-bold"
                            >
                              #1
                            </td>
                          </>
                        )}
                        <td className="p-2 border border-black font-semibold text-black">
                          {p.golferName}
                        </td>
                        <td className="p-2 border border-black text-[11px] text-gray-800">
                          {p.flight || "General Field"}
                        </td>
                        <td className="p-2 border border-black text-center font-bold">
                          {p.handicapIndex !== null && p.handicapIndex !== undefined
                            ? p.handicapIndex.toFixed(1)
                            : "0.0"}
                        </td>
                        <td className="p-2 border border-black text-center">
                          <span className="inline-block w-4 h-4 border border-black rounded" />
                        </td>
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState, useMemo } from "react";
import AdminLayout from "../components/AdminLayout";
import { useAuth } from "../api/AuthContext";
import { tournamentApi } from "../api/tournament";
import { courseApi } from "../api/course";
import { golfersApi } from "../api/golfers";
import { toDateInput } from "../utils/time";
import TournamentScorecardModal from "../components/TournamentScorecardModal";
import TournamentPrintCollateralModal from "../components/TournamentPrintCollateralModal";
import type {
  TournamentSummary,
  TournamentDetail,
  TournamentFormat,
  TournamentStatus,
  TenantGolferSummary,
  TournamentHoleScore,
  TournamentRegistration,
  TournamentSkinsSummary,
  TournamentPayoutsResponse,
  AutoFlightRule,
  OrderOfMeritResponse,
} from "../types";

const FORMAT_OPTIONS: { label: string; value: TournamentFormat }[] = [
  { label: "Stroke Play (Gross / Net)", value: "StrokePlay" },
  { label: "Stableford (Points)", value: "Stableford" },
  { label: "Team Scramble", value: "Scramble" },
  { label: "Match Play", value: "MatchPlay" },
];

const DEFAULT_FLIGHT_RULES: AutoFlightRule[] = [
  { flightName: "Championship Flight", minHandicap: 0, maxHandicap: 4.9 },
  { flightName: "Flight A", minHandicap: 5.0, maxHandicap: 11.9 },
  { flightName: "Flight B", minHandicap: 12.0, maxHandicap: 19.9 },
  { flightName: "Flight C", minHandicap: 20.0, maxHandicap: 54.0 },
];

function extractTimeValue(isoOrTime?: string | null): string {
  if (!isoOrTime) return "08:00";
  const tIdx = isoOrTime.indexOf("T");
  if (tIdx !== -1) {
    return isoOrTime.slice(tIdx + 1, tIdx + 6);
  }
  if (isoOrTime.includes(":")) {
    return isoOrTime.slice(0, 5);
  }
  return "08:00";
}

function toLocalWallIsoString(dateTimeStr: string): string {
  if (!dateTimeStr) return "";
  if (dateTimeStr.length >= 19) return dateTimeStr.slice(0, 19);
  if (dateTimeStr.length === 16) return `${dateTimeStr}:00`;
  return dateTimeStr;
}

export default function TournamentManager() {
  const { user } = useAuth();
  const token = user?.token || null;
  const tenantId = user?.tenantId;

  const [tournaments, setTournaments] = useState<TournamentSummary[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<TournamentDetail | null>(null);
  const [registeredGolfers, setRegisteredGolfers] = useState<TenantGolferSummary[]>([]);
  const [tenantName, setTenantName] = useState("Clubhouse Arena");
  const [currencySymbol, setCurrencySymbol] = useState("₹");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create Tournament Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [format, setFormat] = useState<TournamentFormat>("StrokePlay");
  const [startDate, setStartDate] = useState(() => `${toDateInput(new Date())}T08:00`);
  const [endDate, setEndDate] = useState(() => `${toDateInput(new Date())}T16:00`);
  const [entryFee, setEntryFee] = useState("1000");
  const [prizePurse, setPrizePurse] = useState("0");
  const [maxParticipants, setMaxParticipants] = useState("72");
  const [holesCount, setHolesCount] = useState("18");
  const [roundsCount, setRoundsCount] = useState("1");
  const [creating, setCreating] = useState(false);

  // Pairings Modal
  const [pairingsModalOpen, setPairingsModalOpen] = useState(false);
  const [groupSize, setGroupSize] = useState(4);
  const [intervalMinutes, setIntervalMinutes] = useState(8);
  const [firstTeeTime, setFirstTeeTime] = useState("08:00");
  const [generatingPairings, setGeneratingPairings] = useState(false);

  // Enroll Player Modal
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [enrollName, setEnrollName] = useState("");
  const [enrollEmail, setEnrollEmail] = useState("");
  const [enrollHandicap, setEnrollHandicap] = useState("10.0");
  const [enrollFlight, setEnrollFlight] = useState("");
  const [enrollPaymentStatus, setEnrollPaymentStatus] = useState<"Paid" | "Unpaid" | "Free">("Paid");
  const [enrolling, setEnrolling] = useState(false);

  // Auto-Flight Modal
  const [autoFlightModalOpen, setAutoFlightModalOpen] = useState(false);
  const [flightRules, setFlightRules] = useState<AutoFlightRule[]>(DEFAULT_FLIGHT_RULES);
  const [applyingFlight, setApplyingFlight] = useState(false);

  // Side Contests Modal
  const [sideContestModalOpen, setSideContestModalOpen] = useState(false);
  const [ctpHole, setCtpHole] = useState<string>("3");
  const [ctpWinner, setCtpWinner] = useState<string>("");
  const [ldHole, setLdHole] = useState<string>("18");
  const [ldWinner, setLdWinner] = useState<string>("");
  const [contestPurse, setContestPurse] = useState<string>("0");
  const [savingSideContests, setSavingSideContests] = useState(false);

  // Cut Line Modal
  const [cutModalOpen, setCutModalOpen] = useState(false);
  const [cutRank, setCutRank] = useState("30");
  const [includeTies, setIncludeTies] = useState(true);
  const [cutAfterRound, setCutAfterRound] = useState("1");
  const [applyingCut, setApplyingCut] = useState(false);

  // Printable Collateral Modal
  const [printModalOpen, setPrintModalOpen] = useState(false);

  // Full 18-Hole Digital Scorecard Modal
  const [scorecardModalOpen, setScorecardModalOpen] = useState(false);
  const [activeScorecardPlayer, setActiveScorecardPlayer] = useState<{
    id: string;
    name: string;
    handicap?: number | null;
    scores?: TournamentHoleScore[];
  } | null>(null);

  // View state inside selected tournament
  const [detailTab, setDetailTab] = useState<"roster" | "pairings" | "leaderboard" | "skins" | "payouts" | "merit">("roster");
  const [leaderboardMode, setLeaderboardMode] = useState<"gross" | "net">("gross");
  const [skinsMode, setSkinsMode] = useState<"gross" | "net">("gross");
  const [selectedFlight, setSelectedFlight] = useState<string>("all");
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Skins, Payouts & Order of Merit Async Data
  const [skinsData, setSkinsData] = useState<TournamentSkinsSummary | null>(null);
  const [loadingSkins, setLoadingSkins] = useState(false);
  const [payoutsData, setPayoutsData] = useState<TournamentPayoutsResponse | null>(null);
  const [customPurseInput, setCustomPurseInput] = useState<string>("");
  const [loadingPayouts, setLoadingPayouts] = useState(false);
  const [meritData, setMeritData] = useState<OrderOfMeritResponse | null>(null);
  const [loadingMerit, setLoadingMerit] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    courseApi.getTenant(tenantId).then((t) => {
      if (t.name) setTenantName(t.name);
      if (t.currencySymbol) setCurrencySymbol(t.currencySymbol);
    }).catch(() => {});
    loadTournaments();
    golfersApi.getGolfers(tenantId, undefined, token).then(setRegisteredGolfers).catch(() => {});
  }, [tenantId]);

  // Load Skins, Payouts, or Order of Merit when tab switches
  useEffect(() => {
    if (!tenantId || !selectedTournament) return;
    if (detailTab === "skins") {
      loadSkins();
    } else if (detailTab === "payouts") {
      loadPayouts();
    } else if (detailTab === "merit") {
      loadMerit();
    }
  }, [detailTab, selectedTournament?.id, selectedFlight]);

  function handleSelectRegisteredGolfer(golferId: string) {
    if (!golferId) return;
    const g = registeredGolfers.find((x) => x.id === golferId);
    if (!g) return;
    setEnrollName(`${g.firstName} ${g.lastName}`.trim());
    setEnrollEmail(g.email);
    if (g.handicapIndex !== null && g.handicapIndex !== undefined) {
      setEnrollHandicap(g.handicapIndex.toString());
    }
  }

  async function loadTournaments() {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const list = await tournamentApi.getTournaments(tenantId, undefined, token);
      setTournaments(list);
      if (list.length > 0 && !selectedTournament) {
        loadDetail(list[0].id);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load tournaments.");
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(tournId: string) {
    if (!tenantId) return;
    try {
      const detail = await tournamentApi.getTournament(tenantId, tournId, token);
      setSelectedTournament(detail);
      setCtpHole(detail.closestToPinHole ? detail.closestToPinHole.toString() : "3");
      setCtpWinner(detail.closestToPinWinner || "");
      setLdHole(detail.longestDriveHole ? detail.longestDriveHole.toString() : "18");
      setLdWinner(detail.longestDriveWinner || "");
      setContestPurse(detail.prizePurse ? detail.prizePurse.toString() : "0");
      setCutAfterRound(detail.currentRound.toString());
    } catch (err: any) {
      setError(err?.message || "Failed to load tournament detail.");
    }
  }

  async function loadSkins() {
    if (!tenantId || !selectedTournament) return;
    setLoadingSkins(true);
    try {
      const flt = selectedFlight === "all" ? undefined : selectedFlight;
      const data = await tournamentApi.getSkins(tenantId, selectedTournament.id, flt, token);
      setSkinsData(data);
    } catch (err: any) {
      console.error("Failed to load skins:", err);
    } finally {
      setLoadingSkins(false);
    }
  }

  async function loadPayouts(customPurse?: number) {
    if (!tenantId || !selectedTournament) return;
    setLoadingPayouts(true);
    try {
      const data = await tournamentApi.getPayouts(tenantId, selectedTournament.id, customPurse, token);
      setPayoutsData(data);
      if (!customPurseInput) {
        setCustomPurseInput(data.totalPurse.toString());
      }
    } catch (err: any) {
      console.error("Failed to load payouts:", err);
    } finally {
      setLoadingPayouts(false);
    }
  }

  async function loadMerit() {
    if (!tenantId) return;
    setLoadingMerit(true);
    try {
      const data = await tournamentApi.getOrderOfMerit(tenantId, token);
      setMeritData(data);
    } catch (err: any) {
      console.error("Failed to load order of merit:", err);
    } finally {
      setLoadingMerit(false);
    }
  }

  async function handleEnrollPlayer(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId || !selectedTournament) return;
    setEnrolling(true);
    try {
      const reg = await tournamentApi.register(
        tenantId,
        selectedTournament.id,
        {
          golferName: enrollName.trim(),
          golferEmail: enrollEmail.trim(),
          handicapIndex: parseFloat(enrollHandicap) || undefined,
          flight: enrollFlight.trim() || undefined,
        },
        token
      );

      if (enrollPaymentStatus === "Paid" && selectedTournament.entryFee > 0) {
        await tournamentApi.confirmSandboxPayment(tenantId, selectedTournament.id, reg.id, token);
      }

      setEnrollModalOpen(false);
      setEnrollName("");
      setEnrollEmail("");
      setEnrollFlight("");
      loadDetail(selectedTournament.id);
      loadTournaments();
    } catch (err: any) {
      alert(err?.message || "Failed to enroll player.");
    } finally {
      setEnrolling(false);
    }
  }

  async function handleUpdatePlayerFlight(regId: string, flight: string) {
    if (!tenantId || !selectedTournament) return;
    try {
      await tournamentApi.updateFlight(tenantId, selectedTournament.id, regId, flight || null, token);
      loadDetail(selectedTournament.id);
    } catch (err: any) {
      alert(err?.message || "Failed to update golfer's flight.");
    }
  }

  async function handleApplyAutoFlight() {
    if (!tenantId || !selectedTournament) return;
    setApplyingFlight(true);
    try {
      await tournamentApi.autoFlight(tenantId, selectedTournament.id, flightRules, token);
      setAutoFlightModalOpen(false);
      loadDetail(selectedTournament.id);
    } catch (err: any) {
      alert(err?.message || "Failed to auto-flight golfers.");
    } finally {
      setApplyingFlight(false);
    }
  }

  async function handleSaveSideContests(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId || !selectedTournament) return;
    setSavingSideContests(true);
    try {
      await tournamentApi.updateSideContests(
        tenantId,
        selectedTournament.id,
        {
          closestToPinHole: parseInt(ctpHole, 10) || null,
          closestToPinWinner: ctpWinner.trim() || null,
          longestDriveHole: parseInt(ldHole, 10) || null,
          longestDriveWinner: ldWinner.trim() || null,
          prizePurse: parseFloat(contestPurse) || 0,
        },
        token
      );
      setSideContestModalOpen(false);
      loadDetail(selectedTournament.id);
    } catch (err: any) {
      alert(err?.message || "Failed to save side contests.");
    } finally {
      setSavingSideContests(false);
    }
  }

  async function handleAdvanceRound(targetRound: number) {
    if (!tenantId || !selectedTournament) return;
    try {
      await tournamentApi.setCurrentRound(tenantId, selectedTournament.id, targetRound, token);
      loadDetail(selectedTournament.id);
    } catch (err: any) {
      alert(err?.message || "Failed to advance round.");
    }
  }

  async function handleApplyCutSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId || !selectedTournament) return;
    setApplyingCut(true);
    try {
      await tournamentApi.applyCut(
        tenantId,
        selectedTournament.id,
        {
          cutRank: parseInt(cutRank, 10) || 30,
          includeTies,
          afterRound: parseInt(cutAfterRound, 10) || selectedTournament.currentRound,
        },
        token
      );
      setCutModalOpen(false);
      loadDetail(selectedTournament.id);
    } catch (err: any) {
      alert(err?.message || "Failed to apply cut line.");
    } finally {
      setApplyingCut(false);
    }
  }

  function openScorecard(regId?: string) {
    if (!selectedTournament || selectedTournament.registrations.length === 0) return;
    const reg = regId
      ? selectedTournament.registrations.find((r) => r.id === regId)
      : selectedTournament.registrations[0];
    if (!reg) return;

    const lbRow = selectedTournament.leaderboard.find((l) => l.registrationId === reg.id);
    setActiveScorecardPlayer({
      id: reg.id,
      name: reg.golferName,
      handicap: reg.handicapIndex,
      scores: lbRow?.holeScores || [],
    });
    setScorecardModalOpen(true);
  }

  // Available unique flights in the current tournament
  const availableFlights = useMemo(() => {
    if (!selectedTournament) return [];
    const set = new Set<string>();
    selectedTournament.registrations.forEach((r) => {
      if (r.flight && r.flight.trim().length > 0) {
        set.add(r.flight.trim());
      }
    });
    return Array.from(set);
  }, [selectedTournament]);

  // Filtered registrations according to active flight tab
  const filteredRegistrations = useMemo(() => {
    if (!selectedTournament) return [];
    if (selectedFlight === "all") return selectedTournament.registrations;
    return selectedTournament.registrations.filter((r) => r.flight === selectedFlight);
  }, [selectedTournament, selectedFlight]);

  // Group registrations by pairingGroup
  const { sortedGroups, unassignedPlayers } = useMemo(() => {
    if (!selectedTournament) {
      return {
        sortedGroups: [] as {
          groupNumber: number;
          teeTime?: string | null;
          players: TournamentRegistration[];
        }[],
        unassignedPlayers: [] as TournamentRegistration[],
      };
    }
    const map = new Map<number, TournamentRegistration[]>();
    const unassignedList: TournamentRegistration[] = [];

    const targetList = selectedFlight === "all" ? selectedTournament.registrations : filteredRegistrations;

    targetList.forEach((r) => {
      if (r.pairingGroup && r.pairingGroup > 0) {
        const list = map.get(r.pairingGroup) || [];
        list.push(r);
        map.set(r.pairingGroup, list);
      } else {
        unassignedList.push(r);
      }
    });

    const groups = Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([groupNum, players]) => ({
        groupNumber: groupNum,
        teeTime: players[0]?.teeTime,
        players,
      }));

    return {
      sortedGroups: groups,
      unassignedPlayers: unassignedList,
    };
  }, [selectedTournament, filteredRegistrations, selectedFlight]);

  // Leaderboard sorting & filtering (Gross vs Net + Flight)
  const sortedLeaderboard = useMemo(() => {
    if (!selectedTournament) return [];
    let list = [...selectedTournament.leaderboard];

    if (selectedFlight !== "all") {
      list = list.filter((r) => r.flight === selectedFlight);
    }

    if (selectedTournament.format === "Stableford") {
      list.sort((a, b) => {
        if (a.madeCut !== b.madeCut) return a.madeCut ? -1 : 1;
        return b.stablefordPoints - a.stablefordPoints;
      });
    } else if (leaderboardMode === "net") {
      list.sort((a, b) => {
        if (a.madeCut !== b.madeCut) return a.madeCut ? -1 : 1;
        if (a.thruHoles === 0 && b.thruHoles === 0) return 0;
        if (a.thruHoles === 0) return 1;
        if (b.thruHoles === 0) return -1;
        return a.netToPar - b.netToPar;
      });
    } else {
      list.sort((a, b) => {
        if (a.madeCut !== b.madeCut) return a.madeCut ? -1 : 1;
        if (a.thruHoles === 0 && b.thruHoles === 0) return 0;
        if (a.thruHoles === 0) return 1;
        if (b.thruHoles === 0) return -1;
        return a.toPar - b.toPar;
      });
    }

    return list.map((item, idx) => ({ ...item, rank: idx + 1 }));
  }, [selectedTournament, leaderboardMode, selectedFlight]);

  // CSV Export
  function handleExportResultsCsv() {
    if (!selectedTournament) return;
    const holes = selectedTournament.holesCount > 0 ? selectedTournament.holesCount : 18;
    const isMultiRound = selectedTournament.roundsCount > 1;
    const headers = ["Rank", "Golfer Name", "Handicap", "Flight", "Status", "Thru"];
    if (isMultiRound) {
      for (let r = 1; r <= selectedTournament.roundsCount; r++) {
        headers.push(`R${r}`);
      }
    }
    headers.push("Gross", "To Par", "Net", "Net To Par", "Stableford Points");
    for (let i = 1; i <= holes; i++) {
      headers.push(`Hole ${i}`);
    }

    const rows = sortedLeaderboard.map((r) => {
      const holeMap = new Map<number, number>();
      r.holeScores?.forEach((h) => holeMap.set(h.holeNumber, h.grossScore));
      const holeCols: (number | string)[] = [];
      for (let i = 1; i <= holes; i++) {
        holeCols.push(holeMap.get(i) ?? "");
      }

      const rCols: (number | string)[] = [];
      if (isMultiRound) {
        for (let rn = 1; rn <= selectedTournament.roundsCount; rn++) {
          const score = r.roundGrossScores && r.roundGrossScores[rn - 1] ? r.roundGrossScores[rn - 1] : "";
          rCols.push(score);
        }
      }

      return [
        r.rank,
        `"${r.golferName}"`,
        r.handicapIndex ?? "",
        `"${r.flight || "General"}"`,
        r.madeCut ? "Made Cut" : "MC",
        r.thruHoles,
        ...rCols,
        r.totalGross,
        r.toPar > 0 ? `+${r.toPar}` : r.toPar === 0 ? "E" : r.toPar,
        r.totalNet,
        r.netToPar > 0 ? `+${r.netToPar}` : r.netToPar === 0 ? "E" : r.netToPar,
        r.stablefordPoints,
        ...holeCols,
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${selectedTournament.name.replace(/\s+/g, "_")}_Official_Results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Manual Pairing Handlers
  async function handleAssignPlayerGroup(registrationId: string, targetGroup: number | null) {
    if (!tenantId || !selectedTournament) return;
    try {
      let groupTeeTime: string | null = null;
      if (targetGroup !== null) {
        const existingGroup = sortedGroups.find((g) => g.groupNumber === targetGroup);
        if (existingGroup?.teeTime) {
          groupTeeTime = existingGroup.teeTime;
        } else {
          groupTeeTime = selectedTournament.startDate;
        }
      }

      await tournamentApi.updateRegistrationPairing(
        tenantId,
        selectedTournament.id,
        registrationId,
        {
          pairingGroup: targetGroup,
          teeTime: groupTeeTime,
        },
        token
      );
      loadDetail(selectedTournament.id);
    } catch (err: any) {
      alert(err?.message || "Failed to update golfer's group assignment.");
    }
  }

  async function handleSetGroupTeeTime(groupNumber: number, timeString: string) {
    if (!tenantId || !selectedTournament) return;
    const group = sortedGroups.find((g) => g.groupNumber === groupNumber);
    if (!group || group.players.length === 0) return;

    try {
      const datePart = selectedTournament.startDate.slice(0, 10);
      const cleanTime = timeString.length === 5 ? `${timeString}:00` : timeString;
      const combinedIso = `${datePart}T${cleanTime}`;

      const assignments = group.players.map((p) => ({
        registrationId: p.id,
        pairingGroup: groupNumber,
        teeTime: combinedIso,
      }));

      await tournamentApi.batchUpdatePairings(
        tenantId,
        selectedTournament.id,
        { assignments },
        token
      );
      loadDetail(selectedTournament.id);
    } catch (err: any) {
      alert(err?.message || "Failed to update group tee time.");
    }
  }

  async function handleDeleteGroup(groupNumber: number) {
    if (!tenantId || !selectedTournament) return;
    const group = sortedGroups.find((g) => g.groupNumber === groupNumber);
    if (!group) return;

    if (!confirm(`Are you sure you want to disband Group ${groupNumber}? The ${group.players.length} golfer(s) will be unassigned.`)) return;

    try {
      const assignments = group.players.map((p) => ({
        registrationId: p.id,
        pairingGroup: null,
        teeTime: null,
      }));

      await tournamentApi.batchUpdatePairings(
        tenantId,
        selectedTournament.id,
        { assignments },
        token
      );
      loadDetail(selectedTournament.id);
    } catch (err: any) {
      alert(err?.message || "Failed to disband group.");
    }
  }

  async function handleClearAllPairings() {
    if (!tenantId || !selectedTournament) return;
    if (!confirm("Are you sure you want to clear all pairings? All golfers will become unassigned.")) return;

    try {
      await tournamentApi.clearPairings(tenantId, selectedTournament.id, token);
      loadDetail(selectedTournament.id);
    } catch (err: any) {
      alert(err?.message || "Failed to clear pairings.");
    }
  }

  async function handleCreateTournament(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId) return;
    setCreating(true);
    try {
      await tournamentApi.createTournament(
        tenantId,
        {
          name,
          description,
          format,
          startDate: toLocalWallIsoString(startDate),
          endDate: toLocalWallIsoString(endDate),
          entryFee: parseFloat(entryFee) || 0,
          prizePurse: parseFloat(prizePurse) || 0,
          maxParticipants: parseInt(maxParticipants, 10) || 72,
          holesCount: parseInt(holesCount, 10) || 18,
          roundsCount: parseInt(roundsCount, 10) || 1,
          isPublic: true,
        },
        token
      );
      setCreateModalOpen(false);
      setName("");
      setDescription("");
      loadTournaments();
    } catch (err: any) {
      alert(err?.message || "Failed to create tournament.");
    } finally {
      setCreating(false);
    }
  }

  async function handleStatusChange(tournId: string, newStatus: TournamentStatus) {
    if (!tenantId) return;
    try {
      await tournamentApi.updateTournament(tenantId, tournId, { status: newStatus }, token);
      loadTournaments();
      if (selectedTournament?.id === tournId) {
        loadDetail(tournId);
      }
    } catch (err: any) {
      alert(err?.message || "Failed to update status.");
    }
  }

  async function handleGeneratePairings(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId || !selectedTournament) return;
    setGeneratingPairings(true);
    try {
      const datePart = selectedTournament.startDate.slice(0, 10);
      const cleanTime = firstTeeTime.length === 5 ? `${firstTeeTime}:00` : firstTeeTime;
      const combinedStart = `${datePart}T${cleanTime}`;

      await tournamentApi.generatePairings(
        tenantId,
        selectedTournament.id,
        {
          playersPerGroup: groupSize,
          intervalMinutes,
          firstTeeTime: combinedStart,
        },
        token
      );
      setPairingsModalOpen(false);
      loadDetail(selectedTournament.id);
    } catch (err: any) {
      alert(err?.message || "Failed to generate pairings.");
    } finally {
      setGeneratingPairings(false);
    }
  }

  async function handleDeleteTournament(tournId: string) {
    if (!tenantId) return;
    if (!confirm("Are you sure you want to delete this tournament? All registrations and scores will be removed.")) return;
    try {
      await tournamentApi.deleteTournament(tenantId, tournId, token);
      setSelectedTournament(null);
      loadTournaments();
    } catch (err: any) {
      alert(err?.message || "Failed to delete tournament.");
    }
  }

  if (!tenantId) {
    return (
      <AdminLayout>
        <div className="p-12 text-center text-fairway/60">No course found for your account.</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-widest text-turf font-bold">
              Course Operations · Phase 3 Championship Suite
            </div>
            <h1 className="text-3xl font-display font-bold text-fairway tracking-tight">
              Tournaments &amp; Leagues
            </h1>
            <p className="text-xs text-fairway/60 mt-1">
              Multi-round championships (36/54/72 holes), cut line manager, printable collateral suite, and Order of Merit.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-fairway text-white font-medium hover:bg-fairway-dark transition-colors flex items-center gap-2 shadow-sm text-sm"
            >
              <span>+</span> New Tournament
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Layout: Tournament List & Management Drawer */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Events List */}
          <div className="bg-white rounded-2xl border border-sand-dark shadow-sm overflow-hidden divide-y divide-sand">
            <div className="p-4 bg-mist font-display font-semibold text-sm text-fairway flex items-center justify-between">
              <span>Club Tournaments</span>
              <span className="text-xs font-mono text-fairway/60">{tournaments.length} events</span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-fairway/50">Loading tournaments...</div>
            ) : tournaments.length === 0 ? (
              <div className="p-8 text-center text-xs text-fairway/60 space-y-2">
                <p>No tournaments scheduled yet.</p>
                <button
                  onClick={() => setCreateModalOpen(true)}
                  className="text-turf font-semibold hover:underline"
                >
                  Create your first tournament →
                </button>
              </div>
            ) : (
              tournaments.map((t) => {
                const isSelected = selectedTournament?.id === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => loadDetail(t.id)}
                    className={`p-4 cursor-pointer transition-colors space-y-2 ${
                      isSelected ? "bg-sand/30 border-l-4 border-fairway" : "hover:bg-mist/60"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-fairway/10 text-fairway">
                        {t.format} {(t.roundsCount || 1) > 1 ? `· ${t.roundsCount} Rds` : ""}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          t.status === "InProgress"
                            ? "bg-red-100 text-red-800"
                            : t.status === "Completed"
                            ? "bg-gray-100 text-gray-700"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>

                    <h3 className="font-display font-bold text-sm text-fairway">{t.name}</h3>

                    <div className="flex items-center justify-between text-xs text-fairway/60">
                      <span>{new Date(t.startDate).toLocaleDateString()}</span>
                      <span className="font-mono">{t.registeredCount} / {t.maxParticipants} players</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right 2 Columns: Selected Tournament Workspace */}
          <div className="lg:col-span-2 space-y-6">
            {selectedTournament ? (
              <div className="space-y-6">
                {/* Event Summary Card */}
                <div className="bg-white rounded-2xl p-6 border border-sand-dark shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-sand">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-display font-bold text-2xl text-fairway">
                          {selectedTournament.name}
                        </h2>
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sand text-fairway">
                          {selectedTournament.format}
                        </span>
                        {selectedTournament.roundsCount > 1 && (
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-mono">
                            🏌️ Round {selectedTournament.currentRound} of {selectedTournament.roundsCount}
                          </span>
                        )}
                        {selectedTournament.cutRule && (
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-mono">
                            ✂️ Cut: {selectedTournament.cutRule}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-fairway/60 mt-1">
                        Starts {new Date(selectedTournament.startDate).toLocaleString()} · Entry Fee: {currencySymbol}{selectedTournament.entryFee.toFixed(2)} · Purse: {currencySymbol}{(selectedTournament.prizePurse || 0).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={selectedTournament.status}
                        onChange={(e) => handleStatusChange(selectedTournament.id, e.target.value as TournamentStatus)}
                        className="text-xs font-semibold px-3 py-2 rounded-lg border border-sand-dark bg-white text-fairway focus:outline-none focus:ring-2 focus:ring-fairway"
                      >
                        <option value="Upcoming">Upcoming</option>
                        <option value="InProgress">In Progress (Live)</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>

                      <button
                        onClick={() => handleDeleteTournament(selectedTournament.id)}
                        className="text-xs px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Multi-Round Advance Button */}
                    {selectedTournament.roundsCount > 1 && selectedTournament.currentRound < selectedTournament.roundsCount && (
                      <button
                        onClick={() => handleAdvanceRound(selectedTournament.currentRound + 1)}
                        className="text-xs px-3.5 py-2 rounded-xl bg-emerald-700 text-white font-bold hover:bg-emerald-800 transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        <span>⏩</span> Advance to Round {selectedTournament.currentRound + 1}
                      </button>
                    )}

                    {/* Cut Line Button */}
                    {selectedTournament.roundsCount > 1 && (
                      <button
                        onClick={() => setCutModalOpen(true)}
                        className="text-xs px-3.5 py-2 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-700 transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        <span>✂️</span> Cut Line
                      </button>
                    )}

                    {/* Print Collateral Modal Button */}
                    <button
                      onClick={() => setPrintModalOpen(true)}
                      className="text-xs px-3.5 py-2 rounded-xl bg-[#062016] text-emerald-300 font-bold border border-emerald-500/30 hover:bg-[#082a1d] transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <span>🖨️</span> Print Collateral
                    </button>

                    <button
                      onClick={() => setPairingsModalOpen(true)}
                      className="text-xs px-3 py-2 rounded-xl bg-gold text-fairway font-semibold hover:bg-gold-light transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <span>⚡</span> Auto-Pairings
                    </button>
                    <button
                      onClick={() => setAutoFlightModalOpen(true)}
                      className="text-xs px-3 py-2 rounded-xl bg-fairway/10 text-fairway font-semibold hover:bg-fairway/20 transition-colors flex items-center gap-1.5"
                    >
                      <span>🏆</span> Auto-Flight
                    </button>
                    <button
                      onClick={() => setSideContestModalOpen(true)}
                      className="text-xs px-3 py-2 rounded-xl border border-sand-dark text-fairway font-medium hover:bg-mist transition-colors flex items-center gap-1.5"
                    >
                      <span>🎯</span> Side Contests
                    </button>
                    <button
                      onClick={() => openScorecard()}
                      disabled={selectedTournament.registrations.length === 0}
                      className="text-xs px-3.5 py-2 rounded-xl bg-fairway text-white font-semibold hover:bg-fairway-dark transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                    >
                      <span>📝</span> Scorecard Matrix
                    </button>
                    <a
                      href={`/tournaments/${selectedTournament.id}/tv`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-3 py-2 rounded-xl bg-[#062016] text-emerald-300 font-bold border border-emerald-500/30 hover:bg-[#082a1d] transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <span>📺</span> TV Kiosk ↗
                    </a>
                    <a
                      href={`/tournaments/${selectedTournament.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-3 py-2 rounded-xl border border-sand-dark text-fairway font-medium hover:bg-mist transition-colors flex items-center gap-1.5"
                    >
                      <span>🔗</span> Public Page ↗
                    </a>
                  </div>
                </div>

                {/* Main Navigation Sub-tabs */}
                <div className="flex items-center gap-1.5 border-b border-sand pb-1 overflow-x-auto">
                  <button
                    onClick={() => setDetailTab("roster")}
                    className={`px-3.5 py-2 text-xs font-semibold rounded-t-xl transition-colors border-b-2 whitespace-nowrap ${
                      detailTab === "roster"
                        ? "border-fairway text-fairway bg-mist font-bold"
                        : "border-transparent text-fairway/60 hover:text-fairway"
                    }`}
                  >
                    👥 Players ({selectedTournament.registrations.length})
                  </button>
                  <button
                    onClick={() => setDetailTab("pairings")}
                    className={`px-3.5 py-2 text-xs font-semibold rounded-t-xl transition-colors border-b-2 whitespace-nowrap ${
                      detailTab === "pairings"
                        ? "border-fairway text-fairway bg-mist font-bold"
                        : "border-transparent text-fairway/60 hover:text-fairway"
                    }`}
                  >
                    ⛳ Pairings ({sortedGroups.length})
                  </button>
                  <button
                    onClick={() => setDetailTab("leaderboard")}
                    className={`px-3.5 py-2 text-xs font-semibold rounded-t-xl transition-colors border-b-2 whitespace-nowrap ${
                      detailTab === "leaderboard"
                        ? "border-gold text-fairway bg-gold/10 font-bold"
                        : "border-transparent text-fairway/60 hover:text-fairway"
                    }`}
                  >
                    🏆 Leaderboard ({selectedTournament.leaderboard.length})
                  </button>
                  <button
                    onClick={() => setDetailTab("skins")}
                    className={`px-3.5 py-2 text-xs font-semibold rounded-t-xl transition-colors border-b-2 whitespace-nowrap ${
                      detailTab === "skins"
                        ? "border-emerald-600 text-fairway bg-emerald-50 font-bold"
                        : "border-transparent text-fairway/60 hover:text-fairway"
                    }`}
                  >
                    🎯 Skins &amp; Contests
                  </button>
                  <button
                    onClick={() => setDetailTab("payouts")}
                    className={`px-3.5 py-2 text-xs font-semibold rounded-t-xl transition-colors border-b-2 whitespace-nowrap ${
                      detailTab === "payouts"
                        ? "border-amber-600 text-fairway bg-amber-50 font-bold"
                        : "border-transparent text-fairway/60 hover:text-fairway"
                    }`}
                  >
                    💰 Purse &amp; Payouts
                  </button>
                  <button
                    onClick={() => setDetailTab("merit")}
                    className={`px-3.5 py-2 text-xs font-semibold rounded-t-xl transition-colors border-b-2 whitespace-nowrap ${
                      detailTab === "merit"
                        ? "border-purple-600 text-fairway bg-purple-50 font-bold"
                        : "border-transparent text-fairway/60 hover:text-fairway"
                    }`}
                  >
                    ⭐ Order of Merit
                  </button>
                </div>

                {/* Flight Filter Pills Toolbar */}
                {availableFlights.length > 0 && detailTab !== "merit" && (
                  <div className="flex items-center gap-1.5 flex-wrap bg-white p-2.5 rounded-xl border border-sand">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-fairway/50 mr-1">
                      Flight Filter:
                    </span>
                    <button
                      onClick={() => setSelectedFlight("all")}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                        selectedFlight === "all"
                          ? "bg-fairway text-white shadow-sm"
                          : "bg-mist text-fairway/70 hover:bg-sand/60"
                      }`}
                    >
                      All Divisions ({selectedTournament.registrations.length})
                    </button>
                    {availableFlights.map((flt) => {
                      const count = selectedTournament.registrations.filter((r) => r.flight === flt).length;
                      return (
                        <button
                          key={flt}
                          onClick={() => setSelectedFlight(flt)}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                            selectedFlight === flt
                              ? "bg-fairway text-white shadow-sm"
                              : "bg-mist text-fairway/70 hover:bg-sand/60"
                          }`}
                        >
                          {flt} ({count})
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* TAB 1: ROSTER & FLIGHT ASSIGNMENT */}
                {detailTab === "roster" && (
                  <div className="bg-white rounded-2xl border border-sand-dark shadow-sm overflow-hidden">
                    <div className="p-4 bg-mist flex items-center justify-between border-b border-sand">
                      <span className="font-display font-semibold text-xs text-fairway uppercase tracking-wider">
                        Tournament Roster ({filteredRegistrations.length} Players)
                      </span>
                      <button
                        onClick={() => setEnrollModalOpen(true)}
                        className="text-xs font-bold px-3 py-1.5 rounded-xl bg-fairway text-white hover:bg-fairway-dark transition-colors"
                      >
                        + Add Golfer
                      </button>
                    </div>

                    {filteredRegistrations.length === 0 ? (
                      <div className="p-8 text-center text-xs text-fairway/60">No golfers enrolled in this view.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-mist/50 text-[10px] font-mono uppercase tracking-wider text-fairway/70 border-b border-sand">
                              <th className="py-3 px-4">Golfer</th>
                              <th className="py-3 px-4">Email</th>
                              <th className="py-3 px-4">Handicap</th>
                              <th className="py-3 px-4">Flight / Division</th>
                              <th className="py-3 px-4">Cut Status</th>
                              <th className="py-3 px-4">Group</th>
                              <th className="py-3 px-4">Payment</th>
                              <th className="py-3 px-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-sand">
                            {filteredRegistrations.map((r) => (
                              <tr key={r.id} className="hover:bg-mist/40 transition-colors">
                                <td className="py-3 px-4 font-bold text-fairway">{r.golferName}</td>
                                <td className="py-3 px-4 text-fairway/70 font-mono text-[11px]">{r.golferEmail}</td>
                                <td className="py-3 px-4 font-mono font-medium">
                                  {r.handicapIndex !== null && r.handicapIndex !== undefined
                                    ? r.handicapIndex.toFixed(1)
                                    : "—"}
                                </td>
                                <td className="py-3 px-4">
                                  <select
                                    value={r.flight || ""}
                                    onChange={(e) => handleUpdatePlayerFlight(r.id, e.target.value)}
                                    className="px-2 py-1 rounded-lg border border-sand bg-white text-xs font-semibold text-fairway"
                                  >
                                    <option value="">General</option>
                                    <option value="Championship Flight">Championship</option>
                                    <option value="Flight A">Flight A</option>
                                    <option value="Flight B">Flight B</option>
                                    <option value="Flight C">Flight C</option>
                                    <option value="Senior Division">Senior Division</option>
                                    <option value="Ladies Division">Ladies Division</option>
                                  </select>
                                </td>
                                <td className="py-3 px-4">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      r.madeCut !== false
                                        ? "bg-green-100 text-green-800"
                                        : "bg-rose-100 text-rose-800"
                                    }`}
                                  >
                                    {r.madeCut !== false ? "✓ Made Cut" : "❌ MC"}
                                  </span>
                                </td>
                                <td className="py-3 px-4 font-mono">
                                  {r.pairingGroup ? `Group ${r.pairingGroup}` : <span className="text-fairway/40">Unassigned</span>}
                                </td>
                                <td className="py-3 px-4">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      r.paymentStatus === "Paid"
                                        ? "bg-green-100 text-green-800"
                                        : r.paymentStatus === "Free"
                                        ? "bg-blue-100 text-blue-800"
                                        : "bg-amber-100 text-amber-800"
                                    }`}
                                  >
                                    {r.paymentStatus}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <button
                                    onClick={() => openScorecard(r.id)}
                                    className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-sand/60 hover:bg-sand text-fairway transition-colors"
                                  >
                                    Scorecard
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: PAIRINGS & MANUAL TEE SHEET DRIVER */}
                {detailTab === "pairings" && (
                  <div className="space-y-6">
                    {/* Top Action Bar for Pairings */}
                    <div className="bg-white p-4 rounded-2xl border border-sand-dark shadow-sm flex items-center justify-between flex-wrap gap-4">
                      <div>
                        <h3 className="font-display font-bold text-base text-fairway">
                          Pairings &amp; Starting Tee Sheet ({sortedGroups.length} Groups Scheduled)
                        </h3>
                        <p className="text-xs text-fairway/60">
                          Drag, assign, adjust tee times per group, or auto-generate pairings.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPairingsModalOpen(true)}
                          className="px-3.5 py-1.5 rounded-xl bg-gold text-fairway font-bold text-xs hover:bg-gold-light transition-colors"
                        >
                          ⚡ Auto-Generate
                        </button>
                        {sortedGroups.length > 0 && (
                          <button
                            onClick={handleClearAllPairings}
                            className="px-3.5 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors"
                          >
                            Clear All Pairings
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Visual Group Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {sortedGroups.map((g) => (
                        <div
                          key={g.groupNumber}
                          className="bg-white rounded-2xl p-5 border border-sand-dark shadow-sm space-y-3"
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-sand">
                            <div className="flex items-center gap-2">
                              <span className="font-display font-bold text-sm text-fairway">
                                Group {g.groupNumber}
                              </span>
                              <span className="text-[11px] text-fairway/50 font-mono">
                                ({g.players.length} Golfers)
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <input
                                type="time"
                                value={extractTimeValue(g.teeTime)}
                                onChange={(e) => handleSetGroupTeeTime(g.groupNumber, e.target.value)}
                                className="px-2 py-1 rounded-lg border border-sand-dark text-xs font-mono font-bold text-turf bg-mist"
                              />
                              <button
                                onClick={() => handleDeleteGroup(g.groupNumber)}
                                className="text-red-500 hover:text-red-700 text-xs px-2 py-1"
                                title="Disband Group"
                              >
                                ✕
                              </button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            {g.players.map((p, idx) => (
                              <div
                                key={p.id}
                                className="flex items-center justify-between p-2 rounded-xl bg-mist/60 border border-sand text-xs"
                              >
                                <div>
                                  <span className="font-bold text-fairway block">
                                    {idx + 1}. {p.golferName}
                                  </span>
                                  <span className="text-[10px] text-fairway/50 font-mono">
                                    {p.flight || "General"} {p.handicapIndex ? `· HCP ${p.handicapIndex.toFixed(1)}` : ""}
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleAssignPlayerGroup(p.id, null)}
                                  className="text-[10px] text-red-500 hover:underline"
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Unassigned Players Bucket */}
                    {unassignedPlayers.length > 0 && (
                      <div className="bg-white rounded-2xl p-5 border border-sand-dark shadow-sm space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-sand">
                          <span className="font-display font-bold text-xs uppercase tracking-wider text-fairway">
                            Unassigned Golfers ({unassignedPlayers.length})
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {unassignedPlayers.map((p) => (
                            <div
                              key={p.id}
                              className="p-3 bg-mist rounded-xl border border-sand flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-bold text-fairway block">{p.golferName}</span>
                                <span className="text-[10px] text-fairway/50 font-mono">
                                  {p.flight || "General"} {p.handicapIndex ? `· HCP ${p.handicapIndex.toFixed(1)}` : ""}
                                </span>
                              </div>
                              <select
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  if (!isNaN(val)) handleAssignPlayerGroup(p.id, val);
                                }}
                                className="px-2 py-1 text-[11px] rounded-lg border border-sand bg-white text-fairway font-semibold"
                              >
                                <option value="">+ Assign</option>
                                {Array.from({ length: Math.max(sortedGroups.length + 1, 10) }, (_, i) => i + 1).map((g) => (
                                  <option key={g} value={g}>
                                    Group {g}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: LEADERBOARD MATRIX */}
                {detailTab === "leaderboard" && (
                  <div className="bg-white rounded-2xl border border-sand-dark shadow-sm overflow-hidden space-y-4 p-4">
                    <div className="flex items-center justify-between flex-wrap gap-4 pb-2 border-b border-sand">
                      <div>
                        <h3 className="font-display font-bold text-base text-fairway">
                          Live Tournament Leaderboard
                        </h3>
                        <p className="text-xs text-fairway/60">
                          Real-time scoring standings with Gross, Net, and multi-round breakdowns.
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleExportResultsCsv}
                          className="px-3.5 py-1.5 rounded-xl bg-fairway text-white font-bold text-xs hover:bg-fairway-dark transition-colors shadow-xs flex items-center gap-1.5"
                        >
                          <span>📥</span> Export Results (CSV)
                        </button>

                        {selectedTournament.format !== "Stableford" && (
                          <div className="bg-mist p-1 rounded-xl border border-sand flex items-center">
                            <button
                              onClick={() => setLeaderboardMode("gross")}
                              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                                leaderboardMode === "gross"
                                  ? "bg-white text-fairway shadow-sm"
                                  : "text-fairway/60 hover:text-fairway"
                              }`}
                            >
                              Gross
                            </button>
                            <button
                              onClick={() => setLeaderboardMode("net")}
                              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                                leaderboardMode === "net"
                                  ? "bg-gold text-fairway shadow-sm"
                                  : "text-fairway/60 hover:text-fairway"
                              }`}
                            >
                              Net (Handicap)
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {sortedLeaderboard.length === 0 ? (
                      <div className="p-8 text-center text-xs text-fairway/60">No scores recorded yet.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-mist text-[10px] font-mono uppercase tracking-wider text-fairway/70 border-b border-sand">
                              <th className="py-3 px-4 w-12 text-center">Pos</th>
                              <th className="py-3 px-4">Player</th>
                              <th className="py-3 px-4">Flight</th>
                              <th className="py-3 px-4 text-center">Cut</th>
                              <th className="py-3 px-4 text-center">Thru</th>
                              {selectedTournament.roundsCount > 1 &&
                                Array.from({ length: selectedTournament.roundsCount }).map((_, rIdx) => (
                                  <th key={rIdx} className="py-3 px-2 text-center">R{rIdx + 1}</th>
                                ))}
                              <th className="py-3 px-4 text-center">Gross</th>
                              <th className="py-3 px-4 text-center">To Par</th>
                              <th className="py-3 px-4 text-center">Net</th>
                              <th className="py-3 px-4 text-center">Net To Par</th>
                              <th className="py-3 px-4 text-right">Card</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-sand">
                            {sortedLeaderboard.map((r) => {
                              const isExpanded = expandedRowId === r.registrationId;
                              return (
                                <>
                                  <tr
                                    key={r.registrationId}
                                    onClick={() => setExpandedRowId(isExpanded ? null : r.registrationId)}
                                    className={`cursor-pointer transition-colors ${
                                      isExpanded ? "bg-sand/20" : "hover:bg-mist/50"
                                    }`}
                                  >
                                    <td className="py-3 px-4 text-center font-display font-black text-sm text-fairway">
                                      {r.rank === 1 ? "🥇 1" : r.rank === 2 ? "🥈 2" : r.rank === 3 ? "🥉 3" : r.rank}
                                    </td>
                                    <td className="py-3 px-4 font-bold text-fairway">
                                      <div>{r.golferName}</div>
                                      <div className="text-[10px] font-mono text-fairway/50 font-normal">
                                        HCP {r.handicapIndex !== null && r.handicapIndex !== undefined ? r.handicapIndex.toFixed(1) : "—"}
                                      </div>
                                    </td>
                                    <td className="py-3 px-4">
                                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-fairway/10 text-fairway">
                                        {r.flight || "General"}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                          r.madeCut !== false
                                            ? "bg-green-100 text-green-800"
                                            : "bg-rose-100 text-rose-800"
                                        }`}
                                      >
                                        {r.madeCut !== false ? "Made" : "MC"}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 text-center font-mono font-bold">
                                      {r.thruHoles === 0 ? "—" : r.thruHoles === selectedTournament.holesCount ? "F" : r.thruHoles}
                                    </td>
                                    {selectedTournament.roundsCount > 1 &&
                                      Array.from({ length: selectedTournament.roundsCount }).map((_, rIdx) => (
                                        <td key={rIdx} className="py-3 px-2 text-center font-mono font-medium">
                                          {r.roundGrossScores && r.roundGrossScores[rIdx] ? r.roundGrossScores[rIdx] : "—"}
                                        </td>
                                      ))}
                                    <td className="py-3 px-4 text-center font-mono font-bold text-sm">
                                      {r.totalGross || "—"}
                                    </td>
                                    <td className="py-3 px-4 text-center font-mono font-extrabold text-sm">
                                      <span
                                        className={
                                          r.toPar < 0 ? "text-emerald-600" : r.toPar > 0 ? "text-amber-700" : "text-fairway"
                                        }
                                      >
                                        {r.thruHoles === 0 ? "—" : r.toPar === 0 ? "E" : r.toPar > 0 ? `+${r.toPar}` : r.toPar}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 text-center font-mono font-bold text-sm text-fairway">
                                      {r.totalNet || "—"}
                                    </td>
                                    <td className="py-3 px-4 text-center font-mono font-extrabold text-sm">
                                      <span
                                        className={
                                          r.netToPar < 0 ? "text-emerald-600 font-black" : r.netToPar > 0 ? "text-amber-700" : "text-fairway"
                                        }
                                      >
                                        {r.thruHoles === 0 ? "—" : r.netToPar === 0 ? "E" : r.netToPar > 0 ? `+${r.netToPar}` : r.netToPar}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openScorecard(r.registrationId);
                                        }}
                                        className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-fairway text-white hover:bg-fairway-dark transition-colors shadow-sm"
                                      >
                                        Edit 📝
                                      </button>
                                    </td>
                                  </tr>

                                  {/* Expandable 18-Hole Matrix Drawer */}
                                  {isExpanded && r.holeScores && r.holeScores.length > 0 && (
                                    <tr className="bg-sand/30">
                                      <td colSpan={11 + (selectedTournament.roundsCount > 1 ? selectedTournament.roundsCount : 0)} className="p-4">
                                        <div className="bg-white rounded-xl p-3 border border-sand shadow-inner space-y-2">
                                          <span className="text-[10px] font-mono uppercase tracking-widest text-fairway/60 font-bold block">
                                            Hole-by-Hole Scorecard Matrix ({r.golferName})
                                          </span>
                                          <div className="grid grid-cols-9 sm:grid-cols-18 gap-1 text-center font-mono text-[10px]">
                                            {r.holeScores.map((h) => {
                                              const diff = h.grossScore - h.par;
                                              const bg =
                                                diff <= -2
                                                  ? "bg-amber-200 text-amber-950 font-black"
                                                  : diff === -1
                                                  ? "bg-emerald-200 text-emerald-950 font-bold"
                                                  : diff === 0
                                                  ? "bg-gray-100 text-gray-800"
                                                  : "bg-rose-100 text-rose-900";
                                              return (
                                                <div key={`${h.roundNumber || 1}-${h.holeNumber}`} className="border border-sand rounded p-1 space-y-0.5">
                                                  <div className="text-[9px] text-fairway/50 font-semibold">#{h.holeNumber}</div>
                                                  <div className={`rounded py-0.5 font-bold ${bg}`}>{h.grossScore}</div>
                                                  <div className="text-[8px] text-fairway/40">P{h.par}</div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 4: SKINS GAME & CONTESTS */}
                {detailTab === "skins" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-white p-5 rounded-2xl border border-sand-dark shadow-sm">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-fairway/60 block font-bold">
                          Total Skins Won
                        </span>
                        <span className="font-display font-black text-2xl text-fairway mt-1 block">
                          {skinsData?.totalSkins || 0}
                        </span>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-sand-dark shadow-sm">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-fairway/60 block font-bold">
                          Estimated Skins Pot
                        </span>
                        <span className="font-display font-black text-2xl text-emerald-700 mt-1 block">
                          {currencySymbol}{(skinsData?.totalPot || 0).toLocaleString()}
                        </span>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-sand-dark shadow-sm flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-fairway/60 block font-bold">
                            Side Contests
                          </span>
                          <span className="text-xs font-bold text-fairway mt-1 block">
                            CTP Hole #{selectedTournament.closestToPinHole || 3} · LD #{selectedTournament.longestDriveHole || 18}
                          </span>
                        </div>
                        <button
                          onClick={() => setSideContestModalOpen(true)}
                          className="px-3 py-1.5 rounded-xl bg-mist border border-sand-dark text-xs font-bold text-fairway hover:bg-sand"
                        >
                          Edit
                        </button>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-sand-dark shadow-sm overflow-hidden space-y-3 p-4">
                      <div className="flex items-center justify-between flex-wrap gap-4 pb-2 border-b border-sand">
                        <div>
                          <h3 className="font-display font-bold text-base text-fairway">
                            Hole-by-Hole Skins Board
                          </h3>
                          <p className="text-xs text-fairway/60">
                            Outright lowest score per hole with tie carryovers.
                          </p>
                        </div>

                        <div className="bg-mist p-1 rounded-xl border border-sand flex items-center">
                          <button
                            onClick={() => setSkinsMode("gross")}
                            className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                              skinsMode === "gross" ? "bg-white text-fairway shadow-sm" : "text-fairway/60 hover:text-fairway"
                            }`}
                          >
                            Gross Skins
                          </button>
                          <button
                            onClick={() => setSkinsMode("net")}
                            className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                              skinsMode === "net" ? "bg-white text-fairway shadow-sm" : "text-fairway/60 hover:text-fairway"
                            }`}
                          >
                            Net Skins
                          </button>
                        </div>
                      </div>

                      {loadingSkins ? (
                        <div className="p-8 text-center text-xs text-fairway/60">Calculating skins...</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-mist text-[10px] font-mono uppercase tracking-wider text-fairway/70 border-b border-sand">
                                <th className="py-3 px-4">Hole</th>
                                <th className="py-3 px-4">Par</th>
                                <th className="py-3 px-4">Lowest Score</th>
                                <th className="py-3 px-4">Skin Winner</th>
                                <th className="py-3 px-4">Division</th>
                                <th className="py-3 px-4 text-right">Result</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-sand">
                              {(skinsMode === "gross" ? skinsData?.grossSkins : skinsData?.netSkins)?.map((s) => (
                                <tr key={s.holeNumber} className="hover:bg-mist/40 transition-colors">
                                  <td className="py-3 px-4 font-mono font-bold text-fairway">Hole #{s.holeNumber}</td>
                                  <td className="py-3 px-4 font-mono text-fairway/60">Par {s.par}</td>
                                  <td className="py-3 px-4 font-mono font-extrabold text-sm text-fairway">
                                    {s.winningScore}
                                  </td>
                                  <td className="py-3 px-4 font-bold text-fairway">
                                    {s.winnerName || <span className="text-fairway/40 font-normal">Tie / Carryover</span>}
                                  </td>
                                  <td className="py-3 px-4 text-fairway/70">{s.flight || "General"}</td>
                                  <td className="py-3 px-4 text-right">
                                    {s.isCarryover ? (
                                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                                        🔥 Carryover
                                      </span>
                                    ) : (
                                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900">
                                        ✓ 1 Skin Won
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 5: PRIZE PURSE & PAYOUTS */}
                {detailTab === "payouts" && (
                  <div className="space-y-6">
                    <div className="bg-white p-5 rounded-2xl border border-sand-dark shadow-sm flex items-center justify-between flex-wrap gap-4">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-fairway/60 block font-bold">
                          Configured Prize Pool
                        </span>
                        <span className="font-display font-black text-2xl text-fairway mt-0.5 block">
                          {currencySymbol}{(payoutsData?.totalPurse || 0).toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          value={customPurseInput}
                          onChange={(e) => setCustomPurseInput(e.target.value)}
                          placeholder="Override Purse..."
                          className="px-3 py-1.5 rounded-xl border border-sand text-xs font-mono font-bold w-36"
                        />
                        <button
                          onClick={() => loadPayouts(parseFloat(customPurseInput) || undefined)}
                          className="px-4 py-2 rounded-xl bg-fairway text-white font-bold text-xs hover:bg-fairway-dark"
                        >
                          Recalculate
                        </button>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-sand-dark shadow-sm overflow-hidden">
                      {loadingPayouts ? (
                        <div className="p-8 text-center text-xs text-fairway/60">Calculating payouts...</div>
                      ) : (
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-mist text-[10px] font-mono uppercase tracking-wider text-fairway/70 border-b border-sand">
                              <th className="py-3 px-4">Place</th>
                              <th className="py-3 px-4">Golfer</th>
                              <th className="py-3 px-4">Division</th>
                              <th className="py-3 px-4 text-right">Prize Amount</th>
                              <th className="py-3 px-4 text-right">% of Purse</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-sand">
                            {payoutsData?.payouts.map((p) => (
                              <tr key={p.registrationId} className="hover:bg-mist/40 transition-colors">
                                <td className="py-3 px-4 font-display font-black text-sm text-fairway">
                                  {p.isTie ? `T${p.rank}` : `#${p.rank}`}
                                </td>
                                <td className="py-3 px-4 font-bold text-fairway">
                                  {p.golferName}
                                  {p.isTie && <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">Tie Split</span>}
                                </td>
                                <td className="py-3 px-4 text-fairway/70">{p.flight || "General"}</td>
                                <td className="py-3 px-4 text-right font-display font-black text-sm text-emerald-700">
                                  {currencySymbol}{p.payoutAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                                <td className="py-3 px-4 text-right font-mono font-bold text-fairway/70">
                                  {p.pursePercentage.toFixed(1)}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 6: ORDER OF MERIT / LEAGUE RACE */}
                {detailTab === "merit" && (
                  <div className="space-y-6">
                    <div className="bg-white p-5 rounded-2xl border border-sand-dark shadow-sm flex items-center justify-between flex-wrap gap-4">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-purple-700 block font-bold">
                          ⭐ Season Championship
                        </span>
                        <h3 className="font-display font-black text-2xl text-fairway mt-0.5 block">
                          {meritData?.seasonName || "Club Order of Merit Race"}
                        </h3>
                        <p className="text-xs text-fairway/60">
                          Accumulated points race based on tournament finishes (1st: 500pts, 2nd: 300pts, 3rd: 190pts).
                        </p>
                      </div>
                      <button
                        onClick={loadMerit}
                        className="px-4 py-2 rounded-xl bg-purple-100 text-purple-900 font-bold text-xs hover:bg-purple-200 transition-colors"
                      >
                        🔄 Refresh Standings
                      </button>
                    </div>

                    <div className="bg-white rounded-2xl border border-sand-dark shadow-sm overflow-hidden">
                      {loadingMerit ? (
                        <div className="p-8 text-center text-xs text-fairway/60">Loading season standings...</div>
                      ) : meritData?.standings.length === 0 ? (
                        <div className="p-8 text-center text-xs text-fairway/60">No tournament points recorded yet this season.</div>
                      ) : (
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-mist text-[10px] font-mono uppercase tracking-wider text-fairway/70 border-b border-sand">
                              <th className="py-3 px-4 w-14 text-center">Rank</th>
                              <th className="py-3 px-4">Golfer</th>
                              <th className="py-3 px-4 text-center">HCP</th>
                              <th className="py-3 px-4 text-center">Events</th>
                              <th className="py-3 px-4 text-center">Wins</th>
                              <th className="py-3 px-4 text-center">Top 10s</th>
                              <th className="py-3 px-4 text-right">Season Earnings</th>
                              <th className="py-3 px-4 text-right font-black">Points</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-sand">
                            {meritData?.standings.map((m) => (
                              <tr key={m.golferName} className="hover:bg-mist/40 transition-colors">
                                <td className="py-3.5 px-4 text-center font-display font-black text-sm text-fairway">
                                  {m.rank === 1 ? "🥇 1" : m.rank === 2 ? "🥈 2" : m.rank === 3 ? "🥉 3" : m.rank}
                                </td>
                                <td className="py-3.5 px-4 font-bold text-fairway">{m.golferName}</td>
                                <td className="py-3.5 px-4 text-center font-mono">
                                  {m.handicapIndex !== null && m.handicapIndex !== undefined ? m.handicapIndex.toFixed(1) : "—"}
                                </td>
                                <td className="py-3.5 px-4 text-center font-mono font-medium">{m.tournamentsPlayed}</td>
                                <td className="py-3.5 px-4 text-center font-mono font-bold text-amber-700">{m.wins}</td>
                                <td className="py-3.5 px-4 text-center font-mono">{m.top10s}</td>
                                <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700">
                                  {currencySymbol}{m.totalEarnings.toLocaleString()}
                                </td>
                                <td className="py-3.5 px-4 text-right font-display font-black text-base text-purple-900">
                                  {m.totalPoints.toLocaleString()} <span className="text-[10px] font-sans text-purple-700">pts</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-12 border border-sand-dark shadow-sm text-center space-y-3">
                <div className="text-4xl">⛳</div>
                <h3 className="font-display font-bold text-lg text-fairway">Select a Tournament</h3>
                <p className="text-xs text-fairway/60">
                  Select a tournament from the left or create a new one to manage pairings, flights, and leaderboards.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* MODAL: Auto-Flight */}
        {autoFlightModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-sand-dark shadow-2xl w-full max-w-lg p-6 space-y-4 font-sans text-fairway">
              <div className="flex items-center justify-between border-b border-sand pb-3">
                <h3 className="font-display font-bold text-xl text-fairway">
                  🏆 Auto-Assign Flights by Handicap
                </h3>
                <button
                  type="button"
                  onClick={() => setAutoFlightModalOpen(false)}
                  className="text-fairway/60 hover:text-fairway text-lg"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                {flightRules.map((rule, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-mist rounded-xl border border-sand">
                    <input
                      type="text"
                      value={rule.flightName}
                      onChange={(e) => {
                        const next = [...flightRules];
                        next[idx].flightName = e.target.value;
                        setFlightRules(next);
                      }}
                      className="flex-1 px-3 py-2 rounded-xl border border-sand-dark bg-white font-bold"
                    />
                    <input
                      type="number"
                      step="0.1"
                      value={rule.minHandicap}
                      onChange={(e) => {
                        const next = [...flightRules];
                        next[idx].minHandicap = parseFloat(e.target.value) || 0;
                        setFlightRules(next);
                      }}
                      className="w-16 px-2 py-2 rounded-xl border border-sand-dark font-mono text-center"
                    />
                    <span>to</span>
                    <input
                      type="number"
                      step="0.1"
                      value={rule.maxHandicap}
                      onChange={(e) => {
                        const next = [...flightRules];
                        next[idx].maxHandicap = parseFloat(e.target.value) || 0;
                        setFlightRules(next);
                      }}
                      className="w-16 px-2 py-2 rounded-xl border border-sand-dark font-mono text-center"
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-sand">
                <button
                  type="button"
                  onClick={() => setAutoFlightModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-fairway/60 hover:text-fairway"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyAutoFlight}
                  disabled={applyingFlight}
                  className="px-5 py-2.5 rounded-xl bg-fairway text-white text-xs font-bold hover:bg-fairway-dark transition-all disabled:opacity-50"
                >
                  {applyingFlight ? "Applying..." : "⚡ Auto-Flight Field"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Side Contests */}
        {sideContestModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <form
              onSubmit={handleSaveSideContests}
              className="bg-white rounded-3xl border border-sand-dark shadow-2xl w-full max-w-md p-6 space-y-4 font-sans text-fairway"
            >
              <div className="flex items-center justify-between border-b border-sand pb-3">
                <h3 className="font-display font-bold text-xl text-fairway">
                  🎯 Side Contests &amp; Purse
                </h3>
                <button
                  type="button"
                  onClick={() => setSideContestModalOpen(false)}
                  className="text-fairway/60 hover:text-fairway text-lg"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-fairway block mb-1">💰 Total Prize Purse ({currencySymbol})</label>
                  <input
                    type="number"
                    value={contestPurse}
                    onChange={(e) => setContestPurse(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-sand-dark font-mono font-bold"
                  />
                </div>

                <div className="p-3 bg-mist rounded-xl space-y-2">
                  <label className="font-bold text-fairway block">🎯 Closest to Pin (CTP)</label>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1">
                      <label className="text-[10px] text-fairway/60">Hole #</label>
                      <input
                        type="number"
                        value={ctpHole}
                        onChange={(e) => setCtpHole(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-sand-dark font-mono"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] text-fairway/60">Winner Name</label>
                      <input
                        type="text"
                        value={ctpWinner}
                        onChange={(e) => setCtpWinner(e.target.value)}
                        placeholder="e.g. John Doe (3ft 2in)"
                        className="w-full px-2 py-1.5 rounded-lg border border-sand-dark"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-mist rounded-xl space-y-2">
                  <label className="font-bold text-fairway block">⛳ Longest Drive (LD)</label>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1">
                      <label className="text-[10px] text-fairway/60">Hole #</label>
                      <input
                        type="number"
                        value={ldHole}
                        onChange={(e) => setLdHole(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-sand-dark font-mono"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] text-fairway/60">Winner Name</label>
                      <input
                        type="text"
                        value={ldWinner}
                        onChange={(e) => setLdWinner(e.target.value)}
                        placeholder="e.g. Mike Smith (312 yds)"
                        className="w-full px-2 py-1.5 rounded-lg border border-sand-dark"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-sand">
                <button
                  type="button"
                  onClick={() => setSideContestModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-fairway/60 hover:text-fairway"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSideContests}
                  className="px-5 py-2.5 rounded-xl bg-fairway text-white text-xs font-bold hover:bg-fairway-dark transition-all disabled:opacity-50"
                >
                  {savingSideContests ? "Saving..." : "Save Contests"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* MODAL: Cut Line Manager */}
        {cutModalOpen && selectedTournament && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <form
              onSubmit={handleApplyCutSubmit}
              className="bg-white rounded-3xl border border-sand-dark shadow-2xl w-full max-w-md p-6 space-y-4 font-sans text-fairway"
            >
              <div className="flex items-center justify-between border-b border-sand pb-3">
                <h3 className="font-display font-bold text-xl text-fairway">
                  ✂️ Execute Tournament Cut
                </h3>
                <button
                  type="button"
                  onClick={() => setCutModalOpen(false)}
                  className="text-fairway/60 hover:text-fairway text-lg"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-fairway block mb-1">Cut After Round</label>
                  <select
                    value={cutAfterRound}
                    onChange={(e) => setCutAfterRound(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-sand-dark bg-white font-bold"
                  >
                    {Array.from({ length: selectedTournament.roundsCount - 1 }).map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        Round {i + 1}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-fairway block mb-1">Cut Threshold (Top N Players)</label>
                  <input
                    type="number"
                    min={1}
                    max={selectedTournament.registrations.length}
                    value={cutRank}
                    onChange={(e) => setCutRank(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-sand-dark font-mono font-bold"
                  />
                </div>

                <div className="flex items-center gap-2 p-3 bg-mist rounded-xl border border-sand">
                  <input
                    type="checkbox"
                    id="includeTiesCheck"
                    checked={includeTies}
                    onChange={(e) => setIncludeTies(e.target.checked)}
                    className="w-4 h-4 text-fairway rounded"
                  />
                  <label htmlFor="includeTiesCheck" className="font-semibold text-fairway text-xs cursor-pointer">
                    Include Ties (Standard PGA / USGA Rule)
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-sand">
                <button
                  type="button"
                  onClick={() => setCutModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-fairway/60 hover:text-fairway"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={applyingCut}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition-all disabled:opacity-50"
                >
                  {applyingCut ? "Applying..." : "✂️ Apply Cut to Field"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* MODAL: Auto-Generate Pairings */}
        {pairingsModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <form
              onSubmit={handleGeneratePairings}
              className="bg-white rounded-3xl border border-sand-dark shadow-2xl w-full max-w-md p-6 space-y-4 font-sans text-fairway"
            >
              <div className="flex items-center justify-between border-b border-sand pb-3">
                <h3 className="font-display font-bold text-xl text-fairway">
                  ⚡ Auto-Generate Pairings
                </h3>
                <button
                  type="button"
                  onClick={() => setPairingsModalOpen(false)}
                  className="text-fairway/60 hover:text-fairway text-lg"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-fairway block mb-1">⏰ First Group Starting Tee Time</label>
                  <input
                    type="time"
                    value={firstTeeTime}
                    onChange={(e) => setFirstTeeTime(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-sand-dark font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-fairway block mb-1">Players per Group</label>
                  <select
                    value={groupSize}
                    onChange={(e) => setGroupSize(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-xl border border-sand-dark"
                  >
                    <option value={2}>2 Golfers (Twosomes)</option>
                    <option value={3}>3 Golfers (Threesomes)</option>
                    <option value={4}>4 Golfers (Foursomes - Standard)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-fairway block mb-1">Tee Time Interval (minutes)</label>
                  <input
                    type="number"
                    min={4}
                    max={20}
                    value={intervalMinutes}
                    onChange={(e) => setIntervalMinutes(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-xl border border-sand-dark font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-sand">
                <button
                  type="button"
                  onClick={() => setPairingsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-fairway/60 hover:text-fairway"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generatingPairings}
                  className="px-5 py-2.5 rounded-xl bg-gold text-fairway text-xs font-bold hover:bg-gold-light transition-all disabled:opacity-50"
                >
                  {generatingPairings ? "Generating..." : "Generate Pairings"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* MODAL: Create Tournament */}
        {createModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <form
              onSubmit={handleCreateTournament}
              className="bg-white rounded-3xl border border-sand-dark shadow-2xl w-full max-w-lg p-6 space-y-4 font-sans text-fairway"
            >
              <div className="flex items-center justify-between border-b border-sand pb-3">
                <h3 className="font-display font-bold text-xl text-fairway">
                  + Create New Tournament
                </h3>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="text-fairway/60 hover:text-fairway text-lg"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-fairway block mb-1">Tournament Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Annual Club Championship 2026"
                    className="w-full px-3 py-2 rounded-xl border border-sand-dark"
                  />
                </div>

                <div>
                  <label className="font-bold text-fairway block mb-1">Description / Rules</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tournament rules, format notes, flight details..."
                    className="w-full px-3 py-2 rounded-xl border border-sand-dark"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-fairway block mb-1">Format</label>
                    <select
                      value={format}
                      onChange={(e) => setFormat(e.target.value as TournamentFormat)}
                      className="w-full px-3 py-2 rounded-xl border border-sand-dark"
                    >
                      {FORMAT_OPTIONS.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-fairway block mb-1">Holes/Round</label>
                    <select
                      value={holesCount}
                      onChange={(e) => setHolesCount(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-sand-dark"
                    >
                      <option value="18">18 Holes</option>
                      <option value="9">9 Holes</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-fairway block mb-1">Rounds</label>
                    <select
                      value={roundsCount}
                      onChange={(e) => setRoundsCount(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-sand-dark font-bold text-emerald-800"
                    >
                      <option value="1">1 Round (18H)</option>
                      <option value="2">2 Rounds (36H)</option>
                      <option value="3">3 Rounds (54H)</option>
                      <option value="4">4 Rounds (72H)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-fairway block mb-1">Start Date &amp; Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-sand-dark font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-fairway block mb-1">End Date &amp; Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-sand-dark font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-fairway block mb-1">Entry Fee ({currencySymbol})</label>
                    <input
                      type="number"
                      value={entryFee}
                      onChange={(e) => setEntryFee(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-sand-dark font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-fairway block mb-1">Purse ({currencySymbol})</label>
                    <input
                      type="number"
                      value={prizePurse}
                      onChange={(e) => setPrizePurse(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-sand-dark font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-fairway block mb-1">Max Players</label>
                    <input
                      type="number"
                      value={maxParticipants}
                      onChange={(e) => setMaxParticipants(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-sand-dark font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-sand">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-fairway/60 hover:text-fairway"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2.5 rounded-xl bg-fairway text-white text-xs font-bold hover:bg-fairway-dark transition-all disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create Tournament"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* MODAL: Enroll Golfer */}
        {enrollModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <form
              onSubmit={handleEnrollPlayer}
              className="bg-white rounded-3xl border border-sand-dark shadow-2xl w-full max-w-md p-6 space-y-4 font-sans text-fairway"
            >
              <div className="flex items-center justify-between border-b border-sand pb-3">
                <h3 className="font-display font-bold text-xl text-fairway">
                  + Enroll Golfer
                </h3>
                <button
                  type="button"
                  onClick={() => setEnrollModalOpen(false)}
                  className="text-fairway/60 hover:text-fairway text-lg"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                {registeredGolfers.length > 0 && (
                  <div>
                    <label className="font-bold text-fairway block mb-1">Quick Select Club Member</label>
                    <select
                      onChange={(e) => handleSelectRegisteredGolfer(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-sand-dark bg-mist text-fairway font-medium"
                    >
                      <option value="">— Select from Member Directory —</option>
                      {registeredGolfers.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.firstName} {g.lastName} ({g.email}) {g.handicapIndex ? `· HCP ${g.handicapIndex}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="font-bold text-fairway block mb-1">Golfer Full Name</label>
                  <input
                    type="text"
                    required
                    value={enrollName}
                    onChange={(e) => setEnrollName(e.target.value)}
                    placeholder="e.g. Tiger Woods"
                    className="w-full px-3 py-2 rounded-xl border border-sand-dark"
                  />
                </div>

                <div>
                  <label className="font-bold text-fairway block mb-1">Golfer Email</label>
                  <input
                    type="email"
                    required
                    value={enrollEmail}
                    onChange={(e) => setEnrollEmail(e.target.value)}
                    placeholder="golfer@example.com"
                    className="w-full px-3 py-2 rounded-xl border border-sand-dark font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-fairway block mb-1">Handicap Index</label>
                    <input
                      type="number"
                      step="0.1"
                      value={enrollHandicap}
                      onChange={(e) => setEnrollHandicap(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-sand-dark font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-fairway block mb-1">Division / Flight</label>
                    <input
                      type="text"
                      value={enrollFlight}
                      onChange={(e) => setEnrollFlight(e.target.value)}
                      placeholder="e.g. Flight A"
                      className="w-full px-3 py-2 rounded-xl border border-sand-dark"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-fairway block mb-1">Entry Fee Status</label>
                  <select
                    value={enrollPaymentStatus}
                    onChange={(e) => setEnrollPaymentStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-sand-dark"
                  >
                    <option value="Paid">Mark as Paid ({currencySymbol}{selectedTournament?.entryFee.toFixed(2)})</option>
                    <option value="Unpaid">Unpaid / Pay at Pro Shop</option>
                    <option value="Free">Complimentary / Free Entry</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-sand">
                <button
                  type="button"
                  onClick={() => setEnrollModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-fairway/60 hover:text-fairway"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={enrolling}
                  className="px-5 py-2.5 rounded-xl bg-fairway text-white text-xs font-bold hover:bg-fairway-dark transition-all disabled:opacity-50"
                >
                  {enrolling ? "Enrolling..." : "Enroll Player"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* MODAL: Printable Tournament Collateral Suite */}
        {printModalOpen && selectedTournament && (
          <TournamentPrintCollateralModal
            isOpen={printModalOpen}
            onClose={() => setPrintModalOpen(false)}
            tournament={selectedTournament}
            tenantName={tenantName}
          />
        )}

        {/* MODAL: 18-Hole Digital Championship Scorecard Matrix */}
        {scorecardModalOpen && activeScorecardPlayer && selectedTournament && (
          <TournamentScorecardModal
            isOpen={scorecardModalOpen}
            onClose={() => setScorecardModalOpen(false)}
            tenantId={tenantId}
            tournamentId={selectedTournament.id}
            registrationId={activeScorecardPlayer.id}
            golferName={activeScorecardPlayer.name}
            handicapIndex={activeScorecardPlayer.handicap}
            holesCount={selectedTournament.holesCount}
            roundsCount={selectedTournament.roundsCount}
            currentRound={selectedTournament.currentRound}
            initialScores={activeScorecardPlayer.scores}
            token={token}
            onScoresSaved={() => {
              loadDetail(selectedTournament.id);
            }}
          />
        )}
      </div>
    </AdminLayout>
  );
}

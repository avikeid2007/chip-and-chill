import { apiFetch } from "./client";
import type {
  TournamentSummary,
  TournamentDetail,
  TournamentRegistration,
  TournamentLeaderboardRow,
  TournamentFormat,
  TournamentStatus,
  AutoFlightRule,
  TournamentSkinsSummary,
  TournamentPayoutsResponse,
  OrderOfMeritResponse,
} from "../types";

export interface CreateTournamentDto {
  name: string;
  description?: string;
  format: TournamentFormat;
  startDate: string;
  endDate: string;
  entryFee: number;
  maxParticipants: number;
  holesCount: number;
  isPublic: boolean;
  prizePurse?: number;
  roundsCount?: number;
}

export interface UpdateTournamentDto {
  name?: string;
  description?: string;
  format?: TournamentFormat;
  status?: TournamentStatus;
  startDate?: string;
  endDate?: string;
  entryFee?: number;
  maxParticipants?: number;
  holesCount?: number;
  isPublic?: boolean;
  prizePurse?: number;
  closestToPinHole?: number | null;
  closestToPinWinner?: string | null;
  longestDriveHole?: number | null;
  longestDriveWinner?: string | null;
  roundsCount?: number;
  currentRound?: number;
  cutRule?: string | null;
}

export interface UpdateSideContestsDto {
  closestToPinHole?: number | null;
  closestToPinWinner?: string | null;
  longestDriveHole?: number | null;
  longestDriveWinner?: string | null;
  prizePurse?: number;
}

export interface RegisterTournamentDto {
  golferName: string;
  golferEmail: string;
  handicapIndex?: number;
  flight?: string;
}

export interface PostScoreDto {
  registrationId: string;
  holeNumber: number;
  grossScore: number;
  par: number;
  roundNumber?: number;
}

export interface BatchScoresDto {
  registrationId: string;
  scores: { holeNumber: number; grossScore: number; par: number }[];
  roundNumber?: number;
}

export interface GeneratePairingsDto {
  playersPerGroup: number;
  intervalMinutes: number;
  firstTeeTime?: string;
}

export interface ApplyCutDto {
  cutRank: number;
  includeTies: boolean;
  afterRound: number;
}

export const tournamentApi = {
  getTournaments: (tenantId: string, status?: TournamentStatus, token?: string | null) => {
    const query = status ? `?status=${status}` : "";
    return apiFetch<TournamentSummary[]>(`/api/tenants/${tenantId}/tournaments${query}`, {}, token, tenantId);
  },

  getTournament: (tenantId: string, tournamentId: string, token?: string | null) =>
    apiFetch<TournamentDetail>(`/api/tenants/${tenantId}/tournaments/${tournamentId}`, {}, token, tenantId),

  getTournamentDirect: (tournamentId: string, token?: string | null) =>
    apiFetch<TournamentDetail>(`/api/tournaments/${tournamentId}`, {}, token),

  createTournament: (tenantId: string, data: CreateTournamentDto, token?: string | null) =>
    apiFetch<TournamentSummary>(
      `/api/tenants/${tenantId}/tournaments`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      token,
      tenantId
    ),

  updateTournament: (tenantId: string, tournamentId: string, data: UpdateTournamentDto, token?: string | null) =>
    apiFetch<TournamentSummary>(
      `/api/tenants/${tenantId}/tournaments/${tournamentId}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
      token,
      tenantId
    ),

  updateSideContests: (tenantId: string, tournamentId: string, data: UpdateSideContestsDto, token?: string | null) =>
    apiFetch<TournamentDetail>(
      `/api/tenants/${tenantId}/tournaments/${tournamentId}/side-contests`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
      token,
      tenantId
    ),

  setCurrentRound: (tenantId: string, tournamentId: string, roundNumber: number, token?: string | null) =>
    apiFetch<{ success: boolean; currentRound: number }>(
      `/api/tenants/${tenantId}/tournaments/${tournamentId}/current-round`,
      {
        method: "PUT",
        body: JSON.stringify({ roundNumber }),
      },
      token,
      tenantId
    ),

  applyCut: (tenantId: string, tournamentId: string, data: ApplyCutDto, token?: string | null) =>
    apiFetch<TournamentDetail>(
      `/api/tenants/${tenantId}/tournaments/${tournamentId}/cut`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      token,
      tenantId
    ),

  deleteTournament: (tenantId: string, tournamentId: string, token?: string | null) =>
    apiFetch<void>(
      `/api/tenants/${tenantId}/tournaments/${tournamentId}`,
      {
        method: "DELETE",
      },
      token,
      tenantId
    ),

  register: (tenantId: string, tournamentId: string, data: RegisterTournamentDto, token?: string | null) =>
    apiFetch<TournamentRegistration>(
      `/api/tenants/${tenantId}/tournaments/${tournamentId}/register`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      token,
      tenantId
    ),

  updateFlight: (tenantId: string, tournamentId: string, regId: string, flight: string | null, token?: string | null) =>
    apiFetch<TournamentRegistration>(
      `/api/tenants/${tenantId}/tournaments/${tournamentId}/registrations/${regId}/flight`,
      {
        method: "PUT",
        body: JSON.stringify({ flight }),
      },
      token,
      tenantId
    ),

  autoFlight: (tenantId: string, tournamentId: string, rules: AutoFlightRule[], token?: string | null) =>
    apiFetch<TournamentRegistration[]>(
      `/api/tenants/${tenantId}/tournaments/${tournamentId}/auto-flight`,
      {
        method: "POST",
        body: JSON.stringify({ rules }),
      },
      token,
      tenantId
    ),

  confirmSandboxPayment: (tenantId: string, tournamentId: string, regId: string, token?: string | null) =>
    apiFetch<TournamentRegistration>(
      `/api/tenants/${tenantId}/tournaments/${tournamentId}/registrations/${regId}/confirm-sandbox-payment`,
      {
        method: "POST",
      },
      token,
      tenantId
    ),

  generatePairings: (tenantId: string, tournamentId: string, data: GeneratePairingsDto, token?: string | null) =>
    apiFetch<TournamentRegistration[]>(
      `/api/tenants/${tenantId}/tournaments/${tournamentId}/generate-pairings`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      token,
      tenantId
    ),

  updateRegistrationPairing: (
    tenantId: string,
    tournamentId: string,
    registrationId: string,
    data: { pairingGroup: number | null; teeTime?: string | null },
    token?: string | null
  ) =>
    apiFetch<TournamentRegistration>(
      `/api/tenants/${tenantId}/tournaments/${tournamentId}/registrations/${registrationId}/pairing`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
      token,
      tenantId
    ),

  batchUpdatePairings: (
    tenantId: string,
    tournamentId: string,
    data: { assignments: { registrationId: string; pairingGroup: number | null; teeTime?: string | null }[] },
    token?: string | null
  ) =>
    apiFetch<TournamentRegistration[]>(
      `/api/tenants/${tenantId}/tournaments/${tournamentId}/pairings/batch`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
      token,
      tenantId
    ),

  clearPairings: (tenantId: string, tournamentId: string, token?: string | null) =>
    apiFetch<TournamentRegistration[]>(
      `/api/tenants/${tenantId}/tournaments/${tournamentId}/pairings`,
      {
        method: "DELETE",
      },
      token,
      tenantId
    ),

  postScore: (tenantId: string, tournamentId: string, data: PostScoreDto, token?: string | null) =>
    apiFetch<void>(
      `/api/tenants/${tenantId}/tournaments/${tournamentId}/scores`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      token,
      tenantId
    ),

  batchPostScores: (tenantId: string, tournamentId: string, data: BatchScoresDto, token?: string | null) =>
    apiFetch<void>(
      `/api/tenants/${tenantId}/tournaments/${tournamentId}/scores/batch`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      token,
      tenantId
    ),

  getLeaderboard: (tenantId: string, tournamentId: string, flight?: string, token?: string | null) => {
    const query = flight ? `?flight=${encodeURIComponent(flight)}` : "";
    return apiFetch<TournamentLeaderboardRow[]>(
      `/api/tenants/${tenantId}/tournaments/${tournamentId}/leaderboard${query}`,
      {},
      token,
      tenantId
    );
  },

  getSkins: (tenantId: string, tournamentId: string, flight?: string, token?: string | null) => {
    const query = flight ? `?flight=${encodeURIComponent(flight)}` : "";
    return apiFetch<TournamentSkinsSummary>(
      `/api/tenants/${tenantId}/tournaments/${tournamentId}/skins${query}`,
      {},
      token,
      tenantId
    );
  },

  getPayouts: (tenantId: string, tournamentId: string, customPurse?: number, token?: string | null) => {
    const query = customPurse !== undefined ? `?customPurse=${customPurse}` : "";
    return apiFetch<TournamentPayoutsResponse>(
      `/api/tenants/${tenantId}/tournaments/${tournamentId}/payouts${query}`,
      {},
      token,
      tenantId
    );
  },

  getOrderOfMerit: (tenantId?: string | null, token?: string | null) => {
    const path = tenantId ? `/api/tenants/${tenantId}/tournaments/order-of-merit` : `/api/tournaments/order-of-merit`;
    return apiFetch<OrderOfMeritResponse>(path, {}, token, tenantId);
  },
};

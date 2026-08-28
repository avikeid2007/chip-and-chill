import { apiFetch } from "./client";
import type {
  TournamentSummary,
  TournamentDetail,
  TournamentRegistration,
  TournamentLeaderboardRow,
  TournamentFormat,
  TournamentStatus,
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
}

export interface RegisterTournamentDto {
  golferName: string;
  golferEmail: string;
  handicapIndex?: number;
}

export interface PostScoreDto {
  registrationId: string;
  holeNumber: number;
  grossScore: number;
  par: number;
}

export interface BatchScoresDto {
  registrationId: string;
  scores: { holeNumber: number; grossScore: number; par: number }[];
}

export interface GeneratePairingsDto {
  playersPerGroup: number;
  intervalMinutes: number;
  firstTeeTime?: string;
}

export const tournamentApi = {
  getTournaments: (tenantId: string, status?: TournamentStatus, token?: string | null) => {
    const query = status ? `?status=${status}` : "";
    return apiFetch<TournamentSummary[]>(`/api/tenants/${tenantId}/tournaments${query}`, {}, token, tenantId);
  },

  getTournament: (tenantId: string, tournamentId: string, token?: string | null) =>
    apiFetch<TournamentDetail>(`/api/tenants/${tenantId}/tournaments/${tournamentId}`, {}, token, tenantId),

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

  getLeaderboard: (tenantId: string, tournamentId: string, token?: string | null) =>
    apiFetch<TournamentLeaderboardRow[]>(
      `/api/tenants/${tenantId}/tournaments/${tournamentId}/leaderboard`,
      {},
      token,
      tenantId
    ),
};

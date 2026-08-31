import { apiFetch } from "./client";

export interface RoundHoleInput {
  holeNumber: number;
  par: number;
  strokes: number;
}

export interface Round {
  id: string;
  tenantId: string;
  playedOn: string;
  teeBox: string;
  handicapDifferential?: number | null;
  courseRating?: number;
  slopeRating?: number;
  holes: RoundHoleInput[];
}

export interface TrendPoint {
  playedOn: string;
  strokes: number;
  par: number;
  differential?: number | null;
  /** Number of holes played. Used to distinguish 9-hole vs 18-hole rounds in charts. */
  holeCount?: number;
}

export interface HoleStat {
  holeNumber: number;
  avgStrokes: number;
  avgPar: number;
  birdies: number;
  pars: number;
  bogeys: number;
  doublesOrWorse: number;
}

export interface Stats {
  handicapIndex?: number | null;
  averageScore?: number | null;
  averageToPar?: number | null;
  roundsPlayed: number;
  bestRound?: { roundId: string; playedOn: string; strokes: number; par: number } | null;
  trend: TrendPoint[];
  holes: HoleStat[];
  full18Rounds: number;
}

export const roundsApi = {
  mine: (token: string) => apiFetch<Round[]>("/api/rounds/mine", {}, token),

  getById: (id: string, token: string) => apiFetch<Round>(`/api/rounds/${id}`, {}, token),

  create: (
    data: {
      tenantId: string;
      playedOn: string;
      teeBox: string;
      holes: RoundHoleInput[];
      courseRating?: number;
      slopeRating?: number;
    },
    token: string
  ) => apiFetch<Round>("/api/rounds", { method: "POST", body: JSON.stringify(data) }, token),

  stats: (token: string) => apiFetch<Stats>("/api/rounds/stats", {}, token),
};

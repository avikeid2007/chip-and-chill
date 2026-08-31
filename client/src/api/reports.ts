import { apiFetch } from "./client";

export interface DailyRevenuePoint {
  date: string;        // "2026-08-01"
  tee: number;
  range: number;
}

export interface RevenueReport {
  totalRevenue: number;
  teeRevenue: number;
  rangeRevenue: number;
  previousPeriodRevenue: number;
  previousTeePeriodRevenue: number;
  previousRangePeriodRevenue: number;

  totalBookings: number;
  checkedIn: number;
  cancelled: number;
  occupancyPercent: number;
  averagePartySize: number;

  daily: DailyRevenuePoint[];
}

export interface HourlyDistribution {
  hour: number;
  hourLabel: string;
  totalSlots: number;
  bookedSlots: number;
  totalGolfers: number;
  occupancyPercent: number;
  revenue: number;
}

export interface TimeOfDayBucket {
  name: string;
  timeRange: string;
  totalSlots: number;
  bookedSlots: number;
  totalGolfers: number;
  occupancyPercent: number;
  revenue: number;
}

export interface DayOfWeekDistribution {
  day: string;
  shortDay: string;
  totalSlots: number;
  bookedSlots: number;
  totalGolfers: number;
  occupancyPercent: number;
  revenue: number;
}

export interface TeeSheetReport {
  totalSlots: number;
  bookedSlots: number;
  totalGolfers: number;
  overallOccupancyPercent: number;
  weekdayOccupancyPercent: number;
  weekendOccupancyPercent: number;
  checkInRate: number;
  cancellationRate: number;
  averagePartySize: number;
  hourly: HourlyDistribution[];
  timeOfDay: TimeOfDayBucket[];
  daysOfWeek: DayOfWeekDistribution[];
}

export interface TopGolfer {
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  roundsPlayed: number;
  bookingsCount: number;
  totalSpend: number;
  handicapIndex?: number | null;
  bestRoundScore?: number | null;
}

export interface HandicapBucket {
  rangeLabel: string;
  count: number;
  percentage: number;
}

export interface ScoreDistribution {
  eaglesOrBetter: number;
  birdies: number;
  pars: number;
  bogeys: number;
  doubleBogeysOrWorse: number;
}

export interface GolfersReport {
  totalUniqueGolfers: number;
  totalRoundsPlayed: number;
  rounds9Hole: number;
  rounds18Hole: number;
  averageRoundScore: number;
  averageScoreToPar: number;
  totalRegisteredMembers: number;
  topGolfers: TopGolfer[];
  handicapDistribution: HandicapBucket[];
  scoringBreakdown: ScoreDistribution;
}

export interface BayPerformance {
  bayId: string;
  bayNumber: number;
  bayName: string;
  isOutdoor: boolean;
  hasLaunchMonitor: boolean;
  hourlyRate: number;
  sessionsCount: number;
  totalHours: number;
  totalRevenue: number;
  utilizationPercent: number;
}

export interface TournamentPerformance {
  id: string;
  name: string;
  format: string;
  status: string;
  startDate: string;
  endDate: string;
  participantsCount: number;
  maxParticipants: number;
  entryFee: number;
  revenueCollected: number;
  prizePurse: number;
  closestToPinWinner?: string | null;
  longestDriveWinner?: string | null;
}

export interface RangeTournamentsReport {
  totalRangeSessions: number;
  totalRangeRevenue: number;
  totalPracticeHours: number;
  averageSessionDurationMinutes: number;
  trackManSessions: number;
  trackManRevenue: number;
  standardSessions: number;
  standardRevenue: number;
  totalTournaments: number;
  totalParticipants: number;
  totalTournamentRevenue: number;
  totalPrizePurse: number;
  bays: BayPerformance[];
  tournaments: TournamentPerformance[];
}

export const reportsApi = {
  revenue: (tenantId: string, days: number, token: string): Promise<RevenueReport> =>
    apiFetch<RevenueReport>(
      `/api/tenants/${tenantId}/reports/revenue?days=${days}`,
      {},
      token,
      tenantId
    ),

  teeSheet: (tenantId: string, days: number, token: string): Promise<TeeSheetReport> =>
    apiFetch<TeeSheetReport>(
      `/api/tenants/${tenantId}/reports/tee-sheet?days=${days}`,
      {},
      token,
      tenantId
    ),

  golfers: (tenantId: string, days: number, token: string): Promise<GolfersReport> =>
    apiFetch<GolfersReport>(
      `/api/tenants/${tenantId}/reports/golfers?days=${days}`,
      {},
      token,
      tenantId
    ),

  rangeAndTournaments: (tenantId: string, days: number, token: string): Promise<RangeTournamentsReport> =>
    apiFetch<RangeTournamentsReport>(
      `/api/tenants/${tenantId}/reports/range-tournaments?days=${days}`,
      {},
      token,
      tenantId
    ),
};

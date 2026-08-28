export type PricingDays =
  | "All"
  | "Weekday"
  | "Weekend"
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

export interface PricingRule {
  id: string;
  tenantId: string;
  name: string;
  days: PricingDays;
  startTime?: string | null;
  endTime?: string | null;
  price: number;
  priority: number;
  isActive: boolean;
  createdAt: string;
}

export type PaymentStatus = "Unpaid" | "Paid" | "Refunded";

export interface StripeStatus {
  isConnected: boolean;
  accountId?: string | null;
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
  requirePaymentUpfront: boolean;
}

export interface CheckoutSession {
  sessionId: string;
  checkoutUrl?: string | null;
  mode: "Stripe" | "Sandbox";
  amount: number;
  currency: string;
}

export interface ResolvedTenant {
  id: string;
  name: string;
  subdomain?: string | null;
  customDomain?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  requirePaymentUpfront: boolean;
  stripeChargesEnabled: boolean;
  timezone: string;
  currency: string;
  currencySymbol: string;
  address?: string | null;
  description?: string | null;
}

export interface TeeSlot {
  id: string;
  startTime?: string;
  time?: string;
  playersBooked?: number;
  bookedPlayers?: number;
  playersMax?: number;
  maxPlayers?: number;
  price: number;
  status: "open" | "low" | "full" | "blocked";
}

export interface Course {
  id: string;
  name: string;
  location?: string;
  address?: string;
  holes?: number;
  image?: string;
  logoUrl?: string;
  primaryColor?: string;
  currency?: string;
  currencySymbol?: string;
}

export interface ScorecardHole {
  hole: number;
  par: number;
  score: number;
}

export interface LeaderboardEntry {
  rank: number;
  player: string;
  thru: number;
  toPar: number;
}

// Tournament Types
export type TournamentFormat = "StrokePlay" | "Stableford" | "Scramble" | "MatchPlay";
export type TournamentStatus = "Upcoming" | "InProgress" | "Completed" | "Cancelled";
export type TournamentRegistrationStatus = "Registered" | "Confirmed" | "Withdrawn";
export type TournamentPaymentStatus = "Unpaid" | "Paid" | "Refunded" | "Free";

export interface TournamentSummary {
  id: string;
  tenantId: string;
  name: string;
  description?: string | null;
  format: TournamentFormat;
  status: TournamentStatus;
  startDate: string;
  endDate: string;
  entryFee: number;
  maxParticipants: number;
  registeredCount: number;
  holesCount: number;
  isPublic: boolean;
  createdAt: string;
}

export interface TournamentRegistration {
  id: string;
  tournamentId: string;
  userId?: string | null;
  golferName: string;
  golferEmail: string;
  handicapIndex?: number | null;
  status: TournamentRegistrationStatus;
  paymentStatus: TournamentPaymentStatus;
  amountPaid: number;
  pairingGroup?: number | null;
  teeTime?: string | null;
  registeredAt: string;
}

export interface TournamentLeaderboardRow {
  rank: number;
  registrationId: string;
  userId?: string | null;
  golferName: string;
  handicapIndex?: number | null;
  thruHoles: number;
  totalGross: number;
  toPar: number;
  stablefordPoints: number;
  eagles: number;
  birdies: number;
  pars: number;
  bogeys: number;
  doublePlus: number;
  pairingGroup?: number | null;
  teeTime?: string | null;
}

export interface TournamentDetail extends TournamentSummary {
  registrations: TournamentRegistration[];
  leaderboard: TournamentLeaderboardRow[];
}

// Driving Range Types
export interface RangeBay {
  id: string;
  tenantId: string;
  bayNumber: number;
  name: string;
  isOutdoor: boolean;
  hasLaunchMonitor: boolean;
  hourlyRate: number;
  isActive: boolean;
  createdAt: string;
}

export type BayBookingStatus = "Confirmed" | "Active" | "Completed" | "Cancelled";
export type BayPaymentStatus = "Unpaid" | "Paid" | "Refunded";

export interface BayBooking {
  id: string;
  tenantId: string;
  rangeBayId: string;
  bayName: string;
  bayNumber: number;
  userId?: string | null;
  golferName: string;
  golferEmail: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  status: BayBookingStatus;
  price: number;
  paymentStatus: BayPaymentStatus;
  amountPaid: number;
  createdAt: string;
}

export interface RangeAvailabilitySlot {
  rangeBayId: string;
  bayNumber: number;
  bayName: string;
  hasLaunchMonitor: boolean;
  isOutdoor: boolean;
  price: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export interface BayLiveStatusItem {
  bayId: string;
  bayNumber: number;
  name: string;
  hasLaunchMonitor: boolean;
  isOutdoor: boolean;
  isActive: boolean;
  status: "Available" | "Occupied" | "Maintenance";
  currentBookingId?: string | null;
  golferName?: string | null;
  sessionStartTime?: string | null;
  sessionEndTime?: string | null;
  remainingMinutes?: number | null;
  totalDurationMinutes?: number | null;
}

export interface RangeLiveStatus {
  totalBays: number;
  occupiedBays: number;
  availableBays: number;
  maintenanceBays: number;
  bays: BayLiveStatusItem[];
}

// Course Admin Golfer Directory Types
export interface TenantGolferSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string | null;
  handicapIndex?: number | null;
  memberSince?: string | null;
  totalBookings: number;
  totalTournaments: number;
  totalRangeBookings: number;
  totalRounds: number;
  lifetimeSpend: number;
  lastActivityAt?: string | null;
}

export interface TenantGolferRecentBooking {
  bookingId: string;
  date: string;
  startTime: string;
  partySize: number;
  status: string;
  price: number;
  paymentStatus: string;
}

export interface TenantGolferRecentTournament {
  tournamentId: string;
  tournamentName: string;
  format: string;
  startDate: string;
  registrationStatus: string;
  paymentStatus: string;
  rank?: number | null;
  toPar?: number | null;
}

export interface TenantGolferRecentRange {
  bookingId: string;
  bayName: string;
  startTime: string;
  durationMinutes: number;
  status: string;
  price: number;
}

export interface TenantGolferDetail extends TenantGolferSummary {
  recentBookings: TenantGolferRecentBooking[];
  recentTournaments: TenantGolferRecentTournament[];
  recentRangeSessions: TenantGolferRecentRange[];
}

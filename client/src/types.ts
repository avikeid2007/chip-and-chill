export interface TeeSlot {
  id: string;
  time: string;
  playersBooked: number;
  playersMax: number;
  price: number;
  status: "open" | "low" | "full";
}

export interface Course {
  id: string;
  name: string;
  location: string;
  holes: number;
  image?: string;
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

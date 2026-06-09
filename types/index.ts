export interface User {
  uid: string;
  name: string;
  photoURL?: string;
  state: string;
  district: string;
  isAnonymous: boolean;
  totalDonated: number;
  currentWeekDonated: number;
  streak: number;
  badges: string[];
  boostActive?: boolean;
  boostExpiry?: any;
  rivals: string[];
  streakFreezes?: number;
  timeline?: TimelineItem[];
  upgrades?: UserUpgrades;
  bestRank?: number;
  lastDonationWeek?: string;
  createdAt: Date;
}

export interface TimelineItem {
  icon: string;
  title: string;
  description: string;
  date: any;
  milestone?: boolean;
}

export interface UserUpgrades {
  animatedBorder?: boolean;
  badgeColor?: string;
  boldName?: boolean;
}

export interface Donation {
  id: string;
  userId: string;
  amount: number;
  week: string;
  state: string;
  district: string;
  createdAt: Date;
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  amount: number;
  state: string;
  district: string;
  isAnonymous: boolean;
  rank: number;
}

export interface Request {
  id: string;
  userId: string;
  userName: string;
  title: string;
  description: string;
  category: string;
  isAnonymous: boolean;
  location: {
    city: string;
    area: string;
    address?: string;
    state: string;
    pinCode: string;
  };
  preferredDate: any;
  preferredTime: string;
  isFlexible: boolean;
  additionalNotes?: string;
  status:
    | "pending_review"
    | "quote_sent"
    | "accepted"
    | "rejected"
    | "in_progress"
    | "completed"
    | "cancelled";
  quote?: {
    amount: number;
    message: string;
    sentAt: any;
  } | null;
  payment?: {
    paymentId: string;
    paidAt: any;
    amount: number;
  };
  proof?: {
    fileUrl: string;
    note: string;
    completedAt: any;
  };
  createdAt: any;
}

export interface MadeMyDayComment {
  id: string;
  userId: string;
  displayName: string;
  text: string;
  createdAt: any;
}

export interface MadeMyDayPost {
  id: string;
  userId: string;
  displayName: string;
  isAnonymous: boolean;
  requestId: string;
  requestType: string;
  title: string;
  story: string;
  rating: number;
  emotionTags: string[];
  photoURL?: string;
  videoURL?: string;
  isSurpriseReveal: boolean;
  surpriseFrom?: string;
  likes: number;
  likedBy: string[];
  comments: MadeMyDayComment[];
  viralScore: number;
  weekNumber: string;
  weeklyVotes: number;
  isWholesomeWinner: boolean;
  mapLocation: {
    state: string;
    district: string;
    lat?: number;
    lng?: number;
  };
  createdAt: any;
}

export interface Campaign {
  id: string;
  title: string;
  description: string;
  theme: string;
  type: "monthly" | "emergency" | "district_duel";
  status: "active" | "completed" | "upcoming";
  startDate: any;
  endDate: any;
  targetAmount: number;
  totalRaised: number;
  stateBreakdown: Record<string, number>;
  districtBreakdown: Record<string, number>;
  milestones: Milestone[];
  challenges: Challenge[];
  heroUserId?: string;
  heroName?: string;
  heroAmount?: number;
  winnerState?: string;
  winnerDistrict?: string;
  impactProof?: string[];
  createdAt: any;
}

export interface Milestone {
  id: string;
  amount: number;
  title: string;
  description: string;
  unlocked: boolean;
  unlockedAt?: any;
}

export interface Challenge {
  id: string;
  userId: string;
  displayName: string;
  state: string;
  pledgeAmount: number;
  triggerAmount: number;
  triggerState?: string;
  message: string;
  accepted: boolean;
  fulfilled: boolean;
  createdAt: any;
}

export interface CampaignDonation {
  id: string;
  campaignId: string;
  userId: string;
  displayName: string;
  isAnonymous: boolean;
  amount: number;
  state: string;
  district: string;
  message?: string;
  createdAt: any;
}

export const BADGES = {
  FIRST_BLOOD: {
    id: "first_blood",
    name: "First Blood",
    emoji: "🎯",
    description: "Made your first donation",
  },
  WEEK_WARRIOR: {
    id: "week_warrior",
    name: "Week Warrior",
    emoji: "📅",
    description: "4 weeks continuous streak",
  },
  DISTRICT_DOMINATOR: {
    id: "district_dominator",
    name: "District Dominator",
    emoji: "🗺️",
    description: "Reached #1 in your district",
  },
  STATE_SENTINEL: {
    id: "state_sentinel",
    name: "State Sentinel",
    emoji: "🏛️",
    description: "Reached top 5 in your state",
  },
  COMEBACK_KING: {
    id: "comeback_king",
    name: "Comeback King",
    emoji: "🌊",
    description: "Came back from last place to top 10",
  },
  GHOST_LEGEND: {
    id: "ghost_legend",
    name: "Ghost Legend",
    emoji: "👻",
    description: "Reached #1 while anonymous",
  },
  CENTURION: {
    id: "centurion",
    name: "Centurion",
    emoji: "💸",
    description: "Donated for 100 weeks",
  },
  HALL_OF_FAMER: {
    id: "hall_of_famer",
    name: "Hall of Famer",
    emoji: "🏆",
    description: "Reached national #1",
  },
} as const;

export const STAGES = [
  { name: "Stone", emoji: "🪨", minRankPercent: 100 },
  { name: "Bronze", emoji: "🥉", minRankPercent: 50 },
  { name: "Silver", emoji: "🥈", minRankPercent: 25 },
  { name: "Gold", emoji: "🥇", minRankPercent: 10 },
  { name: "Diamond", emoji: "💎", minRankPercent: 5 },
  { name: "Sovereign", emoji: "👑", minRankPercent: 1 },
] as const;

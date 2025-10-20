// Auth Types
export interface SignupRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: UserData;
}

export interface UserData {
  id: string;
  email: string;
  name: string;
  role: "admin" | "member";
  adminId?: string;
  avatar?: string;
  teamId?: string;
}

// Demo response (keep existing)
export interface DemoResponse {
  message: string;
}

// Conversation types
export interface Contact {
  id: string;
  name: string;
  phone: string;
  lastMessage?: string;
  lastMessageTime?: string;
  pinned: boolean;
  userId: string;
}

export interface Message {
  id: string;
  contactId: string;
  userId: string;
  content: string;
  sender: "user" | "contact";
  timestamp: string;
  read: boolean;
}

// Numbers types
export interface NumberLine {
  _id?: string;
  id?: string;
  content: string;
  lineNumber: number;
  createdAt?: string;
  status: "queued" | "distributed" | "claimed";
  claimedBy?: string;
  claimedAt?: string;
  distributedTo?: string[];
  teamId?: string;
}

export interface QueuedLine {
  id: string;
  lineNumber: number;
  content: string;
  teamId: string;
}

export interface GetLinesResponse {
  lines: NumberLine[];
}

export interface MoveLinesToQueueRequest {
  lineIds: string[];
}

export interface MoveLinesToDistributorRequest {
  lineIds: string[];
}

// Auto Distributor types
export interface DistributorSettings {
  id: string;
  teamId: string;
  linesPerMember: number;
  timerSeconds: number;
  isActive: boolean;
  selectedMembers: string[];
}

// Inbox types
export interface ClaimSettings {
  id: string;
  teamId: string;
  adminId: string;
  claimLineCount: number;
  cooldownSeconds: number;
}

export interface TimerIndicator {
  claimReady: boolean;
  claimCooldownRemaining: number;
  distributorActive: boolean;
}

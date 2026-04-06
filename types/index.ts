// ============================================================
// סוגי נתונים מרכזיים
// ============================================================

// --- תושבים ---

export type ResidentRole = "admin" | "chairman" | "resident";

export interface Resident {
  id: string;
  user_id?: string | null;
  name: string;
  phone?: string | null;
  address?: string | null;
  role: ResidentRole;
  balance: number;
  created_at: string;
  updated_at?: string | null;
  created_by?: string | null;
}

export interface ResidentFormData {
  name: string;
  phone?: string;
  address?: string;
  role: ResidentRole;
  balance: number;
  user_id?: string | null;
}

// --- פניות ---

export type RequestStatus = "new" | "in_progress" | "closed";

export interface Request {
  id: string;
  tenant_id: string;
  resident_id?: string | null;
  title: string;
  description?: string | null;
  status: RequestStatus;
  created_at: string;
  updated_at?: string | null;
  created_by?: string | null;
  // joined
  residents?: { name: string } | null;
}

export interface RequestFormData {
  title: string;
  description?: string;
  resident_id?: string | null;
}

// --- משימות ---

export type TaskStatus = "pending" | "in_progress" | "done";

export interface Task {
  id: string;
  tenant_id: string;
  request_id?: string | null;
  title: string;
  description?: string | null;
  assigned_to?: string | null;
  status: TaskStatus;
  due_date?: string | null;
  created_at: string;
  updated_at?: string | null;
  created_by?: string | null;
  // joined
  residents?: { name: string } | null;
  requests?: { title: string } | null;
}

export interface TaskFormData {
  title: string;
  description?: string;
  assigned_to?: string | null;
  request_id?: string | null;
  status: TaskStatus;
  due_date?: string | null;
}



export interface Member {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  status: "active" | "inactive" | "pending";
  role: "admin" | "moderator" | "member";
  tags?: string[];
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface ActivityItem {
  id: string;
  user_id?: string;
  action: string;
  message: string;
  icon: string;
  time: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  author_id: string;
  status: "draft" | "published" | "archived";
  tags?: string[];
  created_at: string;
  updated_at?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  created_at: string;
}

// --- הצבעות ---

export type PollType = "general_assembly" | "committee";
export type PollStatus = "draft" | "open" | "closed";
export type PollCategory = "bylaw" | "budget" | "committee_election" | "general";

export interface PollOption {
  id: string;
  poll_id: string;
  text: string;
  order_index: number;
  created_at: string;
  vote_count?: number;
}

export interface Poll {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  type: PollType;
  category: PollCategory;
  is_anonymous: boolean;
  status: PollStatus;
  created_by: string | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
  options?: PollOption[];
  total_votes?: number;
  has_voted?: boolean;
  voters?: { user_id: string; name: string; voted_at: string }[];
}

// ============================================================
// סוגי API Response
// ============================================================

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================
// סוגי Form
// ============================================================

export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface MemberFormData {
  name: string;
  email: string;
  phone?: string;
  status: Member["status"];
  role: Member["role"];
  tags?: string[];
  notes?: string;
}

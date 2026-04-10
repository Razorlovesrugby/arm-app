import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ============================================================
// Type helpers matching the ARM data model
// ============================================================

// ============================================================
// Phase 16.0: Multi-Tenant Types
// ============================================================

export interface Club {
  id: string
  name: string
  created_at: string
}

export interface Profile {
  id: string
  club_id: string
  role: string
  created_at: string
}

export type Position =
  | 'Prop' | 'Hooker' | 'Lock' | 'Flanker' | 'Number 8'
  | 'Scrum-half' | 'Fly-half' | 'Centre' | 'Wing' | 'Fullback'
  | 'Unspecified'

export type PlayerType = 'Performance' | 'Open' | "Women's"
export type PlayerStatus = 'Active' | 'Injured' | 'Unavailable' | 'Retired' | 'Archived'
export type Availability = 'Available' | 'TBC' | 'Unavailable'
export type WeekStatus = 'Open' | 'Closed'

export interface Player {
  id: string
  club_id: string
  name: string
  email: string
  phone: string
  date_of_birth: string
  primary_position: Position | null
  secondary_positions: Position[]
  player_type: PlayerType
  status: PlayerStatus
  subscription_paid: boolean
  notes: string | null
  last_played_date: string | null
  last_played_team: string | null
  historical_caps: number
  court_fines: string | null
  is_retired: boolean
  created_at: string
  updated_at: string
}

export interface DepthChartOrder {
  id: string
  club_id: string
  position: Position
  player_order: string[]
  updated_at: string
}

export interface Week {
  id: string
  club_id: string
  start_date: string
  end_date: string
  label: string
  status: WeekStatus
  availability_link_token: string
  notes: string | null
  created_at: string
}

export interface WeekTeam {
  id: string
  club_id: string
  week_id: string
  team_name: string
  sort_order: number
  starters_count: number
  visible: boolean
  is_active: boolean
  score_for: number | null
  score_against: number | null
  match_report: string | null
  opponent: string | null
}

export interface AvailabilityResponse {
  id: string
  club_id: string
  week_id: string
  player_id: string
  availability: Availability
  submitted_primary_position: Position | null
  submitted_secondary_positions: Position[]
  availability_note: string | null
  created_at: string
}

export interface ArchiveGameNote {
  id: string
  club_id: string
  week_team_id: string
  player_id: string | null
  player_name_snapshot: string
  player_type_snapshot: string | null
  position_snapshot: string | null
  game_notes: string | null
  updated_at: string
}

export interface TeamSelection {
  id: string
  club_id: string
  week_id: string
  week_team_id: string
  player_order: (string | null)[]
  captain_id: string | null
  saved_at: string
  created_at: string
  updated_at: string
}

export const POSITIONS: Position[] = [
  'Prop', 'Hooker', 'Lock', 'Flanker', 'Number 8',
  'Scrum-half', 'Fly-half', 'Centre', 'Wing', 'Fullback', 'Unspecified',
]

export const PLAYER_TYPES: PlayerType[] = ['Performance', 'Open', "Women's"]
export const PLAYER_STATUSES: PlayerStatus[] = ['Active', 'Injured', 'Unavailable', 'Retired', 'Archived']

export function normalisePhone(phone: string): string {
  return phone.replace(/[\s\-()]/g, '')
}

// ============================================================
// v2.0 New Types
// ============================================================

export type MatchEventType =
  | 'try' | 'conversion' | 'penalty' | 'drop_goal'
  | 'mvp_3' | 'mvp_2' | 'mvp_1' | 'dotd'
  | 'yellow_card' | 'red_card'
  | 'Conversion Miss' | 'Penalty Miss'

export interface ClubSettings {
  id: string
  club_id: string
  club_name: string
  primary_color: string
  secondary_color: string
  logo_url: string | null
  default_teams: string[] | null
  default_squad_size?: number
  require_positions_in_form?: boolean
  require_contact_info?: boolean
  require_birthday?: boolean
  training_days?: { id: string; label: string }[] | null
  created_at: string
  updated_at: string
}

export interface TrainingAttendance {
  id: string
  club_id: string
  player_id: string
  week_id: string
  session_id: string
  attended: boolean
  created_at: string
}

export interface MatchEvent {
  id: string
  club_id: string
  week_id: string
  week_team_id: string
  player_id: string | null
  event_type: MatchEventType
  points: number
  created_at: string
}

export const MATCH_EVENT_TYPES: MatchEventType[] = [
  'try', 'conversion', 'penalty', 'drop_goal',
  'mvp_3', 'mvp_2', 'mvp_1', 'dotd',
  'yellow_card', 'red_card',
  'Conversion Miss', 'Penalty Miss',
]

// ============================================================
// PDF Types (Phase 13)
// ============================================================

export interface PDFPlayer {
  id: string
  shirtNumber: number
  fullName: string
  isCaptain: boolean
  position?: string
}

export interface PDFTeam {
  teamName: string
  players: PDFPlayer[]
  matchNotes?: string
  matchDate?: string
  opponent?: string
  venue?: string
  kickoffTime?: string
}

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
  historical_caps: number  // v2.0: Pre-v2 caps count
  court_fines: string | null  // v2.0: Free-form notes field for disciplinary fines
  is_retired: boolean  // v2.0: Flag to filter players from active lists
  created_at: string
  updated_at: string
}

export interface DepthChartOrder {
  id: string
  position: Position
  player_order: string[]
  updated_at: string
}

export interface Week {
  id: string
  start_date: string
  end_date: string
  label: string
  status: WeekStatus
  availability_link_token: string
  created_at: string
}

export interface WeekTeam {
  id: string
  week_id: string
  team_name: string
  sort_order: number
  starters_count: number
  visible: boolean          // CP7-A: controls tab visibility
  is_active: boolean        // CP8: false = Bye week (skip in Close Week validation + Archive)
  score_for: number | null  // v2.0: Points scored by this team
  score_against: number | null  // v2.0: Points conceded by this team
  match_report: string | null  // v2.0: Markdown-compatible match report
}

export interface AvailabilityResponse {
  id: string
  week_id: string
  player_id: string
  availability: Availability
  submitted_primary_position: Position | null
  submitted_secondary_positions: Position[]
  availability_note: string | null   // player-submitted week-specific note (v1.8 rename)
  created_at: string
}

export interface ArchiveGameNote {
  id: string
  week_team_id: string
  player_id: string | null           // nullable — supports deleted players
  player_name_snapshot: string
  player_type_snapshot: string | null  // CP8: badge snapshot
  position_snapshot: string | null     // CP8: position badge snapshot
  game_notes: string | null
  updated_at: string
}

export interface TeamSelection {
  id: string
  week_id: string
  week_team_id: string
  player_order: (string | null)[]
  captain_id: string | null  // CP7-A: nullable, one per row
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

/** Normalise a phone number: strip spaces, dashes, parentheses */
export function normalisePhone(phone: string): string {
  return phone.replace(/[\s\-()]/g, '')
}

// ============================================================
// v2.0 New Types
// ============================================================

export type MatchEventType = 
  | 'try' | 'conversion' | 'penalty' | 'drop_goal'
  | 'mvp_3' | 'mvp_2' | 'mvp_1' | 'dotd'

export interface ClubSettings {
  id: string
  club_name: string
  primary_color: string
  secondary_color: string
  logo_url: string | null
  created_at: string
  updated_at: string
}

export interface MatchEvent {
  id: string
  week_id: string
  player_id: string
  week_team_id: string
  event_type: MatchEventType
  points: number
  created_at: string
  created_by: string | null
}

export const MATCH_EVENT_TYPES: MatchEventType[] = [
  'try', 'conversion', 'penalty', 'drop_goal',
  'mvp_3', 'mvp_2', 'mvp_1', 'dotd'
]

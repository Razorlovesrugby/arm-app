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
export type PlayerStatus = 'Active' | 'Injured' | 'Unavailable' | 'Retired'
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
}

export interface AvailabilityResponse {
  id: string
  week_id: string
  player_id: string
  availability: Availability
  submitted_primary_position: Position | null
  submitted_secondary_positions: Position[]
  note: string | null
  created_at: string
}

export interface TeamSelection {
  id: string
  week_id: string
  week_team_id: string
  player_order: string[]
  saved_at: string
}

export const POSITIONS: Position[] = [
  'Prop', 'Hooker', 'Lock', 'Flanker', 'Number 8',
  'Scrum-half', 'Fly-half', 'Centre', 'Wing', 'Fullback', 'Unspecified',
]

export const PLAYER_TYPES: PlayerType[] = ['Performance', 'Open', "Women's"]
export const PLAYER_STATUSES: PlayerStatus[] = ['Active', 'Injured', 'Unavailable', 'Retired']

/** Normalise a phone number: strip spaces, dashes, parentheses */
export function normalisePhone(phone: string): string {
  return phone.replace(/[\s\-()]/g, '')
}

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useSelectionBoard } from './useSelectionBoard'
import type { Player, WeekTeam, TeamSelection, AvailabilityResponse } from '../lib/supabase'

// ── Mock Supabase (vi.hoisted for hoist-safe vars) ───────────────
const { mockFrom, mockRpc } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
}))

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    rpc: mockRpc,
  },
  RUGBY_POSITION_ORDER: [
    'Prop', 'Hooker', 'Lock', 'Flanker', 'Number 8',
    'Scrum-half', 'Fly-half', 'Centre', 'Wing', 'Fullback', 'Unspecified',
  ],
  DEFAULT_PLAYER_TYPES: ['Performance', 'Open', "Women's"],
}))

// ── Mock AuthContext ─────────────────────────────────────────────
const { mockActiveClubId } = vi.hoisted(() => ({
  mockActiveClubId: vi.fn(),
}))
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    activeClubId: mockActiveClubId(),
  }),
}))

// ── Mock useClubSettings ─────────────────────────────────────────
const { mockClubSettings } = vi.hoisted(() => ({
  mockClubSettings: vi.fn(),
}))
vi.mock('./useClubSettings', () => ({
  useClubSettings: () => ({
    clubSettings: mockClubSettings(),
  }),
}))

// ── Test data ────────────────────────────────────────────────────
const mockPlayers: Player[] = [
  {
    id: 'p1', name: 'Alice Smith', email: 'a@t.com', phone: '1',
    date_of_birth: '1990-01-01', primary_position: 'Scrum-half',
    secondary_positions: [], player_type: 'Performance', status: 'Active',
    subscription_paid: true, notes: null, last_played_date: null,
    last_played_team: null, historical_caps: 0, total_caps: 10,
    court_fines: null, is_retired: false, created_at: '', updated_at: '',
  },
  {
    id: 'p2', name: 'Bob Jones', email: 'b@t.com', phone: '2',
    date_of_birth: '1992-02-02', primary_position: 'Prop',
    secondary_positions: [], player_type: 'Open', status: 'Active',
    subscription_paid: true, notes: null, last_played_date: null,
    last_played_team: null, historical_caps: 0, total_caps: 5,
    court_fines: null, is_retired: false, created_at: '', updated_at: '',
  },
  {
    id: 'p3', name: 'Charlie Brown', email: 'c@t.com', phone: '3',
    date_of_birth: '1988-03-03', primary_position: 'Fullback',
    secondary_positions: [], player_type: "Women's", status: 'Active',
    subscription_paid: true, notes: null, last_played_date: null,
    last_played_team: null, historical_caps: 0, total_caps: 20,
    court_fines: null, is_retired: false, created_at: '', updated_at: '',
  },
]

const mockWeekTeams: WeekTeam[] = [
  { id: 'wt1', club_id: 'club-123', week_id: 'w1', team_name: 'A Team',
    sort_order: 1, starters_count: 3, visible: true, is_active: true,
    score_for: null, score_against: null, match_report: null, opponent: null },
  { id: 'wt2', club_id: 'club-123', week_id: 'w1', team_name: 'B Team',
    sort_order: 2, starters_count: 3, visible: true, is_active: true,
    score_for: null, score_against: null, match_report: null, opponent: null },
]

const mockAllWeekTeams: WeekTeam[] = [
  ...mockWeekTeams,
  { id: 'wt3', club_id: 'club-123', week_id: 'w1', team_name: 'Hidden Team',
    sort_order: 3, starters_count: 0, visible: false, is_active: true,
    score_for: null, score_against: null, match_report: null, opponent: null },
]

const mockSelections: TeamSelection[] = [
  { id: 'sel1', club_id: 'club-123', week_id: 'w1', week_team_id: 'wt1',
    player_order: ['p1', null, 'p2'], captain_id: 'p1',
    saved_at: '', created_at: '', updated_at: '' },
  { id: 'sel2', club_id: 'club-123', week_id: 'w1', week_team_id: 'wt2',
    player_order: ['p3'], captain_id: null,
    saved_at: '', created_at: '', updated_at: '' },
]

const mockAvailability: AvailabilityResponse[] = [
  { id: 'a1', club_id: 'club-123', week_id: 'w1', player_id: 'p1',
    availability: 'Available', submitted_primary_position: 'Scrum-half',
    submitted_secondary_positions: [], availability_note: null, created_at: '' },
  { id: 'a2', club_id: 'club-123', week_id: 'w1', player_id: 'p2',
    availability: 'Available', submitted_primary_position: 'Prop',
    submitted_secondary_positions: [], availability_note: null, created_at: '' },
  { id: 'a3', club_id: 'club-123', week_id: 'w1', player_id: 'p3',
    availability: 'TBC', submitted_primary_position: 'Fullback',
    submitted_secondary_positions: [], availability_note: null, created_at: '' },
]

const mockHistoryData = [
  { player_id: 'p1', last_team: 'A Team', last_played: '2026-03-15' },
  { player_id: 'p2', last_team: 'B Team', last_played: '2026-03-08' },
]

// ── Mock the supabase chain for a given week fetch ───────────────
function mockSupabaseForWeek(_weekId: string, _clubId: string, responses: {
  visibleTeams?: { data: WeekTeam[] | null; error: null | { message: string } }
  allTeams?: { data: WeekTeam[] | null; error: null | { message: string } }
  selections?: { data: TeamSelection[] | null; error: null | { message: string } }
  availability?: { data: AvailabilityResponse[] | null; error: null | { message: string } }
  history?: { data: any[] | null; error: null | { message: string } }
}) {
  vi.clearAllMocks()

  const {
    visibleTeams = { data: mockWeekTeams, error: null },
    allTeams = { data: mockAllWeekTeams, error: null },
    selections = { data: mockSelections, error: null },
    availability = { data: mockAvailability, error: null },
    history = { data: mockHistoryData, error: null },
  } = responses

  // Mock rpc — used for player fetch + history
  mockRpc.mockImplementation((rpcName: string) => {
    if (rpcName === 'get_club_players') {
      return Promise.resolve({ data: mockPlayers })
    }
    return Promise.resolve(history)
  })

  // Build chain for visible teams:
  // from('week_teams').select('*').eq('week_id',id).eq('club_id',cid).eq('visible',true).order('sort_order')
  const visibleOrder = vi.fn().mockResolvedValue(visibleTeams)
  const visibleEqVisible = vi.fn().mockReturnValue({ order: visibleOrder })
  const visibleEqClub = vi.fn().mockReturnValue({ eq: visibleEqVisible })
  const visibleEqWeek = vi.fn().mockReturnValue({ eq: visibleEqClub })

  // Build chain for all teams:
  // from('week_teams').select('*').eq('week_id',id).eq('club_id',cid).order('sort_order')
  const allOrder = vi.fn().mockResolvedValue(allTeams)
  const allEqClub = vi.fn().mockReturnValue({ order: allOrder })
  const allEqWeek = vi.fn().mockReturnValue({ eq: allEqClub })

  // Build chain for selections:
  // from('team_selections').select('*').eq('week_id',id).eq('club_id',cid)
  const selEqClub = vi.fn().mockResolvedValue(selections)
  const selEqWeek = vi.fn().mockReturnValue({ eq: selEqClub })
  const selSelect = vi.fn().mockReturnValue({ eq: selEqWeek })

  // Build chain for availability:
  // from('availability_responses').select('*').eq('week_id',id).eq('club_id',cid).order('created_at',{ascending:false})
  const availOrder = vi.fn().mockResolvedValue(availability)
  const availEqClub = vi.fn().mockReturnValue({ order: availOrder })
  const availEqWeek = vi.fn().mockReturnValue({ eq: availEqClub })
  const availSelect = vi.fn().mockReturnValue({ eq: availEqWeek })

  mockFrom.mockImplementation((table: string) => {
    switch (table) {
      case 'week_teams': {
        let calls = 0
        return {
          select: () => {
            calls++
            if (calls === 1) return { eq: visibleEqWeek }
            return { eq: allEqWeek }
          },
        }
      }
      case 'team_selections':
        return { select: selSelect }
      case 'availability_responses':
        return { select: availSelect }
      default:
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }) }
    }
  })
}

describe('useSelectionBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockActiveClubId.mockReturnValue('club-123')
    mockClubSettings.mockReturnValue(null)
  })

  // ── Loading state ─────────────────────────────────────────────
  it('starts with loading=true when weekId is provided', () => {
    mockSupabaseForWeek('w1', 'club-123', {
      history: { data: [], error: null },
    })
    const { result } = renderHook(() => useSelectionBoard('w1'))
    expect(result.current.loading).toBe(true)
    expect(result.current.teams).toEqual([])
    expect(result.current.unassignedPlayers).toEqual([])
  })

  // ── Null weekId returns empty state immediately ───────────────
  it('returns empty state when weekId is null', async () => {
    const { result } = renderHook(() => useSelectionBoard(null))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.teams).toEqual([])
    expect(result.current.allWeekTeams).toEqual([])
    expect(result.current.allPlayers).toEqual([])
    expect(result.current.availabilityMap).toEqual({})
    expect(result.current.playerHistory).toEqual({})
    expect(result.current.error).toBeNull()
  })

  // ── Null activeClubId returns empty state ─────────────────────
  it('returns empty state when activeClubId is null', async () => {
    mockActiveClubId.mockReturnValue(null)

    const { result } = renderHook(() => useSelectionBoard('w1'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.allPlayers).toEqual([])
    expect(result.current.teams).toEqual([])
  })

  // ── Successful fetch renders teams and unassigned players ─────
  it('fetches and renders teams and unassigned players correctly', async () => {
    mockSupabaseForWeek('w1', 'club-123', {})
    mockClubSettings.mockReturnValue({ player_types: ['Performance', 'Open', "Women's"] })

    const { result } = renderHook(() => useSelectionBoard('w1'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    // Should have 2 visible teams
    expect(result.current.teams).toHaveLength(2)
    expect(result.current.teams[0].weekTeam.team_name).toBe('A Team')
    expect(result.current.teams[1].weekTeam.team_name).toBe('B Team')

    // A Team should have p1 at slot 0, null at slot 1, p2 at slot 2
    expect(result.current.teams[0].players[0]?.id).toBe('p1')
    expect(result.current.teams[0].players[1]).toBeNull()
    expect(result.current.teams[0].players[2]?.id).toBe('p2')
    expect(result.current.teams[0].captainId).toBe('p1')

    // B Team should have p3 at slot 0
    expect(result.current.teams[1].players[0]?.id).toBe('p3')

    // allWeekTeams should include hidden
    expect(result.current.allWeekTeams).toHaveLength(3)

    // All 3 players should be in allPlayers
    expect(result.current.allPlayers).toHaveLength(3)

    // All 3 players are assigned, so unassigned should be empty
    expect(result.current.unassignedPlayers).toHaveLength(0)
  })

  // ── Unassigned players filtered correctly ─────────────────────
  it('shows unassigned players who are Available or TBC', async () => {
    const extraPlayer: Player = {
      id: 'p4', name: 'Diana Prince', email: 'd@t.com', phone: '4',
      date_of_birth: '1995-04-04', primary_position: 'Wing',
      secondary_positions: [], player_type: 'Open', status: 'Active',
      subscription_paid: false, notes: null, last_played_date: null,
      last_played_team: null, historical_caps: 0, total_caps: 15,
      court_fines: null, is_retired: false, created_at: '', updated_at: '',
    }

    const extraUnavailable: Player = {
      id: 'p5', name: 'Eve Adams', email: 'e@t.com', phone: '5',
      date_of_birth: '1993-05-05', primary_position: 'Hooker',
      secondary_positions: [], player_type: 'Open', status: 'Active',
      subscription_paid: false, notes: null, last_played_date: null,
      last_played_team: null, historical_caps: 0, total_caps: 5,
      court_fines: null, is_retired: false, created_at: '', updated_at: '',
    }

    const extendedAvailability = [
      ...mockAvailability,
      { id: 'a4', club_id: 'club-123', week_id: 'w1', player_id: 'p4',
        availability: 'Available' as const, submitted_primary_position: 'Wing' as const,
        submitted_secondary_positions: [], availability_note: null, created_at: '' },
      { id: 'a5', club_id: 'club-123', week_id: 'w1', player_id: 'p5',
        availability: 'Unavailable' as const, submitted_primary_position: 'Hooker' as const,
        submitted_secondary_positions: [], availability_note: null, created_at: '' },
    ]

    mockRpc.mockImplementation((rpcName: string) => {
      if (rpcName === 'get_club_players') {
        return Promise.resolve({ data: [...mockPlayers, extraPlayer, extraUnavailable] })
      }
      return Promise.resolve({ data: mockHistoryData, error: null })
    })

    mockSupabaseForWeek('w1', 'club-123', {
      availability: { data: extendedAvailability, error: null },
    })
    mockClubSettings.mockReturnValue({ player_types: ['Performance', 'Open', "Women's"] })

    const { result } = renderHook(() => useSelectionBoard('w1'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    // p4 is unassigned and Available → should be in unassigned
    // p5 is unassigned but Unavailable → should NOT be in unassigned
    expect(result.current.unassignedPlayers).toHaveLength(1)
    expect(result.current.unassignedPlayers[0].id).toBe('p4')
  })

  // ── Error handling ────────────────────────────────────────────
  it('sets error when a query fails', async () => {
    const errorMsg = 'Network error'
    mockSupabaseForWeek('w1', 'club-123', {
      visibleTeams: { data: null, error: { message: errorMsg } },
      allTeams: { data: null, error: { message: errorMsg } },
      selections: { data: null, error: { message: errorMsg } },
      availability: { data: null, error: { message: errorMsg } },
    })
    mockClubSettings.mockReturnValue(null)
    mockRpc.mockImplementation((rpcName: string) => {
      if (rpcName === 'get_club_players') {
        return Promise.resolve({ data: mockPlayers })
      }
      return Promise.resolve({ data: null, error: { message: errorMsg } })
    })

    const { result } = renderHook(() => useSelectionBoard('w1'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe(errorMsg)
    expect(result.current.teams).toEqual([])
  })

  // ── setActiveWeekId switches week ─────────────────────────────
  it('setActiveWeekId updates the active week', () => {
    const { result } = renderHook(() => useSelectionBoard('w1'))

    result.current.setActiveWeekId('w2')
    expect(result.current.activeWeekId).toBe('w2')
  })
})

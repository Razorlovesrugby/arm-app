import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { usePlayers } from './usePlayers'
import type { Player } from '../lib/supabase'

// ── Mock Supabase ────────────────────────────────────────────────
// vi.hoisted ensures these exist before vi.mock factories run
const { mockFrom, mockSelect, mockEq, mockNeq, mockOrder } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockSelect: vi.fn(),
  mockEq: vi.fn(),
  mockNeq: vi.fn(),
  mockOrder: vi.fn(),
}))

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: mockFrom,
  },
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

// ── Test data ────────────────────────────────────────────────────
const mockPlayers: Player[] = [
  {
    id: 'p1', name: 'Alice Smith', email: 'alice@test.com', phone: '123',
    date_of_birth: '1990-01-01', primary_position: 'Scrum-half',
    secondary_positions: [], player_type: 'Performance', status: 'Active',
    subscription_paid: true, notes: null, last_played_date: null,
    last_played_team: null, historical_caps: 0, total_caps: 10,
    court_fines: null, is_retired: false, created_at: '', updated_at: '',
  },
  {
    id: 'p2', name: 'Bob Jones', email: 'bob@test.com', phone: '456',
    date_of_birth: '1992-02-02', primary_position: 'Prop',
    secondary_positions: [], player_type: 'Open', status: 'Injured',
    subscription_paid: true, notes: null, last_played_date: null,
    last_played_team: null, historical_caps: 0, total_caps: 5,
    court_fines: null, is_retired: false, created_at: '', updated_at: '',
  },
  {
    id: 'p3', name: 'Charlie Brown', email: 'charlie@test.com', phone: '789',
    date_of_birth: '1988-03-03', primary_position: 'Fullback',
    secondary_positions: [], player_type: 'Open', status: 'Retired',
    subscription_paid: true, notes: null, last_played_date: null,
    last_played_team: null, historical_caps: 0, total_caps: 20,
    court_fines: null, is_retired: true, created_at: '', updated_at: '',
  },
  {
    id: 'p4', name: 'Diana Prince', email: 'diana@test.com', phone: '012',
    date_of_birth: '1995-04-04', primary_position: 'Centre',
    secondary_positions: [], player_type: "Women's", status: 'Archived',
    subscription_paid: false, notes: null, last_played_date: null,
    last_played_team: null, historical_caps: 0, total_caps: 15,
    court_fines: null, is_retired: false, created_at: '', updated_at: '',
  },
]

function setupSupabaseChain(mockData: Player[] = mockPlayers) {
  vi.clearAllMocks()
  mockOrder.mockResolvedValue({ data: mockData, error: null })
  mockNeq.mockReturnValue({ order: mockOrder })
  mockEq.mockReturnValue({ neq: mockNeq, order: mockOrder })
  mockSelect.mockReturnValue({ eq: mockEq })
  mockFrom.mockReturnValue({ select: mockSelect })
}

describe('usePlayers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Loading state ─────────────────────────────────────────────
  it('starts with loading=true and empty players', async () => {
    mockOrder.mockReturnValue(new Promise(() => {})) // never resolves
    mockNeq.mockReturnValue({ order: mockOrder })
    mockEq.mockReturnValue({ neq: mockNeq, order: mockOrder })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ select: mockSelect })
    mockActiveClubId.mockReturnValue('club-123')

    const { result } = renderHook(() => usePlayers())

    expect(result.current.loading).toBe(true)
    expect(result.current.players).toEqual([])
    expect(result.current.error).toBeNull()
  })

  // ── Successful fetch ──────────────────────────────────────────
  it('fetches and returns all players when no filters are set', async () => {
    setupSupabaseChain()
    mockActiveClubId.mockReturnValue('club-123')

    const { result } = renderHook(() => usePlayers())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.players).toHaveLength(4)
    expect(result.current.players[0].name).toBe('Alice Smith')
    expect(result.current.error).toBeNull()

    expect(mockFrom).toHaveBeenCalledWith('players')
    expect(mockSelect).toHaveBeenCalledWith('*')
    expect(mockEq).toHaveBeenCalledWith('club_id', 'club-123')
    expect(mockOrder).toHaveBeenCalledWith('name', { ascending: true })
  })

  // ── Empty activeClubId ────────────────────────────────────────
  it('returns empty players when activeClubId is null', async () => {
    mockActiveClubId.mockReturnValue(null)

    const { result } = renderHook(() => usePlayers())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.players).toEqual([])
    expect(result.current.error).toBeNull()
    expect(mockFrom).not.toHaveBeenCalled()
  })

  // ── Error handling ────────────────────────────────────────────
  it('sets error when the query fails', async () => {
    const errorMessage = 'Database connection failed'
    mockOrder.mockResolvedValue({ data: null, error: { message: errorMessage } })
    mockNeq.mockReturnValue({ order: mockOrder })
    mockEq.mockReturnValue({ neq: mockNeq, order: mockOrder })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ select: mockSelect })
    mockActiveClubId.mockReturnValue('club-123')

    const { result } = renderHook(() => usePlayers())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.players).toEqual([])
    expect(result.current.error).toBe(errorMessage)
  })

  // ── excludeRetired filter ─────────────────────────────────────
  it('applies excludeRetired filter when option is set', async () => {
    setupSupabaseChain([mockPlayers[0], mockPlayers[1]])
    mockActiveClubId.mockReturnValue('club-123')

    const { result } = renderHook(() => usePlayers({ excludeRetired: true }))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(mockNeq).toHaveBeenCalledWith('status', 'Retired')
    expect(result.current.players).toHaveLength(2)
  })

  // ── excludeArchived filter ────────────────────────────────────
  it('applies excludeArchived filter when option is set', async () => {
    setupSupabaseChain([mockPlayers[0], mockPlayers[1], mockPlayers[2]])
    mockActiveClubId.mockReturnValue('club-123')

    const { result } = renderHook(() => usePlayers({ excludeArchived: true }))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(mockNeq).toHaveBeenCalledWith('status', 'Archived')
    expect(result.current.players).toHaveLength(3)
  })

  // ── Both filters ──────────────────────────────────────────────
  it('applies both excludeRetired and excludeArchived filters', async () => {
    const orderMock = vi.fn().mockResolvedValue({ data: [mockPlayers[0], mockPlayers[1]], error: null })
    const neqArchivedMock = vi.fn().mockReturnValue({ order: orderMock })
    const neqRetiredMock = vi.fn().mockReturnValue({ neq: neqArchivedMock })
    const eqMock = vi.fn().mockReturnValue({ neq: neqRetiredMock })
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
    mockFrom.mockReturnValue({ select: selectMock })
    mockActiveClubId.mockReturnValue('club-123')

    const { result } = renderHook(() => usePlayers({ excludeRetired: true, excludeArchived: true }))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(neqRetiredMock).toHaveBeenCalledWith('status', 'Retired')
    expect(neqArchivedMock).toHaveBeenCalledWith('status', 'Archived')
    expect(result.current.players).toHaveLength(2)
  })

  // ── refetch returns fresh data ────────────────────────────────
  it('refetch returns fresh data', async () => {
    setupSupabaseChain([...mockPlayers])
    mockActiveClubId.mockReturnValue('club-123')

    const { result } = renderHook(() => usePlayers())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.players).toHaveLength(4)

    setupSupabaseChain([mockPlayers[0], mockPlayers[1]])

    result.current.refetch()
    await waitFor(() => expect(result.current.players).toHaveLength(2))
  })

  // ── Cancellation on unmount ───────────────────────────────────
  it('does not set state after unmount (cancellation)', async () => {
    mockActiveClubId.mockReturnValue('club-123')

    mockOrder.mockReturnValue(new Promise(() => {}))
    mockNeq.mockReturnValue({ order: mockOrder })
    mockEq.mockReturnValue({ neq: mockNeq, order: mockOrder })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ select: mockSelect })

    const { result, unmount } = renderHook(() => usePlayers())
    unmount()

    expect(result.current.loading).toBe(true)
  })
})

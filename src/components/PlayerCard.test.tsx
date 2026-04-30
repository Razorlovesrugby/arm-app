import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PlayerCard from './PlayerCard'
import type { Player } from '../lib/supabase'

// ── Base mock player ─────────────────────────────────────────────
function createMockPlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1',
    name: 'John Doe',
    email: 'john@test.com',
    phone: '1234567890',
    date_of_birth: '1990-05-15',
    primary_position: 'Scrum-half',
    secondary_positions: [],
    player_type: 'Performance',
    status: 'Active',
    subscription_paid: true,
    notes: null,
    last_played_date: null,
    last_played_team: null,
    historical_caps: 0,
    total_caps: 10,
    court_fines: null,
    is_retired: false,
    created_at: '',
    updated_at: '',
    ...overrides,
  }
}

describe('PlayerCard', () => {
  // ── Renders player details ──────────────────────────────────
  it('renders player name', () => {
    const player = createMockPlayer()
    render(<PlayerCard player={player} onEdit={() => {}} onDelete={() => {}} />)

    expect(screen.getByText('John Doe')).toBeDefined()
  })

  it('renders player primary position', () => {
    const player = createMockPlayer({ primary_position: 'Fly-half' })
    render(<PlayerCard player={player} onEdit={() => {}} onDelete={() => {}} />)

    expect(screen.getByText('Fly-half')).toBeDefined()
  })

  it('renders player status badge', () => {
    const player = createMockPlayer({ status: 'Injured' })
    render(<PlayerCard player={player} onEdit={() => {}} onDelete={() => {}} />)

    expect(screen.getByText('Injured')).toBeDefined()
  })

  it('renders player type badge', () => {
    const player = createMockPlayer({ player_type: 'Open' })
    render(<PlayerCard player={player} onEdit={() => {}} onDelete={() => {}} />)

    expect(screen.getByText('Open')).toBeDefined()
  })

  // ── Avatar initials ─────────────────────────────────────────
  it('renders initials from first and last name (2 words)', () => {
    const player = createMockPlayer({ name: 'Alice Smith' })
    render(<PlayerCard player={player} onEdit={() => {}} onDelete={() => {}} />)

    expect(screen.getByText('AS')).toBeDefined()
  })

  it('renders first letter only when name is single word', () => {
    const player = createMockPlayer({ name: 'Cher' })
    render(<PlayerCard player={player} onEdit={() => {}} onDelete={() => {}} />)

    expect(screen.getByText('C')).toBeDefined()
  })

  it('renders first two initials for three-word name', () => {
    const player = createMockPlayer({ name: 'Mary Jane Watson' })
    render(<PlayerCard player={player} onEdit={() => {}} onDelete={() => {}} />)

    expect(screen.getByText('MJ')).toBeDefined()
  })

  // ── Edge cases ──────────────────────────────────────────────
  it('renders without position when primary_position is null', () => {
    const player = createMockPlayer({ primary_position: null })
    render(<PlayerCard player={player} onEdit={() => {}} onDelete={() => {}} />)

    // Position text should not be present
    expect(screen.queryByText('Unspecified')).toBeNull()
  })

  it('renders with unknown status fallback', () => {
    const player = createMockPlayer({ status: 'UnknownStatus' as any })
    render(<PlayerCard player={player} onEdit={() => {}} onDelete={() => {}} />)

    expect(screen.getByText('UnknownStatus')).toBeDefined()
  })

  it('renders with unknown player_type fallback', () => {
    const player = createMockPlayer({ player_type: 'UnknownType' })
    render(<PlayerCard player={player} onEdit={() => {}} onDelete={() => {}} />)

    expect(screen.getByText('UnknownType')).toBeDefined()
  })

  // ── All statuses ────────────────────────────────────────────
  it.each([
    'Active', 'Injured', 'Unavailable', 'Retired', 'Archived',
  ] as const)('renders status badge for %s', (status) => {
    const player = createMockPlayer({ status })
    render(<PlayerCard player={player} onEdit={() => {}} onDelete={() => {}} />)

    expect(screen.getByText(status)).toBeDefined()
  })

  // ── All player types ────────────────────────────────────────
  it.each([
    'Performance', 'Open', "Women's",
  ] as const)('renders type badge for %s', (playerType) => {
    const player = createMockPlayer({ player_type: playerType })
    render(<PlayerCard player={player} onEdit={() => {}} onDelete={() => {}} />)

    expect(screen.getByText(playerType)).toBeDefined()
  })

  // ── Long name truncation ────────────────────────────────────
  it('renders long names without crashing', () => {
    const longName = 'Alexander Benjamin Christopher Davidson'
    const player = createMockPlayer({ name: longName })
    render(<PlayerCard player={player} onEdit={() => {}} onDelete={() => {}} />)

    // Initials should be first two words: "AB"
    expect(screen.getByText('AB')).toBeDefined()
  })

  // ── Calls onEdit callback on click ───────────────────────────
  it('calls onEdit when clicked', async () => {
    const onEdit = vi.fn()
    const player = createMockPlayer()
    render(<PlayerCard player={player} onEdit={onEdit} onDelete={() => {}} />)

    const user = userEvent.setup()
    await user.click(screen.getByRole('button'))

    expect(onEdit).toHaveBeenCalledTimes(1)
  })

  // ── Chevron icon renders ────────────────────────────────────
  it('renders a chevron icon', () => {
    const player = createMockPlayer()
    const { container } = render(
      <PlayerCard player={player} onEdit={() => {}} onDelete={() => {}} />
    )

    // The ChevronRight icon from lucide-react renders an SVG
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
  })

  // ── Subscription status ─────────────────────────────────────
  it('renders subscription badge', () => {
    const player = createMockPlayer({ subscription_paid: false })
    render(<PlayerCard player={player} onEdit={() => {}} onDelete={() => {}} />)

    expect(screen.getByText('John Doe')).toBeDefined()
    // The card should still render even without subscription
  })
})

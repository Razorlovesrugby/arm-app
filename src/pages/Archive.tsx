// src/pages/Archive.tsx
// Phase 11 (built as part of CP8):
//   - Sub-tab: Archive | Search
//   - Archive: reverse-chronological closed weeks, pill team tabs, click-to-edit game notes
//   - Search: player history hub — search across all archive_game_notes by name
//   - Deep-link: /archive?tab=archive&week=X&team=Y&player=Z  (auto-selects tab + scrolls)
//   - Back navigation from deep-link returns to previous search state via browser history

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { WeekTeam, ArchiveGameNote } from '../lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClosedWeek {
  id: string
  label: string
  start_date: string
  end_date: string
  week_teams: WeekTeam[]
}

// archive_game_notes row augmented with de-normalised fields for display
interface NoteRow extends ArchiveGameNote {
  team_name?: string
  week_id?: string      // added for search deep-link navigation
  week_label?: string
  week_start?: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function typeBadgeStyle(type: string | null): React.CSSProperties {
  if (type === 'Performance') return { background: '#EFF6FF', color: '#1D4ED8' }
  if (type === "Women's")     return { background: '#FDF4FF', color: '#7E22CE' }
  return { background: '#F3F4F6', color: '#374151' }  // Open / fallback
}

function posBadgeStyle(): React.CSSProperties {
  return { background: '#F3E8FF', color: '#6B21A8' }
}

function Badge({ text, style }: { text: string; style: React.CSSProperties }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 999,
      whiteSpace: 'nowrap', flexShrink: 0, ...style,
    }}>
      {text}
    </span>
  )
}

// ─── Game Note Row ────────────────────────────────────────────────────────────

interface NoteRowProps {
  note: NoteRow
  isDeepLinkTarget: boolean
  onSave: (noteId: string, text: string) => void
}

function GameNoteRow({ note, isDeepLinkTarget, onSave }: NoteRowProps) {
  const [expanded, setExpanded] = useState(isDeepLinkTarget)
  const [text,     setText]     = useState(note.game_notes ?? '')
  const [saving,   setSaving]   = useState(false)
  const debounceRef             = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rowRef                  = useRef<HTMLDivElement>(null)

  // Sync if external data changes
  useEffect(() => {
    setText(note.game_notes ?? '')
  }, [note.game_notes])

  // Scroll into center when this is the deep-link target
  useEffect(() => {
    if (isDeepLinkTarget && rowRef.current) {
      setTimeout(() => {
        rowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
    }
  }, [isDeepLinkTarget])

  function handleChange(val: string) {
    setText(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSaving(true)
      await onSave(note.id, val)
      setSaving(false)
    }, 1500)
  }

  const hasNotes = text.trim().length > 0

  return (
    <div
      ref={rowRef}
      style={{
        borderBottom: '1px solid #F3F4F6',
        background: isDeepLinkTarget ? '#FAFAFF' : '#FFFFFF',
        outline: isDeepLinkTarget ? '2px solid #6B21A8' : 'none',
        outlineOffset: '-2px',
        transition: 'outline 0.3s',
      }}
    >
      {/* Player header row — tap to toggle notes textarea */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '11px 14px', cursor: 'pointer', minHeight: 52,
        }}
      >
        {/* Avatar circle */}
        <div style={{
          width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
          background: '#F3E8FF', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#6B21A8',
        }}>
          {(note.player_name_snapshot ?? '?').charAt(0).toUpperCase()}
        </div>

        {/* Name + badges */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {note.player_name_snapshot}
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 2, flexWrap: 'wrap' }}>
            {note.player_type_snapshot && (
              <Badge text={note.player_type_snapshot} style={typeBadgeStyle(note.player_type_snapshot)} />
            )}
            {note.position_snapshot && (
              <Badge text={note.position_snapshot} style={posBadgeStyle()} />
            )}
          </div>
        </div>

        {/* Notes preview + expand chevron */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {hasNotes && !expanded && (
            <span style={{ fontSize: 12, color: '#6B7280', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {text.slice(0, 40)}{text.length > 40 ? '…' : ''}
            </span>
          )}
          {!hasNotes && !expanded && (
            <span style={{ fontSize: 12, color: '#D1D5DB', fontStyle: 'italic' }}>Add note…</span>
          )}
          <span style={{
            fontSize: 12, color: '#9CA3AF', display: 'inline-block',
            transform: expanded ? 'rotate(90deg)' : 'none',
            transition: 'transform 0.2s',
          }}>▶</span>
        </div>
      </div>

      {/* Expanded textarea */}
      {expanded && (
        <div style={{ padding: '0 14px 12px' }}>
          <textarea
            value={text}
            onChange={e => handleChange(e.target.value)}
            placeholder="Post-match notes for this player…"
            rows={3}
            autoFocus={isDeepLinkTarget}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '10px 12px',
              border: '1px solid #E5E7EB',
              borderRadius: 8,
              fontSize: 14, color: '#111827',
              background: '#FFFFFF',
              resize: 'vertical',
              outline: 'none',
              fontFamily: 'inherit',
              lineHeight: 1.5,
            }}
            onFocus={e => (e.target.style.borderColor = '#6B21A8')}
            onBlur={e  => (e.target.style.borderColor = '#E5E7EB')}
          />
          {saving && (
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9CA3AF' }}>Saving…</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Week Archive Card ────────────────────────────────────────────────────────

interface WeekArchiveCardProps {
  week: ClosedWeek
  expanded: boolean
  onToggleExpand: () => void
  activeTeamId: string | null
  onSelectTeam: (teamId: string) => void
  notes: NoteRow[]
  deepLinkPlayerId: string | null
  onSaveNote: (noteId: string, text: string) => void
}

function WeekArchiveCard({
  week, expanded, onToggleExpand, activeTeamId, onSelectTeam,
  notes, deepLinkPlayerId, onSaveNote,
}: WeekArchiveCardProps) {
  // Hide inactive (Bye) teams from archive view
  const activeTeams = week.week_teams.filter(t => t.is_active !== false)

  const resolvedTeamId = activeTeamId ?? (activeTeams[0]?.id ?? null)
  const teamNotes      = notes.filter(n => n.week_team_id === resolvedTeamId)

  return (
    <div style={{
      background: '#FFFFFF', borderRadius: 12, border: '1px solid #E5E7EB',
      overflow: 'hidden', marginBottom: 12,
    }}>
      {/* Week header — tap to expand/collapse */}
      <div
        onClick={onToggleExpand}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px', cursor: 'pointer',
          borderBottom: expanded ? '1px solid #F3F4F6' : 'none',
        }}
      >
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{week.label}</div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
            {formatDate(week.start_date)} – {formatDate(week.end_date)}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999,
            background: '#F3F4F6', color: '#4B5563',
          }}>
            Closed
          </span>
          <span style={{
            fontSize: 14, color: '#9CA3AF', display: 'inline-block',
            transform: expanded ? 'rotate(90deg)' : 'none',
            transition: 'transform 0.2s',
          }}>▶</span>
        </div>
      </div>

      {expanded && (
        <>
          {/* Team pill tabs */}
          {activeTeams.length > 0 && (
            <div style={{
              display: 'flex', gap: 6, padding: '10px 16px', flexWrap: 'wrap',
              borderBottom: '1px solid #F3F4F6',
            }}>
              {activeTeams.map(t => {
                const isActive = resolvedTeamId === t.id
                return (
                  <button
                    key={t.id}
                    onClick={() => onSelectTeam(t.id)}
                    style={{
                      padding: '5px 14px', borderRadius: 999, border: 'none',
                      cursor: 'pointer', fontSize: 13, fontWeight: 600, flexShrink: 0,
                      background: isActive ? '#6B21A8' : '#F3F4F6',
                      color:      isActive ? '#FFFFFF' : '#374151',
                    }}
                  >
                    {t.team_name}
                  </button>
                )
              })}
            </div>
          )}

          {/* Player notes list */}
          {teamNotes.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 14, color: '#9CA3AF' }}>
              No players recorded for this team.
            </div>
          ) : (
            teamNotes.map(note => (
              <GameNoteRow
                key={note.id}
                note={note}
                isDeepLinkTarget={deepLinkPlayerId === (note.player_id ?? note.id)}
                onSave={onSaveNote}
              />
            ))
          )}
        </>
      )}
    </div>
  )
}

// ─── Search Tab ───────────────────────────────────────────────────────────────

interface SearchTabProps {
  initialQuery: string
  onNavigateToPlayer: (weekId: string, teamId: string, playerId: string | null, query: string) => void
}

function SearchTab({ initialQuery, onNavigateToPlayer }: SearchTabProps) {
  const [query,    setQuery]    = useState(initialQuery)
  const [results,  setResults]  = useState<NoteRow[]>([])
  const [loading,  setLoading]  = useState(false)
  const [searched, setSearched] = useState(false)
  const debounceRef             = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setSearched(false); return }
    setLoading(true)
    // archive_game_notes → week_teams → weeks (all many-to-one FKs, returns objects not arrays)
    const { data } = await supabase
      .from('archive_game_notes')
      .select(`
        *,
        week_teams (
          id,
          team_name,
          week_id,
          weeks ( label, start_date )
        )
      `)
      .ilike('player_name_snapshot', `%${q.trim()}%`)

    const rows: NoteRow[] = ((data ?? []) as any[])
      .filter(r => r.week_teams !== null)
      .map(r => ({
        ...(r as ArchiveGameNote),
        team_name:  r.week_teams?.team_name as string | undefined,
        week_id:    r.week_teams?.week_id   as string | undefined,
        week_label: r.week_teams?.weeks?.label      as string | undefined,
        week_start: r.week_teams?.weeks?.start_date as string | undefined,
      }))
      // Client-side sort: most recent week first
      .sort((a, b) =>
        new Date(b.week_start ?? '').getTime() - new Date(a.week_start ?? '').getTime()
      )

    setResults(rows)
    setSearched(true)
    setLoading(false)
  }, [])

  function handleChange(val: string) {
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(val), 350)
  }

  // Run on mount if initial query present (restored from URL after Back)
  useEffect(() => {
    if (initialQuery) doSearch(initialQuery)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ padding: '16px', maxWidth: 680, margin: '0 auto' }}>
      {/* Search input */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <span style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          fontSize: 16, color: '#9CA3AF', pointerEvents: 'none',
        }}>🔍</span>
        <input
          type="search"
          value={query}
          onChange={e => handleChange(e.target.value)}
          placeholder="Search by player name…"
          autoFocus
          style={{
            width: '100%', boxSizing: 'border-box',
            paddingLeft: 38, paddingRight: 14,
            height: 46, borderRadius: 10,
            border: '1px solid #E5E7EB', fontSize: 15,
            color: '#111827', background: '#FFFFFF', outline: 'none',
          }}
          onFocus={e  => (e.target.style.borderColor = '#6B21A8')}
          onBlur={e   => (e.target.style.borderColor = '#E5E7EB')}
        />
      </div>

      {/* Loading spinner */}
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
          <div style={{
            width: 28, height: 28, border: '3px solid #E5E7EB',
            borderTopColor: '#6B21A8', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* No results */}
      {!loading && searched && results.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: '#9CA3AF', fontSize: 14 }}>
          No match for "{query}"
        </div>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {results.map(r => (
            <div
              key={r.id}
              onClick={() => r.week_id && onNavigateToPlayer(r.week_id, r.week_team_id, r.player_id, query)}
              style={{
                background: '#FFFFFF', borderRadius: 10, border: '1px solid #E5E7EB',
                padding: '12px 14px', cursor: 'pointer',
              }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(107,33,168,0.12)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
            >
              {/* Week + team metadata */}
              <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>
                {r.week_label ?? '—'}
                {r.week_start && ` · ${formatDate(r.week_start)}`}
                {r.team_name && ` · ${r.team_name}`}
              </div>

              {/* Player name + badges */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>
                  {r.player_name_snapshot}
                </span>
                {r.player_type_snapshot && (
                  <Badge text={r.player_type_snapshot} style={typeBadgeStyle(r.player_type_snapshot)} />
                )}
                {r.position_snapshot && (
                  <Badge text={r.position_snapshot} style={posBadgeStyle()} />
                )}
              </div>

              {/* Notes preview */}
              {r.game_notes ? (
                <p style={{ margin: 0, fontSize: 13, color: '#6B7280', lineHeight: 1.4 }}>
                  {r.game_notes.slice(0, 90)}{r.game_notes.length > 90 ? '…' : ''}
                </p>
              ) : (
                <p style={{ margin: 0, fontSize: 13, color: '#D1D5DB', fontStyle: 'italic' }}>No notes yet</p>
              )}

              <div style={{ fontSize: 11, color: '#C4B5FD', marginTop: 6, fontWeight: 600 }}>
                Tap to view on team sheet →
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state — no search typed yet */}
      {!loading && !searched && (
        <div style={{ textAlign: 'center', padding: '56px 24px', color: '#9CA3AF' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
          <p style={{ fontSize: 15, fontWeight: 500, color: '#374151', margin: '0 0 6px' }}>Player History</p>
          <p style={{ fontSize: 14, margin: 0 }}>Search by name to find a player's match history and notes.</p>
        </div>
      )}
    </div>
  )
}

// ─── Main Archive Page ────────────────────────────────────────────────────────

export default function Archive() {
  const { activeClubId } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  // URL-driven state
  const tabParam    = searchParams.get('tab') as 'archive' | 'search' | null
  const weekParam   = searchParams.get('week')
  const teamParam   = searchParams.get('team')
  const playerParam = searchParams.get('player')
  const qParam      = searchParams.get('q') ?? ''

  const activeSubTab: 'archive' | 'search' = tabParam === 'search' ? 'search' : 'archive'

  // ── Closed weeks ───────────────────────────────────────────────────────────

  const [closedWeeks,  setClosedWeeks]  = useState<ClosedWeek[]>([])
  const [weeksLoading, setWeeksLoading] = useState(true)

  useEffect(() => {
    async function fetchClosedWeeks() {
      setWeeksLoading(true)
      const { data } = await supabase
        .from('weeks')
        .select('*, week_teams(*)')
        .eq('status', 'Closed')
        .order('start_date', { ascending: false })

      setClosedWeeks(
        ((data ?? []) as any[]).map(w => ({
          id:         w.id,
          label:      w.label,
          start_date: w.start_date,
          end_date:   w.end_date,
          week_teams: ((w.week_teams ?? []) as WeekTeam[])
            .sort((a, b) => a.sort_order - b.sort_order),
        }))
      )
      setWeeksLoading(false)
    }
    fetchClosedWeeks()
  }, [])

  // ── Per-week UI state ──────────────────────────────────────────────────────

  const [expandedWeekId,   setExpandedWeekId]   = useState<string | null>(weekParam)
  const [activeTeamPerWeek, setActiveTeamPerWeek] = useState<Record<string, string>>(
    weekParam && teamParam ? { [weekParam]: teamParam } : {}
  )

  // ── Archive game notes (all loaded notes merged) ───────────────────────────

  const [allNotes,    setAllNotes]    = useState<NoteRow[]>([])
  const loadedWeeks   = useRef<Set<string>>(new Set())

  // Load notes for a week using the known team IDs — no join filter needed.
  // We pass the week object so we can map team_name without a join.
  const loadWeekNotes = useCallback(async (week: ClosedWeek) => {
    if (loadedWeeks.current.has(week.id)) return
    loadedWeeks.current.add(week.id)

    const teamIds  = week.week_teams.map(t => t.id)
    if (teamIds.length === 0) return

    const { data } = await supabase
      .from('archive_game_notes')
      .select('*')
      .in('week_team_id', teamIds)

    const teamNameMap = Object.fromEntries(week.week_teams.map(t => [t.id, t.team_name]))

    const rows: NoteRow[] = ((data ?? []) as ArchiveGameNote[]).map(r => ({
      ...r,
      team_name: teamNameMap[r.week_team_id],
      week_id:   week.id,
    }))

    setAllNotes(prev => {
      const newIds = new Set(rows.map(r => r.id))
      return [...prev.filter(n => !newIds.has(n.id)), ...rows]
    })
  }, [])

  // Trigger load when a week is expanded
  useEffect(() => {
    if (!expandedWeekId) return
    const week = closedWeeks.find(w => w.id === expandedWeekId)
    if (week) loadWeekNotes(week)
  }, [expandedWeekId, closedWeeks, loadWeekNotes])

  // Deep-link: once closedWeeks loads, auto-expand + select team from URL params
  useEffect(() => {
    if (!weekParam || closedWeeks.length === 0) return
    setExpandedWeekId(weekParam)
    if (teamParam) {
      setActiveTeamPerWeek(prev => ({ ...prev, [weekParam]: teamParam }))
    }
  // Run whenever closedWeeks first populates (handles async load after mount)
  }, [closedWeeks, weekParam, teamParam])

  // ── Save game note ─────────────────────────────────────────────────────────

  async function handleSaveNote(noteId: string, text: string) {
    if (!activeClubId) {
      console.error('handleSaveNote aborted: no active club ID')
      return
    }
    await supabase
      .from('archive_game_notes')
      .update({ game_notes: text || null, club_id: activeClubId })
      .eq('id', noteId)
      .eq('club_id', activeClubId)
    setAllNotes(prev =>
      prev.map(n => n.id === noteId ? { ...n, game_notes: text || null } : n)
    )
  }

  // ── Sub-tab switch ─────────────────────────────────────────────────────────

  function switchTab(tab: 'archive' | 'search') {
    const next = new URLSearchParams()
    next.set('tab', tab)
    if (tab === 'search' && qParam) next.set('q', qParam)
    setSearchParams(next, { replace: true })
  }

  // ── Navigate to player from search ────────────────────────────────────────

  function handleNavigateToPlayer(
    weekId: string, teamId: string, playerId: string | null, query: string,
  ) {
    const next = new URLSearchParams()
    next.set('tab', 'archive')
    next.set('week', weekId)
    next.set('team', teamId)
    if (playerId) next.set('player', playerId)
    if (query)    next.set('q', query)   // preserved so Back button restores search
    navigate(`/archive?${next.toString()}`)
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ paddingBottom: 80 }}>

      {/* Sub-tab bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: '#F8F8F8', borderBottom: '1px solid #E5E7EB',
        padding: '0 16px',
        display: 'flex', gap: 0,
      }}>
        {(['archive', 'search'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => switchTab(tab)}
            style={{
              padding: '13px 18px', border: 'none', background: 'none',
              cursor: 'pointer', fontSize: 14, fontWeight: 600,
              color:       activeSubTab === tab ? '#6B21A8' : '#6B7280',
              borderBottom: activeSubTab === tab ? '2px solid #6B21A8' : '2px solid transparent',
              transition:  'color 0.15s',
            }}
          >
            {tab === 'archive' ? '🗄 Archive' : '🔍 Search'}
          </button>
        ))}

        {/* Back to search — shown when arriving via deep-link from Search */}
        {activeSubTab === 'archive' && weekParam && qParam && (
          <button
            onClick={() => navigate(-1)}
            style={{
              marginLeft: 'auto', padding: '0 8px',
              border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, color: '#6B21A8',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            ← Back
          </button>
        )}
      </div>

      {/* ── Archive tab ──────────────────────────────────────────────────── */}
      {activeSubTab === 'archive' && (
        <div style={{ padding: '16px', maxWidth: 680, margin: '0 auto' }}>
          {weeksLoading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
              <div style={{
                width: 32, height: 32, border: '3px solid #E5E7EB',
                borderTopColor: '#6B21A8', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {!weeksLoading && closedWeeks.length === 0 && (
            <div style={{ textAlign: 'center', padding: '56px 24px' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🗄️</div>
              <p style={{ fontSize: 15, fontWeight: 500, color: '#111827', margin: '0 0 6px' }}>
                No closed weeks yet
              </p>
              <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>
                Close a week from the Weeks screen to see it here.
              </p>
            </div>
          )}

          {!weeksLoading && closedWeeks.map(week => (
            <WeekArchiveCard
              key={week.id}
              week={week}
              expanded={expandedWeekId === week.id}
              onToggleExpand={() => setExpandedWeekId(id => id === week.id ? null : week.id)}
              activeTeamId={activeTeamPerWeek[week.id] ?? null}
              onSelectTeam={teamId => setActiveTeamPerWeek(prev => ({ ...prev, [week.id]: teamId }))}
              notes={allNotes}
              deepLinkPlayerId={weekParam === week.id ? playerParam : null}
              onSaveNote={handleSaveNote}
            />
          ))}
        </div>
      )}

      {/* ── Search tab ───────────────────────────────────────────────────── */}
      {activeSubTab === 'search' && (
        <SearchTab
          initialQuery={qParam}
          onNavigateToPlayer={handleNavigateToPlayer}
        />
      )}

    </div>
  )
}

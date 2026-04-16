import type { Position } from '../lib/supabase'

// Maps SelectionBoard's verbose position names (shirt number labels)
// to the standard Position type used across the app.
export function mapToStandardPosition(positionName: string): Position {
  const mapping: Record<string, Position> = {
    'Loosehead Prop':    'Prop',
    'Tighthead Prop':    'Prop',
    'Hooker':            'Hooker',
    'Lock':              'Lock',
    'Blindside Flanker': 'Flanker',
    'Openside Flanker':  'Flanker',
    'Number 8':          'Number 8',
    'Scrum-half':        'Scrum-half',
    'Fly-half':          'Fly-half',
    'Inside Centre':     'Centre',
    'Outside Centre':    'Centre',
    'Left Wing':         'Wing',
    'Right Wing':        'Wing',
    'Fullback':          'Fullback',
  }
  return mapping[positionName] ?? 'Unspecified'
}

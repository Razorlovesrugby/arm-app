import { describe, it, expect } from 'vitest'
import { mapToStandardPosition } from './positionMapper'

describe('mapToStandardPosition', () => {
  // ── Known mappings ──────────────────────────────────────────────
  it('maps "Loosehead Prop" to "Prop"', () => {
    expect(mapToStandardPosition('Loosehead Prop')).toBe('Prop')
  })

  it('maps "Tighthead Prop" to "Prop"', () => {
    expect(mapToStandardPosition('Tighthead Prop')).toBe('Prop')
  })

  it('maps "Hooker" to "Hooker"', () => {
    expect(mapToStandardPosition('Hooker')).toBe('Hooker')
  })

  it('maps "Lock" to "Lock"', () => {
    expect(mapToStandardPosition('Lock')).toBe('Lock')
  })

  it('maps "Blindside Flanker" to "Flanker"', () => {
    expect(mapToStandardPosition('Blindside Flanker')).toBe('Flanker')
  })

  it('maps "Openside Flanker" to "Flanker"', () => {
    expect(mapToStandardPosition('Openside Flanker')).toBe('Flanker')
  })

  it('maps "Number 8" to "Number 8"', () => {
    expect(mapToStandardPosition('Number 8')).toBe('Number 8')
  })

  it('maps "Scrum-half" to "Scrum-half"', () => {
    expect(mapToStandardPosition('Scrum-half')).toBe('Scrum-half')
  })

  it('maps "Fly-half" to "Fly-half"', () => {
    expect(mapToStandardPosition('Fly-half')).toBe('Fly-half')
  })

  it('maps "Inside Centre" to "Centre"', () => {
    expect(mapToStandardPosition('Inside Centre')).toBe('Centre')
  })

  it('maps "Outside Centre" to "Centre"', () => {
    expect(mapToStandardPosition('Outside Centre')).toBe('Centre')
  })

  it('maps "Left Wing" to "Wing"', () => {
    expect(mapToStandardPosition('Left Wing')).toBe('Wing')
  })

  it('maps "Right Wing" to "Wing"', () => {
    expect(mapToStandardPosition('Right Wing')).toBe('Wing')
  })

  it('maps "Fullback" to "Fullback"', () => {
    expect(mapToStandardPosition('Fullback')).toBe('Fullback')
  })

  // ── Edge cases / invalid inputs ────────────────────────────────
  it('returns "Unspecified" for an empty string', () => {
    expect(mapToStandardPosition('')).toBe('Unspecified')
  })

  it('returns "Unspecified" for a misspelled position', () => {
    expect(mapToStandardPosition('Losehead Prop')).toBe('Unspecified')
  })

  it('returns "Unspecified" for lowercase input', () => {
    expect(mapToStandardPosition('hooker')).toBe('Unspecified')
  })

  it('returns "Unspecified" for mixed case input', () => {
    expect(mapToStandardPosition('LOOSEHEAD PROP')).toBe('Unspecified')
  })

  it('returns "Unspecified" for a completely unknown string', () => {
    expect(mapToStandardPosition('Quarterback')).toBe('Unspecified')
  })

  it('returns "Unspecified" for whitespace-only input', () => {
    expect(mapToStandardPosition('   ')).toBe('Unspecified')
  })

  it('returns "Unspecified" for a string with trailing space', () => {
    expect(mapToStandardPosition('Hooker ')).toBe('Unspecified')
  })

  it('returns "Unspecified" for a string with leading space', () => {
    expect(mapToStandardPosition(' Hooker')).toBe('Unspecified')
  })

  it('returns "Unspecified" for numeric input', () => {
    expect(mapToStandardPosition('123')).toBe('Unspecified')
  })

  it('returns "Unspecified" for special characters', () => {
    expect(mapToStandardPosition('!@#$%')).toBe('Unspecified')
  })

  // ── Verify all 14 known entries exist and are distinct ──────────
  it('maps all known position names without throwing', () => {
    const knownPositions = [
      'Loosehead Prop', 'Tighthead Prop', 'Hooker', 'Lock',
      'Blindside Flanker', 'Openside Flanker', 'Number 8',
      'Scrum-half', 'Fly-half', 'Inside Centre', 'Outside Centre',
      'Left Wing', 'Right Wing', 'Fullback',
    ]
    const results = knownPositions.map(mapToStandardPosition)
    expect(results).toHaveLength(14)
    // All results should be valid Position types, never 'Unspecified'
    results.forEach(r => expect(r).not.toBe('Unspecified'))
  })
})

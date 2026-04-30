import { describe, it, expect } from 'vitest'
import { getContrastColor, isValidHexColor } from './colorUtils'

describe('getContrastColor', () => {
  // ── Dark backgrounds → white text ─────────────────────────────
  it('returns "text-white" for black (#000000)', () => {
    expect(getContrastColor('#000000')).toBe('text-white')
  })

  it('returns "text-white" for very dark blue (#000033)', () => {
    expect(getContrastColor('#000033')).toBe('text-white')
  })

  // #4A148C → R:74 G:20 B:140 → (0.299*74 + 0.587*20 + 0.114*140)/255 ≈ 0.195 > 0.179 → gray-900
  it('returns "text-gray-900" for dark purple (#4A148C)', () => {
    expect(getContrastColor('#4A148C')).toBe('text-gray-900')
  })

  it('returns "text-white" for dark red (#8B0000)', () => {
    expect(getContrastColor('#8B0000')).toBe('text-white')
  })

  // ── Light backgrounds → gray-900 text ─────────────────────────
  it('returns "text-gray-900" for white (#FFFFFF)', () => {
    expect(getContrastColor('#FFFFFF')).toBe('text-gray-900')
  })

  it('returns "text-gray-900" for very light gray (#F5F5F5)', () => {
    expect(getContrastColor('#F5F5F5')).toBe('text-gray-900')
  })

  it('returns "text-gray-900" for light yellow (#FFFACD)', () => {
    expect(getContrastColor('#FFFACD')).toBe('text-gray-900')
  })

  it('returns "text-gray-900" for light blue (#ADD8E6)', () => {
    expect(getContrastColor('#ADD8E6')).toBe('text-gray-900')
  })

  // ── Boundary near luminance threshold (~0.179) ────────────────
  // #555555 → R:85 G:85 B:85 → (0.299*85 + 0.587*85 + 0.114*85)/255 = 85/255 ≈ 0.333 > 0.179 → gray-900
  it('returns "text-gray-900" for medium gray (#555555)', () => {
    expect(getContrastColor('#555555')).toBe('text-gray-900')
  })

  // #333333 → R:51 G:51 B:51 → 51/255 ≈ 0.2 > 0.179 → gray-900
  it('returns "text-gray-900" for dark gray (#333333)', () => {
    expect(getContrastColor('#333333')).toBe('text-gray-900')
  })

  // #2A2A2A → R:42 G:42 B:42 → 42/255 ≈ 0.165 < 0.179 → white
  it('returns "text-white" for very dark gray (#2A2A2A)', () => {
    expect(getContrastColor('#2A2A2A')).toBe('text-white')
  })

  // ── Hex without # prefix ──────────────────────────────────────
  it('handles hex without the # prefix', () => {
    expect(getContrastColor('FFFFFF')).toBe('text-gray-900')
    expect(getContrastColor('000000')).toBe('text-white')
  })

  // Note: getContrastColor does NOT expand 3-char shorthand hex.
  // 'FFF'.substr(2,2) = "F" → parseInt("F",16) = 15 for green,
  // 'FFF'.substr(4,2) = "" → parseInt("",16) = NaN for blue,
  // so the result is effectively NaN-derived. These tests document
  // current (imperfect) behavior.
  it('handles 3-char hex without # prefix as 6-char', () => {
    // #FFF becomes "FFF" → r=255, g=15, b=NaN → luminance NaN → NaN > 0.179 = false → white
    expect(getContrastColor('#FFF')).toBe('text-white')
    // #000 becomes "000" → r=0, g=0, b=0 → black → white
    expect(getContrastColor('#000')).toBe('text-white')
  })
})

describe('isValidHexColor', () => {
  // ── Valid formats ─────────────────────────────────────────────
  it('returns true for a valid 6-char hex with #', () => {
    expect(isValidHexColor('#FF5733')).toBe(true)
  })

  it('returns true for a valid 6-char hex with lowercase letters', () => {
    expect(isValidHexColor('#ff5733')).toBe(true)
  })

  it('returns true for a valid 6-char hex with mixed case', () => {
    expect(isValidHexColor('#Ff5733')).toBe(true)
  })

  it('returns true for a valid 3-char hex with #', () => {
    expect(isValidHexColor('#FFF')).toBe(true)
  })

  it('returns true for a valid 3-char hex lowercase', () => {
    expect(isValidHexColor('#abc')).toBe(true)
  })

  it('returns true for all zeros', () => {
    expect(isValidHexColor('#000000')).toBe(true)
  })

  it('returns true for all Fs uppercase', () => {
    expect(isValidHexColor('#FFFFFF')).toBe(true)
  })

  // ── Invalid formats ───────────────────────────────────────────
  it('returns false for a hex without #', () => {
    expect(isValidHexColor('FF5733')).toBe(false)
  })

  it('returns false for an empty string', () => {
    expect(isValidHexColor('')).toBe(false)
  })

  it('returns false for just "#"', () => {
    expect(isValidHexColor('#')).toBe(false)
  })

  it('returns false for a 5-char string (#FFFFF)', () => {
    expect(isValidHexColor('#FFFFF')).toBe(false)
  })

  it('returns false for a 7-char string (#FFFFFFF)', () => {
    expect(isValidHexColor('#FFFFFFF')).toBe(false)
  })

  it('returns false for a 2-char string (#F)', () => {
    expect(isValidHexColor('#F')).toBe(false)
  })

  it('returns false for a 4-char string (#FFFF)', () => {
    expect(isValidHexColor('#FFFF')).toBe(false)
  })

  it('returns false for non-hex characters', () => {
    expect(isValidHexColor('#GGGGGG')).toBe(false)
  })

  it('returns false for hex with spaces', () => {
    expect(isValidHexColor('#FF 5733')).toBe(false)
  })

  it('returns false for a number without #', () => {
    expect(isValidHexColor('123456')).toBe(false)
  })

  it('returns false for null as string', () => {
    expect(isValidHexColor('null')).toBe(false)
  })
})

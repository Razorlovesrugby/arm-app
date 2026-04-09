// Utility for dynamic text color based on background luminance
export function getContrastColor(hex: string): 'text-white' | 'text-gray-900' {
  const cleanHex = hex.replace('#', '')

  const r = parseInt(cleanHex.substr(0, 2), 16)
  const g = parseInt(cleanHex.substr(2, 2), 16)
  const b = parseInt(cleanHex.substr(4, 2), 16)

  // Calculate relative luminance (WCAG formula)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  // Return black text for light backgrounds, white for dark
  return luminance > 0.179 ? 'text-gray-900' : 'text-white'
}

// Validate hex color
export function isValidHexColor(hex: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex)
}

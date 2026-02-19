/**
 * Convert hex color to HSL format for CSS variables
 * @param hex - Hex color string (e.g., "#ef4444")
 * @returns HSL string in format "h s% l%" (e.g., "0 84% 60%")
 */
export function hexToHSL(hex: string): string {
  // Remove # if present
  hex = hex.replace(/^#/, '')

  // Parse hex values
  const r = parseInt(hex.substring(0, 2), 16) / 255
  const g = parseInt(hex.substring(2, 4), 16) / 255
  const b = parseInt(hex.substring(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  // Convert to degrees and percentages
  h = Math.round(h * 360)
  s = Math.round(s * 100)
  const lPercent = Math.round(l * 100)

  // Return in the format expected by CSS variables (without % for hue)
  return `${h} ${s}% ${lPercent}%`
}

/**
 * Apply theme colors to CSS variables
 * @param colors - Object containing primary_color, secondary_color, accent_color
 */
export function applyThemeColors(colors: {
  primary_color?: string
  secondary_color?: string
  accent_color?: string
}) {
  if (typeof document === 'undefined') return

  const root = document.documentElement

  if (colors.primary_color) {
    const hsl = hexToHSL(colors.primary_color)
    root.style.setProperty('--primary', hsl)
  }

  if (colors.secondary_color) {
    const hsl = hexToHSL(colors.secondary_color)
    root.style.setProperty('--secondary', hsl)
  }

  if (colors.accent_color) {
    const hsl = hexToHSL(colors.accent_color)
    root.style.setProperty('--accent', hsl)
  }
}

/**
 * Get contrasting foreground color (black or white) for a given background color
 * @param hex - Hex color string
 * @returns HSL string for either white or black
 */
export function getContrastColor(hex: string): string {
  // Remove # if present
  hex = hex.replace(/^#/, '')

  // Parse hex values
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)

  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  // Return white for dark backgrounds, black for light backgrounds
  return luminance > 0.5 ? '0 0% 0%' : '0 0% 100%'
}

/**
 * Apply theme colors with automatic foreground colors
 * @param colors - Object containing primary_color, secondary_color, accent_color
 */
export function applyThemeColorsWithForeground(colors: {
  primary_color?: string
  secondary_color?: string
  accent_color?: string
}) {
  if (typeof document === 'undefined') return

  const root = document.documentElement

  if (colors.primary_color) {
    const hsl = hexToHSL(colors.primary_color)
    const foreground = getContrastColor(colors.primary_color)
    root.style.setProperty('--primary', hsl)
    root.style.setProperty('--primary-foreground', foreground)
  }

  if (colors.secondary_color) {
    const hsl = hexToHSL(colors.secondary_color)
    const foreground = getContrastColor(colors.secondary_color)
    root.style.setProperty('--secondary', hsl)
    root.style.setProperty('--secondary-foreground', foreground)
  }

  if (colors.accent_color) {
    const hsl = hexToHSL(colors.accent_color)
    const foreground = getContrastColor(colors.accent_color)
    root.style.setProperty('--accent', hsl)
    root.style.setProperty('--accent-foreground', foreground)
  }
}


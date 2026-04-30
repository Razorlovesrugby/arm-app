// src/components/PDFDownloadLink.tsx
// Phase 13: PDF download trigger wrapper

import { PDFDownloadLink } from '@react-pdf/renderer'
import { Download } from 'lucide-react'
import TeamSheetPDF from './TeamSheetPDF'
import type { PDFTeam } from '../lib/supabase'

interface PDFDownloadButtonProps {
  teams: PDFTeam[]
  brandColor?: string
  clubName?: string
  coachName?: string
  fileName?: string
  showCaps?: boolean
  /** Dark variant for use on dark backgrounds (SelectionBoard header) */
  dark?: boolean
}

export function PDFDownloadButton({
  teams,
  brandColor,
  clubName,
  coachName,
  fileName = 'team-sheet.pdf',
  showCaps = true,
  dark = false,
}: PDFDownloadButtonProps) {
  if (teams.length === 0) return null

  const lightStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 14px',
    background: '#1e40af',
    color: '#fff',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    textDecoration: 'none',
    border: 'none',
    cursor: 'pointer',
  }

  const darkStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    width: 32,
    height: 32,
    background: '#1a1a1a',
    color: 'rgba(255,255,255,0.7)',
    borderRadius: 8,
    fontSize: 12,
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'none',
    flexShrink: 0,
  }

  return (
    <PDFDownloadLink
      document={
        <TeamSheetPDF
          teams={teams}
          brandColor={brandColor}
          clubName={clubName}
          coachName={coachName}
          showCaps={showCaps}
        />
      }
      fileName={fileName}
      style={{ textDecoration: 'none' }}
    >
      {({ loading }: { loading: boolean }) => (
        <span
          style={dark ? darkStyle : lightStyle}
          title="Download Team Sheet PDF"
        >
          <Download size={dark ? 15 : 16} />
          {!dark && (loading ? 'Generating…' : 'Team Sheet PDF')}
        </span>
      )}
    </PDFDownloadLink>
  )
}

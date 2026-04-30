// src/components/TeamSheetPDF.tsx
// Phase 13: Professional Team Sheet PDF using @react-pdf/renderer

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { PDFPlayer, PDFTeam } from '../lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TeamSheetPDFProps {
  teams: PDFTeam[]
  brandColor?: string
  clubName?: string
  coachName?: string
  showCaps?: boolean
}

// ─── Player Numbering Logic ───────────────────────────────────────────────────

const organizePlayersByNumber = (players: PDFPlayer[]): (PDFPlayer | null)[] => {
  const result: (PDFPlayer | null)[] = Array(23).fill(null)
  players.forEach(player => {
    if (player.shirtNumber >= 1 && player.shirtNumber <= 23) {
      result[player.shirtNumber - 1] = player
    }
  })
  return result
}

const getPlayerDisplayName = (player: PDFPlayer | null, showCaps: boolean): string | null => {
  if (!player) return null
  const base = player.isCaptain ? `${player.fullName} (C)` : player.fullName
  if (!showCaps) return base
  const caps = player.totalCaps ?? 0
  return `${base} (${caps})`
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function createStyles(brandColor: string) {
  return StyleSheet.create({
    page: {
      padding: 40,
      fontSize: 10,
      fontFamily: 'Helvetica',
      color: '#000000',
    },
    header: {
      backgroundColor: brandColor,
      color: '#ffffff',
      padding: 20,
      marginBottom: 24,
      borderRadius: 4,
    },
    clubName: {
      fontSize: 11,
      marginBottom: 4,
      opacity: 0.8,
    },
    teamName: {
      fontSize: 24,
      fontFamily: 'Helvetica-Bold',
      marginBottom: 10,
    },
    matchInfoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      fontSize: 11,
      marginBottom: 4,
    },
    matchInfoLabel: {
      opacity: 0.75,
      marginRight: 4,
    },
    sectionTitle: {
      fontSize: 12,
      fontFamily: 'Helvetica-Bold',
      marginBottom: 10,
      borderBottomWidth: 2,
      borderBottomColor: brandColor,
      paddingBottom: 4,
      color: '#111111',
    },
    playerRow: {
      flexDirection: 'row',
      marginBottom: 7,
      alignItems: 'center',
      minHeight: 16,
    },
    shirtNumber: {
      width: 28,
      fontFamily: 'Helvetica-Bold',
      fontSize: 12,
      color: '#111111',
    },
    playerName: {
      flex: 1,
      fontSize: 11,
      color: '#111111',
    },
    captainBadge: {
      fontSize: 9,
      color: '#dc2626',
    },
    positionLabel: {
      width: 120,
      fontSize: 9,
      color: '#6b7280',
      textAlign: 'right',
    },
    emptySlot: {
      flex: 1,
      borderBottomWidth: 1,
      borderBottomColor: '#9ca3af',
      height: 12,
      marginLeft: 2,
    },
    notesSection: {
      marginTop: 20,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: '#e5e7eb',
    },
    notesTitle: {
      fontSize: 12,
      fontFamily: 'Helvetica-Bold',
      marginBottom: 8,
    },
    notesContent: {
      fontSize: 10,
      lineHeight: 1.5,
      color: '#374151',
    },
    footer: {
      position: 'absolute',
      bottom: 24,
      left: 40,
      right: 40,
      flexDirection: 'row',
      justifyContent: 'space-between',
      fontSize: 9,
      color: '#6b7280',
    },
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TeamSheetPDF({
  teams,
  brandColor = '#1e40af',
  clubName,
  coachName,
  showCaps = true,
}: TeamSheetPDFProps) {
  const styles = createStyles(brandColor)
  const generatedAt = new Date().toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  return (
    <Document title="Team Sheet" author={clubName ?? 'ARM'}>
      {teams.map((team, teamIdx) => {
        const organizedPlayers = organizePlayersByNumber(team.players)

        return (
          <Page key={teamIdx} size="A4" style={styles.page}>

            {/* ── Header ── */}
            <View style={styles.header}>
              {clubName && <Text style={styles.clubName}>{clubName}</Text>}
              <Text style={styles.teamName}>{team.teamName}</Text>

              {(team.opponent || team.matchDate || team.venue || team.kickoffTime) && (
                <View>
                  {team.opponent && (
                    <View style={styles.matchInfoRow}>
                      <Text style={styles.matchInfoLabel}>vs</Text>
                      <Text style={{ flex: 1, fontSize: 11 }}>{team.opponent}</Text>
                    </View>
                  )}
                  <View style={styles.matchInfoRow}>
                    {team.matchDate && <Text>{team.matchDate}</Text>}
                    {team.kickoffTime && <Text>{team.kickoffTime}</Text>}
                    {team.venue && <Text>{team.venue}</Text>}
                  </View>
                </View>
              )}
            </View>

            {/* ── Squad List ── */}
            <Text style={styles.sectionTitle}>SQUAD</Text>

            {organizedPlayers.map((player, idx) => {
              const shirtNum = idx + 1
              const displayName = getPlayerDisplayName(player, showCaps)

              return (
                <View key={idx} style={styles.playerRow}>
                  <Text style={styles.shirtNumber}>{shirtNum}</Text>
                  {player && displayName ? (
                    <>
                      <Text style={styles.playerName}>{displayName}</Text>
                      {player.position && (
                        <Text style={styles.positionLabel}>{player.position}</Text>
                      )}
                    </>
                  ) : (
                    <View style={styles.emptySlot} />
                  )}
                </View>
              )
            })}

            {/* ── Coach's Notes ── */}
            {team.matchNotes && (
              <View style={styles.notesSection}>
                <Text style={styles.notesTitle}>Coach's Notes</Text>
                <Text style={styles.notesContent}>{team.matchNotes}</Text>
              </View>
            )}

            {/* ── Footer ── */}
            <View style={styles.footer} fixed>
              <Text>Generated by ARM • {generatedAt}{coachName ? ` • ${coachName}` : ''}</Text>
              <Text
                render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
                  `${pageNumber} / ${totalPages}`
                }
              />
            </View>

          </Page>
        )
      })}
    </Document>
  )
}

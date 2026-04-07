import { useNavigate } from 'react-router-dom'
import { useWeeks } from '../hooks/useWeeks'

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function Results() {
  const { pastWeeks, loading } = useWeeks()
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-purple-800 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-20">
      <h1 className="text-xl font-bold text-gray-900 mb-4">Results</h1>

      {pastWeeks.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🏉</p>
          <p className="font-medium text-gray-600">No past weeks</p>
          <p className="text-sm mt-1">Results will appear here once a week has ended.</p>
        </div>
      )}

      <div className="space-y-3">
        {pastWeeks.map(week => {
          const activeTeams = week.week_teams.filter(t => t.is_active !== false)
          return (
            <div
              key={week.id}
              onClick={() => navigate(`/results/${week.id}`)}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
            >
              {/* Week label + date */}
              <div className="mb-3">
                <span className="font-semibold text-gray-900">{week.label}</span>
                <span className="text-sm text-gray-400 ml-2">
                  {formatDate(week.start_date)}
                </span>
              </div>

              {/* Teams */}
              {activeTeams.length === 0 ? (
                <p className="text-sm text-gray-400">No active teams</p>
              ) : (
                activeTeams.map(team => (
                  <div key={team.id} className="flex justify-between items-center py-2 border-t border-gray-100 first:border-0">
                    <span className="text-sm font-medium text-gray-700">{team.team_name} vs OPPOSITION</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-gray-900">
                        {team.score_for ?? 0} – {team.score_against ?? 0}
                      </span>
                    </div>
                  </div>
                ))
              )}

              {/* Match report preview */}
              {activeTeams.some(t => t.match_report) && (
                <p className="text-sm text-gray-500 truncate mt-2 pt-2 border-t border-gray-100">
                  {activeTeams.find(t => t.match_report)?.match_report?.slice(0, 50)}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

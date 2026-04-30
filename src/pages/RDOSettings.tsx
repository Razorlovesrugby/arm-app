// src/pages/RDOSettings.tsx
// Phase 17.6 — RDO Settings & Data Governance: Facilities management

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, CheckCircle, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { RdoFacility, FacilityType } from '../lib/supabase'

const FACILITY_TYPES: FacilityType[] = ['Pitch', 'Training Grid', 'Gym', 'Clubhouse', 'Off-Site']

const TABS = ['Facilities & Locations', 'Managed Teams', 'App Preferences'] as const
type Tab = typeof TABS[number]

// ── Facility status badge ──────────────────────────────────────────────────────

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span style={{
      background: '#DCFCE7', color: '#15803D',
      padding: '2px 8px', borderRadius: '999px',
      fontSize: '12px', fontWeight: '600',
    }}>
      Active
    </span>
  ) : (
    <span style={{
      background: '#F3F4F6', color: '#6B7280',
      padding: '2px 8px', borderRadius: '999px',
      fontSize: '12px', fontWeight: '600',
    }}>
      Inactive
    </span>
  )
}

// ── Add / Edit form ────────────────────────────────────────────────────────────

interface FacilityFormProps {
  initial?: { name: string; facility_type: FacilityType }
  onSubmit: (values: { name: string; facility_type: FacilityType }) => void
  onCancel: () => void
  submitting: boolean
}

function FacilityForm({ initial, onSubmit, onCancel, submitting }: FacilityFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [facilityType, setFacilityType] = useState<FacilityType>(initial?.facility_type ?? 'Pitch')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit({ name: name.trim(), facility_type: facilityType })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-gray-50 rounded-lg p-4 border border-gray-200"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Facility Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Main Pitch"
            required
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Facility Type
          </label>
          <select
            value={facilityType}
            onChange={e => setFacilityType(e.target.value as FacilityType)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white"
          >
            {FACILITY_TYPES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-lg hover:bg-brand-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Saving…' : initial ? 'Save Changes' : 'Add Facility'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

// ── Facility row ───────────────────────────────────────────────────────────────

interface FacilityRowProps {
  facility: RdoFacility
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
}

function FacilityRow({ facility, onEdit, onToggle, onDelete }: FacilityRowProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
      <div>
        <p className="text-sm font-medium text-gray-900">{facility.name}</p>
        <p className="text-xs text-gray-500 mt-0.5">{facility.facility_type}</p>
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge active={facility.is_active} />
        <button
          onClick={onToggle}
          title={facility.is_active ? 'Deactivate' : 'Activate'}
          className="p-1.5 text-gray-400 hover:text-gray-600 rounded transition-colors"
        >
          {facility.is_active ? <XCircle size={16} /> : <CheckCircle size={16} />}
        </button>
        <button
          onClick={onEdit}
          title="Edit"
          className="p-1.5 text-gray-400 hover:text-gray-600 rounded transition-colors"
        >
          <Pencil size={16} />
        </button>
        <button
          onClick={onDelete}
          title="Delete"
          className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  )
}

// ── Facilities tab ─────────────────────────────────────────────────────────────

function FacilitiesTab() {
  const { user } = useAuth()
  const [facilities, setFacilities] = useState<RdoFacility[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    fetchFacilities()
  }, [user])

  async function fetchFacilities() {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('rdo_facilities')
      .select('*')
      .eq('rdo_user_id', user!.id)
      .order('created_at', { ascending: true })
    if (error) {
      setError('Failed to load facilities.')
    } else {
      setFacilities(data ?? [])
    }
    setLoading(false)
  }

  async function handleAdd(values: { name: string; facility_type: FacilityType }) {
    setSubmitting(true)
    const { error } = await supabase.from('rdo_facilities').insert({
      rdo_user_id: user!.id,
      name: values.name,
      facility_type: values.facility_type,
    })
    if (error) {
      setError('Failed to add facility.')
    } else {
      setShowAddForm(false)
      await fetchFacilities()
    }
    setSubmitting(false)
  }

  async function handleEdit(id: string, values: { name: string; facility_type: FacilityType }) {
    setSubmitting(true)
    const { error } = await supabase
      .from('rdo_facilities')
      .update({ name: values.name, facility_type: values.facility_type })
      .eq('id', id)
    if (error) {
      setError('Failed to update facility.')
    } else {
      setEditingId(null)
      await fetchFacilities()
    }
    setSubmitting(false)
  }

  async function handleToggle(facility: RdoFacility) {
    const { error } = await supabase
      .from('rdo_facilities')
      .update({ is_active: !facility.is_active })
      .eq('id', facility.id)
    if (!error) await fetchFacilities()
  }

  async function handleDelete(id: string) {
    const { error } = await supabase
      .from('rdo_facilities')
      .delete()
      .eq('id', id)
    if (!error) {
      setDeleteConfirmId(null)
      await fetchFacilities()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
        Loading facilities…
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Add form */}
      {showAddForm ? (
        <FacilityForm
          onSubmit={handleAdd}
          onCancel={() => setShowAddForm(false)}
          submitting={submitting}
        />
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-brand-primary border border-brand-primary/30 rounded-lg hover:bg-ui-base transition-colors"
        >
          <Plus size={16} />
          Add Facility
        </button>
      )}

      {/* List */}
      {facilities.length === 0 && !showAddForm ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-gray-500 text-sm">No facilities yet.</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="mt-3 text-sm font-medium text-brand-primary hover:underline"
          >
            Add your first facility
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {facilities.map(facility => (
            editingId === facility.id ? (
              <FacilityForm
                key={facility.id}
                initial={{ name: facility.name, facility_type: facility.facility_type }}
                onSubmit={values => handleEdit(facility.id, values)}
                onCancel={() => setEditingId(null)}
                submitting={submitting}
              />
            ) : deleteConfirmId === facility.id ? (
              <div key={facility.id} className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm text-red-700 font-medium">
                  Delete "{facility.name}"? This cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDelete(facility.id)}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <FacilityRow
                key={facility.id}
                facility={facility}
                onEdit={() => setEditingId(facility.id)}
                onToggle={() => handleToggle(facility)}
                onDelete={() => setDeleteConfirmId(facility.id)}
              />
            )
          ))}
        </div>
      )}
    </div>
  )
}

// ── Placeholder tabs ───────────────────────────────────────────────────────────

function ManagedTeamsTab() {
  return (
    <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
      Managed Teams — coming in a future phase.
    </div>
  )
}

function AppPreferencesTab() {
  return (
    <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
      App Preferences — coming in a future phase.
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function RDOSettings() {
  const [activeTab, setActiveTab] = useState<Tab>('Facilities & Locations')

  function renderTab() {
    switch (activeTab) {
      case 'Facilities & Locations': return <FacilitiesTab />
      case 'Managed Teams':          return <ManagedTeamsTab />
      case 'App Preferences':        return <AppPreferencesTab />
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Global Settings & Data Governance</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage master locations, teams, and configuration for your RDO region.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-1 -mb-px">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={[
                'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                activeTab === tab
                  ? 'border-brand-primary text-brand-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              ].join(' ')}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {renderTab()}
    </div>
  )
}

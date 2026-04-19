phase 17.9
***

# ACTIVE_SPEC.md: Player Overlay Total Caps Integration

### 🎯 Why
Phase 12.5 introduced a database function to dynamically calculate player caps (`calculate_player_caps`), but the frontend `PlayerOverlay.tsx` was never wired up to fetch or display this data. We need to implement the compute-on-read fetch and render the Total Caps in the overlay's info grid.

### 🏗️ Architecture Decisions
* **Compute-on-Read Pattern:** The component will query the existing `calculate_player_caps` RPC. We will not pass caps down through props to avoid invalidating the parent `usePlayers` cache.
* **Asynchronous Fetching:** Caps will be fetched via a dedicated `useEffect` hooked to `player.id`. 
* **Grid Reflow:** The existing `InfoCell` grid currently uses `gridTemplateColumns: '1fr 1fr'` for 4 items. Adding a 5th item requires updating the grid to `1fr 1fr 1fr` to prevent orphaned, full-width bottom rows.
* **Styling Consistency:** The `PlayerOverlay` component uses inline styling. Do not refactor to Tailwind; match the existing inline style objects exactly.

### 📁 Files to Touch
1.  **`src/components/PlayerOverlay.tsx`**
    * Add `totalCaps` state.
    * Add `useEffect` for the RPC fetch.
    * Update Section 2 grid CSS and insert the new `InfoCell`.

### 🎨 UI Implementation

**1. State & Fetch Logic (Insert below existing training state):**
```tsx
  // Total Caps State
  const [totalCaps, setTotalCaps] = useState<number | null>(null)

  // Fetch Total Caps via the Database RPC
  useEffect(() => {
    let cancelled = false
    setTotalCaps(null)

    async function fetchCaps() {
      const { data, error } = await supabase.rpc('calculate_player_caps', { 
        p_player_id: player.id 
      })
      
      if (!cancelled && !error) {
        setTotalCaps(data)
      }
    }

    fetchCaps()
    return () => { cancelled = true }
  }, [player.id])
```

**2. Grid Layout & Render (Replace existing Section 2 grid):**
```tsx
          {/* Section 2 — Info grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <InfoCell label="Last Team"   value={lastTeam   ?? '—'} />
            <InfoCell label="Last Played" value={lastPlayed ?? '—'} />
            <InfoCell label="Availability" value={avLabel} valueColor={avColor} />
            <InfoCell
              label="Training"
              value={trainingAttended !== null && trainingTotal !== null
                ? `${trainingAttended} / ${trainingTotal}`
                : '—'}
            />
            <InfoCell 
              label="Total Caps" 
              value={totalCaps !== null ? totalCaps.toString() : '—'} 
            />
          </div>
```

### ✅ Acceptance Criteria
* [ ] `totalCaps` state is initialized.
* [ ] `useEffect` correctly targets `supabase.rpc('calculate_player_caps', { p_player_id: player.id })`.
* [ ] Section 2 `div` style is updated to `gridTemplateColumns: '1fr 1fr 1fr'`.
* [ ] `InfoCell` for "Total Caps" is rendered.
* [ ] A null or loading caps state safely falls back to rendering `"—"`.

### ⚠️ Edge Cases
* **Component Unmount During Fetch:** Handled via the `cancelled` boolean guard inside the `useEffect`.
* **RPC Failure:** Silently caught; `totalCaps` remains `null`, gracefully degrading the UI to `"—"`.

### 🚀 Implementation Order
1. Open `src/components/PlayerOverlay.tsx`.
2. Add `totalCaps` to `useState` block.
3. Add the `fetchCaps` `useEffect` hook.
4. Locate "Section 2 — Info grid", update the `gridTemplateColumns` property, and append the `InfoCell`.
5. Save and verify.
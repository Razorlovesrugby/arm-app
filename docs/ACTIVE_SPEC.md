# ACTIVE_SPEC: 16.1 Database Expansion & Safe Backfill

### 🎯 Why
We are migrating to a multi-tenant architecture using the "Expand and Contract" zero-downtime pattern. This phase expands the database schema by adding `club_id` routing, creating the `clubs` and `profiles` tables, and safely backfilling existing users and data to a Master Club. 
**CRITICAL:** To prevent application breakage, do NOT enforce `NOT NULL` constraints on `club_id` and do NOT enable Row Level Security (RLS) yet.
 for me 
### 🧠 Context Gathering (COMPLETED)
Based on analysis of existing migrations, the following core tables require `club_id`:
1. `players` - Main player roster
2. `depth_chart_order` - Position ordering  
3. `weeks` - Weekly scheduling
4. `week_teams` - Teams within weeks
5. `availability_responses` - Availability submissions
6. `team_selections` - Selected players
7. `club_settings` - Club configuration
8. `match_events` - Match performance tracking
9. `training_attendance` - Training records
10. `archive_game_notes` - Archived game notes

### 🏗️ Architecture Decisions
- **Zero Frontend Impact:** Do NOT touch any UI components or frontend Supabase hooks in this phase.
- **The Auth Bridge:** A `profiles` table maps `auth.users.id` to a `club_id`.
- **Complete Backfill:** Both existing *data* AND existing *users* must be mapped to "ARM15 Lite Master".
- **Soft Schema:** `club_id` is added to data tables as a nullable column. 

### 📁 Files to Touch
1. `supabase/migrations/017_phase_16_1_expand.sql` (Create new)
2. `src/lib/supabase.ts` (Update database types)

### 🎨 Logic Implementation

**1. `supabase/migrations/017_phase_16_1_expand.sql`**
Write a precise SQL migration:
* **Step 1:** Create `clubs` table (`id UUID PRIMARY KEY DEFAULT uuid_generate_v4()`, `name TEXT NOT NULL`).
* **Step 2:** Insert Master Club: `INSERT INTO clubs (name) VALUES ('ARM15 Lite Master') RETURNING id;` (Store in variable).
* **Step 3:** Create `profiles` table (`id UUID REFERENCES auth.users(id) PRIMARY KEY`, `club_id UUID REFERENCES clubs(id)`, `role TEXT DEFAULT 'coach'`).
* **Step 4 (User Backfill):** `INSERT INTO profiles (id, club_id) SELECT id, master_id FROM auth.users;`
* **Step 5:** Add `club_id UUID REFERENCES clubs(id)` to ALL core tables identified during context gathering.
* **Step 6 (Data Backfill):** `UPDATE [table_name] SET club_id = master_id;` for all core tables.
* **Step 7:** STOP. Do NOT add `NOT NULL`. Do NOT enable RLS.

**2. `src/lib/supabase.ts`**
* Update Database Types to include the new tables and the new (currently optional) `club_id` columns.

### ✅ Acceptance Criteria
- [ ] Migration 017 executes perfectly.
- [ ] "ARM15 Lite Master" is created.
- [ ] Existing `auth.users` have a corresponding row in `profiles`.
- [ ] Existing core data rows have the `club_id` populated.
- [ ] App continues to function normally (no strict constraints blocking saves).

### 📝 Implementation Details

**Migration File Structure (Defensive Code - Separates DDL from DML):**
```sql
-- Migration 017: Phase 16.1 — Database Expansion & Safe Backfill
-- Expand phase of "Expand and Contract" zero-downtime pattern
-- CRITICAL: Do NOT add NOT NULL constraints or enable RLS in this phase
-- DEFENSIVE: Separates DDL (CREATE/ALTER) from DML (INSERT/UPDATE) to avoid PostgreSQL DO block compilation errors

-- ============================================================
-- STEP 1-3: DDL - Create tables and add columns (outside DO block)
-- ============================================================

-- Step 1: Create clubs table
CREATE TABLE IF NOT EXISTS clubs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Step 2: Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  club_id UUID REFERENCES clubs(id),
  role TEXT DEFAULT 'coach',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Step 3: Add nullable club_id to all core tables (DDL must be outside DO block)
ALTER TABLE players ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id);
ALTER TABLE depth_chart_order ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id);
ALTER TABLE weeks ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id);
ALTER TABLE week_teams ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id);
ALTER TABLE availability_responses ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id);
ALTER TABLE team_selections ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id);
ALTER TABLE club_settings ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id);
ALTER TABLE match_events ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id);
ALTER TABLE training_attendance ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id);
ALTER TABLE archive_game_notes ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id);

-- ============================================================
-- STEP 4-6: DML - Insert data and backfill (inside DO block)
-- ============================================================

DO $$ 
DECLARE 
  master_club_id UUID;
BEGIN
  -- Step 4: Insert master club and store its ID (with idempotency)
  -- First, try to get existing master club ID
  SELECT id INTO master_club_id FROM clubs WHERE name = 'ARM15 Lite Master';
  
  -- If not found, insert it
  IF master_club_id IS NULL THEN
    INSERT INTO clubs (name) VALUES ('ARM15 Lite Master') 
    RETURNING id INTO master_club_id;
  END IF;
  
  -- Step 5: Backfill existing users into profiles
  INSERT INTO profiles (id, club_id)
  SELECT id, master_club_id FROM auth.users
  ON CONFLICT (id) DO NOTHING;
  
  -- Step 6: Backfill existing data with master club ID
  -- IMPORTANT: These UPDATE statements reference columns created in Step 3
  -- Since DDL is outside the DO block, PostgreSQL won't fail during compilation
  UPDATE players SET club_id = master_club_id WHERE club_id IS NULL;
  UPDATE depth_chart_order SET club_id = master_club_id WHERE club_id IS NULL;
  UPDATE weeks SET club_id = master_club_id WHERE club_id IS NULL;
  UPDATE week_teams SET club_id = master_club_id WHERE club_id IS NULL;
  UPDATE availability_responses SET club_id = master_club_id WHERE club_id IS NULL;
  UPDATE team_selections SET club_id = master_club_id WHERE club_id IS NULL;
  UPDATE club_settings SET club_id = master_club_id WHERE club_id IS NULL;
  UPDATE match_events SET club_id = master_club_id WHERE club_id IS NULL;
  UPDATE training_attendance SET club_id = master_club_id WHERE club_id IS NULL;
  UPDATE archive_game_notes SET club_id = master_club_id WHERE club_id IS NULL;
  
  -- Step 7: DO NOT add NOT NULL constraints
  -- Step 8: DO NOT enable RLS
END $$;
```

**TypeScript Updates:**
```typescript
// Add new interfaces
export interface Club {
  id: string;
  name: string;
  created_at: string;
}

export interface Profile {
  id: string;
  club_id?: string; // Optional during expansion phase
  role: string;
  created_at: string;
}

// Update existing interfaces to include optional club_id
export interface Player {
  id: string;
  club_id?: string; // Optional during expansion phase
  name: string;
  email: string;
  // ... existing fields
}

// Repeat for all other entity interfaces...
```

### ⚠️ Critical Safety Notes
1. **NULLABLE Columns:** `club_id` must remain nullable to prevent application breakage
2. **No RLS:** Row Level Security must NOT be enabled in this phase
3. **Idempotent:** Use `IF NOT EXISTS` and `WHERE club_id IS NULL` for safe re-runs
4. **PostgreSQL DO Block Trap:** DDL (CREATE/ALTER) must be outside DO block, DML (INSERT/UPDATE) inside DO block to avoid compilation errors
5. **Defensive Code:** Migration must separate schema changes from data backfill operations

### 🚀 Implementation Order
1. Create `supabase/migrations/017_phase_16_1_expand.sql`
2. Update `src/lib/supabase.ts` TypeScript definitions
3. Execute migration in controlled environment
4. Verify data integrity and application functionality

### 🔧 Testing Commands
```bash
# Create migration file
touch supabase/migrations/017_phase_16_1_expand.sql

# Apply migration (in Supabase SQL Editor)
# Copy and execute migration SQL

# Verify migration
SELECT COUNT(*) FROM clubs WHERE name = 'ARM15 Lite Master';
SELECT COUNT(*) FROM profiles;
SELECT table_name, COUNT(*) as total, COUNT(club_id) as with_club_id 
FROM information_schema.columns 
WHERE table_name IN ('players', 'weeks', 'week_teams', 'availability_responses', 'team_selections', 'club_settings', 'match_events', 'training_attendance', 'archive_game_notes', 'depth_chart_order')
  AND column_name = 'club_id'
GROUP BY table_name;
```

**Status:** ✅ Specification Ready for Implementation  
**Target:** Safe database expansion for multi-tenancy with zero downtime  
**Priority:** Critical — Foundation for Phase 16.2+  
**Zero Frontend Impact:** ✅ No UI changes required
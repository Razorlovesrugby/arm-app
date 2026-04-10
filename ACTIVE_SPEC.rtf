# ACTIVE SPEC: Phase 16.0 — Multi-Tenant Database Architecture & Data Backfill

**Status:** Ready for Implementation  
**Target:** Transform ARM15 Lite into scalable multi-tenant SaaS with zero frontend impact  
**Priority:** Critical — Foundation for multi-club support  
**Context-Free:** ✅ All decisions locked below  
**Preserves All Features:** ✅ No existing functionality removed or broken
**Implementation Start:** 2026-04-10

---

## 🎯 Why
To transition ARM15 Lite into a scalable, multi-tenant SaaS application. This phase acts as the "open-heart surgery" on the backend. We are establishing the Database Schema for multi-tenancy, backfilling all legacy data into a default "ARM15 Lite Master" club, and locking down the database with Row Level Security (RLS). 
**CRITICAL:** From a Frontend perspective, there must be ZERO visual or functional impact. This is purely a backend data restructuring phase.

---

## 🧠 Context Gathering (COMPLETED)
Based on analysis of existing migrations, the following core tables require `club_id`:
1. `players` - Main player roster
2. `depth_chart_order` - Position ordering
3. `weeks` - Weekly scheduling
4. `week_teams` - Teams within weeks
5. `availability_responses` - Availability submissions
6. `team_selections` - Selected players
7. `club_settings` - Club configuration (will have one row per club)
8. `match_events` - Match performance tracking
9. `training_attendance` - Training records
10. `archive_game_notes` - Archived game notes

---

## 🏗️ Architecture Decisions (Locked)

### Zero Frontend UI Impact
- Do NOT touch or modify any UI components, pages, or frontend Supabase query hooks (e.g., `usePlayers`, `useWeeks`). The frontend must remain completely unaffected during this phase.

### Authentication Scope
- This is strictly a "Coaching App." Players do NOT log in. 

### The Auth Bridge
- A `profiles` table will link a logged-in Supabase `auth.users.id` to a specific `club_id`. Role defaults to `'coach'`. One email = one club.

### Legacy Data Backfill
- ALL existing data currently in the database (every player, week, event, setting, etc.) MUST be associated with a newly generated master club named `"ARM15 Lite Master"`. This ensures no existing data is orphaned or broken.

### Public Availability Link
- Players join/update their data via the public availability link. The backend will derive the correct `club_id` by looking up the `week_id` in the URL parameters (Frontend logic for this comes in Phase 16.2).

### Club Settings
- Each club will have its own `club_settings` row. All clubs start with identical default settings but can toggle custom settings independently.

### Anonymous User Creation
- If a player's name or phone doesn't match existing records when submitting via an availability link, they will be auto-created as a new player for the club whose availability link was used.

---

## 📁 Files to Touch (Exact Paths)

1. **`supabase/migrations/018_phase_16_0.sql`** — NEW
   - Complete multi-tenant database migration
   - Creates `clubs` and `profiles` tables
   - Adds `club_id` to 10 core tables
   - Implements RLS with club-based security

2. **`src/lib/supabase.ts`** — UPDATE
   - Add `Club` and `Profile` TypeScript interfaces
   - Update all existing entity interfaces to include `club_id: string`
   - Maintain backward compatibility

3. **`src/contexts/AuthContext.tsx`** — UPDATE
   - Add `activeClubId` to context state
   - Query `profiles` table after auth session resolves
   - Expose club ID via context
   - Add console warning for users without profiles

---

## 🎨 Database Implementation

### Migration 018: Phase 16.0 SQL
```sql
-- Phase 16.0: Multi-Tenant Database Architecture & Data Backfill
-- CRITICAL: Backup database before running this migration

-- Step 1: Create clubs table
CREATE TABLE clubs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Step 2: Insert master club and store its ID
DO $$ 
DECLARE 
  master_club_id UUID;
BEGIN
  INSERT INTO clubs (name) VALUES ('ARM15 Lite Master') 
  RETURNING id INTO master_club_id;
  
  -- Step 3: Create profiles table
  CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    club_id UUID REFERENCES clubs(id) NOT NULL,
    role TEXT DEFAULT 'coach',
    created_at TIMESTAMPTZ DEFAULT now()
  );
  
  -- Step 4: Add club_id to all core tables
  ALTER TABLE players ADD COLUMN club_id UUID REFERENCES clubs(id);
  ALTER TABLE depth_chart_order ADD COLUMN club_id UUID REFERENCES clubs(id);
  ALTER TABLE weeks ADD COLUMN club_id UUID REFERENCES clubs(id);
  ALTER TABLE week_teams ADD COLUMN club_id UUID REFERENCES clubs(id);
  ALTER TABLE availability_responses ADD COLUMN club_id UUID REFERENCES clubs(id);
  ALTER TABLE team_selections ADD COLUMN club_id UUID REFERENCES clubs(id);
  ALTER TABLE club_settings ADD COLUMN club_id UUID REFERENCES clubs(id);
  ALTER TABLE match_events ADD COLUMN club_id UUID REFERENCES clubs(id);
  ALTER TABLE training_attendance ADD COLUMN club_id UUID REFERENCES clubs(id);
  ALTER TABLE archive_game_notes ADD COLUMN club_id UUID REFERENCES clubs(id);
  
  -- Step 5: Backfill all existing data with master club ID
  UPDATE players SET club_id = master_club_id;
  UPDATE depth_chart_order SET club_id = master_club_id;
  UPDATE weeks SET club_id = master_club_id;
  UPDATE week_teams SET club_id = master_club_id;
  UPDATE availability_responses SET club_id = master_club_id;
  UPDATE team_selections SET club_id = master_club_id;
  UPDATE club_settings SET club_id = master_club_id;
  UPDATE match_events SET club_id = master_club_id;
  UPDATE training_attendance SET club_id = master_club_id;
  UPDATE archive_game_notes SET club_id = master_club_id;
  
  -- Step 6: Make club_id NOT NULL
  ALTER TABLE players ALTER COLUMN club_id SET NOT NULL;
  ALTER TABLE depth_chart_order ALTER COLUMN club_id SET NOT NULL;
  ALTER TABLE weeks ALTER COLUMN club_id SET NOT NULL;
  ALTER TABLE week_teams ALTER COLUMN club_id SET NOT NULL;
  ALTER TABLE availability_responses ALTER COLUMN club_id SET NOT NULL;
  ALTER TABLE team_selections ALTER COLUMN club_id SET NOT NULL;
  ALTER TABLE club_settings ALTER COLUMN club_id SET NOT NULL;
  ALTER TABLE match_events ALTER COLUMN club_id SET NOT NULL;
  ALTER TABLE training_attendance ALTER COLUMN club_id SET NOT NULL;
  ALTER TABLE archive_game_notes ALTER COLUMN club_id SET NOT NULL;
  
  -- Step 7: Enable RLS (already enabled, but confirm)
  ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
  ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
  
  -- Step 8: Create RLS policies with club-based security
  -- Clubs: authenticated users can read all clubs
  CREATE POLICY "Authenticated users can read clubs"
    ON clubs FOR SELECT TO authenticated USING (true);
    
  -- Profiles: users can only read their own profile
  CREATE POLICY "Users can read own profile"
    ON profiles FOR SELECT TO authenticated
    USING (auth.uid() = id);
    
  -- Core tables: users can only access rows from their club
  CREATE POLICY "Club-based access for players"
    ON players FOR ALL TO authenticated
    USING (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()));
    
  -- Repeat similar policies for all other core tables...
  
  -- Step 9: Preserve anonymous access for public availability forms
  CREATE POLICY "Anonymous can insert players with club from week"
    ON players FOR INSERT TO anon
    WITH CHECK (true); -- Club_id derived from week lookup in application logic
    
  CREATE POLICY "Anonymous can insert availability responses"
    ON availability_responses FOR INSERT TO anon
    WITH CHECK (true); -- Club_id derived from week lookup
    
  CREATE POLICY "Anonymous can read weeks for token lookup"
    ON weeks FOR SELECT TO anon USING (true);
END $$;
```

### AuthContext Updates
```typescript
// Add to AuthContext interface
interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  activeClubId: string | null; // NEW
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

// In AuthProvider useEffect after session is set:
if (data.session?.user) {
  supabase
    .from('profiles')
    .select('club_id')
    .eq('id', data.session.user.id)
    .single()
    .then(({ data: profile }) => {
      if (profile) {
        setActiveClubId(profile.club_id);
      } else {
        console.warn('User has no linked profile');
        setActiveClubId(null);
      }
    });
}
```

### Database Types Update
```typescript
// Add new interfaces
export interface Club {
  id: string;
  name: string;
  created_at: string;
}

export interface Profile {
  id: string;
  club_id: string;
  role: string;
  created_at: string;
}

// Update existing interfaces to include club_id
export interface Player {
  id: string;
  club_id: string; // NEW
  name: string;
  email: string;
  // ... existing fields
}

// Repeat for all other entity interfaces...
```

---

## ✅ Acceptance Criteria (Binary Pass/Fail)

### Database Migration
- [ ] Database backup created before migration execution
- [ ] Migration 018 executes perfectly without dropping any legacy data
- [ ] The "ARM15 Lite Master" club is created and all existing data is mapped to it
- [ ] Each club gets its own `club_settings` row with default values
- [ ] All 10 core tables have `club_id` column as NOT NULL

### Authentication & Security
- [ ] `AuthContext` successfully fetches and stores the `activeClubId`
- [ ] RLS policies enforce club-based access for authenticated users
- [ ] Anonymous users can still submit availability forms with auto-creation of new players for the correct club

### Zero Frontend Impact
- [ ] ZERO frontend query hooks (`src/hooks/*`) were touched
- [ ] ZERO UI components or pages were modified
- [ ] All existing functionality continues working without changes

### Type Safety
- [ ] All TypeScript interfaces updated to include `club_id: string`
- [ ] New `Club` and `Profile` interfaces added to `supabase.ts`
- [ ] TypeScript compilation passes without errors

---

## ⚠️ Edge Cases (Already Handled)

### Constraint Order
- Execute the `UPDATE` step to backfill the `club_id` BEFORE applying the `NOT NULL` constraints, otherwise the migration will instantly fail.

### Club Settings Migration
- Existing single `club_settings` row needs to be duplicated for the master club with `club_id` added.

### Anonymous Access
- RLS policies must allow `anon` users to insert into `players` and `availability_responses` with proper `club_id` derived from week lookup.

### Data Integrity
- All foreign key relationships preserved when adding `club_id`
- No orphaned data after migration

---

## 🚀 Implementation Order

1. **Create Database Backup** — Safety first
   - Use Supabase CLI or pg_dump to backup current state

2. **Write Migration File** — Core database changes
   - Create `018_phase_16_0.sql` with all SQL operations

3. **Update TypeScript Types** — Frontend type safety
   - Modify `src/lib/supabase.ts` to include new interfaces and `club_id` fields

4. **Enhance AuthContext** — Club awareness
   - Update `src/contexts/AuthContext.tsx` to fetch and expose `activeClubId`

5. **Test Migration** — Controlled execution
   - Execute migration in a controlled manner
   - Verify all data properly backfilled

6. **Verify Data Integrity** — Quality assurance
   - Confirm RLS policies work correctly
   - Test anonymous access for availability forms

---

## 📝 Quick Start Commands

```bash
# Create migration file
touch supabase/migrations/018_phase_16_0.sql

# Backup database (example - adjust for your Supabase setup)
supabase db dump --data-only -f backup_$(date +%Y%m%d_%H%M%S).sql

# Apply migration in Supabase SQL editor
# Copy content from migration file

# Update TypeScript files
# 1. Update src/lib/supabase.ts
# 2. Update src/contexts/AuthContext.tsx
```

---

## 🔧 Technical Details

### Backup Strategy
- Use `pg_dump` or Supabase backup tool
- Store backup file securely before migration

### RLS Policy Pattern
```sql
USING (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()))
```

### Anonymous Policy Logic
- Derive `club_id` from `week_id` lookup in application logic
- Auto-create players with correct club association

### Performance Considerations
- Add indexes on `club_id` columns for large tables
- Consider composite indexes for frequent query patterns

**Deliverable:** Fully implemented multi-tenant database architecture with zero frontend impact, ready for Phase 16.1 club management UI.
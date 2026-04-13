# Database Schema Documentation

## Supabase Tables

### Core Tables

#### `players`
- **id**: UUID (Primary Key, auto-generated)
- **name**: TEXT (Required)
- **email**: TEXT (Required) 
- **phone**: TEXT (Required)
- **date_of_birth**: DATE (Required)
- **primary_position**: TEXT (Enum: 'Prop','Hooker','Lock','Flanker','Number 8','Scrum-half','Fly-half','Centre','Wing','Fullback','Unspecified')
- **secondary_positions**: JSONB (Default: '[]')
- **player_type**: TEXT (Enum: 'Performance','Open','Women''s')
- **status**: TEXT (Default: 'Active', Enum: 'Active','Injured','Unavailable','Retired')
- **subscription_paid**: BOOLEAN (Default: false)
- **notes**: TEXT (Optional)
- **last_played_date**: DATE (Optional)
- **last_played_team**: TEXT (Optional)
- **created_at**: TIMESTAMPTZ (Default: now())
- **updated_at**: TIMESTAMPTZ (Default: now())

#### `depth_chart_order`
- **id**: UUID (Primary Key, auto-generated)
- **position**: TEXT (Required, Unique)
- **player_order**: JSONB (Default: '[]')
- **updated_at**: TIMESTAMPTZ (Default: now())

#### `weeks`
- **id**: UUID (Primary Key, auto-generated)
- **start_date**: DATE (Required)
- **end_date**: DATE (Required)
- **label**: TEXT (Required)
- **status**: TEXT (Default: 'Open', Enum: 'Open','Closed')
- **availability_link_token**: TEXT (Required, Unique, auto-generated UUID)
- **created_at**: TIMESTAMPTZ (Default: now())

#### `week_teams`
- **id**: UUID (Primary Key, auto-generated)
- **week_id**: UUID (Foreign Key to weeks.id, CASCADE delete)
- **team_name**: TEXT (Required)
- **sort_order**: INTEGER (Required)
- **starters_count**: INTEGER (Default: 15)
- **UNIQUE(week_id, team_name)** - No duplicate team names per week

#### `availability_responses`
- **id**: UUID (Primary Key, auto-generated)
- **week_id**: UUID (Foreign Key to weeks.id, CASCADE delete)
- **player_id**: UUID (Foreign Key to players.id, CASCADE delete)
- **availability**: TEXT (Enum: 'Available','TBC','Unavailable')
- **submitted_primary_position**: TEXT (Optional)
- **created_at**: TIMESTAMPTZ (Default: now())
- **Note**: No UNIQUE constraint - full history retained

### ARM 2.0 Pivot Tables (Phase 11+)

#### `club_settings` (Added in Migration 011)
- **id**: UUID (Primary Key, auto-generated)
- **club_name**: TEXT (Default: 'Belsize Park RFC')
- **primary_color**: TEXT (Default: '#1e40af' - blue)
- **secondary_color**: TEXT (Default: '#dc2626' - red)
- **logo_url**: TEXT (Optional)
- **default_teams**: TEXT[] (Optional, for pre-filling new weeks)
- **default_squad_size**: INTEGER (Default: 22, total players in squad)
- **require_positions_in_form**: BOOLEAN (Default: true, whether availability form asks for positions)
- **require_contact_info**: BOOLEAN (Default: false, whether availability form asks for email and phone)
- **require_birthday**: BOOLEAN (Default: false, whether availability form asks for birthday)
- **training_days**: JSONB (Default: '[{"id": "1", "label": "Wednesday"}]'::jsonb, array of {id, label} objects)
- **created_at**: TIMESTAMPTZ (Default: now())
- **updated_at**: TIMESTAMPTZ (Default: now())

#### `match_events` (Added in Migration 011)
- **id**: UUID (Primary Key, auto-generated)
- **week_id**: UUID (Foreign Key to weeks.id, CASCADE delete)
- **player_id**: UUID (Foreign Key to players.id, CASCADE delete)
- **week_team_id**: UUID (Foreign Key to week_teams.id, CASCADE delete)
- **event_type**: TEXT (Enum: 'Try', 'Conversion', 'Penalty', 'DropGoal', 'YellowCard', 'RedCard', 'Injury', 'Substitution')
- **minute**: INTEGER (0-120)
- **points**: INTEGER (0-10)
- **notes**: TEXT (Optional)
- **created_at**: TIMESTAMPTZ (Default: now())

### Migration 012 Tables

#### `match_cards` (Added in Migration 012)
- **id**: UUID (Primary Key, auto-generated)
- **week_id**: UUID (Foreign Key to weeks.id, CASCADE delete)
- **week_team_id**: UUID (Foreign Key to week_teams.id, CASCADE delete)
- **card_type**: TEXT (Enum: 'TeamSheet', 'Scorecard', 'Stats')
- **pdf_url**: TEXT (Optional)
- **data**: JSONB (Structured match data)
- **created_at**: TIMESTAMPTZ (Default: now())
- **updated_at**: TIMESTAMPTZ (Default: now())

### Migration 016 Tables (Phase 15.1 — Training Attendance)

#### `training_attendance` (Added in Migration 016)
- **id**: UUID (Primary Key, auto-generated)
- **player_id**: UUID (Foreign Key to players.id, CASCADE delete)
- **week_id**: UUID (Foreign Key to weeks.id, CASCADE delete)
- **session_id**: TEXT (Required, references training day ID from club_settings.training_days)
- **attended**: BOOLEAN (Default: false)
- **created_at**: TIMESTAMPTZ (Default: now())
- **UNIQUE(player_id, week_id, session_id)** - One attendance record per player per session per week

### Migration 018 Tables (Phase 16.0 — Multi-Tenant Architecture)

#### `clubs` (Added in Migration 018)
- **id**: UUID (Primary Key, auto-generated)
- **name**: TEXT (Required)
- **created_at**: TIMESTAMPTZ (Default: now())

#### `profiles` (Added in Migration 018)
- **id**: UUID (References auth.users(id) PRIMARY KEY)
- **club_id**: UUID (Foreign Key to clubs.id, NOT NULL)
- **role**: TEXT (Default: 'coach')
- **created_at**: TIMESTAMPTZ (Default: now())

#### Multi-Tenant Columns (Added in Migration 018)
- **players.club_id**: UUID (Foreign Key to clubs.id, NOT NULL)
- **depth_chart_order.club_id**: UUID (Foreign Key to clubs.id, NOT NULL)
- **weeks.club_id**: UUID (Foreign Key to clubs.id, NOT NULL)
- **week_teams.club_id**: UUID (Foreign Key to clubs.id, NOT NULL)
- **availability_responses.club_id**: UUID (Foreign Key to clubs.id, NOT NULL)
- **team_selections.club_id**: UUID (Foreign Key to clubs.id, NOT NULL)
- **club_settings.club_id**: UUID (Foreign Key to clubs.id, NOT NULL)
- **match_events.club_id**: UUID (Foreign Key to clubs.id, NOT NULL)
- **training_attendance.club_id**: UUID (Foreign Key to clubs.id, NOT NULL)
- **archive_game_notes.club_id**: UUID (Foreign Key to clubs.id, NOT NULL)

## Migrations Tracker

### Migration Files (Chronological Order)

1. **001_schema.sql** - Initial schema: players, depth_chart_order, weeks, week_teams, availability_responses
2. **002_rls.sql** - Row Level Security policies for all tables
3. **003_seed.sql** - Initial seed data
4. **004_availability_positions.sql** - Enhanced availability responses with positions
5. **005_phase6.sql** - Phase 6 enhancements
6. **007_cp7b.sql** - Checkpoint 7B updates
7. **008_cp8_schema.sql** - Checkpoint 8 schema updates
8. **009_cp8_trigger.sql** - Checkpoint 8 trigger functions
9. **010_cp8_close_week_rpc.sql** - Close week RPC function
10. **011_v2_pivot.sql** - ARM 2.0 pivot: club_settings, match_events
11. **012_match_cards.sql** - Match cards functionality
12. **013_phase_12_6.sql** - Phase 12.6 schema updates
13. **014_phase_14.sql** - Phase 14.3 — Kicking Miss Events
14. **015_phase_14_4.sql** - Phase 14.4 — Club Settings Expansion (default_squad_size, require_positions_in_form)
15. **016_phase_15_1.sql** - Phase 15.1 — Training Attendance Tracker (training_attendance table, club_settings.training_days column)
16. **017_phase_15_2.sql** - Phase 15.2 — Availability Form Data Collection Mode (require_contact_info, require_birthday columns in club_settings)
17. **018_phase_16_0.sql** - Phase 16.0 — Multi-Tenant Database Architecture (clubs, profiles tables, club_id columns, RLS policies)
18. **019_phase_16_1_expand.sql** - Phase 16.1 — Database Expansion & Safe Backfill (club_id column population, data backfill to master club)
19. **020_phase_16_3_lockdown.sql** - Phase 16.3 — Database Lockdown (NOT NULL constraints on club_id columns, RLS enforcement, indexes, service_role bypass)

### Migration Notes
- All migrations are idempotent (safe to run multiple times)
- Use `CREATE TABLE IF NOT EXISTS` for forward compatibility
- Use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for schema evolution
- Triggers are created with `CREATE OR REPLACE FUNCTION`

## RLS (Row Level Security) Rules

### General Principles
1. **Authenticated Users Only**: Most tables require authentication
2. **Read Access**: Authenticated users can read most data
3. **Write Restrictions**: Some tables restrict updates to specific conditions
4. **Admin Roles**: Future enhancement for admin-only operations

### Table-Specific RLS Policies

#### `players` Table
- **SELECT**: All authenticated users
- **INSERT**: Authenticated users (with validation)
- **UPDATE**: Authenticated users (typically coaches/admins)
- **DELETE**: Restricted (soft delete via status preferred)

#### `weeks` Table  
- **SELECT**: All authenticated users
- **INSERT**: Authenticated users (typically admins)
- **UPDATE**: Authenticated users (status changes, date updates)
- **DELETE**: Restricted (cascading deletes affect related data)

#### `availability_responses` Table
- **SELECT**: Authenticated users (coaches see all, players see own)
- **INSERT**: Authenticated users (players submit own availability)
- **UPDATE**: Limited (players can update own recent submissions)
- **DELETE**: Restricted (preserve history)

#### `club_settings` Table (Migration 011)
- **SELECT**: All authenticated users
- **UPDATE**: Authenticated users (branding configuration)
- **Policy**: "Club settings are viewable by authenticated users"
- **Policy**: "Club settings are updatable by authenticated users"

#### `match_events` Table (Migration 011)
- **SELECT**: Authenticated users
- **INSERT**: Authenticated users (coaches/match officials)
- **UPDATE**: Authenticated users (corrections)
- **DELETE**: Restricted (preserve match integrity)

### RLS Implementation Pattern
```sql
-- Enable RLS on table
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Policy for SELECT access
CREATE POLICY "Policy name for SELECT"
  ON table_name FOR SELECT
  TO authenticated
  USING (true);

-- Policy for INSERT access  
CREATE POLICY "Policy name for INSERT"
  ON table_name FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy for UPDATE access
CREATE POLICY "Policy name for UPDATE"
  ON table_name FOR UPDATE
  TO authenticated
  USING (true);
```

### Security Notes
- **Auth Integration**: Uses Supabase Auth `auth.uid()` for user identification
- **Cascading Deletes**: Carefully implemented to maintain referential integrity
- **Audit Trails**: `created_at` and `updated_at` timestamps on all tables
- **Soft Deletes**: Preferred over hard deletes (use status fields)
- **Data Validation**: CHECK constraints enforce data integrity at DB level
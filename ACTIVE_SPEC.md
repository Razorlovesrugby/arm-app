# ACTIVE SPEC: Phase 17.8 - Dynamic Player Type Cascading

## 🎯 Context & Objective
In Phase 16.8, we introduced Custom Player Types at the club settings level. However, renaming a player type (e.g., from "Performance" to "Premier") currently leaves existing players orphaned with the old tag, breaking filters on both the Coach UI and the RDO Master Dashboard (Phase 17.5).

**Critical Database Block:** The `players` table still has a hardcoded CHECK constraint:
```sql
CHECK (player_type IN ('Performance','Open','Women''s'))
```
This literally blocks the database from accepting "Premier" as a player_type value!

**Goal:** Create a database-level cascading update with safe batch processing. When a player type is renamed in `club_settings`, an RPC must automatically update all players in that club who currently hold the old type, and the frontend must dynamically pull filter options from the settings.

## 🔍 Current State Analysis

### Phase 17.3 Status: ✅ COMPLETED
- **God Mode Hydration & Data Safety**: React tree remount with `key={activeClubId}`, enhanced switchTenant with switching state, three-layer hook protection, realtime subscription safety
- **Implementation Date**: 2026-04-14
- **Spec Location**: `docs/phase-specs/17.3_GodMode_Hydration_DataSafety_COMPLETED_SPEC.md`

### Database Constraints Status
- ✅ **CHECK constraint exists**: `CHECK (player_type IN ('Performance','Open','Women''s'))` in `001_schema.sql`
- ✅ **Phase 16.8 incomplete**: Migration `022_` added `player_types` to `club_settings` but didn't drop the CHECK constraint
- ❌ **Blocking issue**: Database rejects custom player type values like "Premier", "Development", etc.

### Frontend Implementation Status
- ✅ **ClubSettings.tsx**: Already has player type management UI with add/remove/reorder
- ✅ **PlayerFormSheet.tsx**: Uses `clubSettings?.player_types ?? DEFAULT_PLAYER_TYPES` dynamically
- ✅ **supabase.ts**: `PlayerType` is already `string` (dynamic)
- ⚠️ **RfcPlayerPool.tsx**: Filters dynamically extract player types from data (`[...new Set(data.map(r => r.player_type))]`) - will break after rename
- ⚠️ **Any other filters**: Need audit for hardcoded player type arrays

## 🏗️ Architecture Decisions

### 1. Database Migration Strategy
- **Drop Hardcoded Constraint**: Safely remove `players_player_type_check` constraint
- **Create Safe RPC**: Batch processing function `rename_custom_player_type` with 50-player batches
- **Add Performance Index**: `idx_players_club_id_player_type` for efficient lookups

### 2. Frontend Rename Flow
- **Confirmation Modal**: Show player count and batch information before rename
- **Progress Indicators**: Visual feedback during batch processing
- **Error Recovery**: Clear retry options for failed renames

### 3. Dynamic Filter Sources
- **Club Settings First**: All filters should use `club_settings.player_types` as source of truth
- **Audit Required**: Find and fix all hardcoded player type references
- **RDO Dashboard**: Multi-club filters need special handling

## 📁 Files to Touch

### New Files
1. **`supabase/migrations/024_phase_17_8_player_type_cascade.sql`** - Database migration with RPC

### Modified Files
2. **`src/pages/ClubSettings.tsx`** - Add rename modal, batch progress, RPC integration
3. **`src/hooks/useRFCPlayerPool.ts`** - Fix filter source to use club_settings
4. **`src/lib/supabase.ts`** - Add RPC type definitions
5. **`src/pages/RfcPlayerPool.tsx`** - Update filter to use hook data

### Audit Targets
6. **`src/components/SelectionBoard.tsx`** - Check for hardcoded player types
7. **`src/hooks/useSelectionBoard.ts`** - Check sorting logic
8. **Any other files** using `PLAYER_TYPE_ORDER` or `DEFAULT_PLAYER_TYPES`

## 🎨 Logic Implementation

### Step 1: Database Migration (Constraint Cleanup & Safe RPC)
Create `supabase/migrations/024_phase_17_8_player_type_cascade.sql` with:
1. **Drop Constraint**: `ALTER TABLE players DROP CONSTRAINT IF EXISTS players_player_type_check;`
2. **Create RPC**: `rename_custom_player_type` function with batch processing (50 players/batch)
3. **Add Index**: `CREATE INDEX IF NOT EXISTS idx_players_club_id_player_type ON players(club_id, player_type);`

### Step 2: Frontend Settings UI Enhancement (`ClubSettings.tsx`)
1. **Add Rename Confirmation Modal**: Show old/new type and player count
2. **Batch Progress Indicator**: Visual feedback during processing
3. **Error Handling**: Retry options for failed batches
4. **Success Feedback**: Toast notification with update statistics

### Step 3: Dynamic Filter Sources Audit & Fix
1. **Fix RfcPlayerPool.tsx**: Use `club_settings.player_types` not data-extracted types
2. **Audit Other Filters**: Search for hardcoded `['Performance','Open','Women\'s']` arrays
3. **Update useRFCPlayerPool Hook**: Fetch club settings for filter options

### Step 4: TypeScript Definitions Update
1. **Add RPC Types**: `RenamePlayerTypeResult` interface
2. **Update supabase.ts**: Add RPC function signature

## 🧪 Testing Strategy

### 1. Database Layer Tests
- **Constraint Removal**: Verify `players_player_type_check` is dropped
- **RPC Functionality**: Test rename with 0, 10, 100 players
- **Batch Processing**: Verify 50-player batch size works correctly
- **Error Handling**: Test validation errors and rollback

### 2. Frontend Layer Tests
- **Rename Flow**: "Performance" → "Premier" with player count display
- **Progress Indicators**: Batch progress updates during processing
- **Filter Updates**: Verify filters show updated type immediately
- **Error Recovery**: Network failure during batch processing

### 3. Integration Tests
- **Multi-Club RDO View**: Verify filters work across clubs with different types
- **Backward Compatibility**: Existing "Performance"/"Open"/"Women's" players still work
- **Data Consistency**: No orphaned player records after partial failure

## ✅ Definition of Done

### Database Layer
- [ ] Migration `024_` safely drops `players_player_type_check` constraint
- [ ] RPC `rename_custom_player_type` created with batch processing
- [ ] Index `idx_players_club_id_player_type` exists for performance
- [ ] Function has proper error handling and returns JSONB result

### Frontend Layer
- [ ] ClubSettings shows rename confirmation modal for existing types
- [ ] Modal displays accurate player count and batch information
- [ ] Progress indicators show batch processing status
- [ ] Error handling with retry options for failed renames
- [ ] RfcPlayerPool filters use club_settings data, not extracted from players
- [ ] All other filters dynamically use club_settings.player_types

### Integration & Testing
- [ ] Rename "Performance" → "Premier" works for clubs with 0, 10, 100+ players
- [ ] Filters update immediately after rename completes
- [ ] No broken player records after partial failure
- [ ] Backward compatibility: Existing "Performance"/"Open"/"Women's" players still work
- [ ] RDO dashboard shows correct player types across multiple clubs

## 🚀 Implementation Order

### Day 1: Database Foundation
1. Create migration `024_phase_17_8_player_type_cascade.sql`
2. Test RPC with sample data (0, 10, 100 players)
3. Verify constraint removal and index creation

### Day 2: Frontend Core
4. Implement rename confirmation modal in ClubSettings.tsx
5. Add RPC integration with error handling
6. Create batch progress indicators

### Day 3: Filter Updates
7. Update useRFCPlayerPool hook to use club_settings
8. Audit and fix other filter locations
9. Test filter updates after renames

### Day 4: Integration Testing
10. End-to-end test: Rename → Cascade → Filter update
11. Edge cases: Empty types, duplicate names, network failures
12. Performance test: 200+ player clubs

## ⚠️ Risk Mitigation

### Technical Risks
1. **Database Timeouts**: Mitigated by batch processing (50 players/batch)
2. **Lock Contention**: Mitigated by `SKIP LOCKED` and 10ms delays between batches
3. **Partial Updates**: Mitigated by RPC atomicity (all-or-nothing)
4. **UI Freeze**: Mitigated by async operations with progress feedback
5. **Network Failure**: Mitigated by detailed error reporting and retry options

### Business Risks
1. **Data Corruption**: RPC validates inputs and uses transactions
2. **User Confusion**: Clear modals explain what will happen
3. **Performance Impact**: Batch size 50 ensures UI remains responsive
4. **Multi-club Conflicts**: RPC is club-scoped, no cross-club contamination

## 📋 Success Metrics

### Quantitative
- ✅ **Constraint dropped**: `players_player_type_check` no longer exists
- ✅ **RPC success rate**: 95%+ successful renames on first attempt
- ✅ **Batch efficiency**: <5 second processing for 200 players
- ✅ **Zero data loss**: No orphaned player records after renames

### Qualitative
- ✅ **User confidence**: Clear understanding of rename consequences
- ✅ **System stability**: No UI freezes during large renames
- ✅ **Data consistency**: All filters show correct, updated player types
- ✅ **Error recovery**: Users can retry failed operations easily

## 🎯 Final Deliverables

### 1. Database Foundation
- Safe constraint removal without data loss
- Scalable batch processing RPC
- Performance-optimized indexes

### 2. User-Friendly Rename Experience
- Clear confirmation before destructive operations
- Real-time progress feedback
- Graceful error recovery

### 3. Consistent Filter System
- Dynamic filter sources from club_settings
- Multi-club RDO dashboard support
- Backward compatibility with existing data

---

**Spec Finalized and Ready for Implementation**

This ACTIVE SPEC provides complete technical specifications for Phase 17.8. The solution addresses the critical database blocking issue while providing a safe, user-friendly cascade mechanism with batch processing for scalability.

**Next Step:** Begin implementation of Phase 17.8 - Dynamic Player Type Cascading.
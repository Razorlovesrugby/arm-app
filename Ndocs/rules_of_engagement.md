# Rules of Engagement

## Coding Standards

### Design & Styling
1. **Mobile-First Design**: All components must be designed for mobile first using Tailwind CSS responsive utilities
2. **Tailwind CSS**: Use Tailwind utility classes exclusively for styling; avoid custom CSS unless absolutely necessary
3. **Design Tokens**: Use CSS custom properties defined in `src/index.css` for colors and typography
4. **Touch Targets**: Ensure all interactive elements have minimum 44px × 44px touch targets (use `.touch-target` class)

### Component Architecture
1. **Modular Components**: Keep UI components small, focused, and reusable
2. **Functional Components**: Use React functional components with hooks (no class components)
3. **TypeScript**: Strict TypeScript with proper interfaces and types for all props and state
4. **Prop Validation**: Use TypeScript interfaces for prop validation; avoid `PropTypes`

### Error Handling & State Management
1. **Supabase Interactions**: Always implement strict error handling for all database operations
2. **Loading States**: Include loading states for all async operations (data fetching, mutations)
3. **Error Boundaries**: Implement error boundaries at appropriate component levels
4. **User Feedback**: Provide clear user feedback for errors and success states

### Code Quality
1. **Imports**: Use absolute imports from `src/` when possible
2. **Naming Conventions**: 
   - Components: PascalCase (e.g., `PlayerCard.tsx`)
   - Hooks: camelCase starting with "use" (e.g., `usePlayers.ts`)
   - Files: kebab-case for non-component files
3. **File Organization**: Keep related files colocated when appropriate
4. **Comments**: Document complex logic; avoid obvious comments

### Performance
1. **Code Splitting**: Use React.lazy() for route-based code splitting
2. **Memoization**: Use `useMemo` and `useCallback` appropriately to prevent unnecessary re-renders
3. **Bundle Size**: Be mindful of bundle size; avoid large dependencies

## AI Agent Handoff Rules

### Role Definitions
1. **DeepSeek/Cline**: Responsible for project management, documentation reading, and task tracker updates
2. **Claude Code**: Treated as an isolated execution engine for code implementation only

### Token Optimization Protocol
**CRITICAL RULE**: When preparing a task for Claude, Cline must generate a highly focused prompt containing ONLY the necessary code context, completely omitting project management files to save tokens.

### Workflow Protocol
1. **Context Limitation**: Claude operates with strict context limits and reads only specified files
2. **Targeted Execution**: Claude modifies ONLY the files requested in the active specification
3. **No Exploration**: Claude does not perform general codebase explorations or refactor adjacent logic unless specified
4. **No Bookkeeping**: Claude does NOT update trackers, markdown logs, or documentation files
5. **No Git Operations**: Claude does NOT perform git commands or commits

### Handoff Process
1. **Preparation**: Cline reviews the task and identifies required code changes
2. **Context Isolation**: Cline extracts ONLY the relevant code snippets and file references
3. **Prompt Creation**: Cline creates a focused prompt with:
   - Specific file paths to modify
   - Exact requirements for implementation
   - Necessary context from existing code
   - NO project management or documentation content
4. **Execution**: Claude implements the code changes based on the focused prompt
5. **Completion**: Claude stops after implementation and hands back to Cline for review and logging

### Reference Documents
1. **CLAUDE.md**: Contains senior developer instructions for Claude (strict context limits)
2. **ACTIVE_SPEC.md**: The active specification file that Claude should reference
3. **.docs/**: AI-readable knowledge base (this directory) for project understanding

### Example Handoff Template
```
## Task: [Brief task description]

## Files to Modify:
1. /path/to/file1.tsx
2. /path/to/file2.ts

## Current Code Context:
[Include ONLY the relevant code snippets needed for the task]

## Requirements:
1. [Specific requirement 1]
2. [Specific requirement 2]
3. [Specific requirement 3]

## Implementation Notes:
[Any additional technical details or constraints]

## Do Not Include:
- Project management updates
- Documentation changes  
- Task tracker updates
- Git operations
```

## Quality Assurance

### Code Review Checklist
- [ ] Mobile-responsive design verified
- [ ] Tailwind classes used appropriately
- [ ] Loading states implemented for async operations
- [ ] Error handling implemented for Supabase calls
- [ ] TypeScript types are strict and accurate
- [ ] No console.log statements in production code
- [ ] Accessibility considerations addressed

### Testing Protocol
1. **Manual Testing**: Test on mobile and desktop viewports
2. **Error Scenarios**: Test error states and recovery flows
3. **Performance**: Verify no significant performance regressions
4. **Browser Compatibility**: Test on latest Chrome, Safari, and Firefox

### Documentation Updates
- Update relevant `.docs/` files when architectural changes occur
- Keep `architecture.md` current with tech stack changes
- Update `database_schema.md` when schema changes
- Maintain `task_tracker.md` as the single source of truth for project status
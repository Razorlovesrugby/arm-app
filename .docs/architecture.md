# Architecture Documentation

## Tech Stack

### Frontend
- **Framework**: React 18.2.0 with TypeScript
- **Build Tool**: Vite 5.1.4
- **Styling**: Tailwind CSS 3.4.1
- **Routing**: React Router DOM 6.22.0
- **Drag & Drop**: @dnd-kit/core 6.1.0, @dnd-kit/sortable 8.0.0
- **Icons**: Lucide React 0.344.0
- **PDF Generation**: jsPDF 2.5.1
- **PWA Support**: Vite Plugin PWA 0.19.2

### Backend
- **Database**: Supabase (PostgreSQL)
- **Client Library**: @supabase/supabase-js 2.39.0
- **Authentication**: Supabase Auth

### Development
- **Type Checking**: TypeScript 5.2.2
- **CSS Processing**: PostCSS 8.4.35, Autoprefixer 10.4.18
- **Package Manager**: npm (via package-lock.json)

## Core App Structure

### Directory Layout
```
/workspaces/arm-app/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/         # Page components (routes)
│   ├── hooks/         # Custom React hooks
│   ├── contexts/      # React contexts (Auth, etc.)
│   ├── lib/           # Utility libraries (Supabase client)
│   ├── App.tsx        # Main App component
│   ├── main.tsx       # Entry point
│   └── index.css      # Global styles
├── public/            # Static assets
├── supabase/          # Database migrations & seeds
└── .docs/             # AI-readable knowledge base (this directory)
```

### Key Components
- **Layout.tsx**: Main application layout with Sidebar
- **Sidebar.tsx**: Navigation sidebar
- **SelectionBoard.tsx**: Drag-and-drop team selection interface
- **PlayerCard.tsx**: Individual player display component
- **ProtectedRoute.tsx**: Authentication wrapper

### Pages
- **Login.tsx**: Authentication page
- **Players.tsx**: Player management
- **Weeks.tsx**: Week/availability management  
- **Board.tsx**: Selection board interface
- **Results.tsx**: Match results tracking
- **DepthChart.tsx**: Player depth visualization
- **ClubSettings.tsx**: Branding configuration
- **Attendance.tsx**: Training attendance matrix with sticky columns
- **Grid.tsx**: Availability Dashboard combining training + match availability data

### Hooks
- **usePlayers.ts**: Player data management
- **useWeeks.ts**: Week/availability data
- **useClubSettings.ts**: Branding configuration
- **useSelectionBoard.ts**: Selection board state
- **useDepthChart.ts**: Depth chart visualization
- **useMatchEvents.ts**: Match event tracking
- **useGrid.ts**: Master availability grid data (Phase 12.6+)

## Data Architecture

### Multi-Tenant Data Isolation (Phase 16+)
- **Club-Based Data Separation**: All data is filtered by `club_id` using the logged-in user's active club from `AuthContext`
- **Auth Integration**: User profiles link to clubs via `profiles.club_id` reference
- **Frontend Patterns**: All data hooks include `.eq('club_id', activeClubId)` filters for read operations and include `club_id: activeClubId` in write payloads
- **Anonymous Submissions**: Public availability forms fetch week's `club_id` from database to maintain data isolation
- **Defensive Checks**: Hooks block operations with console.error when `activeClubId` is null
- **Database Structure**: All tables include `club_id` column with foreign key to `clubs` table

## UI/UX Guidelines

### Design Tokens (CSS Custom Properties)

#### Primary Colors
- **Primary**: `#6B21A8` (Purple)
- **Primary Dark**: `#581C87` (Dark Purple)
- **Primary Light**: `#F3E8FF` (Light Purple)
- **Secondary**: `#DC2626` (Red) - From club_settings table

#### Surface & Background
- **Surface**: `#FFFFFF` (White)
- **Background**: `#F8F8F8` (Light Gray)
- **Border**: `#E5E7EB` (Gray Border)

#### Text Colors
- **Text Primary**: `#111827` (Dark Gray)
- **Text Secondary**: `#6B7280` (Medium Gray)

#### Status Colors
- **Success**: `#16A34A` (Green)
- **Warning**: `#D97706` (Amber)
- **Danger**: `#DC2626` (Red)

#### Badge Colors (Used across Roster, Weeks, etc.)
- **Active/Available**: Background `#DCFCE7`, Text `#15803D`
- **Injured/TBC**: Background `#FEF3C7`, Text `#B45309`
- **Unavailable**: Background `#FEE2E2`, Text `#B91C1C`
- **Retired**: Background `#F3F4F6`, Text `#4B5563`
- **Performance**: Background `#F3E8FF`, Text `#6B21A8`
- **Open**: Background `#DBEAFE`, Text `#1D4ED8`
- **Womens**: Background `#FCE7F3`, Text `#BE185D`

### Typography
- **Font Family**: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- **Base Size**: System default (typically 16px)
- **Weight Scale**: Regular (400), Medium (500), Semibold (600), Bold (700)

### Spacing & Layout
- **Base Unit**: 4px (Tailwind default)
- **Container Padding**: Responsive (mobile: 1rem, desktop: 2rem)
- **Touch Targets**: Minimum 44px × 44px (`.touch-target` class)

### Responsive Design
- **Mobile First**: All designs start at mobile breakpoint
- **Breakpoints**: Tailwind defaults (sm: 640px, md: 768px, lg: 1024px, xl: 1280px)
- **Safe Areas**: Support for device notches and home indicators via `env(safe-area-inset-*)`

### Accessibility
- **Color Contrast**: Minimum WCAG AA compliance
- **Focus States**: Visible focus indicators for keyboard navigation
- **Screen Readers**: Semantic HTML structure, ARIA labels where needed

### Performance
- **Code Splitting**: Vite automatic code splitting
- **Image Optimization**: Responsive images with appropriate sizes
- **Bundle Optimization**: Tree-shaking via Vite and TypeScript
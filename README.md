# PUNC Chapter Management App

**Find Your Brotherhood** - A web application for managing PUNC (Project UNcivilized) chapters: men's groups focused on personal development, community building, and authentic connection.

## 🌟 Mission

> "We are dedicated to ending the unnecessary suffering in men to end the suffering caused by men."

## 🎨 Brand & Design

This application follows the UNcivilized Movement's brand aesthetic:
- **Rugged authenticity** - grounded, earthy, real
- **Earth-toned palette** - browns, creams, burnt orange
- **Strong but approachable** - masculine without aggression
- **Typography**: Merriweather (headings), Source Sans Pro (body)

Reference: [Man Uncivilized](https://www.manuncivilized.com/)

## 🚀 Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Hosting**: Vercel
- **Email**: Resend (planned)
- **Payments**: Stripe (Phase 5)

## 📂 Project Structure

```
puncapp/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx         # Root layout with fonts
│   ├── page.tsx           # Landing page
│   └── globals.css        # Design system & Tailwind config
├── components/
│   └── ui/                # Reusable UI components
│       ├── Button.tsx     # Primary, Secondary, Tertiary variants
│       ├── Card.tsx       # Card container with hover effects
│       ├── Badge.tsx      # Status badges
│       └── Input.tsx      # Form input with labels
├── lib/
│   └── supabase/          # Supabase client utilities
│       ├── client.ts      # Client-side Supabase client
│       └── server.ts      # Server-side Supabase client
├── types/
│   └── database.ts        # TypeScript types for data models
├── middleware.ts          # Auth session refresh
├── .env.local             # Local environment variables
└── .env.example           # Environment variables template
```

## 🎯 Development Phases

### ✅ Phase 0: Foundation (Current)
- [x] Next.js project initialized
- [x] Custom design system implemented
- [x] Core UI components (Button, Card, Badge, Input)
- [x] Supabase integration setup
- [x] TypeScript types for all data models
- [x] Landing page with brand design

### Phase 1: Core Chapter Management (MVP)
- [ ] User signup and authentication
- [ ] Chapter creation (admin only)
- [ ] Manual member onboarding by leader
- [ ] Meeting scheduling (recurring)
- [ ] RSVP system
- [ ] Basic attendance tracking
- [ ] Meeting feedback form (1-10 rating)
- [ ] Member profile with stats

### Phase 2: Meeting Runner & Commitments
- [ ] Meeting runner interface with step-by-step flow
- [ ] Attendance self-check-in
- [ ] Lightning Round timer
- [ ] Commitment creation and tracking
- [ ] Commitment discrepancy detection
- [ ] Audio recording
- [ ] Meeting validation workflow

### Phase 3: Curriculum & Badges
- [ ] PUNC curriculum module library
- [ ] Program leader curriculum selection
- [ ] Module content display during meetings
- [ ] Curriculum progress tracking
- [ ] Badge awarding system

### Phase 4: Chapter Formation & Discovery
- [ ] Public chapter search (radius-based)
- [ ] Membership application workflow
- [ ] Chapter formation request system
- [ ] PUNC admin formation queue

### Phase 5: Advanced Features & Funding
- [ ] Tiered membership (contributing members)
- [ ] Chapter funding dashboard and ledger
- [ ] Donation system (own chapter + cross-chapter)
- [ ] Stripe payment integration
- [ ] PUNC admin analytics dashboard
- [ ] Meeting validation queue

## 🛠️ Getting Started

### Prerequisites

- Node.js 20+ installed
- npm or yarn
- Supabase account
- Git

### Installation

1. **Clone the repository** (or you're already here!)

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   - Copy `.env.example` to `.env.local`
   - Fill in your Supabase credentials:
     ```bash
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
     ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Open your browser** to [http://localhost:3000](http://localhost:3000)

### Setting Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Navigate to **Settings > API** to get your:
   - Project URL (`NEXT_PUBLIC_SUPABASE_URL`)
   - Anon/Public Key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
3. Copy these to your `.env.local` file
4. We'll set up the database schema in Phase 1

## 🎨 Design System

### Colors

```css
/* Primary Earth Tones */
--earth-brown: #8B6F47      /* Headers, buttons, primary text */
--warm-cream: #F5F1E8        /* Background */
--deep-charcoal: #2B2621     /* Dark text, nav backgrounds */
--stone-gray: #A39B8F        /* Secondary text, borders */

/* Accent Colors */
--burnt-orange: #D97532      /* Primary CTA buttons */
--forest-green: #4A5D4A      /* Success states */
--burnt-amber: #D4A74E       /* Warning states */
--rust-red: #B34A3C          /* Error states */
```

### Typography

- **Headings**: Merriweather (Bold, 700-900 weight)
- **Body**: Source Sans Pro (Regular, 400 weight)
- **UI/Data**: IBM Plex Sans (for technical elements)

### Components

All components follow the design brief principles:
- **Buttons**: 3 variants (primary, secondary, tertiary)
- **Cards**: Subtle shadows, gentle corners, hover effects
- **Badges**: Pill-shaped status indicators
- **Inputs**: Clean with earth-brown focus states

## 📦 Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
```

## 🔐 Authentication Flow (Coming in Phase 1)

The app will use Supabase Auth with:
- Email/password signup
- Magic link login (optional)
- Session management via middleware
- Role-based access control

## 🗄️ Database Schema (Coming in Phase 1)

Key entities:
- **Users**: Members and leaders
- **Chapters**: Groups of 5-12 men
- **Meetings**: Scheduled and completed meetings
- **Commitments**: Member promises and goals
- **Attendance**: RSVP and check-in records

Full schema defined in `/types/database.ts`

## 🤝 Contributing

This project is being built for PUNC and will be handed off to the organization upon completion.

Development guidelines:
- Follow the design brief for all UI work
- Use TypeScript strictly
- Keep components small and reusable
- Write direct, human-friendly copy (no corporate jargon)
- Mobile-first responsive design

## 📝 License

Copyright © 2026 Project UNcivilized. All rights reserved.

## 🔗 Links

- [Project UNcivilized](https://www.manuncivilized.com/project-uncivilized)
- [Man Uncivilized](https://www.manuncivilized.com/)

## 📞 Support

For questions or issues during development, refer to:
- Technical Specification document
- Design Brief document
- Next.js documentation: https://nextjs.org/docs
- Supabase documentation: https://supabase.com/docs

---

**Built with Claude Code** 🤖

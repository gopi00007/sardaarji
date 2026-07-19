# SARDAARJI — Fitness & Trading Coach

A premium, animated coaching platform for traders and athletes.

- **Landing page** — cinematic, animated marketing site with pricing plans
- **Trade Journal** — log trades, auto P/L analytics, equity curve
- **Fitness Log** — log workouts, streaks, smart recommendations
- **Community** — member profiles + Q&A board
- **Auth** — Google (Gmail) + email login via Supabase
- **Backend** — Supabase (Postgres) stores profiles, trades, workouts, Q&A

## Tech
Plain HTML + CSS + JavaScript (no build step). Data and auth via Supabase.

## Run locally
Serve the folder with any static server, e.g.:

```
npx serve . -l 5180
```

Then open http://localhost:5180

## Configuration
`js/supabase-config.js` holds the Supabase project URL and **public anon key**
(safe for client-side use). Database tables are defined in `supabase-schema.sql`.
Setup steps are in `SETUP-BACKEND.md`.

---
© 2026 Sardaarji Coaching.

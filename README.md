# Raise the Bar

Habits, but make it a game. Tick off daily bars for XP, do the lazy "mini" version when you can't be bothered, hit **I'm bored** for a 5-minute quest, beat a new boss every week, and spend coins on treats or wishlist items.

- Personal onboarding (name, up to 3 goal areas, specific goals, starting point, difficulty, daily time, days/times) that builds a first-week plan from a curated quest library (`src/content.js`, generator in `src/plan.js`)
- Weekly check-in that levels quests up when you crush them and makes them easier when you skip them
- Weekly boss whose HP scales with your plan, heals a little on missed days, and drops coins, XP and a trophy
- I'm Bored quick quests sized by time (2/5/15 min) and energy, tilted toward your goals
- Real-life milestones, a coin shop with an explained economy, and a wishlist priced in euros
- Vite + vanilla JS, no framework
- Supabase Auth (Google + email/password) and one `saves` row per user
- Live sync between devices (Supabase Realtime)
- Installable PWA (Add to Home Screen), works offline after first load

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in your Supabase URL + publishable key
npm run dev
```

Without keys the app runs in local-only mode (no login, saved in the browser). Useful for UI work.

## Supabase setup (once)

1. Create a project at supabase.com.
2. **SQL Editor** → paste and run `supabase/migrations/20261012000000_saves.sql`.
   (Or with the CLI: `supabase link` then `supabase db push`.)
3. **Project Settings → API**: copy the Project URL and the publishable key (or legacy anon key) into `.env.local`.
4. **Authentication → URL Configuration**
   - Site URL: your production URL, e.g. `https://raise-the-bar.vercel.app`
   - Redirect URLs: add `http://localhost:5173` and your production URL.
5. **Authentication → Providers**
   - Email: on by default. Leave "Confirm email" on if you want sign-ups to verify their address.
   - Google: turn on, then paste a Client ID + Secret from Google Cloud Console
     (APIs & Services → Credentials → OAuth client ID → Web application).
     In Google, add this Authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`

## Deploy (Vercel)

1. vercel.com → Add New → Project → import this repo. Framework preset: **Vite**.
2. Deploy. The Supabase URL and publishable key are in `.env.production`, so no env vars are needed
   (set `VITE_SUPABASE_URL` / `VITE_SUPABASE_KEY` in Vercel only if you want to override them).
3. Put the production URL into Supabase (step 4 above).

## Moving old progress in

Footer → **Import** → pick a `.json` save (for example one exported from the old version). It replaces the current progress after you confirm. **Export** downloads your save the same way.

## How data is stored

`public.saves`: `user_id` (PK, references `auth.users`), `data` (jsonb, the whole game state), `updated_at`.
Row Level Security lets each user read and write only their own row. When two devices disagree, the newer `data.updatedAt` wins.

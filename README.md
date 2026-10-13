# PeakTube V2

YouTube-inspired video browser built with Next.js, TypeScript and Supabase support.

**Branch status:** This project is under development. Test the production build and API integrations before merging.

## Local development

Requires Node.js 22+.

1. Clone this repository.
2. Run `npm install`.
3. Create an untracked `.env.local` yourself on your computer (the file is intentionally **not** included in GitHub).
4. Set the variables listed below, then run `npm run dev`.

Without configured API credentials, the app shows a clearly labeled sample catalog. Playback uses the authorized YouTube embed, which remains subject to embeddability, availability, network conditions and YouTube player restrictions.

## Configuration — no .env files in GitHub

All environment files are ignored by `.gitignore`. Environment values are stored locally in `.env.local` and privately in **Vercel Project Settings → Environment Variables**.

### Required for Supabase email login and saved data

| Environment variable | Where to get it | Visibility |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard → project URL; use the root URL (no `/rest/v1/`) | Public browser config |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase dashboard → publishable key | Public browser config |

A Supabase **publishable** key is intentionally readable in browser code and is not an admin secret. Protect data using Row Level Security. **Never** use your Supabase service-role/secret key in any `NEXT_PUBLIC_` variable.

1. In Supabase **SQL Editor**, execute `supabase/migrations/0001_peaktube.sql` to create protected history, saved videos, likes, subscriptions and native comments.
2. In **Authentication → Providers → Email**, enable email magic-link sign-in. Google sign-in is not used.
3. In **Authentication → URL Configuration**, set Site URL and allowed redirect URLs to the final Vercel URL and `http://localhost:3000` for local testing.

### Required for live marketplace video search

These API credentials are **server-only**. The RapidAPI key must not appear in GitHub, screenshots, browser bundles, or `NEXT_PUBLIC_` variables.

| Environment variable | Intended setting |
| --- | --- |
| `RAPIDAPI_PRIMARY_HOST` | Your authorized RapidAPI host, currently YouTube138 |
| `RAPIDAPI_PRIMARY_BASE_URL` | The provider's HTTPS base URL |
| `RAPIDAPI_PRIMARY_KEY` | **Newly rotated** RapidAPI key, entered privately in Vercel |
| `RAPIDAPI_PRIMARY_SEARCH_PATH` | `/search/` (check provider documentation) |
| `RAPIDAPI_PRIMARY_SEARCH_PARAM` | `q` |
| `RAPIDAPI_PRIMARY_VIDEO_PATH` | `/video/details/` (check provider documentation) |
| `RAPIDAPI_PRIMARY_VIDEO_PARAM` | `id` |
| `RAPIDAPI_PRIMARY_DAILY_LIMIT` | A conservative value within your marketplace plan |

Optional independent secondary provider: the same variables prefixed `RAPIDAPI_SECONDARY_` instead of `RAPIDAPI_PRIMARY_`. Set secondary host, base, key, paths, parameters and budget only after verifying that provider's API and permissions.

Provider request counters in this starter are process-local and **not globally reliable** across Vercel instances. Enforce hard quotas in the provider's own dashboard to prevent overages. Automatic failover isn't a way to circumvent underlying API restrictions.

The previously posted RapidAPI key(s) should be **revoked and rotated** because they appeared in Git history. A force-push cannot guarantee removal of old commit objects, third-party clones, pull-request caches, or logs.

## Deploy to Vercel

1. Import the GitHub repository in https://vercel.com/new.
2. Select the application branch or merge your reviewed feature branch into `main`.
3. Use the **Next.js** framework preset with the project root directory.
4. In **Project Settings → Environment Variables**, add the required Supabase and RapidAPI variables. For each value, select the environments you use (Production and Preview as needed). Keep RapidAPI keys server-only.
5. Redeploy after saving the variables. Next.js `NEXT_PUBLIC_` values are embedded during build, so the deployment must be rebuilt if those values change.
6. Configure the Vercel deployment URL in Supabase auth redirects and execute the SQL migration if not already done.
7. Check `/api/health`, try live search, watch an embeddable video, sign in with an email magic link and confirm personal library isolation.

The project intentionally supports guest viewing without Supabase credentials, but login and user data require correct Supabase settings.

## Security

- Never commit `.env.local`, `.env.production`, or example env files with real values.
- The public Supabase publishable key is not a private credential; privacy depends on proper RLS.
- Do not paste RapidAPI keys into chat, issues, README, or GitHub Actions logs.
- YouTube player-provided advertising or buffering cannot be removed or guaranteed away through marketplace metadata APIs.
- Do not use unlicensed scraping/extraction providers or use provider cycling to bypass quotas.

## Current verification status

Frontend and API gateway code is present. The original CI reported a Next.js link lint issue, for which a source fix was committed; follow-up build verification is required. Live YouTube138 responses and Supabase authentication have not been fully tested with the selected provider and project. Confirm those before shipping.

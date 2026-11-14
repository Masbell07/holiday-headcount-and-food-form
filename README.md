# Holiday RSVP: Thanksgiving & Christmas 2026

Guests RSVP, say how many adults and kids are coming, and claim dishes. The server rejects a dish someone else already claimed, even when it's worded differently ("Grandma's mashed potatoes" vs "mashed potato"). Similar dishes, like sweet potato pie next to sweet potato casserole, get a heads-up but are allowed. Guests can come back on the same phone to change or remove their RSVP.

## Deploy to Vercel (about 5 minutes)

1. **Get the code into Vercel.** Either:
   - In this folder run `npx vercel` and follow the prompts, or
   - Push this folder to a GitHub repo, then on vercel.com choose **Add New → Project** and import it.
2. **Add storage (required, free tier is plenty).** In the Vercel project go to **Storage → Create / Connect → Upstash for Redis** (Marketplace), and connect it to this project. That adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` automatically. Until storage is connected, the site shows a red "Setup needed" banner and RSVPs are not saved.
3. **Optional settings** (Project → Settings → Environment Variables):
   | Variable | Example | Shows |
   |---|---|---|
   | `NEXT_PUBLIC_EVENT_TIME` | `2:00 PM` | Next to the date |
   | `NEXT_PUBLIC_EVENT_PLACE` | `123 Maple St, Paola KS` | Under the date |
   | `NEXT_PUBLIC_HOST_NAME` | `Mel` | "Hosted by Mel" |
   4. **Redeploy** (Deployments → ⋯ → Redeploy) after adding storage or variables.

## Events

| Event | Guest page | Host dashboard |
|---|---|---|
| Thanksgiving 2026 | `/` | `/host` |
| Christmas 2026 | `/xmas` | `/host-xmas` |
| Secret Santa 2026 | `/xmas-ss` | Secret Santa section of `/host-xmas` |

Each event has its own RSVPs, day vote, dish claims and must-haves. Days, times and must-haves live in `lib/events.js`. One host login works for both dashboards.

Secret Santa sign-ups close automatically at the start of Thanksgiving (12:00 AM Central, Nov 26); the host can keep them open or close them early. On Thanksgiving, tap **Draw names** on `/host-xmas`: nobody gets themselves or someone from their household, and each person sees their match privately on the device they signed up with.

## Host dashboard

Go to `/host` (there's also a small "Host login" link at the bottom of the site) and log in as **mel**. From there you can:

- edit or remove anyone's RSVP, or add one for someone who called or texted
- set the final dinner day (this closes voting and updates the header), or reopen voting
- clear every RSVP and start over

The password is stored only as a salted hash, never in plain text. To change it, add `HOST_PASSWORD` (and optionally `HOST_USER`) in Vercel's Environment Variables and redeploy; those replace the built-in login.

## Run locally

`npm install` then `npm run dev`. Without the Upstash variables it keeps RSVPs in memory, which resets when the server stops.

# Thanksgiving 2026 RSVP

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
   | `ADMIN_KEY` | any secret word | Lets you remove anyone's RSVP |
4. **Redeploy** (Deployments → ⋯ → Redeploy) after adding storage or variables.

## Removing someone's RSVP (host only)

Set `ADMIN_KEY`, then open `https://your-site.vercel.app/?admin=YOUR_KEY` once. That browser will show a **Remove** button on every guest.

## Run locally

`npm install` then `npm run dev`. Without the Upstash variables it keeps RSVPs in memory, which resets when the server stops.

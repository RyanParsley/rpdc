# Newsletter Signup Form - Implementation Summary

## What was built

- `/newsletter` - Landing page with personal tone, form, RSS option
- `/newsletter/confirm` - Confirmation page (success/error/fallback states with aside blocks)
- `/api/newsletter/subscribe` - Server-side form handler using `formData()` + redirect pattern
- `src/components/NewsletterSignup.astro` - Pure HTML form (no JS, no inline styles)
- `src/utils/buttondown.ts` - Typed API client for Buttondown
- `.env.example` - Documents `BUTTONDOWN_API_KEY`

## How it works

1. User fills form at `/newsletter`
2. Form POSTs to `/api/newsletter/subscribe` (standard HTML, no JS)
3. API validates, calls Buttondown, redirects to `/newsletter/confirm?status=...`
4. Buttondown RSS-to-email reads from existing `/rss.xml` and sends when new content publishes

## Key decisions

- **No JS to frontend** - Pure HTML form with `method="POST"`
- **Redirect pattern** - API returns 302 redirect, not JSON
- **Existing RSS** - Using `/rss.xml` for Buttondown (not creating dedicated email feed)
- **SubscribeBlock includes NewsletterSignup** - No layout modifications needed
- **TypeScript strict mode** - Zero `any`, explicit returns, `readonly` properties

## Post-merge setup

1. Set `BUTTONDOWN_API_KEY` in CloudCannon environment variables
2. Configure Buttondown RSS-to-email:
   - URL: `https://ryanparsley.com/rss.xml`
   - Cadence: Weekly
   - Behavior: Send immediately (or create draft)

## Files changed

| File                                    | Change                                         |
| --------------------------------------- | ---------------------------------------------- |
| `src/components/NewsletterSignup.astro` | New - pure HTML form component                 |
| `src/pages/newsletter.astro`            | New - landing page                             |
| `src/pages/newsletter/confirm.astro`    | New - confirmation page                        |
| `src/pages/api/newsletter/subscribe.ts` | New - form handler                             |
| `src/utils/buttondown.ts`               | New - API client (was in addNewsletter branch) |
| `.env.example`                          | New - documents env var                        |

## Removed (from addNewsletter branch)

- `src/utils/digest.ts` - Not needed, using Buttondown native RSS-to-email
- `src/pages/api/digest/send.ts` - Not needed
- `src/pages/api/digest/test.ts` - Not needed
- `.github/workflows/weekly-digest.yml` - Not needed

## Tests

- `src/utils/buttondown.test.ts` - Unit tests for API client
- `src/pages/api/newsletter/subscribe.test.ts` - Unit tests for validation logic

# Newsletter Signup Form - Implementation Summary

## What was built

- `/newsletter` - Landing page with personal tone, form, RSS option
- `/newsletter/confirm` - Generic confirmation page explaining next steps
- `src/components/NewsletterSignup.astro` - Pure HTML form posting to Buttondown's embed endpoint
- `.env.example` - Documents `BUTTONDOWN_USERNAME`

## How it works

1. User fills form at `/newsletter`
2. Form POSTs directly to `https://buttondown.com/api/emails/embed-subscribe/{username}`
3. Buttondown handles confirmation email (double opt-in)
4. Buttondown RSS-to-email reads from existing `/rss.xml` and sends when new content publishes

## Key decisions

- **Static site compatible** - No server-side code, fully works on CloudCannon
- **No API key in browser** - Uses Buttondown's public embed endpoint
- **No JS to frontend** - Pure HTML form with `method="POST"`
- **Buttondown handles confirmation** - Double opt-in managed by Buttondown
- **Existing RSS** - Using `/rss.xml` for Buttondown RSS-to-email

## Post-merge setup

1. Set `BUTTONDOWN_USERNAME` in CloudCannon environment variables
2. Configure Buttondown RSS-to-email:
   - URL: `https://ryanparsley.com/rss.xml`
   - Cadence: Weekly
   - Behavior: Send immediately (or create draft)

## Files changed

| File                                    | Change                                |
| --------------------------------------- | ------------------------------------- |
| `src/components/NewsletterSignup.astro` | New - pure HTML form component        |
| `src/pages/newsletter.astro`            | New - landing page                    |
| `src/pages/newsletter/confirm.astro`    | New - generic confirmation page       |
| `.env.example`                          | New - documents `BUTTONDOWN_USERNAME` |

## Removed

- `src/pages/api/newsletter/` - No server-side API route needed
- `src/utils/buttondown.ts` - No API client needed for static form
- `@astrojs/node` adapter - Not needed for fully static site

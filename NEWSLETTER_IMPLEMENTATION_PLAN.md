# Newsletter Signup Form Implementation Plan

## Context

Goal: Add Buttondown newsletter signup to ryanparsley.com

- Landing page at `/newsletter`
- Aside block on blog posts and ephemera
- No JS to frontend when possible (prefer Astro native APIs)
- Use Buttondown's native RSS-to-email for actual sending

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Browser                                 │
│                                                                  │
│  ┌──────────────┐    ┌─────────────────┐    ┌───────────────┐  │
│  │ /newsletter  │    │ Post/Ephemera   │    │  API Route    │  │
│  │ Landing Page │    │ aside block     │    │ /api/newsletter│  │
│  └──────────────┘    └─────────────────┘    │ /subscribe    │  │
│         │                   │               └───────┬───────┘  │
│         └───────────────────┴───────────────────────┘          │
│                            │                                     │
│                      Standard HTML Form (POST)                   │
│                      No JS required on frontend                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Astro Server                              │
│                                                                  │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │ NewsletterSignup│    │ subscribe.ts    │    │ buttondown.ts│ │
│  │ .astro          │    │ API Route       │    │ API Client  │ │
│  └─────────────────┘    └────────┬────────┘    └──────┬──────┘ │
│                                  │                    │         │
│                                  ▼                    ▼         │
│                    ┌─────────────────────────┐                │
│                    │ Standard Fetch (Node.js) │                │
│                    └─────────────────────────┘                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Buttondown API                            │
│                                                                  │
│  POST /v1/subscribers                                           │
│  → Adds email to newsletter list                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Buttondown Dashboard                        │
│                                                                  │
│  RSS-to-email automation reads from:                             │
│  https://ryanparsley.com/email.xml (to be created)               │
│                                                                  │
│  Cadence: Weekly (fires when new content, not on strict schedule)│
└─────────────────────────────────────────────────────────────────┘
```

## Key Decisions

### 1. No JS to Frontend

- Standard HTML form with `method="POST"` and `action="/api/newsletter/subscribe"`
- Astro API route handles form POST natively
- API redirects to `/newsletter/confirm?status=success|error&message=...`
- Works without JavaScript enabled in browser
- Confirmation page parses URL params client-side only (no fetch, pure Astro)

### 1a. TypeScript Pedantry

- Zero `any` - all values explicitly typed or inferred
- `interface` for object shapes, `type` for unions
- `readonly` properties on all input/output objects
- `as const` for configuration constants
- Explicit return types on all exported functions
- `npx tsc --noEmit` passes with zero errors
- No `@ts-ignore` or `@ts-expect-error`

### 2. Existing RSS vs Email-Focused RSS

- **Existing `/rss.xml`**: Only blog posts, no body content, used by RSS readers
- **Email feed needed**: Buttondown looks for `content:encoded` field
- **Decision**: Create dedicated `/email.xml.js` for newsletter
  - Includes full rendered content
  - Can include notes + ephemera if desired
  - Keeps existing RSS clean for readers

### 3. React vs Astro Components

- **Decision**: Pure Astro components only
- `NewsletterSignup.astro` - self-contained with inline `<style>`
- No React, no client-side JS bundles
- Small inline script for form handling (progressive enhancement)

## File Inventory

### New Files

| File                                    | Purpose                     | Dependencies      |
| --------------------------------------- | --------------------------- | ----------------- |
| `src/components/NewsletterSignup.astro` | Reusable signup form        | None              |
| `src/pages/newsletter.astro`            | Landing page                | NewsletterSignup  |
| `src/pages/newsletter/confirm.astro`    | Post-subscribe confirmation | None              |
| `src/pages/api/newsletter/subscribe.ts` | Form handler API route      | buttondown.ts     |
| `src/utils/buttondown.ts`               | Buttondown API client       | None (Node fetch) |
| `src/pages/email.xml.js`                | Email-focused RSS feed      | None              |
| `.env.example`                          | Document env vars           | None              |

### Modified Files

| File                         | Change                                 | Risk |
| ---------------------------- | -------------------------------------- | ---- |
| `src/layouts/Ephemera.astro` | Import + add NewsletterSignup to aside | Low  |
| `.env.example`               | Add BUTTONDOWN_API_KEY                 | None |

## Implementation Order

### Phase 1: Foundation

1. `src/utils/buttondown.ts` - API client with types
2. `src/pages/api/newsletter/subscribe.ts` - Form handler
3. Test API with curl

### Phase 2: UI Components

4. `src/components/NewsletterSignup.astro` - Form component
5. `src/pages/newsletter.astro` - Landing page
6. `src/pages/newsletter/confirm.astro` - Confirmation page

### Phase 3: Integration

7. Modify `src/layouts/Ephemera.astro` - Add to aside
8. `src/pages/email.xml.js` - Email RSS feed

### Phase 4: Documentation & Cleanup

9. Update `.env.example`
10. Remove digest-related code (not needed for this approach)
11. Update AGENTS.md if needed

## Detailed Specifications

### API Endpoint: POST /api/newsletter/subscribe

**Request**: Standard HTML form POST

```
Content-Type: application/x-www-form-urlencoded

email_address=user@example.com
```

**Response** (redirect):

```
302 → /newsletter/confirm?status=success
```

**Error Response** (redirect):

```
302 → /newsletter/confirm?status=error&message=Already+subscribed
```

### NewsletterSignup Component Props

```typescript
interface Props {
  title?: string; // Default: "Subscribe to my newsletter"
  description?: string; // Default: "Get notified when I publish..."
  buttonText?: string; // Default: "Subscribe"
  className?: string; // For layout customization
}
```

### Email RSS Feed Fields

```javascript
{
  title: post.data.title,
  link: `/blog/${post.slug}/`,
  pubDate: post.data.pubDate,
  description: post.data.description,
  content: renderedMarkdownBody,  // Full content for Buttondown
}
```

### Buttondown Template (for reference)

```jinja
We published the following:

{% for item in items %}
  <h2>{{ item.title }}</h2>
  <p>{{ item.description }}</p>
  <p><a href="{{ item.url }}">Read more</a></p>
{% endfor %}
```

## Local Testing Plan

### Prerequisites

- Buttondown account with API key
- `.env` file with `BUTTONDOWN_API_KEY=xxx`

### Step 1: Verify API Client

```bash
cd newsletter-worktree
npm run dev

# In another terminal, test API directly
curl -X POST http://localhost:4321/api/newsletter/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email_address":"test@example.com"}'
```

Expected: `{ "success": true, ... }` or appropriate error

### Step 2: Test Landing Page

1. Open http://localhost:4321/newsletter
2. Verify page loads without errors
3. Check form is visible with correct styling

### Step 3: Test Form Submission

```bash
# Test successful subscription
curl -X POST http://localhost:4321/api/newsletter/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email_address":"test@example.com"}'

# Test validation (missing email)
curl -X POST http://localhost:4321/api/newsletter/subscribe \
  -H "Content-Type: application/json" \
  -d '{}'

# Test validation (invalid email)
curl -X POST http://localhost:4321/api/newsletter/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email_address":"not-an-email"}'
```

### Step 4: Test Email RSS Feed

```bash
curl http://localhost:4321/email.xml | head -100
```

Verify:

- Valid XML
- Contains `content:encoded` tags
- Items have proper structure

### Step 5: Test Aside Integration

1. Open a blog post (e.g., http://localhost:4321/blog/posse)
2. Verify aside shows SubscribeBlock with NewsletterSignup

### Step 6: E2E with Playwright (if available)

```bash
npm run test:e2e
# or
npx playwright test
```

### Step 7: Build Verification

```bash
npm run build
```

Verify:

- No TypeScript errors
- No lint errors
- Build completes successfully

## Deployment Checklist

### Pre-Deploy

- [ ] All tests pass locally
- [ ] Build succeeds
- [ ] BUTTONDOWN_API_KEY set in CloudCannon environment variables (Site Settings → Environment Variables)

### Post-Deploy

- [ ] Verify `/newsletter` loads correctly
- [ ] Verify `/email.xml` produces valid RSS
- [ ] Test form submission end-to-end
- [ ] Configure RSS-to-email in Buttondown dashboard:
  - URL: `https://ryanparsley.com/email.xml`
  - Cadence: Weekly
  - Behavior: Send immediately (or create draft)

### Buttondown Dashboard Configuration

1. Go to Settings → Basic → RSS-to-email
2. Add feed URL: `https://ryanparsley.com/email.xml`
3. Choose cadence: Weekly
4. Choose behavior: Send immediately
5. Optional: Build custom template using Django syntax

## RSS Feed Decision: Existing vs New

### Option A: Modify Existing `/rss.xml`

- Pros: Single feed to manage
- Cons: RSS readers get full content emails, different semantics

### Option B: Create `/email.xml` (Selected)

- Pros: Clean separation, optimized for email
- Cons: Another feed to maintain

**Rationale**: Email newsletters have different expectations than RSS feeds. Email readers expect full content in the email itself (via Buttondown template), while RSS readers prefer to click through. Separate feeds allow optimization for each use case.

## Environment Variables

| Variable             | Required | Description                                    |
| -------------------- | -------- | ---------------------------------------------- |
| `BUTTONDOWN_API_KEY` | Yes      | Buttondown API key from Settings → API         |
| `SITE_URL`           | No       | Full site URL for absolute links in email feed |

## Troubleshooting

### "Newsletter service is not properly configured"

- Check CloudCannon has `BUTTONDOWN_API_KEY` in environment variables
- Verify key is valid in Buttondown dashboard

### Form submission gives error

- Check browser console for fetch errors
- Verify API route returns proper JSON
- Check Buttondown API key has permissions

### Buttondown can't reach RSS feed

- Verify `/email.xml` is accessible externally
- Check `robots.txt` not blocking Buttondown's user agent
- Allowlist IPs: `54.221.205.107`, `5.78.40.235`, `5.78.179.70`

### Email content looks wrong in Buttondown

- Verify `content:encoded` is present in RSS items
- Check template syntax in Buttondown dashboard
- Test with sample item URL

## Removed Functionality

The `addNewsletter` branch included:

- `src/utils/digest.ts` - Custom weekly digest generator
- `src/pages/api/digest/send.ts` - Digest email sender
- `.github/workflows/weekly-digest.yml` - Cron workflow

**Reason for removal**: Buttondown's native RSS-to-email handles this better. No need for custom digest generation code.

## Future Considerations

- Could add notes/ephemera to `/email.xml` if desired
- Could add email archive page linking to Buttondown
- Could add subscriber count display (needs API call)
- Could add "manage subscription" link in emails

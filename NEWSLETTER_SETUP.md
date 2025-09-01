# Newsletter Setup Guide

This guide explains how to set up the Buttondown newsletter integration for your Astro blog.

## Prerequisites

1. A [Buttondown](https://buttondown.com) account
2. Your Buttondown API key

## Setup Steps

### 1. Get Your Buttondown API Key

1. Log in to your [Buttondown dashboard](https://buttondown.com)
2. Go to Settings → API
3. Generate a new API key
4. Copy the API key (keep it secure!)

### 2. Configure Environment Variables

Create or update your `.env` file in the project root:

```bash
# Buttondown API Configuration
BUTTONDOWN_API_KEY=your_buttondown_api_key_here
```

### 3. Test the Integration

1. Start your development server:

   ```bash
   npm run dev
   ```

2. Visit `http://localhost:3000` or any blog post
3. Try subscribing with a test email address
4. Check your Buttondown dashboard to verify the subscription was created

### 4. Production Deployment

Make sure to set the `BUTTONDOWN_API_KEY` environment variable in your production environment:

- **Netlify**: Add it in Site Settings → Environment Variables
- **Vercel**: Add it in Project Settings → Environment Variables
- **Other platforms**: Follow their respective documentation for environment variables

## Features Included

### ✅ Newsletter Signup Form

- Clean, accessible form with email validation
- Real-time validation feedback
- Loading states and error handling
- Success confirmation with redirect

### ✅ Integration Points

- Homepage newsletter signup
- Blog post newsletter signup
- Dedicated newsletter page (`/newsletter`)
- Updated SubscribeBlock component

### ✅ User Experience

- Confirmation page for successful subscriptions
- Error handling for failed subscriptions
- Privacy information and unsubscribe instructions
- RSS feed links still available

## Customization

### Styling

The newsletter components use CSS custom properties that match your existing Nord theme. You can customize the appearance by modifying the styles in:

- `src/components/NewsletterSignup.astro`
- `src/pages/newsletter.astro`
- `src/pages/newsletter/confirm.astro`

### Content

Update the newsletter page content in `src/pages/newsletter.astro` to match your brand and messaging.

### Form Behavior

Modify the signup behavior in `src/utils/buttondown.ts` if you need additional customization.

## Troubleshooting

### Common Issues

1. **"Buttondown API key not configured"**
   - Make sure `BUTTONDOWN_API_KEY` is set in your environment variables
   - Restart your development server after adding the variable

2. **"Failed to subscribe" errors**
   - Check your Buttondown API key is valid
   - Verify your Buttondown account has API access
   - Check the browser console for detailed error messages

3. **Form not submitting**
   - Check that JavaScript is enabled
   - Verify the email validation is working
   - Check browser console for JavaScript errors

### Testing

You can test the integration without affecting real subscribers by:

1. Using a test email address
2. Checking your Buttondown dashboard for new subscribers
3. Using Buttondown's test mode if available

## Security Notes

- Never commit your API key to version control
- Use environment variables for all sensitive configuration
- The API key is only used for server-side requests (in the browser, it's used for client-side validation only)

## Support

If you encounter issues:

1. Check the browser console for error messages
2. Verify your Buttondown API key is correct
3. Test with Buttondown's API documentation
4. Check the Astro build logs for any compilation errors

## Next Steps

After setup, consider:

1. Customizing the newsletter welcome email in Buttondown
2. Setting up automated newsletters for new blog posts
3. Adding newsletter analytics tracking
4. Creating subscriber segments based on interests

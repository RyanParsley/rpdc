# Weekly Digest Feature

This feature automatically collects your blog posts, notes, and ephemera from the past week and sends them as a beautifully formatted email digest to your newsletter subscribers.

## 🚀 Features

- **Automatic Content Collection**: Gathers content from blog posts, notes, and ephemera
- **Beautiful HTML Email**: Responsive, mobile-friendly email template
- **Smart Content Detection**: Handles different content types appropriately
- **Weekly Automation**: Runs automatically every Monday (configurable)
- **Manual Testing**: Test endpoint for development and debugging
- **Error Handling**: Comprehensive error handling and logging

## 📋 Setup Instructions

### 1. Environment Variables

Add to your `.env` file:

```bash
BUTTONDOWN_API_KEY=your_buttondown_api_key_here
SITE_URL=https://yourdomain.com  # Optional, defaults to https://ryanparsley.com
```

### 2. GitHub Actions (for Automation)

The weekly digest runs automatically via GitHub Actions. The workflow file is already created at `.github/workflows/weekly-digest.yml`.

**To enable it:**

1. Go to your GitHub repository
2. Navigate to Settings → Secrets and variables → Actions
3. Add your environment variables as repository secrets:
   - `BUTTONDOWN_API_KEY`
   - `SITE_URL` (optional)

### 3. Manual Testing

Test the digest generation without sending emails:

```bash
# Visit this URL in your browser or curl it
GET /api/digest/test
```

This will return a JSON response with:

- Number of items found
- Content breakdown by type
- HTML preview of the digest
- No email is actually sent

### 4. Manual Trigger

To manually send a digest email:

```bash
# Via API
POST /api/digest/send

# Or via curl
curl -X POST https://yourdomain.com/api/digest/send
```

## 📧 Email Template Features

The digest email includes:

- **📊 Summary Statistics**: Total items, breakdown by content type
- **📌 Organized Sections**: Blog posts, notes, and ephemera in separate sections
- **🔗 Direct Links**: Each item links directly to your site
- **📱 Mobile Responsive**: Looks great on all devices
- **🎨 Beautiful Styling**: Clean, professional design matching your brand
- **🏷️ Tags Display**: Shows tags for each item (when available)

## 🔧 Customization

### Content Types

The digest collects from three content collections:

1. **Blog Posts** (`src/content/blog/`): Full articles and tutorials
2. **Notes** (`src/content/note/`): Quick thoughts and updates
3. **Ephemera** (`src/content/ephemera/`): Links, media, and miscellaneous content

### Email Template

Customize the email template in `src/utils/digest.ts`:

```typescript
// Modify the HTML template in formatDigestAsHtml()
const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      /* Your custom CSS styles */
    </style>
  </head>
  <body>
    <!-- Your custom HTML structure -->
  </body>
  </html>
`;
```

### Scheduling

Modify the schedule in `.github/workflows/weekly-digest.yml`:

```yaml
on:
  schedule:
    # Current: Every Monday at 9:00 AM UTC
    - cron: "0 9 * * 1"
    # Change to different day/time as needed
```

## 🧪 Testing

### Local Testing

1. **Start development server**:

   ```bash
   npm run dev
   ```

2. **Test digest generation**:

   ```bash
   curl http://localhost:3000/api/digest/test
   ```

3. **Test digest sending** (requires API key):
   ```bash
   curl -X POST http://localhost:3000/api/digest/send
   ```

### Production Testing

1. **Deploy your changes**
2. **Test the endpoints** on your live site
3. **Check Buttondown dashboard** for sent emails
4. **Verify subscriber delivery**

## 📊 Content Collection Logic

### Date Range

- Collects content from the past 7 days
- Uses `pubDate` for blog posts and notes
- Uses `date` for ephemera
- Excludes future-dated content

### Content Processing

- **Blog Posts**: Title, description, tags, publish date
- **Notes**: Title (or "Untitled Note"), description, tags, publish date
- **Ephemera**: Generated titles based on content type, appropriate descriptions

### Sorting

- Items sorted by publish date (newest first)
- Grouped by content type in email
- Maintains chronological order within each section

## 🚨 Error Handling

### API Errors

- Invalid API key detection
- Network failure handling
- Buttondown API error responses
- Graceful degradation

### Content Errors

- Missing content handling
- Malformed data protection
- Empty digest handling

### Logging

- Comprehensive console logging
- Error details for debugging
- Success confirmations

## 🔒 Security

- **API Key Protection**: Never exposed to client-side
- **Server-Side Only**: All email operations happen on server
- **Input Validation**: All inputs validated before processing
- **Rate Limiting**: Built-in protection against abuse

## 📈 Analytics & Monitoring

### GitHub Actions Logs

- View execution logs in GitHub Actions tab
- Monitor success/failure of digest sends
- Track execution time and performance

### Buttondown Analytics

- View open rates, click rates in Buttondown dashboard
- Track subscriber engagement
- Monitor delivery success

## 🛠️ Troubleshooting

### Common Issues

1. **"No content found"**
   - Check that you have content published in the last 7 days
   - Verify content dates are correct
   - Ensure content is in the right collections

2. **"API key not configured"**
   - Check your `.env` file has `BUTTONDOWN_API_KEY`
   - For GitHub Actions, ensure the secret is set
   - Verify the API key is valid in Buttondown

3. **Email not sending**
   - Check Buttondown dashboard for API errors
   - Verify your account has sending permissions
   - Check spam/junk folders

4. **Wrong content in digest**
   - Verify content publish dates
   - Check collection schemas match expectations
   - Review the content processing logic

### Debug Mode

Enable detailed logging by checking the console output:

- Development server logs
- GitHub Actions logs
- Buttondown API response logs

## 🎯 Best Practices

### Content Strategy

- **Consistent Publishing**: Regular posting helps build engagement
- **Quality over Quantity**: Focus on valuable content
- **Diverse Content Types**: Mix of blog posts, notes, and ephemera

### Email Design

- **Mobile-First**: Test on mobile devices
- **Clear Hierarchy**: Use headings and sections effectively
- **Actionable Links**: Direct links to full content
- **Brand Consistency**: Match your site's design language

### Automation

- **Monitor Regularly**: Check GitHub Actions for failures
- **Test Before Deploying**: Use test endpoints
- **Backup Plan**: Have manual sending capability
- **Timezone Awareness**: Schedule for appropriate times

## 📚 API Reference

### Endpoints

#### `GET /api/digest/test`

Test digest generation without sending email.

**Response:**

```json
{
  "success": true,
  "message": "Test digest generated successfully",
  "digest": {
    "totalItems": 5,
    "blogCount": 2,
    "noteCount": 2,
    "ephemeraCount": 1,
    "weekRange": "2024-01-01T00:00:00.000Z - 2024-01-08T00:00:00.000Z",
    "previewHtml": "<!DOCTYPE html>...",
    "items": [...]
  }
}
```

#### `POST /api/digest/send`

Generate and send the weekly digest email.

**Response:**

```json
{
  "success": true,
  "message": "Weekly digest sent successfully",
  "emailId": "uuid-here",
  "itemCount": 5,
  "weekRange": "Jan 1 - Jan 8, 2024"
}
```

### Configuration

#### Environment Variables

- `BUTTONDOWN_API_KEY`: Your Buttondown API key (required)
- `SITE_URL`: Your site's URL for links (optional, defaults to ryanparsley.com)

#### GitHub Secrets

- `BUTTONDOWN_API_KEY`: Same as environment variable
- `SITE_URL`: Same as environment variable

## 🎉 Success Metrics

Track these metrics to measure digest success:

- **Open Rates**: How many subscribers open the email
- **Click Rates**: How many click through to your site
- **Subscriber Growth**: New subscriptions from digest
- **Content Engagement**: Which types of content perform best
- **Delivery Success**: Percentage of successful deliveries

## 🔄 Future Enhancements

Potential improvements:

- **Customizable Templates**: Multiple email template options
- **Content Filtering**: Include/exclude specific content types
- **A/B Testing**: Test different email formats
- **Subscriber Segmentation**: Target specific subscriber groups
- **Rich Media**: Include images and media in digests
- **Social Sharing**: Add social media links
- **Archive Links**: Link to full content archives

---

**Ready to launch?** Your weekly digest system is production-ready! 🚀

Test it thoroughly, then deploy and let your automated content curation begin! 📧✨

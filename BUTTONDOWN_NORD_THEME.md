# Buttondown Nord Theme Customization

This guide shows how to customize your Buttondown newsletter pages to match your Nord-themed website.

## 🎨 Nord Color Palette

Your site uses these Nord colors:

- **Background**: `#2e3440` (nord0)
- **Secondary BG**: `#3b4252` (nord1)
- **Text**: `#eceff4` (nord6)
- **Headings**: `#d8dee9` (nord4)
- **Accent**: `#88c0d0` (nord8)
- **Links**: `#81a1c1` (nord9)
- **Hover**: `#5e81ac` (nord10)

## 📧 Email Template Customization

Your weekly digest emails are already Nord-themed! The email templates use:

```css
/* Nord CSS Variables */
--nord0: #2e3440; /* Dark background */
--nord1: #3b4252; /* Secondary background */
--nord6: #eceff4; /* Light text */
--nord8: #88c0d0; /* Accent blue */
--nord9: #81a1c1; /* Link blue */
```

## 🌐 Buttondown Hosted Page Customization

### Method 1: Custom CSS in Buttondown

Go to your Buttondown dashboard → **Settings** → **Branding** and add this CSS:

```css
/* Nord Theme for Buttondown Hosted Pages */
:root {
  --nord0: #2e3440;
  --nord1: #3b4252;
  --nord2: #434c5e;
  --nord3: #4c566a;
  --nord4: #d8dee9;
  --nord5: #e5e9f0;
  --nord6: #eceff4;
  --nord7: #8fbcbb;
  --nord8: #88c0d0;
  --nord9: #81a1c1;
  --nord10: #5e81ac;
}

/* Override Buttondown's default styles */
body {
  font-family:
    "Roboto Mono", "SF Mono", Monaco, Inconsolata, monospace !important;
  background-color: var(--nord0) !important;
  color: var(--nord6) !important;
}

.container,
.content {
  background-color: var(--nord0) !important;
  color: var(--nord6) !important;
}

/* Headers */
h1,
h2,
h3,
h4,
h5,
h6 {
  color: var(--nord4) !important;
  font-weight: 200 !important;
}

/* Links */
a {
  color: var(--nord9) !important;
}

a:hover {
  color: var(--nord10) !important;
}

/* Buttons */
.btn,
button,
.button {
  background-color: var(--nord10) !important;
  color: var(--nord6) !important;
  border: none !important;
}

.btn:hover,
button:hover,
.button:hover {
  background-color: var(--nord9) !important;
}

/* Form inputs */
input,
textarea,
select {
  background-color: var(--nord3) !important;
  color: var(--nord6) !important;
  border: 1px solid var(--nord9) !important;
}

input:focus,
textarea:focus,
select:focus {
  border-color: var(--nord8) !important;
  box-shadow: 0 0 0 2px rgba(136, 192, 208, 0.2) !important;
}

/* Cards and sections */
.card,
.post,
.entry {
  background-color: var(--nord1) !important;
  border: 1px solid var(--nord3) !important;
  color: var(--nord6) !important;
}

/* Navigation */
nav,
.nav {
  background-color: var(--nord1) !important;
  border-bottom: 1px solid var(--nord3) !important;
}

/* Footer */
footer,
.footer {
  background-color: var(--nord1) !important;
  border-top: 1px solid var(--nord3) !important;
  color: var(--nord4) !important;
}

/* Code blocks */
code,
pre {
  background-color: var(--nord2) !important;
  color: var(--nord6) !important;
}

/* Blockquotes */
blockquote {
  border-left: 4px solid var(--nord10) !important;
  color: var(--nord8) !important;
  background-color: rgba(94, 129, 172, 0.1) !important;
}
```

### Method 2: Custom Domain with Full Control

For complete control, use a custom domain:

1. **Set up custom domain** in Buttondown settings
2. **Create custom templates** using your own HTML/CSS
3. **Host templates** on your domain
4. **Use webhooks** to trigger custom processing

## 🎨 Advanced Customization

### Custom Email Templates

Create custom email templates in Buttondown:

```html
<!DOCTYPE html>
<html>
  <head>
    <style>
      /* Your Nord-themed CSS */
      :root {
        --nord0: #2e3440;
        --nord8: #88c0d0;
        --nord6: #eceff4;
      }

      body {
        background-color: var(--nord0);
        color: var(--nord6);
        font-family: "Roboto Mono", monospace;
      }

      .header {
        background: linear-gradient(135deg, var(--nord0), var(--nord1));
        color: var(--nord6);
      }

      .button {
        background-color: var(--nord8);
        color: var(--nord0);
      }
    </style>
  </head>
  <body>
    <!-- Your custom email template -->
    <div class="header">
      <h1>{{ newsletter_name }}</h1>
    </div>

    <div class="content">{{ content }}</div>

    <div class="footer">
      <p>Visit <a href="{{ site_url }}">ryanparsley.com</a></p>
    </div>
  </body>
</html>
```

### Custom Signup Forms

Add Nord-themed signup forms to your site:

```html
<style>
  .nord-signup {
    background: #2e3440;
    color: #eceff4;
    padding: 2rem;
    border-radius: 8px;
    border: 1px solid #4c566a;
  }

  .nord-signup input {
    background: #3b4252;
    color: #eceff4;
    border: 1px solid #81a1c1;
  }

  .nord-signup button {
    background: #5e81ac;
    color: #eceff4;
  }
</style>

<div class="nord-signup">
  <h3>Subscribe to Updates</h3>
  <form
    action="https://buttondown.email/api/emails/embed-subscribe/ryanparsley"
    method="post"
  >
    <input type="email" name="email" placeholder="your@email.com" required />
    <button type="submit">Subscribe</button>
  </form>
</div>
```

## 🔧 Buttondown Settings

### Branding Settings

1. Go to **Settings** → **Branding**
2. Upload your logo (consider a Nord-themed version)
3. Set accent color to `#88c0d0` (nord8)
4. Add the custom CSS above

### Email Settings

1. Go to **Settings** → **Emails**
2. Set default template to use Nord colors
3. Customize footer with Nord styling
4. Set link colors to match your theme

### Archive Settings

1. Go to **Settings** → **Archive**
2. Customize archive page styling
3. Use Nord colors for consistency

## 🎯 Testing Your Theme

### Test Email

Send a test email to see your Nord theme:

```bash
# Test the digest generation
curl http://localhost:3000/api/digest/test

# Send actual digest
curl -X POST http://localhost:3000/api/digest/send
```

### Preview Pages

1. **Signup Page**: `https://yourusername.buttondown.email`
2. **Archive Page**: `https://yourusername.buttondown.email/archive`
3. **Confirmation Page**: After subscribing

## 🚀 Best Practices

### Consistency

- Use the same Nord colors across all platforms
- Maintain consistent typography (Roboto Mono)
- Keep spacing and layout patterns uniform

### Accessibility

- Ensure sufficient color contrast
- Test with screen readers
- Maintain keyboard navigation

### Performance

- Optimize images for email
- Use web-safe fonts as fallbacks
- Minimize CSS for email clients

### Mobile Responsiveness

- Test on various devices
- Use media queries for mobile optimization
- Ensure buttons are touch-friendly

## 🔄 Maintenance

### Regular Updates

- Review theme consistency quarterly
- Update colors if you change your Nord palette
- Test new email features with your theme

### Backup

- Keep your custom CSS in version control
- Document your theme customizations
- Have fallback styles for email clients

## 📚 Resources

- [Buttondown Documentation](https://docs.buttondown.com)
- [Nord Color Palette](https://www.nordtheme.com)
- [Email CSS Guidelines](https://www.campaignmonitor.com/css/)
- [CSS Variables Support](https://caniemail.com/features/css-variables/)

---

**Your Nord-themed Buttondown setup is now complete!** 🎨

Your newsletter pages will now perfectly match your site's dark Nord aesthetic, creating a cohesive brand experience across all platforms. 🌟

# TrackPay Marketing Site

A minimal, bilingual (EN/ES) marketing site for the TrackPay iOS app. Built with static HTML/CSS/JS for fast performance and easy deployment.

## 🎨 Design System

- **Aesthetic**: Black/white minimal (TrackPay v2 design system)
- **Primary Color**: Black (#000000)
- **Background**: White (#FFFFFF)
- **Accents**: Gray shades
- **Semantic Colors**: Green (#34C759) for success, Red (#FF3B30) for errors
- **Typography**: System fonts (-apple-system, SF Pro)

## 📁 File Structure

```
marketing/
├── index.html              # Home page with 8 sections
├── privacy.html           # Privacy policy
├── about.html             # About us + contact
├── netlify.toml           # Netlify deployment config
├── css/
│   └── styles.css         # Complete styling (black/white theme)
├── js/
│   ├── i18n.js            # Bilingual toggle (EN/ES)
│   ├── privacy-i18n.js    # Privacy page translations
│   └── about-i18n.js      # About page translations
└── images/
    ├── screenshots/       # iPhone app screenshots (add yours here)
    └── og-image.png       # Social share preview (1200×630px)
```

## 🌍 Bilingual Support

The site supports English and Spanish with:
- Language toggle in header and footer (EN/ES)
- Auto-detection of browser language
- Preference saved in localStorage
- All content translated (homepage, privacy, about)

## 📋 Waitlist Form

The waitlist form uses **Supabase + Netlify Functions**:
- Direct database storage for CRM/analytics
- Captures: email, language, UTM params, IP, user-agent
- Bilingual success/error messages
- Serverless function at `/.netlify/functions/waitlist`
- Form submissions stored in `marketing_waitlist` table

## 🔧 Setup Requirements

### 1. Supabase Database Setup

**Create the waitlist table:**
1. Go to your Supabase project SQL Editor
2. Run the SQL file: `supabase/create-marketing-waitlist.sql`
3. Verify table creation with: `SELECT * FROM marketing_waitlist LIMIT 1;`

**Get your credentials:**
- **SUPABASE_URL**: Project Settings → API → Project URL
- **SUPABASE_SERVICE_ROLE_KEY**: Project Settings → API → service_role key (secret!)

⚠️ **Never commit the service_role key to git** - it's only used in Netlify Functions (server-side).

### 2. Install Dependencies (for local testing)

```bash
cd marketing
npm install
```

This installs `@supabase/supabase-js` for the Netlify Function.

## 🚀 Deployment to Netlify

### Option 1: Git-based Deployment (Recommended)

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "feat: add TrackPay marketing site"
   git push origin feature/marketing-site
   ```

2. **Connect to Netlify**:
   - Go to [netlify.com](https://netlify.com) and sign in
   - Click "Add new site" → "Import an existing project"
   - Choose your GitHub repo
   - Set base directory: `marketing`
   - Netlify will auto-detect settings from `netlify.toml`
   - Click "Deploy site"

3. **Add Environment Variables** (CRITICAL!):
   - In Netlify dashboard → Site settings → Environment variables
   - Add two variables:
     ```
     SUPABASE_URL=https://YOUR-PROJECT.supabase.co
     SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJI...
     ```
   - Without these, the waitlist form will not work!

4. **Custom Domain** (optional):
   - In Netlify dashboard → Site settings → Domain management
   - Add custom domain (e.g., trackpay.app)
   - Follow DNS setup instructions

### Option 2: Drag-and-Drop Deployment

1. Zip the `marketing/` folder contents
2. Go to [netlify.com/drop](https://netlify.com/drop)
3. Drag and drop the zip file
4. Site will be live instantly at a Netlify subdomain

## 📸 Screenshots

✅ **Screenshots are already added!** The site includes 6 iPhone screenshots:
- `start-stop-work-easily.PNG` - Main work tracking interface
- `set-client-rate.PNG` - Setting hourly rates
- `invite-your-client.PNG` - Client invitation system
- `view-your-client-work-activity-timeline.PNG` - Activity timeline
- `request-payment.PNG` - Payment request flow
- `spanish-language.PNG` - Spanish language support

All screenshots are integrated into the homepage hero and preview sections.

## 🖼️ Creating Social Share Image (OG Image)

Create a 1200×630px image for social sharing:
- Use black background with white text
- Include "TrackPay" logo/title
- Add tagline: "Time Tracked. Payments Sorted."
- Save as `images/og-image.png`

Tools to create:
- [Canva](https://canva.com) - Use "Facebook Post" template (1200×630)
- Figma - Quick mockups
- Photoshop/Sketch - Professional designs

## 📧 Contact Email

The site uses `hello@trackpay.app` as the contact email. Update this in:
- `index.html` (footer)
- `privacy.html` (contact section)
- `about.html` (contact box)

If you want a different email, find/replace `hello@trackpay.app` across all HTML files.

## 🔍 SEO Checklist

- [x] Meta title and description (bilingual)
- [x] Open Graph tags for social sharing
- [x] Twitter Card tags
- [x] Semantic HTML structure
- [ ] Add `og-image.png` (1200×630)
- [ ] Submit sitemap to Google Search Console
- [ ] Add Google Analytics or Plausible (optional)

## 🎯 Analytics (Optional)

To add cookie-free analytics with Plausible:

1. Sign up at [plausible.io](https://plausible.io)
2. Add this before `</head>` in all HTML files:
   ```html
   <script defer data-domain="trackpay.app" src="https://plausible.io/js/script.js"></script>
   ```

## 📝 Form Notifications

To get email notifications when someone joins the waitlist:

1. In Netlify dashboard → Site settings → Forms
2. Add form notifications
3. Configure email or webhook (Slack, Discord, Zapier, etc.)

## 🧪 Local Testing

Simply open `index.html` in a browser:
```bash
cd marketing
open index.html  # macOS
# or
python3 -m http.server 8000  # Then visit http://localhost:8000
```

## ✅ Launch Checklist

Before going live:

- [x] Replace screenshot placeholders with real app screenshots
- [x] Set up Supabase waitlist table
- [x] Configure Netlify Functions
- [ ] Run SQL: `supabase/create-marketing-waitlist.sql` in Supabase
- [ ] Add Netlify environment variables (SUPABASE_URL + SERVICE_ROLE_KEY)
- [ ] Create and add `og-image.png` (1200×630)
- [ ] Test language toggle (EN ↔ ES)
- [ ] Test waitlist form submission (check Supabase table)
- [ ] Verify all links work (Privacy, About, Contact)
- [ ] Check mobile responsiveness
- [ ] Test on Safari, Chrome, Firefox
- [ ] Set up custom domain (trackpay.app)
- [ ] Add analytics (optional)

## 🆘 Troubleshooting

**Waitlist form not working:**
- Check browser console for errors
- Verify Netlify environment variables are set (SUPABASE_URL + SERVICE_ROLE_KEY)
- Verify Supabase table exists: `SELECT * FROM marketing_waitlist;`
- Check Netlify Functions logs for errors
- Test the function directly: `curl -X POST https://yoursite.netlify.app/.netlify/functions/waitlist -H "Content-Type: application/json" -d '{"email":"test@example.com"}'`

**Language toggle not working:**
- Check browser console for JavaScript errors
- Ensure `i18n.js` is loaded before closing `</body>`

**Images not loading:**
- Use absolute paths: `/images/screenshot.png` (not `./images`)
- Ensure files are in the `images/` directory

## 📞 Support

For questions about TrackPay marketing site:
- **Email**: hello@trackpay.app
- **Issues**: Create a GitHub issue in the repo

---

Built with ❤️ for independent professionals and small teams.

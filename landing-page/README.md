# Restocka Landing Page

A beautiful, responsive landing page for Restocka restaurant inventory SaaS.

## Files
- `index.html` - Complete landing page (no external dependencies)
- Can be deployed to any static host (Vercel, Netlify, GitHub Pages)

## Sections
1. **Hero** - Value prop + phone mockup
2. **Problem** - Pain points restaurants face
3. **Features** - What Restocka offers
4. **Social Proof** - Metrics + testimonials
5. **Pricing** - FREE / PRO / BUSINESS tiers
6. **CTA** - Download call-to-action
7. **Footer** - Links + branding

## Deployment

### Vercel (Recommended)
```bash
cd landing-page
vercel deploy --prod
```

### Netlify
```bash
cd landing-page
netlify deploy --prod --dir=.
```

### GitHub Pages
1. Push to GitHub
2. Enable Pages in repo settings
3. Point to `/landing-page` folder

## Customization
- Colors: Modify CSS variables for `--primary` (#0d9488 teal)
- Images: Replace phone mockup HTML with actual screenshots
- Testimonials: Update with real customer quotes
- Links: Update CTA buttons to point to app store

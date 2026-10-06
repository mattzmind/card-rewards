# Lucro website

The public site: Home, About, Support (with FAQ), Privacy Policy, Terms of Use and a 404 page.
Plain HTML/CSS with a little JS. No build step, no third-party requests (fonts are self-hosted),
no cookies or analytics. Design notes and references: [REFERENCES.md](REFERENCES.md).

## Preview on your computer
From this folder run `npx http-server -p 8003` (or `python -m http.server 8003` if you have Python),
then open http://localhost:8003. Check it at phone width (390px) and desktop.

## Before it goes live: fill in the placeholders
Every placeholder is marked in the HTML, so a search finds them all.

| What | Where | How to find it | Now |
|---|---|---|---|
| **Domain** | canonical/OG tags, sitemap.xml, robots.txt | search `lucro.example` | `lucro.example` |
| **Support email** | Support, Privacy, Terms, About | search `data-ph="email"` (text and `mailto:`) | `support@lucro.example` |
| **Developer / legal name** | footer ©, Privacy, Terms | search `data-ph="entity"` | `Lucro` |
| **App Store link** | "Get the app" buttons, store badge | search `data-ph="appstore"` (`href="#get"`) | coming-soon badge |
| **Governing law state** | Terms §11 | search `data-ph="state"` | `[State]` |
| **Effective date** | Privacy, Terms | "Effective October 5, 2026" | update if you change the policies |

When the app is live, also:
- Swap the "Coming soon on the App Store" badge for Apple's official **Download on the App Store** badge
  (from Apple's marketing resources) and link it to the App Store URL.
- Replace the lime "coming to iPhone" strip text in every page header.
- Optionally add `<meta name="apple-itunes-app" content="app-id=YOUR_APP_ID">` so Safari shows an install banner.

The Privacy Policy and Terms are written in plain English to match how the app works today
(no accounts, data stored only on the device). Have a lawyer review them before launch,
and update them if the app ever starts collecting data.

## Publishing to your domain (GitHub Pages)
1. Create a new GitHub repo (for example `lucro-site`) and copy this folder's contents into it.
2. Add a file named `CNAME` containing just your domain, for example `getlucro.com`.
3. In the repo: **Settings → Pages → Deploy from branch → main / root**.
4. At your domain registrar, add DNS records:
   - `A` records for the root domain → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `CNAME` record for `www` → `<your-github-username>.github.io`
5. Back in Settings → Pages, tick **Enforce HTTPS** once the certificate is ready (can take up to a day).
6. In App Store Connect use:
   - Marketing URL: `https://yourdomain/`
   - Support URL: `https://yourdomain/support.html`
   - Privacy Policy URL: `https://yourdomain/privacy.html`

## Updating the app screenshots
The phone images in `assets/img/` are real screens from the native app (`mobile/`), rendered with
`npx expo export --platform web` and a made-up wallet, then saved as WebP at 840px wide.
`og.png` (1200×630) is the image shown when the site is shared on social media or in messages.

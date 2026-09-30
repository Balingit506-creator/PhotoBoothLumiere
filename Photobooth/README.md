# Lumière Booth

An elegant online photo booth. Snap a strip with your webcam or upload photos, pick one of 23 templates, add a caption and a film look, then download a 300 dpi print file.

## Run it

It's a static site with no build step. The camera needs a secure context, so serve it locally:

```bash
npx serve .
# or
python -m http.server 8080
```

Then open http://localhost:3000 (or :8080). Opening `index.html` directly also works in Chrome and Edge.

## Structure

| File | What it does |
| --- | --- |
| `index.html` | Landing page, template gallery, 3-step booth, FAQ |
| `css/styles.css` | Design tokens (light and dark), layout, responsive rules |
| `js/templates.js` | Layouts, the 23 procedurally drawn templates, and the canvas renderer |
| `js/filters.js` | Eight film looks (CSS filter on the live preview, the same filter baked into captures) |
| `js/app.js` | Camera, countdown, uploads, design step, download and share |

## Donations

Open `js/donate.js` and fill in the `DONATE` block at the top with your PayPal.Me name, Ko-fi, Buy Me a Coffee or GitHub Sponsors username, or a Stripe Payment Link. Only the platforms you fill in are shown. PayPal also receives the amount the visitor picked. Until something is filled in, the buttons show a "coming soon" message.

## Layouts

| Layout | Output |
| --- | --- |
| Classic Strip (3 photos) | 600×1800, 2×6 in |
| Four-Frame Strip | 600×1800, 2×6 in |
| Double Strip (two strips on one 4×6, cut in half) | 1200×1800 |
| Postcard Grid (2×2) | 1200×1800, 4×6 in |
| Portrait (1 photo) | 1200×1800, 4×6 in |

## Adding a template

Add an `add({...})` block in `js/templates.js`. Give it `id`, `name`, `cats`, `caption`, a `bg(ctx, L, R)` painter, an optional `photo` style and `deco(ctx, L, R)` painter, and `text` styles. `L` holds the layout geometry (`w`, `h`, `k` scale, `slots`, footer `F`), and `R` is a seeded random function so every render comes out the same.

## Third-party templates

Templates from sites such as TemplatesBooth/BrandPacks are **not bundled**. Their licence forbids redistributing the files or displaying them on a website without permission. If you have a licence for a template, export it as a transparent PNG and load it in the booth under **Design → Bring your own template**. It stays in your browser.

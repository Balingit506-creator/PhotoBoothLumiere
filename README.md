# Lumière Booth

An elegant online photo booth. Snap a strip with your webcam or upload photos, pick one of 30 templates, add a caption and a film look, then download a 300 dpi print file.

## Run it

Built with React and Vite. The camera needs a secure context, which the dev server (localhost) provides.

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # static site in dist/
npm run preview   # serve the build
```

## Structure

| File | What it does |
| --- | --- |
| `src/App.jsx` | Page shell: toast, webfont loading, shared template choice |
| `src/components/Booth.jsx` | The 3-step booth: state, camera, countdown, uploads, export |
| `src/components/CaptureStep.jsx`, `DesignStep.jsx` | Capture and design panels |
| `src/components/StripCanvas.jsx` | A canvas drawn by the strip renderer; redraws only when its options change |
| `src/components/*.jsx` | Nav, hero, gallery, features, support, FAQ, footer |
| `src/lib/booth.js` | Layouts, the 30 procedurally drawn templates, and the canvas renderer |
| `src/lib/looks.js` | Eight film looks (CSS filter on the live preview, the same filter baked into captures) |
| `src/lib/media.js` | Image loading, shutter sounds, file naming |
| `src/styles.css` | Design tokens (light and dark), layout, responsive rules |

## Shoot together

Two people in different places can share one booth. In the capture step, **Invite a friend** creates a link (`#room=…`); whoever opens it joins with their own camera. The host runs the countdown for both, each browser snaps its own camera, the two shots are swapped and every frame is joined side by side (host on the left).

Video and photos go directly between the two browsers over WebRTC, encrypted. The free PeerJS cloud service only introduces them, and PeerJS is loaded only when someone uses this feature. If a strict network blocks direct connections, add your own TURN server in `src/together.config.js`. The code lives in `src/lib/useTogether.js` and the together section of `src/components/Booth.jsx`.

## Donations

Open `src/donate.config.js` and fill in the `DONATE` block at the top with your PayPal.Me name, Ko-fi, Buy Me a Coffee or GitHub Sponsors username, or a Stripe Payment Link. Only the platforms you fill in are shown. PayPal also receives the amount the visitor picked. Until something is filled in, the buttons show a "coming soon" message.

## Affiliate links

The "Bring the booth home" section lists recommended gear. Open `src/affiliate.config.js` and set `amazonTag` to your Amazon Associates tracking ID (and `amazonDomain` if you joined another store). Each item links to an Amazon search; give it a `url` to link an exact product instead.

## Layouts

| Layout | Output |
| --- | --- |
| Classic Strip (3 photos) | 600×1800, 2×6 in |
| Four-Frame Strip | 600×1800, 2×6 in |
| Double Strip (two strips on one 4×6, cut in half) | 1200×1800 |
| Postcard Grid (2×2) | 1200×1800, 4×6 in |
| Portrait (1 photo) | 1200×1800, 4×6 in |

## Adding a template

Add an `add({...})` block in `src/lib/booth.js`. Give it `id`, `name`, `cats`, `caption`, a `bg(ctx, L, R)` painter, an optional `photo` style and `deco(ctx, L, R)` painter, and `text` styles. `L` holds the layout geometry (`w`, `h`, `k` scale, `slots`, footer `F`), and `R` is a seeded random function so every render comes out the same.

## Third-party templates

Templates from sites such as TemplatesBooth/BrandPacks are **not bundled**. Their licence forbids redistributing the files or displaying them on a website without permission. If you have a licence for a template, export it as a transparent PNG and load it in the booth under **Design → Bring your own template**. It stays in your browser.

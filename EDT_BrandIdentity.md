# EDT Brand Identity System
## Experiential Design Team — Design Language & Visual Standards
**Version:** 1.1 · March 2026
**Applies to:** Website · Social Media · Campaigns · Print · Digital Collateral

---

## 1. BRAND PERSONALITY

EDT is not a polished agency that promises magic in a pitch deck.
EDT is a **builder** — technical, direct, culturally sharp, and genuinely immersive.

**Brand Character:**
- **Bold** — We say what we do and we do what we say. No fluff.
- **Technical** — We speak the language of engineers and creatives equally.
- **Plugged in** — Always current. Always connected. Literally and metaphorically.
- **Culturally grounded** — Malaysian-made with global range.
- **Unflinching** — We build things others say are too complex.

**Tone of Voice:**
- Direct, never arrogant
- Confident, never loud for the sake of it
- Smart, but never inaccessible
- Energetic, but precise

**What EDT sounds like:**
> "We built a VR onboarding game that set the Malaysia Book of Records. Your team is next."

**What EDT doesn't sound like:**
> "We leverage cutting-edge synergies to deliver transformative immersive solutions."

---

## 2. LOGO SYSTEM

### 2.1 The Mark — Icon Construction

The EDT icon is a **plug connector** — the most honest visual metaphor for what EDT does: connecting brands, ideas, and audiences through technology.

- **Left element (E + D):** Two horizontal prongs + semicircle body = the plug face
- **Right element (T):** Cross/plus symbol = the socket/connector
- Together they form: plug → socket → **connection made**

The mark is geometric, flat, and modular. No gradients. No shadows. No softness.

### 2.2 Logo Variants

| Variant | File(s) | Background | Usage |
|---|---|---|---|
| **Icon mark — web** | `edt-favicon.svg` / `edt-icon.svg` | Blue icon on transparent | Favicon, app icon, social avatar, stamp |
| **Horizontal lockup — all-white** | `EDT-lockup-dark.svg` | White on dark/black | Website header (dark bg), dark slides, dark social posts |
| **Horizontal lockup — blue icon** | `EDT-lockup-light.svg` | Blue icon + dark panels + white text | Website header on black, branded collateral on dark |
| **Vertical stacked lockup** | `edt-icon.svg` | Blue icon + dark rows + white text | Square-format assets, posters, large signage |
| **Icon mark — large PNG** | `EDT LOGO Large-01.png` | Blue on white | Print, presentations, light bg collateral |
| **Full lockup — black** | `EDT Logo_Name-01.png` | Black wordmark on white | Print, documents, light backgrounds |
| **Full lockup — white** | `EDT Logo_Name_White-01.png` | White wordmark on dark | Alternative dark bg lockup (PNG) |
| **Favicon set** | `edt-favicon/` folder | — | Browser tab, PWA icon, iOS/Android home screen |

> **Note on SVG naming:** The files are named `EDT-lockup-dark` and `EDT-lockup-light` — but both are designed for use on **dark backgrounds**. `EDT-lockup-dark` is the all-white version (use when you don't want the blue icon). `EDT-lockup-light` is the blue-icon version (standard brand expression on dark). For **light/white backgrounds**, use the PNG versions (`EDT Logo_Name-01.png`).

### 2.3 Logo Colour Rules

| Background | Icon | Wordmark |
|---|---|---|
| White / Light | Electric Blue `#2D2DFF` | Pure Black `#0A0A0A` |
| Black / Dark `#0A0A0A` | Electric Blue `#2D2DFF` | Pure White `#FFFFFF` |
| Electric Blue `#2D2DFF` | Pure White `#FFFFFF` | Pure White `#FFFFFF` |
| Mid Grey `#8C8C8C` | Pure Black `#0A0A0A` | Pure Black `#0A0A0A` |

**Never:**
- Place the blue logo on a blue background
- Use the logo in any colour other than the four above
- Add drop shadows, outlines, or glow effects to the logo
- Rotate, stretch, or distort the logo
- Use a low-resolution version below 200px wide

### 2.4 Clear Space

Minimum clear space = height of the "T" socket symbol on all four sides.
Never crowd the logo. It needs room to breathe — or to spark.

### 2.5 Minimum Sizes

- Digital: 120px wide (icon only) / 200px wide (full lockup)
- Print: 20mm wide (icon only) / 35mm wide (full lockup)

### 2.6 Wordmark Styling

The wordmark "EXPERIENTIAL / DESIGN / TEAM" is always:
- All-caps
- Stacked on three lines
- Monospaced / condensed weight
- Never on a single line
- Never mixed-case

---

## 3. COLOUR PALETTE

### 3.1 Primary Colours

| Name | Hex | RGB | Usage |
|---|---|---|---|
| **Electric Blue** | `#2D2DFF` | 45, 45, 255 | Primary brand colour. Backgrounds, CTAs, arrows, active states, hero sections |
| **Pure Black** | `#0A0A0A` | 10, 10, 10 | Text block panels, dark sections, primary text on light |
| **Mid Grey** | `#8C8C8C` | 140, 140, 140 | Secondary text, dividers, metadata, captions |
| **Pure White** | `#FFFFFF` | 255, 255, 255 | Window borders, lines, text on dark, negative space |

### 3.2 Colour Philosophy

EDT's palette is deliberately **minimal and high-contrast**. There are no pastels, gradients, or "safe" neutrals.

- **Electric Blue is active.** It means: click here, look here, this matters.
- **Black is structure.** It holds information. It anchors.
- **White is tension.** It cuts through darkness.
- **Grey is support.** It steps back so others lead.

### 3.3 Colour Combinations (Approved)

| Foreground | Background | Use Case |
|---|---|---|
| White `#FFFFFF` | Black `#0A0A0A` | Primary dark UI, hero sections, cards |
| White `#FFFFFF` | Electric Blue `#2D2DFF` | CTA buttons, highlight sections, feature callouts |
| Black `#0A0A0A` | White `#FFFFFF` | Light sections, documents, alternating rows |
| Electric Blue `#2D2DFF` | Black `#0A0A0A` | Accent text, labels, tags on dark backgrounds |
| Electric Blue `#2D2DFF` | White `#FFFFFF` | Accent text on light backgrounds |
| Mid Grey `#8C8C8C` | Black `#0A0A0A` | Secondary text, subheadings, metadata |

### 3.4 CSS Variables (for Antigravity / Next.js)

```css
:root {
  --color-electric-blue: #2D2DFF;
  --color-pure-black: #0A0A0A;
  --color-mid-grey: #8C8C8C;
  --color-pure-white: #FFFFFF;

  /* Semantic aliases */
  --color-background: #0A0A0A;
  --color-surface: #111111;
  --color-border: #FFFFFF;
  --color-accent: #2D2DFF;
  --color-text-primary: #FFFFFF;
  --color-text-secondary: #8C8C8C;
  --color-cta: #2D2DFF;
  --color-cta-text: #FFFFFF;
}
```

### 3.5 Tailwind Config Extension

```js
// tailwind.config.ts
theme: {
  extend: {
    colors: {
      'edt-blue': '#2D2DFF',
      'edt-black': '#0A0A0A',
      'edt-grey': '#8C8C8C',
      'edt-white': '#FFFFFF',
    },
    fontFamily: {
      display: ['"Dela Gothic One"', 'sans-serif'],
      body: ['"Space Grotesk"', 'sans-serif'],
    },
  }
}
```

---

## 4. TYPOGRAPHY

### 4.1 Font Stack

| Role | Font | Weight(s) | Style |
|---|---|---|---|
| **Display / Headlines** | Dela Gothic One | Regular (400) | All-caps preferred. Wide, heavy, dramatic. Japanese gothic DNA. |
| **Body / UI** | Space Grotesk | Light, Regular, Medium, SemiBold, Bold | Clean, geometric, slightly quirky. Never generic. |

### 4.2 Font Files (in Brand Identity/FONTS/)

```
DelaGothicOne-Regular.ttf          — Display headlines
SpaceGrotesk-Light.ttf             — Small captions, metadata
SpaceGrotesk-Regular.ttf           — Body copy
SpaceGrotesk-Medium.ttf            — UI labels, nav items
SpaceGrotesk-SemiBold.ttf          — Subheadings, card titles
SpaceGrotesk-Bold.ttf              — CTAs, emphasis, stats
SpaceGrotesk-VariableFont_wght.ttf — Variable version (use for web)
```

### 4.3 Google Fonts Import (for web)

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Dela+Gothic+One&family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

### 4.4 Type Scale

| Token | Font | Size | Weight | Usage |
|---|---|---|---|---|
| `display-xl` | Dela Gothic One | 96–120px | 400 | Hero headline, full-screen section titles |
| `display-lg` | Dela Gothic One | 64–80px | 400 | Page H1, major section titles |
| `display-md` | Dela Gothic One | 48–56px | 400 | Sub-section headings |
| `display-sm` | Dela Gothic One | 32–40px | 400 | Card titles, feature headings |
| `heading` | Space Grotesk | 24–28px | 700 | H3, component headings |
| `subheading` | Space Grotesk | 18–20px | 600 | Labels, eyebrows, tags |
| `body-lg` | Space Grotesk | 18px | 400 | Long-form body copy |
| `body` | Space Grotesk | 16px | 400 | Standard body, descriptions |
| `body-sm` | Space Grotesk | 14px | 400 | Captions, secondary info |
| `label` | Space Grotesk | 12px | 500–600 | Tags, badges, metadata |
| `mono` | Space Grotesk | 13px | 400 | Code-style labels, stats |

### 4.5 Typography Rules

**Do:**
- Use Dela Gothic One in ALL CAPS for maximum impact
- Use tight letter-spacing (tracking) on Dela Gothic — `-0.02em` to `-0.04em`
- Stack type in large blocks — don't be afraid of the headline taking half the screen
- Use Space Grotesk at lighter weights (300–400) for long body copy
- Use Space Grotesk Bold for CTAs and stats

**Never:**
- Use Dela Gothic One for body copy or anything below 28px
- Use Inter, Roboto, or Arial anywhere in EDT materials
- Centre-align body copy (headlines only)
- Use italic for Dela Gothic (it doesn't have an italic — and it doesn't need one)

### 4.6 CSS Typography Tokens

```css
/* Headlines — Dela Gothic One */
.display-xl { font-family: 'Dela Gothic One', sans-serif; font-size: clamp(64px, 10vw, 120px); text-transform: uppercase; letter-spacing: -0.03em; }
.display-lg { font-family: 'Dela Gothic One', sans-serif; font-size: clamp(48px, 7vw, 80px); text-transform: uppercase; letter-spacing: -0.02em; }
.display-md { font-family: 'Dela Gothic One', sans-serif; font-size: clamp(36px, 5vw, 56px); text-transform: uppercase; }

/* Body — Space Grotesk */
.body { font-family: 'Space Grotesk', sans-serif; font-size: 16px; font-weight: 400; line-height: 1.65; }
.body-lg { font-family: 'Space Grotesk', sans-serif; font-size: 18px; font-weight: 400; line-height: 1.7; }
.label { font-family: 'Space Grotesk', sans-serif; font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; }
```

---

## 5. VISUAL LANGUAGE

### 5.1 Aesthetic Direction

**Primary aesthetic: Neo-Brutalist Retro-Tech**

EDT's visual world lives at the intersection of:
- **Neo-Brutalism** — Raw, structural, no decoration for decoration's sake
- **Y2K / Retro-Tech** — Old computer UI chrome, window frames, system aesthetics
- **Editorial Graphic Design** — Information density, bold type, poster logic
- **Japanese Design Influence** — Mixed media, cultural collage, dense layering

This is not minimalism. This is **maximum clarity through controlled complexity.**

### 5.2 The Grid System

The EDT grid is **strict and visible.** Grids are not hidden infrastructure — they are part of the aesthetic.

- Base grid: 12-column at 1440px, 8-column at 768px, 4-column at 375px
- Gutter: 24px
- Outer margin: 80px (desktop), 24px (mobile)
- **Grid lines can be shown as decorative elements** — thin white 1px lines on dark backgrounds
- Break the grid intentionally and dramatically — not accidentally

### 5.3 Visual Texture Elements

These recurring elements define EDT's visual world. Use them consistently:

**Window Chrome**
- Old computer window frames: title bar + close/minimise/maximise buttons
- Used as containers for content blocks, stats, case study cards
- Borders: 1px `#FFFFFF` on dark backgrounds
- Title bar: filled with `#0A0A0A` or `#2D2DFF`, text in `#FFFFFF`
- Example: A stat card reads like an OS window — title bar says "METAHRISE.EXE", content shows the metrics

**Pixel Grid Overlays**
- Fine crosshatch or dot grid patterns as background texture
- Opacity: 5–12% white on dark backgrounds
- Never overwhelming — it's atmosphere, not content
- Use on hero sections, full-bleed dark panels

**Panel Blocks**
- Rectangular filled blocks (black, blue, or white) that contain text
- No rounded corners. Ever.
- Borders: 1px solid — white on dark, black on light
- Used for labels, eyebrows, product badges, section markers

**Sharp Lines & Dividers**
- Horizontal 1px rules in white or blue
- Used between sections, inside cards, as decorative structural elements
- Never gradients — always flat, single-colour rules

**Scan Lines** (use sparingly)
- Thin horizontal lines at 4–6px intervals, low opacity (3–6%)
- Applied to image overlays or hero sections for retro-digital texture
- Never applied to text areas

**Arrow Language**
- EDT uses a chunky, geometric right-pointing arrow `→` as a motion cue
- Arrow colour: Electric Blue `#2D2DFF`
- Used on CTAs, navigation cues, link labels
- Always right-pointing for forward navigation

**Checkerboard Accent**
- 2x2 or 4x4 pixel checkerboard pattern in white/transparent
- Used as micro-decorations: corner elements, divider accents
- Never as large-scale backgrounds

### 5.4 Photography & Image Treatment

**Photography Style:**
- Real project footage — events, activations, technology in action
- Candid and environmental — people experiencing, not posing
- Blue-tinted or desaturated with Electric Blue colour overlay at 20–30% opacity for consistency
- High contrast — darken shadows, lift highlights
- Never stock-photo aesthetics

**Image Overlays:**
- Dark vignette overlay on hero images to ensure text legibility
- Blue gel overlay (Electric Blue at 20% multiply) for brand consistency
- Window chrome frame placed over images — image sits inside an "OS window"
- Grid overlay (white, 5% opacity) applied to hero images

**Video:**
- Autoplay, muted, looped for backgrounds
- Rendered in high contrast — blacks crushed, highlights bright
- Blue colour grade preferred
- Subtitles / captions: Space Grotesk Medium, white on black panel

### 5.5 Iconography

- Style: Flat, geometric, single-colour
- Stroke: 1.5–2px on outlined icons
- Colour: White on dark backgrounds, Black on light, Blue for active/accent
- No gradient icons, no drop shadows, no "bubbly" rounded styles
- Icon set recommendation: Phosphor Icons or Lucide (both geometric/flat)

### 5.6 Spacing System

```
4px   — xs  (micro gaps, badge padding)
8px   — sm  (tight component spacing)
16px  — md  (standard component padding)
24px  — lg  (section element spacing)
40px  — xl  (component breathing room)
64px  — 2xl (section padding vertical)
96px  — 3xl (large section gaps)
128px — 4xl (hero/page-level spacing)
```

---

## 6. WEB UI COMPONENT LANGUAGE

### 6.1 Buttons

**Primary CTA Button:**
```
Background: #2D2DFF
Text: #FFFFFF, Space Grotesk SemiBold, 14px, all-caps, letter-spacing 0.08em
Padding: 14px 28px
Border-radius: 0px (sharp corners — NO rounding)
Border: none
Hover: background #0000CC, slight scale 1.02
Arrow: right-arrow → appended after text
```

**Secondary Button:**
```
Background: transparent
Text: #FFFFFF, Space Grotesk SemiBold, 14px, all-caps
Border: 1px solid #FFFFFF
Padding: 14px 28px
Border-radius: 0px
Hover: background #FFFFFF, text #0A0A0A
```

**Ghost / Link Button:**
```
Text: #2D2DFF, Space Grotesk SemiBold
No background, no border
Underline on hover
Arrow → after text
```

### 6.2 Cards

**Project Card (Portfolio):**
```
Background: #111111
Border: 1px solid #FFFFFF (or #2D2DFF on hover)
Title bar (window chrome): #0A0A0A, 32px height, 1px bottom border #FFFFFF
  — Contains: category badge (left) + project name
Thumbnail: full-width image with dark overlay
Content area: client name (grey), headline (white, Space Grotesk SemiBold), stat (blue)
Footer: CTA text → in Electric Blue
Border-radius: 0px
```

**Product Card:**
```
Background: #0A0A0A
Border: 1px solid #2D2DFF
Badge: filled Electric Blue, white text, Space Grotesk Bold, 11px, uppercase
Title: Dela Gothic One, white, 28px
Tagline: Space Grotesk Regular, #8C8C8C, 15px
CTA: arrow link in Electric Blue
```

**Stat Card:**
```
Styled as OS window:
Title bar: #2D2DFF background, white monospaced label
Content: large number in Dela Gothic One, white; label in Space Grotesk, grey
Border: 1px solid #FFFFFF
```

### 6.3 Navigation

```
Background: #0A0A0A with 1px bottom border #FFFFFF (or semi-transparent dark on scroll)
Logo: white version (EDT Logo_Name_White-01.png)
Links: Space Grotesk Medium, #FFFFFF, 14px, all-caps, hover colour → #2D2DFF
CTA button: Primary button (blue) — "GET A QUOTE"
Mobile: Hamburger → full-screen dark overlay nav
```

### 6.4 Section Layout Patterns

**Dark Section (default):**
- Background: `#0A0A0A`
- Pixel grid texture overlay: white, 6% opacity
- Text: white primary, grey secondary

**Blue Section (CTA/highlight):**
- Background: `#2D2DFF`
- Text: `#FFFFFF`
- Used for partner CTA, final conversion section

**Split Section:**
- Left panel: `#0A0A0A` (text/content)
- Right panel: `#2D2DFF` or image with overlay
- Hard edge divider — no gradient blend

**Light Break Section (use sparingly):**
- Background: `#FFFFFF`
- Text: `#0A0A0A`
- Used for client logo rows, awards, to create visual breathing room

### 6.5 Hero Section Pattern

```
Full-viewport height
Background: video reel (autoplay, muted, loop) OR dark image with overlay
Overlay: #0A0A0A at 60% opacity
Pixel grid: white, 5% opacity (above overlay)
Layout:
  Eyebrow: Space Grotesk Medium, 12px, all-caps, #2D2DFF, letter-spacing 0.12em
  H1: Dela Gothic One, display-xl, uppercase, white, tight tracking
  Subheadline: Space Grotesk Regular, 18px, #8C8C8C
  CTAs: Primary + Secondary buttons, row layout
```

---

## 7. SOCIAL MEDIA DESIGN SYSTEM

### 7.1 Platform Canvas Sizes

| Platform | Format | Dimensions |
|---|---|---|
| Instagram Feed | Square | 1080 × 1080px |
| Instagram Feed | Portrait | 1080 × 1350px |
| Instagram Reels / TikTok | Vertical video | 1080 × 1920px |
| Instagram Stories | Vertical | 1080 × 1920px |
| LinkedIn Post | Landscape | 1200 × 627px |
| LinkedIn Story | Vertical | 1080 × 1920px |
| Facebook Post | Square | 1080 × 1080px |
| YouTube Thumbnail | Landscape | 1280 × 720px |
| Twitter/X | Landscape card | 1600 × 900px |

### 7.2 Social Post Templates

**Template A — STAT POST (high engagement)**
```
Background: #0A0A0A
Top-left: EDT icon mark, small, white
Centre: Large stat in Dela Gothic One, white (e.g. "52,417")
Below stat: label in Space Grotesk, #8C8C8C (e.g. "AR IMPRESSIONS")
Below label: project name in #2D2DFF panel block
Bottom: "weareedt.com" in Space Grotesk Light, #8C8C8C
Decoration: pixel grid overlay, thin white border 1px inset 8px from edges
```

**Template B — PROJECT REVEAL**
```
Background: Full-bleed project photo/video
Overlay: #0A0A0A at 55% opacity + pixel grid 5%
Top: Window chrome title bar — "#2D2DFF, client name.exe"
Centre-left: H1 in Dela Gothic One, white, stacked
Bottom-left: tech stack labels in panel blocks (#2D2DFF)
Bottom-right: EDT logo white version
```

**Template C — QUOTE/CALLOUT**
```
Background: #2D2DFF
Top: Large quotation mark, white, Dela Gothic One
Centre: Quote text, Space Grotesk Medium, white, 22px
Below: Attribution in Space Grotesk Light, white 80% opacity
Bottom-right: EDT icon mark, white
Decoration: white pixel grid 6% opacity, sharp white border 1px inset
```

**Template D — PRODUCT FEATURE**
```
Background: #0A0A0A
Window chrome top bar: product name.exe
Left 60%: product screenshot/photo
Right 40%:
  - Product name, Dela Gothic One, white
  - 3 feature points, Space Grotesk, white + blue bullet
  - CTA text in Electric Blue →
Bottom: thin Electric Blue rule
```

**Template E — BEHIND THE SCENES (Reels/TikTok)**
```
Vertical 1080×1920
Opening frame: black + EDT icon mark (0.5s)
Text overlay style: Space Grotesk SemiBold, white, bottom-third
Caption style: Window chrome bar at bottom — stat or "DID YOU KNOW" label
Closing frame: "weareedt.com" + icon mark on Electric Blue
```

### 7.3 Social Typography Rules

- Headlines: Dela Gothic One, all-caps, always
- Body / captions: Space Grotesk, 400–600 weight
- Tags/labels: Space Grotesk, 600, all-caps, letter-spacing
- Numbers/stats: Dela Gothic One, massive, full-bleed
- Max 3 font sizes per post — keep it clean

### 7.4 Social Colour Usage

- **Default:** Dark posts (#0A0A0A background, white + blue)
- **High-impact CTA:** Electric Blue background, white text
- **Minimal/white:** Reserve for client logo posts or formal announcements
- Never use more than 2 brand colours in one post

### 7.5 Hashtag Strategy

**Brand hashtags (always include):**
`#weareedt` `#EDT` `#ExperientialDesignTeam`

**Category hashtags (rotate by post type):**
- AR/VR content: `#AugmentedReality` `#VirtualReality` `#MixedReality` `#XR` `#immersive`
- Malaysia market: `#MalaysiaTech` `#KualaLumpur` `#MalaysiaCreative` `#MDEC`
- Events: `#BrandActivation` `#EventTech` `#ExperientialMarketing`
- Products: `#AIAvatar` `#Hologram` `#AIPhotobooth` `#ProjectionMapping`
- SEA market: `#SoutheastAsia` `#SEATech` `#CreativeTech`

### 7.6 Caption Voice by Platform

**Instagram:** Short, punchy, confident. 1–3 sentences + hashtags. Lead with the stat or the result.
> "52,000+ AR impressions across Downtown KL. One city. One weekend. One team. 🔌 #weareedt"

**LinkedIn:** More context, professional framing. 3–5 paragraphs. Share the insight, not just the flex. No fluffy openers ("I'm excited to share...").
> "MetaHRise didn't just onboard 145 MCMC employees. It changed how we think about corporate training. Here's what we learned..."

**TikTok/Reels:** Hook in the first 2 seconds. Text overlay tells the story. No voiceover needed — the visuals do the work.

**YouTube:** Descriptive title with keyword. Description = blog post summary + timestamps + links.

---

## 8. BRAND APPLICATION DO'S AND DON'TS

### ✅ DO

- Use Electric Blue as a spotlight — not wallpaper. One hero element per composition.
- Let Dela Gothic One fill the frame. Size up. Be bold.
- Use window chrome UI elements as content containers — it's on-brand and distinctive
- Show real project footage with real metrics. EDT's proof is its brand.
- Apply the pixel grid as atmosphere — subtle, purposeful
- Keep corners sharp. Always.
- Pair heavy Dela Gothic with light/regular Space Grotesk for contrast and readability
- Stack type vertically in large blocks — poster logic, not prose logic

### ❌ NEVER

- Round corners on cards, buttons, or containers
- Use gradients (other than overlay gradients on photography)
- Use any font other than Dela Gothic One and Space Grotesk
- Place the logo on a busy background without a panel/knockout
- Use pastel colours, muted tones, or "tech startup blue" (`#4285F4`, `#0066CC`, etc.)
- Use stock photography or generic "innovation" imagery (lightbulbs, hands on tablets, etc.)
- Make the logo smaller than the minimum size
- Use Electric Blue for body copy — it's an accent, not a text colour
- Use drop shadows, embossing, or skeuomorphic effects
- Apply too many texture elements at once — pick one or two per composition

---

## 9. BRAND EXTENSIONS (Sub-brands)

Each EDT product maintains its own sub-brand personality while living within the EDT system.

| Product | Accent Colour | Personality | Typography Note |
|---|---|---|---|
| **RiaReality** | `#2D2DFF` (EDT Blue) | Playful, multiplayer, physical energy | Dela Gothic bold display |
| **Hoomans.ai** | `#2D2DFF` + Cyan `#00E5FF` | Intelligent, futuristic, conversational | Dela + Space Grotesk mono |
| **MimpiLab** | `#2D2DFF` + Warm White | Creative, fun, branded, Instagram-worthy | Space Grotesk dominant |
| **CheritAR** | `#2D2DFF` + Amber `#FF9900` | Heritage, storytelling, cultural warmth | Dela Gothic display-led |
| **WayangMind** | `#2D2DFF` + Teal `#00BFA5` | Calm, wellness, culturally local | Space Grotesk light/regular |
| **ARVENA** | `#2D2DFF` + Neon Red `#FF2D2D` | Production, broadcast, cinematic | Dela Gothic heavy + mono |

**Sub-brand rules:**
- All sub-brands use the same base palette (Black / White / Blue)
- Accent colours are secondary — they add personality, not replace the system
- All sub-brand materials must be recognisably EDT — same grid, same type, same aesthetic DNA

---

## 10. FILE ASSETS REFERENCE

### 10.1 Complete Asset Tree

```
Brand Identity/
├── ── VECTOR (SVG) ──────────────────────────────────────────────
├── edt-favicon.svg                — Icon mark only (plug face, no wordmark)
│                                    viewBox: 389 × 194 · Fill: blue (#0000FF → should be #2D2DFF)
│                                    Use: favicon source, small icon contexts
│
├── edt-icon.svg                   — Vertical stacked lockup
│                                    viewBox: 389 × 430 · Fills: blue, #3f3f3f, #fff
│                                    Use: square-format print, posters, large digital
│
├── EDT-lockup-dark.svg            — Horizontal lockup · ALL-WHITE variant
│                                    viewBox: 427 × 98 · Fill: #fff ONLY
│                                    Use: on dark/black backgrounds (white icon + white wordmark)
│
├── EDT-lockup-light.svg           — Horizontal lockup · BLUE ICON variant
│                                    viewBox: 427 × 98 · Fills: blue, #3f3f3f, #fff
│                                    Use: on dark/black backgrounds (blue icon + dark panels + white text)
│
├── ── RASTER (PNG) ──────────────────────────────────────────────
├── EDT LOGO Large-01.png          — Icon mark, large format (white bg)
├── EDT LOGO-01.png                — Icon mark, square crop (white bg)
├── EDT Logo_Name-01.png           — Full lockup, black wordmark (white/light bg)
├── EDT Logo_Name_White-01.png     — Full lockup, white wordmark (dark bg)
│
├── ── REFERENCE ─────────────────────────────────────────────────
├── colourpalette.png              — Brand colour reference
├── Website_Look.png               — Visual direction / mood board
│
├── ── FAVICON KIT ───────────────────────────────────────────────
└── edt-favicon/
    ├── favicon.ico                — Multi-size ICO (browser tab, IE)
    ├── favicon.svg                — Scalable favicon (modern browsers)
    ├── favicon-96x96.png          — Standard favicon PNG
    ├── apple-touch-icon.png       — iOS home screen icon (180×180)
    ├── web-app-manifest-192x192.png — PWA icon, small
    ├── web-app-manifest-512x512.png — PWA icon, large (splash screen)
    └── site.webmanifest           — ⚠️ NEEDS UPDATING (see Section 11.3)

└── FONTS/
    ├── DelaGothicOne-Regular.ttf        — Display headlines
    ├── SpaceGrotesk-Light.ttf           — Captions, metadata
    ├── SpaceGrotesk-Regular.ttf         — Body copy
    ├── SpaceGrotesk-Medium.ttf          — UI labels, nav
    ├── SpaceGrotesk-SemiBold.ttf        — Subheadings, card titles
    ├── SpaceGrotesk-Bold.ttf            — CTAs, stats, emphasis
    └── SpaceGrotesk-VariableFont_wght.ttf — Variable font (use for web)
```

### 10.2 SVG Colour Discrepancy — Action Required

> ⚠️ **The SVG files currently use `fill="blue"` (CSS keyword = `#0000FF`), NOT EDT's Electric Blue `#2D2DFF`.**
>
> This is a 2D2DFF vs 0000FF mismatch — visually subtle but technically incorrect and will produce off-brand colour in browsers and exports.
>
> **Before going live, the SVG source files should be updated:**
> - Find: `fill="blue"`
> - Replace with: `fill="#2D2DFF"`
> - Files affected: `edt-favicon.svg`, `edt-icon.svg`, `EDT-lockup-light.svg`, `edt-favicon/favicon.svg`

---

## 11. WEB & DIGITAL IMPLEMENTATION

### 11.1 Next.js / Antigravity — Logo Usage

**Navigation (dark header):**
```jsx
// Use EDT-lockup-dark.svg (all-white) for the main nav on dark backgrounds
import Logo from '@/assets/EDT-lockup-dark.svg'

<header className="bg-edt-black border-b border-white">
  <Image src={Logo} alt="Experiential Design Team" width={180} height={41} priority />
</header>
```

**Footer:**
```jsx
// Same all-white lockup in footer
<Image src="/images/EDT-lockup-dark.svg" alt="EDT" width={160} height={37} />
```

**On blue/coloured backgrounds (CTA sections):**
```jsx
// Use EDT-lockup-dark.svg (all-white remains legible on blue)
// OR EDT-lockup-light.svg if you prefer the blue-icon-on-blue to be suppressed
```

**On white/light backgrounds (print, light sections):**
```
Use PNG: EDT Logo_Name-01.png (black wordmark)
SVG option: Open EDT-lockup-light.svg and invert — or use PNG for now.
```

**Icon-only contexts (social avatar, app icon):**
```jsx
<Image src="/images/edt-favicon.svg" alt="EDT" width={48} height={25} />
```

### 11.2 Favicon HTML — `<head>` Implementation

Add these tags to your Next.js `app/layout.tsx` metadata or `<head>`:

```html
<!-- Favicon — paste into <head> or use Next.js metadata API -->
<link rel="icon" type="image/svg+xml" href="/favicon/favicon.svg" />
<link rel="icon" type="image/png" sizes="96x96" href="/favicon/favicon-96x96.png" />
<link rel="icon" href="/favicon/favicon.ico" sizes="any" />
<link rel="apple-touch-icon" href="/favicon/apple-touch-icon.png" />
<link rel="manifest" href="/favicon/site.webmanifest" />
```

**Next.js `app/layout.tsx` Metadata API version:**
```tsx
export const metadata: Metadata = {
  title: 'Experiential Design Team | AR, VR & AI Experiences Malaysia',
  description: 'EDT builds AR/VR, AI avatars, and immersive digital experiences for Malaysia's leading brands.',
  icons: {
    icon: [
      { url: '/favicon/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/favicon/favicon.ico', sizes: 'any' },
    ],
    apple: '/favicon/apple-touch-icon.png',
  },
  manifest: '/favicon/site.webmanifest',
}
```

**Recommended file placement in Next.js `public/` folder:**
```
public/
└── favicon/
    ├── favicon.ico
    ├── favicon.svg
    ├── favicon-96x96.png
    ├── apple-touch-icon.png
    ├── web-app-manifest-192x192.png
    ├── web-app-manifest-512x512.png
    └── site.webmanifest
```

### 11.3 site.webmanifest — Corrected Version

> ⚠️ The current `site.webmanifest` contains **placeholder values** ("MyWebSite", "MySite", `#ffffff` theme). Replace the file contents entirely with:

```json
{
  "name": "Experiential Design Team",
  "short_name": "EDT",
  "description": "AR, VR, AI Avatars & Immersive Experiences — Malaysia's Creative Tech Studio",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0A0A0A",
  "theme_color": "#2D2DFF",
  "icons": [
    {
      "src": "/favicon/web-app-manifest-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/favicon/web-app-manifest-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    }
  ]
}
```

### 11.4 SVG Asset Dimensions — Quick Reference

| File | viewBox | Aspect Ratio | Best Use |
|---|---|---|---|
| `edt-favicon.svg` | 389 × 194 | ~2:1 wide | Favicon, 32px+ square contexts |
| `EDT-lockup-dark.svg` | 427 × 98 | ~4.4:1 wide | Nav header, footer (all-white on dark) |
| `EDT-lockup-light.svg` | 427 × 98 | ~4.4:1 wide | Nav header, footer (blue icon on dark) |
| `edt-icon.svg` | 389 × 430 | ~0.9:1 tall | Posters, square formats, vertical stacked |

### 11.5 Antigravity Implementation Checklist

Before the site goes live, confirm the following:

- [ ] Copy all `edt-favicon/` files into `public/favicon/`
- [ ] Copy `EDT-lockup-dark.svg` and `EDT-lockup-light.svg` into `public/images/`
- [ ] Add favicon `<link>` tags to the root layout `<head>`
- [ ] Replace `site.webmanifest` contents with the corrected version above
- [ ] Update `fill="blue"` → `fill="#2D2DFF"` in all SVG files (see Section 10.2)
- [ ] Set `theme-color` meta tag: `<meta name="theme-color" content="#2D2DFF" />`
- [ ] Verify favicon appears correctly in Chrome, Safari, and mobile home screen

---

## 12. QUICK REFERENCE CARD

```
PRIMARY FONT:    Dela Gothic One (display, headlines, stats)
SECONDARY FONT:  Space Grotesk (body, UI, captions)

ELECTRIC BLUE:   #2D2DFF   → CTAs, accents, backgrounds, arrows
PURE BLACK:      #0A0A0A   → Panels, dark sections, primary text (light bg)
MID GREY:        #8C8C8C   → Secondary text, dividers, metadata
PURE WHITE:      #FFFFFF   → Borders, lines, text on dark

BORDER-RADIUS:   0px — always
CORNERS:         Sharp — always
SHADOWS:         None — never
GRADIENTS:       Only on image overlays — never on UI elements
ICON STYLE:      Flat, geometric, single-colour

AESTHETIC:       Neo-Brutalist Retro-Tech
                 Window chrome · Pixel grids · Bold stacked type
                 Electric blue on black · Zero softness
```

---

*EDT Brand Identity System v1.1 · March 2026*
*Experiential Design Team (Adticles Sdn Bhd) · weareedt.com*

# Payroll Protect — redesign v2 notes

Date: 2026-10-18. Brief: product-design-team feel (Linear, Stripe, Vercel, Attio). Quiet confidence for sceptical commercial directors.

## System
- Canvas #F3F4F4, tonal alt #EAECEC, surfaces #FFFFFF / #F7F8F8. Gunmetal #1F2326 for text, structure and dark panels. Lime #0FD76A only for key figures, the CTA and verification states; #077A3E for lime on light surfaces (contrast).
- Depth from tonal shifts and two soft elevation levels. No gradients on surfaces. Hairlines at 8% only where they are structure (steps, FAQ, lists).
- Radii scale: 6 / 10 / 16 / 24 px (chips, buttons and inputs, cards, section panels). Nothing else.
- Type, direction "Ledger" (2026-10-18): Geist for the argument (headlines 600 at -0.045em display, -0.035em section heads; body 400), Geist Mono for the evidence (uppercase labels 500 at +0.06em; worker IDs, timestamps and hours). Figures in Geist 600, tabular. Measure capped at 62ch, leads at 34rem.
- Every type decision is a token in the :root block of styles.css (families, weights, tracking, sizes, label and data settings). A direction is a change to that block only.
- Type lab: lab/type.html, served by the "lab" launch config on port 8001 (outside site/, never deployed). Specimen view compares five directions (Inter Tight, Montserrat + Geist, Geist + Geist Mono, Archivo + Inter, IBM Plex) in real components; in-context view re-types the live site. ?only=C shows one band.
- Typesetting: curly apostrophes and quotes, hanging opening quote marks, narrow no-break space before hour units, text-wrap pretty on prose, case-sensitive forms on uppercase labels, font-synthesis off, brand name set as "PayRoll Protect" (per the live site's PRODUCT.md).
- Fonts still load from Google Fonts. Next: self-host Geist and Geist Mono (no third-party request, metric-matched fallback to stop the swap shift).
- Spacing: sections 96 / 144 / 168 px by breakpoint. Container 1120px.

## Motion
- Springs sampled from the damped-spring closed form (tools: scratch spring.js) as CSS linear() with cubic-bezier fallbacks: gentle (ζ 0.92) for reveals and hover, snappy (ζ 0.68) for rows entering, tick (ζ 0.45) for ticks landing.
- Reveals: opacity + translateY only, staggered 70ms via --i on [data-stagger] children. Anything already in view shows immediately.
- Odometer figures (.od): each digit is a 0–9 strip translated by --d; rightmost digits roll longest. Used for KPIs, stats, totals and calculator output.
- Live attendance feed: rows prepend every ~2s, verify after ~0.8s with a tick that overshoots and settles; one in nine is "Not recognised". Runs only while on screen and the tab is visible.
- Reconciliation: pinned 260vh scene on desktop (unpinned on mobile). Scroll progress checks lines in one by one, moves the scan line, rolls the Claimed / Verified / Flagged totals. Example invoice: £10,155 claimed, £9,996 verified, £159 flagged (1.6%, consistent with the 1.7% sector figure).
- prefers-reduced-motion: all transitions off, hero shows the poster, feed is static, reconciliation shows its final state, odometers set instantly.

## Imagery
- Kept: scroll-driven hero video (the single photographic element) and the terminal hardware shot.
- Dropped: site-cabin, turnstile crowd and aerial photos (read as stock). Replaced with product UI.
- No icon set. One custom tick glyph, dots and typographic index labels.

## Hero video
- MiniMax H3, 2560x1440, 24fps, 124 frames, 5.2s. Master: source/video/hero.mp4. Regenerate frames with scratch extract.sh (video, site/assets, mobile focal 0.77, fps 24).
- Desktop set: assets/frames, 1600px WebP, 13MB. Portrait set: assets/frames-mobile, 864x1440 slice at 77% of width, scaled to 720px WebP, 8MB.
- Set choice is by orientation, not width: portrait screens under 1024px get the portrait slice, everything else the full frame.
- Terminal turns green at frame 121. Scroll plays the video over the first 84% of the hero (data-hold 0.16) and holds the green frame after; overlay line 3 appears at 82.5% so it lands with the tick (data-stages).
- Phones: overlay lines sit in the lower third, clear of the worker's hi-vis.
- Posters and og-image.jpg are taken from the final frame.

## Open
- Form endpoint, hosting target, testimonial confirmation.

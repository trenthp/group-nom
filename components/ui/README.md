# UI Kit

Ported from the `map` branch's component library, restyled for the app's two
skins (decided Aug 2026):

- **Dark Ember** (default) — every library/community surface. Tokens:
  `surface-page` #222222, `surface-card` #333333, `brand` #EA4D19.
  Components default to this skin.
- **Sunset Glass** (session "game mode" only) — setup/voting/results. The
  orange→red gradient page (`from-sunset-from to-sunset-to`) with `glass` /
  `light` / `inverse` component variants and pill shapes.

The two oranges are unified: `brand` (#EA4D19) is the accent everywhere;
the map branch's old primary (#EA580C) survives as `brand-hover`.

All tokens live in `tailwind.config.ts`. Don't hard-code `#222222` /
`#333333` / `#EA4D19` in new code — use `surface-page` / `surface-card` /
`brand`.

## Accessibility rules (enforced by the kit, keep them when composing)

- **Text contrast on dark surfaces**: meaningful text is `text-white` or
  `text-white/70`+; `text-white/50` only for secondary text ≥14px;
  `text-white/40` is decorative or ≥24px only. White on `brand` passes AA
  only bold/large — buttons yes, body copy no.
- **Focus**: every interactive element has a `focus-visible` ring. On dark
  surfaces rings offset against `surface-page`; on the sunset gradient they
  use white rings without offset (no single offset color matches a gradient).
- **Motion**: scale/entrance animations are `motion-safe:` only; BottomSheet
  checks `prefers-reduced-motion` for its slide transition.
- **Icon-only buttons**: `IconButton` requires `aria-label` at the type level.
- **Dialogs**: `Modal` and `BottomSheet` are `role="dialog"` + `aria-modal`,
  move focus in on open, restore it on close, and close on Escape. Pass
  `ariaLabel` when there's no visible header.
- **No star iconography anywhere** — the nomination heart
  (`NominationBadge`) is the only love signal. Positive-only by design.

## Known gaps (fix when it matters)

- `Modal`/`BottomSheet` don't trap Tab focus inside the dialog yet — focus
  can walk out to the page behind. Fine for current simple dialogs; add a
  trap (or switch to `<dialog>`) before putting long forms in them.

# Banking Theme Refactor Design

Date: 2026-05-11
Project: Banking Mini System frontend
Scope: Visual system refactor for the Angular frontend and shared Spartan UI wrappers

## Goal

Refactor the current frontend theme so the application reads clearly as an online banking product rather than a boutique luxury interface. The result should feel professional, restrained, modern, and operational in both light and dark mode.

## Why This Change

The current interface is polished, but its overall tone is too editorial and luxury-leaning for an online banking application. The main issues are:

- The serif-driven typography gives the product a branded, high-fashion tone instead of a clear banking-software tone.
- Surface styling is inconsistent across pages and shared controls.
- Rounded corner usage varies too much across panels, inputs, buttons, and dialogs.
- Dark mode uses surfaces that are too close to black, making the interface feel heavier than intended.
- Hover, active, and selected states are not consistently strong enough in key navigation areas such as the sidebar and menus.

## Agreed Design Direction

### Visual Tone

Use a modern premium banking tone:

- Deep teal for primary emphasis
- Graphite and slate for structure
- Soft silver and restrained neutrals for surfaces

This direction should feel trustworthy and modern without drifting into luxury-brand styling or generic consumer-fintech blue gradients.

### Typography

Use a fully corporate typography approach:

- One clean sans-serif across the product
- No serif-led display styling
- Hierarchy created through weight, size, spacing, and contrast rather than decorative fonts

The typography should read as stable, clear, and product-oriented.

### Shape System

Use a strict shape system:

- `rounded-lg` for almost all controls and panels
- Fully rounded shapes only where they are functionally appropriate, such as switches, tiny badges, or compact status pills

The goal is to remove the current oversized and mixed radius language and replace it with a more disciplined banking UI shape system.

### Light and Dark Themes

Both themes must feel like the same product.

- Light mode should feel clean, calm, and controlled
- Dark mode should remain dark, but noticeably lighter and softer than the current version
- Dark surfaces should use softened charcoal and slate values instead of near-black fills

The dark theme should reduce visual weight while keeping contrast strong enough for clarity.

## Component System Rules

The visual system must be enforced through shared tokens and reusable Spartan UI wrappers, not only through page-level overrides.

### Shared Behavior Expectations

Buttons, inputs, selects, cards, dropdowns, dialogs, sheets, tooltips, switches, and sidebar controls should share:

- The same corner language
- Compatible border weight and border contrast
- Consistent focus treatment
- Minimal but clear shadows
- Clear hover, active, selected, and disabled states

### Sidebar

The sidebar is a priority area.

- Default state should stay quiet
- Hover state should be more visible than it is now
- Active and selected items should be immediately recognizable
- State changes should rely on muted teal-tinted fills, stronger text contrast, and subtle structure rather than loud effects
- Collapsed and expanded states should remain visually consistent

### Menus, Dialogs, and Sheets

Overlays should belong to the same visual family as the main application.

- Menus should have clearer active rows and cleaner structure
- Dialogs and sheets should use disciplined corners, restrained shadows, and calmer surfaces
- Dark mode overlays should avoid floating as nearly black blocks

### Inputs and Form Controls

Form controls should feel operational and dependable.

- Inputs and selects should use consistent shape, padding, border contrast, and focus styling
- Error states should remain easy to notice without overwhelming the interface
- Interactive states should stay minimal but obvious

## Page-Level Scope

The refactor should include the main surfaces currently expressing the old visual language:

- Global theme tokens in `frontend/src/styles.css`
- Shared Spartan wrappers under `frontend/src/app/shared/ui/spartan`
- Banking shell and sidebar
- Login screen
- Overview screen
- Accounts screen
- Shared dialogs and sheets
- Theme toggle surface

## Out of Scope

The following should not be redesigned unless a small styling-driven usability fix is clearly necessary:

- Backend behavior
- Routing structure
- Data flow and API contracts
- Business logic

## Implementation Constraints

- Preserve the existing Angular and Spartan component architecture
- Improve reuse through shared styling primitives instead of page-by-page special cases where possible
- Keep the result modern and professional, but not flashy
- Prefer intentional restraint over decorative styling

## Acceptance Criteria

The work is done when all of the following are true:

1. The application reads clearly as an online banking product in both light and dark mode.
2. Typography is fully corporate and consistent across the product.
3. Rounded corners are disciplined and mostly standardized around `rounded-lg`.
4. Dark mode is lighter, calmer, and more usable than the current implementation.
5. Sidebar, menus, buttons, inputs, dialogs, and sheets share a coherent visual system.
6. Hover, focus, active, and selected states are clearer across navigation and key controls.
7. Shared Spartan wrappers are reusable and aligned instead of depending on scattered ad hoc styling.
8. The frontend builds successfully after the refactor.
9. The updated pages are visually checked in the browser in both themes before reporting completion.

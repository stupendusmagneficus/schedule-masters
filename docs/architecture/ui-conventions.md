# UI Architecture and Frontend Conventions

## Decision

For the MVP, the project uses a hybrid platform-aware UI approach:

- `apps/mobile` uses Expo, React Native, and NativeWind v4.
- `apps/booking-web` uses Next.js, Tailwind CSS, and Radix/shadcn-style web primitives.
- `packages/design-tokens` is the shared source of truth for colors, typography, spacing, radii, elevations, and semantic states.
- Mobile and web presentation components are platform-specific when their interaction or semantics differ.

The goal is a fast, focused mobile experience inspired by Masters Pro while keeping the public booking web page semantic, accessible, and suitable for Next.js rendering.

## Package boundaries

```text
packages/
  design-tokens/    # platform-neutral visual tokens and semantic names
  ui-mobile/        # React Native primitives and mobile compound components
  ui-web/           # accessible web primitives and web compound components
  config/           # shared TypeScript, lint, formatting, and test configuration

apps/
  mobile/           # Expo app, navigation, mobile screens, native adapters
  booking-web/      # Next.js routes, web screens, SEO and booking entry points
```

The UI packages must not import application routes, Supabase clients, or feature-specific business logic. Feature components belong in the relevant app or a future feature package and compose the UI packages.

## Styling rules

1. Use tokens and semantic names instead of raw colors, arbitrary spacing, or duplicated typography values.
2. Use NativeWind utility classes in mobile components; do not mix NativeWind and ad-hoc inline style objects except for measured or platform-native values.
3. Use Tailwind CSS for web layout and styling, wrapping Radix primitives in project-owned components.
4. Keep the public component API small and product-oriented: `Button`, `TextField`, `Card`, `Dialog`, `Tabs`, `Toast`, `DatePicker`, and calendar primitives are preferred over exposing library internals throughout the apps.
5. Prefer composition over large configurable components with many boolean props.
6. Keep loading, error, empty, disabled, focus, pressed, and validation states explicit.
7. Use a minimum interactive target of 44pt on mobile and an equivalent accessible target on web.

## Platform-specific components

Use React Native platform resolution when the component contract is shared but the implementation differs:

```text
packages/ui-mobile/src/Button.native.tsx
packages/ui-mobile/src/Button.ios.tsx
packages/ui-web/src/Button.tsx
```

Use `.ios.tsx` or `.android.tsx` only for genuine native differences. Do not use `Platform.OS` throughout a component when separate files make the boundary clearer. Shared logic should live in a platform-neutral hook or utility.

## Accessibility and interaction

- Web primitives must preserve semantic HTML, keyboard navigation, focus management, labels, and appropriate ARIA semantics.
- Mobile controls must expose accessible labels, roles, states, and hints where visual context is insufficient.
- Every interactive component must define pressed, disabled, loading, error, and focus-visible behavior where applicable.
- Date and calendar components must support keyboard navigation on web and VoiceOver-friendly labels on iOS.
- Visual QA must include small screens, dynamic text sizing, reduced motion, light/dark appearance, and RU/CZ/EN text expansion.

## Component ownership

- The external library provides behavior and low-level primitives.
- `ui-mobile` and `ui-web` own the product-facing API, tokens, variants, accessibility defaults, and tests.
- App screens own orchestration and business state.
- Domain and API packages must remain independent of presentation libraries.

## MVP dependency policy

Add a UI dependency only when it removes meaningful implementation risk or provides difficult accessibility behavior. Prefer small, tree-shakeable dependencies and pin versions compatible with the current Expo SDK and Next.js version. Native dependencies belong to `apps/mobile`; web-only dependencies belong to `apps/booking-web` or `ui-web`.

## Deferred decisions

- Exact MVP token values and visual direction are defined in `docs/design/DESIGN.md` and `docs/design/design-tokens.json`. The product name and final brand identity may still evolve without changing the semantic token contract.
- Calendar/date-picker implementation will be selected while implementing the booking vertical slice.
- A universal UI library such as Tamagui can be reconsidered if the product later requires extensive shared screens between mobile and web.

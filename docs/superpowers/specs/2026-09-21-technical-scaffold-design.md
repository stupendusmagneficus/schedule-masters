# Technical Scaffold Design

**Date:** 2026-09-21
**Status:** Approved

## Goal

Create a minimal, runnable foundation for Schedule Masters before product implementation. The scaffold must support an iOS-first Expo app, a public Next.js booking surface, reusable TypeScript packages, and a future Supabase integration without introducing product business logic.

## Decisions

- Use Yarn 4 through Corepack and Yarn Workspaces.
- Use Turborepo for task orchestration and caching.
- Use `nodeLinker: node-modules` for Expo, Next.js, and IDE compatibility.
- Keep package names neutral under `@schedule-app/*` until the brand is selected.
- Keep the mobile app in `apps/mobile` and booking web in `apps/booking-web`.
- Keep domain, validation, i18n, API, types, and config concerns in separate packages.
- Add Supabase CLI placeholders only; schema, auth, RLS, and Edge Functions are later tasks.
- Keep all repository documentation in English. Product decisions remain in Linear.

## Package boundaries

`domain` is runtime-agnostic and cannot depend on React, Expo, Next.js, Supabase, or browser/native APIs. `validation` owns Zod boundaries. `api` exposes a future typed data-access boundary without credentials. `i18n` starts with RU/CZ/EN identifiers. Apps may consume packages, but apps must not import one another.

## Non-goals

- Product database schema, authentication, RLS, booking availability, notifications, Stripe, production deployment, final brand, shared UI library, and full E2E/mobile infrastructure.

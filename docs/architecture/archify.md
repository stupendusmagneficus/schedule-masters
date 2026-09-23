# Archify

Archify is the repository-local tool for creating verifiable architecture documentation. It generates standalone HTML diagrams from typed JSON specifications and supports architecture, workflow, sequence, data-flow, and lifecycle diagrams.

It is a development and documentation tool only. It is not a runtime dependency of the mobile app, booking web, API package, or Supabase project.

## Location

- Skill: `.agents/skills/archify/`
- Diagram sources: `docs/architecture/diagrams/`
- Skill lockfile: `skills-lock.json`

## Basic workflow

From the repository root:

```bash
node .agents/skills/archify/bin/archify.mjs doctor
node .agents/skills/archify/bin/archify.mjs guide "Show the booking request path from mobile and web to Supabase"
node .agents/skills/archify/bin/archify.mjs validate architecture docs/architecture/diagrams/<name>.json --quality showcase --json
node .agents/skills/archify/bin/archify.mjs deliver architecture docs/architecture/diagrams/<name>.json docs/architecture/diagrams/<name>.html --quality showcase --json
node .agents/skills/archify/bin/archify.mjs visual-check docs/architecture/diagrams/<name>.html --json
yarn archify:report
```

The JSON source is the editable source of truth. The HTML is a shareable documentation artifact and must not be used as application code.

## Repository conventions

- Use English for diagram source labels and GitHub documentation.
- Keep the main path short and limit architecture diagrams to the most important components.
- Use source evidence for repository maps; do not invent infrastructure or runtime behavior.
- Run `validate` after every source edit and before delivery.
- Keep visual review claims separate from automated validation and browser evidence.

The installed skill version and source hash are recorded in `skills-lock.json`. Updates are intentional and must be reviewed as dependency/tooling changes.

## CI report

When an Archify source changes under `docs/architecture/diagrams/`, CI runs `archify:report`. The job validates each source, delivers an HTML artifact, runs `visual-check`, writes a Markdown summary, and uploads the complete report for 14 days. Generated reports are CI artifacts and are not committed to the repository.

# S07: Интеграция + деплой — Research

## Summary

S07 deploys the complete bead designer application (16 routes, PostgreSQL, admin panel) to a reg.ru VPS with HTTPS, PM2 process management, and Nginx reverse proxy. The work splits into three tasks: (1) migrate Prisma from SQLite to PostgreSQL (schema, adapter swap in prisma.ts + seed.ts), (2) add `output: 'standalone'` to next.config.ts + create deployment configs (Nginx, PM2, deploy script), (3) provision the VPS and deploy end-to-end.

## Key Findings

- SQLite→PostgreSQL migration requires changing `provider = "sqlite"` to `"postgresql"` in schema.prisma, swapping `PrismaLibSql` adapter to `PrismaPg` from `@prisma/adapter-pg` + `pg` package, and creating fresh PostgreSQL migrations (existing SQLite migrations are incompatible).
- No local PostgreSQL available (D024) — use `prisma db push` for first deploy or test against VPS PostgreSQL remotely.
- Standalone mode doesn't auto-copy `public/` and `.next/static/` — deploy script must handle this.
- Nginx needs `X-Accel-Buffering: no` header for streaming responses (Next.js docs).
- VPS specs, domain, and SSH credentials are unknown — all deployment scripts must be parameterized.

## Recommended Approach

3 tasks in order: T01 (PostgreSQL migration) → T02 (standalone output + deployment configs) → T03 (VPS provision + deploy).

## Files to Create/Modify

- `next.config.ts` — add `output: 'standalone'`, anti-buffering header
- `prisma/schema.prisma` — change provider to postgresql
- `prisma.config.ts` — no changes needed
- `src/lib/prisma.ts` — swap to PrismaPg adapter
- `prisma/seed.ts` — swap adapter
- `.env.production` (new) — template
- `deploy.sh` (new) — build + rsync script
- `nginx.conf` (new) — reverse proxy template
- `ecosystem.config.cjs` (new) — PM2 config
- `scripts/setup-vps.sh` (new) — VPS provisioning

## Risks

- VPS RAM may be limited (1GB?) — may need swap
- VPS access details unknown — parameterized scripts
- Real device FPS testing is manual, not automatable

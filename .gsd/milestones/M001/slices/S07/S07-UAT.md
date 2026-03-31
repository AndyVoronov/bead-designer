# S07: Интеграция + деплой — UAT

**Milestone:** M001
**Written:** 2026-03-31

## UAT Type

- UAT mode: live-runtime
- Why this mode is sufficient: This slice delivers operational deployment — the proof is that a real browser on the real internet can reach the application and all routes respond correctly. No artifact-driven or human-experience tests can substitute for live runtime verification.

## Preconditions

- VPS at 89.111.175.54 is running and accessible via SSH
- PostgreSQL is running on the VPS with `beaddesigner` database
- PM2 process `bead-designer` is online
- Nginx is running and proxying port 80 to localhost:3000
- Database is seeded with 8 templates
- ADMIN_PASSWORD is set to `aCvwMMtFzEwtSNdaI9Ia` on VPS

## Smoke Test

```
curl -s -o /dev/null -w '%{http_code}' http://89.111.175.54/
```
Expected: **200** — if this returns 200, the entire deployment pipeline (Nginx → Next.js → static page rendering) is working.

## Test Cases

### 1. Public page accessibility

1. Open `http://89.111.175.54/` in browser
2. **Expected:** Main page loads with 3D bead designer interface, template gallery visible

### 2. Editor page loads

1. Navigate to `http://89.111.175.54/editor`
2. **Expected:** Editor page loads with 3D canvas, glass-morphism toolbar (Каталог/Удалить/Сброс)

### 3. Design sharing via URL

1. Navigate to `http://89.111.175.54/design/N4IgbglgNiBcCMA0IAY2QFADgQxgFwCcATEA` (any valid design code)
2. **Expected:** Design page loads, attempts to deserialize the design code, shows editor

### 4. Public API returns data

1. `curl http://89.111.175.54/api/templates`
2. **Expected:** JSON array with 8 templates, each having id, name, designCode, beadCount, isApproved fields. HTTP 200.

### 5. Orders API returns data

1. `curl http://89.111.175.54/api/orders`
2. **Expected:** JSON array (may be empty). HTTP 200.

### 6. Admin panel redirects without auth

1. Navigate to `http://89.111.175.54/admin`
2. **Expected:** Redirected (307) to `/admin/login`

### 7. Admin login — wrong password

1. `curl -X POST http://89.111.175.54/api/admin/auth -H 'Content-Type: application/json' -d '{"password":"wrong"}'`
2. **Expected:** HTTP 401 Unauthorized

### 8. Admin login — correct password

1. `curl -c /tmp/cookies.txt -X POST http://89.111.175.54/api/admin/auth -H 'Content-Type: application/json' -d '{"password":"aCvwMMtFzEwtSNdaI9Ia"}'`
2. **Expected:** HTTP 200, admin_token cookie set in /tmp/cookies.txt

### 9. Admin API accessible with cookie

1. `curl -b /tmp/cookies.txt http://89.111.175.54/api/admin/templates`
2. **Expected:** JSON array with templates (including unapproved). HTTP 200.

### 10. Admin template management page

1. After logging in, navigate to `http://89.111.175.54/admin/templates`
2. **Expected:** Admin template management page loads with list of templates, create/approve/delete controls

### 11. PM2 process health

1. `ssh root@89.111.175.54 "pm2 status"`
2. **Expected:** bead-designer process shows status "online", memory usage reasonable (<300MB)

### 12. Database connectivity

1. `ssh root@89.111.175.54 "su - postgres -c 'psql -d beaddesigner -c \"SELECT count(*) FROM \\\"Template\\\"\"'"`
2. **Expected:** Returns 8 (number of seeded templates)

## Edge Cases

### Server restart resilience

1. `ssh root@89.111.175.54 "pm2 restart bead-designer"`
2. Wait 5 seconds
3. `curl -s -o /dev/null -w '%{http_code}' http://89.111.175.54/`
4. **Expected:** 200 — application recovers after restart

### Concurrent requests

1. Run `curl http://89.111.175.54/api/templates` 5 times simultaneously
2. **Expected:** All return 200 with valid JSON (no connection errors or timeouts)

### Admin session isolation

1. After logging in (Test 8), access `/api/admin/templates` with cookie
2. Then access `/api/admin/templates` without cookie (fresh curl)
3. **Expected:** With cookie → 200, without cookie → 401

## Failure Signals

- **502 Bad Gateway** from Nginx → Next.js process crashed or not running
- **500 Internal Server Error** on API routes → Prisma client hash mismatch (check symlinks) or database connection failure
- **Connection refused** → PM2 not running or Nginx not started
- **PM2 status shows "errored"** → Check `pm2 logs bead-designer --err --lines 20`
- **Empty response from /api/templates** → Database not seeded, run `npx prisma db seed`

## Not Proven By This UAT

- **HTTPS/SSL** — SSL certificate not yet obtained. Application runs on HTTP only.
- **Real mobile FPS** — Requires HTTPS and a physical mobile device. Not tested in this slice.
- **Order creation via browser** — API endpoint works but full browser flow (3D editor → add beads → click "Заказать" → Telegram) not tested on deployed version.
- **Template loading in 3D editor** — API returns templates but the full flow of loading a template into the editor and seeing beads rendered in 3D on mobile not verified on production.
- **PM2 auto-restart after VPS reboot** — `pm2 save` and `pm2 startup` not yet configured.
- **Memory stability under load** — Single-request tests don't prove memory leak absence.

## Notes for Tester

- The application is currently accessible via HTTP only (no HTTPS). SSL cert pending.
- Admin password is set to `aCvwMMtFzEwtSNdaI9Ia`. This is the production password — do not share.
- VPS has 2GB RAM. If the app becomes unresponsive, check memory: `ssh root@89.111.175.54 "free -m"`.
- Turbopack hashed module symlinks may break on rebuild. If API routes return 500 after redeployment, recreate symlinks: `cd /opt/bead-designer/node_modules/@prisma && ln -sf client client-$(grep -o 'prisma/client-[a-z0-9]*' .next/server/chunks/*.js | head -1 | sed 's|prisma/client-||') && cd /opt/bead-designer/node_modules && ln -sf pg pg-$(grep -o 'pg-[a-z0-9]*' .next/server/chunks/*.js | head -1 | sed 's|pg-||')`.
- Domain `thekidsdream.ru` has DNS A record pointing to 89.111.175.54 but certbot hasn't been run yet.

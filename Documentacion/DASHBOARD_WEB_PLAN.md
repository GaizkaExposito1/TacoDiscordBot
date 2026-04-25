# 🖥️ Plan: Dashboard Web — TacoManagment

> Estado: **DEFINITIVO** — decisión final: React + Vite.
> Última revisión: 24 mar 2026

---

## 1. Decisiones adoptadas

| # | Pregunta | Decisión |
|---|---|---|
| D1 | ¿Uno o varios servidores? | **Multi-guild desde el inicio.** La sesión y todas las queries soportan múltiples guilds. Actualmente 1 |
| D2 | ¿Solo lectura o edición? | **Edición completa.** PATCH de config, cambio de estado en sugerencias, revocar sanciones |
| D3 | ¿Dónde vive? | **Proceso separado.** Carpeta `TacoManagment/dashboard/` con dos subcarpetas: `server/` y `client/` |
| D4 | ¿Frontend? | **React 19 + Vite + Tailwind CSS.** SPA — Express solo sirve JSON. Build output servido por Express en producción |
| D5 | ¿Quién accede? | **Op** = acceso total. **Admin** = stats + historial + gestionar sugerencias. **Mod** = ver sanciones y tickets |
| D6 | ¿Entorno? | **Local** (`localhost`) y **producción** (IP pública del VPS). Dos archivos `.env`. Guía de instalación incluida |

---

## 2. Stack tecnológico

### Backend — `dashboard/server/`
| Paquete | Uso |
|---|---|
| `express` ^5 | Servidor HTTP y rutas API REST |
| `better-sqlite3` ^12 | Leer/escribir `bot/data/taco.db` (WAL mode, safe concurrente) |
| `jsonwebtoken` ^9 | Firmar y verificar sesión JWT tras OAuth2 |
| `cookie-parser` ^1.4 | Leer cookie httpOnly del JWT |
| `helmet` ^8 | Cabeceras de seguridad (CSP, HSTS, etc.) |
| `cors` ^2.8 | CORS solo desde el origen del cliente React |
| `express-rate-limit` ^7 | Anti-brute-force en `/auth` y `/api` |
| `envalid` ^8 | Validación de variables de entorno al arrancar |
| `dotenv` ^16 | Carga de `.env` |

Node 18+ → `fetch` nativo, sin `node-fetch` ni `axios`.

### Frontend — `dashboard/client/`
| Paquete | Uso |
|---|---|
| `react` ^19 + `react-dom` | UI |
| `vite` ^6 | Dev server + build |
| `react-router-dom` ^7 | Routing SPA |
| `tailwindcss` ^4 | Estilos utility-first |
| `@tanstack/react-query` ^5 | Fetching, cache y estado del servidor |
| `recharts` ^2 | Gráficos de actividad |
| `lucide-react` | Iconos |

---

## 3. Estructura de archivos

```
TacoManagment/
├── bot/                              ← Bot existente (no se toca)
│   └── data/taco.db                  ← BD compartida
│
└── dashboard/
    ├── server/                       ← API Express (Node.js)
    │   ├── package.json
    │   ├── .env.local
    │   ├── .env.production
    │   ├── .gitignore
    │   ├── server.js                 ← Entry point Express
    │   ├── config/
    │   │   └── env.js                ← Validación envalid
    │   ├── db/
    │   │   └── index.js              ← Conexión a taco.db
    │   ├── middleware/
    │   │   ├── auth.js               ← Verifica JWT → req.user
    │   │   └── requireLevel.js       ← requireLevel('op'|'admin'|'mod')
    │   └── routes/
    │       ├── auth.js               ← /auth/login  /auth/callback  /auth/logout
    │       ├── stats.js              ← GET /api/stats
    │       ├── sanctions.js          ← GET /api/sanctions  PATCH /api/sanctions/:id
    │       ├── tickets.js            ← GET /api/tickets
    │       ├── suggestions.js        ← GET /api/suggestions  PATCH /api/suggestions/:id/status
    │       ├── config.js             ← GET /api/config  PATCH /api/config
    │       └── session.js            ← PATCH /api/session/guild  GET /api/me
    │
    └── client/                       ← SPA React + Vite
        ├── package.json
        ├── vite.config.ts
        ├── tailwind.config.ts
        ├── index.html
        └── src/
            ├── main.tsx
            ├── App.tsx               ← Router + AuthGuard
            ├── api/                  ← Funciones fetch a /api/*
            │   ├── client.ts         ← fetch base con manejo de errores
            │   ├── stats.ts
            │   ├── sanctions.ts
            │   ├── tickets.ts
            │   ├── suggestions.ts
            │   └── config.ts
            ├── hooks/
            │   └── useAuth.ts        ← Contexto de usuario/sesión
            ├── components/
            │   ├── Layout.tsx        ← Sidebar + Navbar + outlet
            │   ├── Sidebar.tsx
            │   ├── Navbar.tsx        ← Selector de guild, avatar, logout
            │   ├── StatCard.tsx
            │   ├── DataTable.tsx     ← Tabla genérica con paginación y filtros
            │   ├── Badge.tsx         ← Badges tipo/estado de sanciones
            │   └── ConfirmModal.tsx  ← Modal de confirmación de acciones
            └── pages/
                ├── Login.tsx         ← Pantalla de login con botón Discord
                ├── Dashboard.tsx     ← Stats generales + gráfico actividad
                ├── Moderation.tsx    ← Tabla sanciones + filtros
                ├── Tickets.tsx       ← Tabla tickets + filtros
                ├── Suggestions.tsx   ← Lista sugerencias + cambio estado
                └── Config.tsx        ← Formularios config (solo Op)
```

---

## 4. Flujo de autenticación OAuth2

```
1. Usuario abre http://localhost:4000  (React SPA)
   → useAuth detecta que no hay sesión → redirect a /login

2. Click "Entrar con Discord"
   → window.location = /auth/login (Express)
   → Express redirige a discord.com/oauth2/authorize
       ?client_id=...&scope=identify+guilds&redirect_uri=CALLBACK_URL&state=CSRF_TOKEN

3. Discord → /auth/callback?code=ABC&state=XYZ (Express)
   → Verificar state anti-CSRF
   → POST discord.com/api/oauth2/token → access_token
   → GET discord.com/api/users/@me → userId, username, avatar
   → Para cada guild gestionado: comprobar roles del usuario → nivel (op/admin/mod)
   → Firmar JWT: { userId, username, avatar, guilds, activeGuildId }
   → Cookie httpOnly; SameSite=Strict; Max-Age=TTL
   → Redirect a http://localhost:5173 (dev) o / (producción)

4. React llama GET /api/me → Express descomprime JWT → devuelve user JSON
   → useAuth guarda en contexto
   → AuthGuard decide qué páginas renderizar
```

**En producción:** Express sirve el build de React (`client/dist/`) como archivos estáticos. Todo desde el mismo puerto. Sin CORS.

**En desarrollo:** Vite corre en `:5173`, Express en `:4001`. Vite proxy reenvía `/api` y `/auth` a Express. Sin CORS complejo.

---

## 5. Variables de entorno

### `dashboard/server/.env.local`
```env
NODE_ENV=development
PORT=4001

DISCORD_CLIENT_ID=TU_CLIENT_ID
DISCORD_CLIENT_SECRET=TU_CLIENT_SECRET
DISCORD_CALLBACK_URL=http://localhost:4001/auth/callback
CLIENT_ORIGIN=http://localhost:5173

JWT_SECRET=string-largo-aleatorio-minimo-32-chars
SESSION_TTL=86400

BOT_DB_PATH=../../bot/data/taco.db
```

### `dashboard/server/.env.production`
```env
NODE_ENV=production
PORT=4000

DISCORD_CLIENT_ID=TU_CLIENT_ID
DISCORD_CLIENT_SECRET=TU_CLIENT_SECRET
DISCORD_CALLBACK_URL=http://TU_IP:4000/auth/callback
CLIENT_ORIGIN=http://TU_IP:4000

JWT_SECRET=string-diferente-produccion-muy-largo
SESSION_TTL=86400

BOT_DB_PATH=/ruta/absoluta/vps/TacoManagment/bot/data/taco.db
```

**Configuración en Discord Developer Portal (una sola vez):**
- OAuth2 → Redirects → añadir `http://localhost:4001/auth/callback` y `http://TU_IP:4000/auth/callback`
- Scopes necesarios: `identify` + `guilds`

---

## 6. Niveles de acceso por pantalla

| Pantalla / Acción | `mod` | `admin` | `op` |
|---|---|---|---|
| Dashboard (stats generales) | ✅ | ✅ | ✅ |
| Ver historial de sanciones | ✅ | ✅ | ✅ |
| Revocar sanción | ❌ | ✅ | ✅ |
| Ver historial de tickets | ✅ | ✅ | ✅ |
| Ver sugerencias | ✅ | ✅ | ✅ |
| Cambiar estado de sugerencia | ❌ | ✅ | ✅ |
| Ver sección Config | ❌ | ❌ | ✅ |
| Editar configuración | ❌ | ❌ | ✅ |
| Cambiar guild activo | ✅ | ✅ | ✅ |

---

## 7. API endpoints

```
GET  /api/me                              → Usuario actual de la sesión
PATCH /api/session/guild                  → { guildId } cambia guild activo en JWT
GET  /api/health                          → { status, db } pública

GET  /api/stats                           → Conteos generales (tickets, sanciones, sugerencias)
GET  /api/stats/activity?days=30          → Actividad diaria para el gráfico

GET  /api/sanctions?type=&status=&page=&q=   → Lista paginada, filtrada
PATCH /api/sanctions/:id                  → { status: 'revoked' } — Admin+

GET  /api/tickets?status=&dept=&page=    → Lista paginada, filtrada

GET  /api/suggestions?status=&page=      → Lista paginada
PATCH /api/suggestions/:id/status        → { status } — Admin+

GET  /api/config                          → Config del guild activo — Op
PATCH /api/config                         → { section, data } con whitelist — Op
```

---

## 8. Seguridad

| Capa | Implementación |
|---|---|
| Autenticación | OAuth2 Discord — sin contraseñas propias |
| Anti-CSRF | `state` aleatorio en cookie temporal durante OAuth2 |
| Sesión | JWT en cookie `httpOnly; SameSite=Strict` |
| Headers HTTP | `helmet()` — CSP, HSTS, X-Frame-Options |
| Rate limiting | `/auth/*` 10 req/15min · `/api/*` 100 req/min por IP |
| SQL injection | 100% prepared statements — cero concatenación SQL |
| XSS | React escapa por defecto. Nunca `dangerouslySetInnerHTML` con datos externos |
| Config PATCH | Whitelist estricta de campos — nunca `Object.assign(config, body)` |
| IDs Discord | Siempre `string` — validar con `/^\d+$/` antes de usar |

---

## 9. Roadmap de implementación

### Fase 1 — Scaffolding + Auth ✅ En progreso
- [x] Rama `feature/dashboard-web`
- [ ] `dashboard/server/`: package.json, env.js, server.js, db/index.js
- [ ] `routes/auth.js`: login redirect → callback → JWT → cookie
- [ ] `middleware/auth.js` y `requireLevel.js`
- [ ] `GET /api/me` y `GET /api/health`
- [ ] `dashboard/client/`: Vite + React + Tailwind + proxy config
- [ ] `Login.tsx` con botón Discord
- [ ] `useAuth` hook + AuthGuard + Layout

### Fase 2 — API de datos
- [ ] `routes/stats.js`: conteos y actividad diaria
- [ ] `routes/sanctions.js`: GET paginado + PATCH revocar
- [ ] `routes/tickets.js`: GET paginado
- [ ] `routes/suggestions.js`: GET paginado + PATCH estado
- [ ] `routes/config.js`: GET + PATCH con whitelist

### Fase 3 — Páginas React
- [ ] `Dashboard.tsx`: StatCards + gráfico Recharts
- [ ] `Moderation.tsx`: DataTable + filtros + botón revocar
- [ ] `Tickets.tsx`: DataTable + filtros
- [ ] `Suggestions.tsx`: cards + modal cambio estado
- [ ] `Config.tsx`: formularios por sección

### Fase 4 — Multi-guild + pulido
- [ ] Selector de guild en Navbar
- [ ] `PATCH /api/session/guild`
- [ ] Modo producción: Express sirve `client/dist/`
- [ ] Scripts `npm run build` y `npm start` en producción

### Fase 5 — Guía de instalación
- [ ] `dashboard/README_INSTALL.md` completo (local + VPS con PM2)

---

## 10. Notas de arquitectura

- **SQLite WAL**: permite múltiples lectores + 1 escritor. El dashboard y el bot comparten la BD sin conflictos para el volumen esperado.
- **IDs Discord como BigInt**: guardar y transmitir siempre como `string`. En React nunca convertir a `Number`.
- **Sin WebSockets en v1**: stats con polling manual (React Query `refetchInterval`). WebSockets en versión futura.
- **HTTPS futuro**: si se añade dominio + Certbot, cambiar cookie a `Secure` y actualizar URLs. Documentado en README.
- **Build en producción**: `cd client && npm run build` genera `client/dist/`. Express lo sirve con `express.static('client/dist')` y un catch-all para el router de React.


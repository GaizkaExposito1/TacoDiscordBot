# 🖥️ Plan: Dashboard Web — TacoManagment

> Estado: **DEFINITIVO** — todas las decisiones de diseño tomadas.
> Última revisión: 24 mar 2026

---

## 1. Decisiones adoptadas

| # | Pregunta | Decisión |
|---|---|---|
| D1 | ¿Uno o varios servidores? | **Multi-guild desde el inicio.** Actualmente 1 guild, pero la sesión y todas las queries soportan múltiples desde el día 1 |
| D2 | ¿Solo lectura o edición? | **Edición completa.** Incluye PATCH de config, cambio de estado en sugerencias, etc. |
| D3 | ¿Dónde vive el dashboard? | **Proceso separado.** Carpeta `TacoManagment/dashboard/` en la misma máquina, arranca independiente |
| D4 | ¿Frontend? | **EJS (SSR) + Bootstrap 5 CDN + vanilla JS.** Sin build step, sin dependencias de frontend. Express renderiza las páginas directamente |
| D5 | ¿Quién accede? | **Op = acceso total. Admin = ver stats + historial + gestionar sugerencias, sin editar config. Mod = ver historial de sanciones y tickets propios** |
| D6 | ¿Entorno? | **Local (localhost) y producción (IP pública de VPS).** Dos archivos `.env`. Incluye guía de instalación completa en ambos |

---

## 2. Stack tecnológico

### Backend (proceso `dashboard/`)
| Paquete | Versión | Uso |
|---|---|---|
| `express` | ^5 | Servidor HTTP, rutas, serve de vistas EJS |
| `ejs` | ^3 | Plantillas SSR — Express lo soporta nativamente |
| `better-sqlite3` | ^12 | Leer/escribir la misma BD del bot (WAL mode = safe) |
| `jsonwebtoken` | ^9 | Firmar y verificar sesión tras OAuth2 |
| `cookie-parser` | ^1.4 | Leer cookies del JWT |
| `helmet` | ^8 | Cabeceras de seguridad HTTP (CSP, HSTS, etc.) |
| `cors` | ^2.8 | CORS restrictivo (mismo origen) |
| `express-rate-limit` | ^7 | Anti-brute-force en `/auth` y `/api` |
| `winston` | ^3 | Log de accesos HTTP |
| `dotenv` | ^16 | Variables de entorno |

Node 18+ tiene `fetch` nativo → no se instala `node-fetch` ni `axios`.

### Frontend
- EJS renderizado por Express (sin build)
- **Bootstrap 5.3** vía CDN (estilos + JS)
- **Chart.js** vía CDN (gráficos de actividad)
- Vanilla JS para llamadas fetch a la API propia
- Tema oscuro usando variables CSS de Bootstrap

---

## 3. Estructura de archivos

```
TacoManagment/
├── bot/                          ← Bot existente (no se toca)
│   └── data/taco.db              ← BD compartida (WAL mode, leer/escribir safe)
│
└── dashboard/                    ← Proceso independiente NUEVO
    ├── package.json
    ├── .env.local                 ← Variables para desarrollo local
    ├── .env.production            ← Variables para el VPS
    ├── .gitignore                 ← Ignorar .env.*, node_modules/
    ├── server.js                  ← Entry point: arranca Express
    ├── README_INSTALL.md          ← Guía de instalación completa
    │
    ├── config/
    │   └── env.js                 ← Validación de variables con envalid
    │
    ├── db/
    │   └── index.js               ← Abre conexión a bot/data/taco.db (read/write)
    │
    ├── middleware/
    │   ├── auth.js                ← Verifica JWT de la cookie → req.user
    │   └── requireLevel.js        ← requireLevel('op'|'admin'|'mod')
    │
    ├── routes/
    │   ├── auth.js                ← GET /auth/login, /auth/callback, /auth/logout
    │   ├── pages.js               ← GET / /tickets /moderation /suggestions /config
    │   ├── api/
    │   │   ├── stats.js           ← GET /api/stats
    │   │   ├── sanctions.js       ← GET /api/sanctions  PATCH /api/sanctions/:id
    │   │   ├── tickets.js         ← GET /api/tickets
    │   │   ├── suggestions.js     ← GET /api/suggestions  PATCH /api/suggestions/:id/status
    │   │   └── config.js          ← GET /api/config  PATCH /api/config
    │
    └── views/                     ← Plantillas EJS
        ├── layout.ejs             ← Navbar, sidebar, Bootstrap imports
        ├── login.ejs              ← Página de login con botón Discord
        ├── index.ejs              ← Dashboard principal (stats + gráficos)
        ├── tickets.ejs            ← Tabla de tickets con filtros
        ├── moderation.ejs         ← Tabla de sanciones con filtros
        ├── suggestions.ejs        ← Lista de sugerencias con gestión
        ├── config.ejs             ← Formulario de configuración (solo Op)
        └── partials/
            ├── navbar.ejs
            ├── sidebar.ejs
            └── alerts.ejs
```

---

## 4. Flujo de autenticación OAuth2

```
1. Usuario abre http://<host>:<port>/
   → middleware detecta que no hay JWT válido
   → redirect a /login

2. Usuario hace click en "Entrar con Discord"
   → GET /auth/login
   → redirect a: https://discord.com/oauth2/authorize
       ?client_id=CLIENT_ID
       &redirect_uri=DASHBOARD_CALLBACK_URL
       &response_type=code
       &scope=identify%20guilds
       &state=<random CSRF token guardado en cookie temporal>

3. Discord redirige a /auth/callback?code=ABC&state=XYZ
   → Verificar state contra cookie (anti-CSRF)
   → POST a discord.com/api/oauth2/token para obtener access_token
   → GET discord.com/api/users/@me  → obtiene userId, username, avatar
   → GET discord.com/api/users/@me/guilds → lista de guilds del usuario

4. Para cada guild que el bot gestiona (según la BD):
   → Consultar guild_config para los role IDs (mod/admin/op)
   → Comparar contra los roles del usuario en ese guild vía Discord API
   → Determinar nivel: 'op' | 'admin' | 'mod' | sin acceso

5. Si tiene acceso en al menos un guild:
   → Firmar JWT: { userId, username, avatar, guilds: [{id, name, level}], activeGuildId }
   → Guardar en cookie httpOnly; SameSite=Strict; Max-Age=DASHBOARD_SESSION_TTL
   → Redirect a /

6. Rutas protegidas: middleware auth.js descomprime JWT → req.user
   requireLevel('op') → 403 si nivel insuficiente
```

**Nota multi-guild:** la sesión incluye todos los guilds con acceso. El usuario puede cambiar de guild activo con un selector en la navbar sin hacer login de nuevo (`PATCH /api/session/guild`).

---

## 5. Variables de entorno

### `dashboard/.env.local`
```env
NODE_ENV=development
DASHBOARD_PORT=4000

# Discord OAuth2
DISCORD_CLIENT_ID=TU_CLIENT_ID_AQUI
DISCORD_CLIENT_SECRET=TU_CLIENT_SECRET_AQUI
DASHBOARD_CALLBACK_URL=http://localhost:4000/auth/callback

# Seguridad
DASHBOARD_JWT_SECRET=cambia-esto-por-un-string-largo-y-aleatorio-minimo-32-chars
DASHBOARD_SESSION_TTL=86400

# Ruta a la BD del bot (relativa al dashboard/ o absoluta)
BOT_DB_PATH=../bot/data/taco.db
```

### `dashboard/.env.production`
```env
NODE_ENV=production
DASHBOARD_PORT=4000

DISCORD_CLIENT_ID=TU_CLIENT_ID_AQUI
DISCORD_CLIENT_SECRET=TU_CLIENT_SECRET_AQUI
DASHBOARD_CALLBACK_URL=http://TU_IP_DEL_VPS:4000/auth/callback

DASHBOARD_JWT_SECRET=string-muy-largo-y-aleatorio-diferente-al-de-desarrollo
DASHBOARD_SESSION_TTL=86400

BOT_DB_PATH=/ruta/absoluta/en/vps/TacoManagment/bot/data/taco.db
```

**Importante:** añadir `http://TU_IP_DEL_VPS:4000/auth/callback` a la lista de Redirects en [Discord Developer Portal](https://discord.com/developers/applications) → tu app → OAuth2.

---

## 6. Niveles de acceso por pantalla

| Pantalla / Acción | `mod` | `admin` | `op` |
|---|---|---|---|
| Ver dashboard (stats generales) | ✅ | ✅ | ✅ |
| Ver historial de sanciones | ✅ | ✅ | ✅ |
| Ver historial de tickets | ✅ | ✅ | ✅ |
| Ver sugerencias | ✅ | ✅ | ✅ |
| Cambiar estado de sugerencia | ❌ | ✅ | ✅ |
| Revocar sanción | ❌ | ✅ | ✅ |
| Ver sección `/config` | ❌ | ❌ | ✅ |
| Editar configuración del servidor | ❌ | ❌ | ✅ |
| Cambiar guild activo (multi-guild) | ✅ | ✅ | ✅ |

---

## 7. Pantallas y datos que muestra cada una

### `/` — Inicio
- Cards: tickets abiertos hoy / warns activos / bans activos / sugerencias pendientes
- Gráfico de línea (Chart.js): tickets + sanciones por día, últimos 30 días
- Top 5 usuarios más sancionados (tabla pequeña)
- Actividad reciente: últimas 5 sanciones y últimos 5 tickets

### `/moderation` — Sanciones
- Filtros: tipo (warn/timeout/kick/ban), estado (active/revoked/expired), rango fechas, buscar por user ID
- Tabla paginada (20 por página): id, usuario, moderador, tipo, razón, estado, fecha, expira
- Botón "Revocar" en filas activas (Admin+) → PATCH `/api/sanctions/:id` `{ status: 'revoked' }`
- Badge de color por tipo de sanción

### `/tickets` — Tickets
- Filtros: estado (open/claimed/closed), departamento, rango fechas
- Tabla paginada: id, usuario, departamento, estado, rating, fecha apertura/cierre
- Rating promedio por departamento (cards pequeñas arriba)
- Enlace al transcript si existe

### `/suggestions` — Sugerencias
- Filtros: estado (pending/accepted/denied/indev/implemented)
- Cards o tabla con contenido, usuario, votos, estado con color
- Botón de cambio de estado con modal de confirmación (Admin+)

### `/config` — Configuración (solo Op)
- Formulario dividido en secciones: Roles / Canales / Tickets / Moderación / Bienvenida
- Los campos muestran el ID actual y el nombre del rol/canal si está en caché
- Botón "Guardar" por sección → PATCH `/api/config` `{ section: 'roles', data: {...} }`
- Advertencia: "Los cambios también se reflejan en los comandos del bot de inmediato"

---

## 8. API endpoints

```
GET  /api/stats                         → Conteos generales para el dashboard
GET  /api/sanctions?type=&status=&page= → Lista paginada de sanciones
PATCH /api/sanctions/:id                → { status: 'revoked' } — Admin+
GET  /api/tickets?status=&dept=&page=  → Lista paginada de tickets
GET  /api/suggestions?status=&page=    → Lista paginada de sugerencias
PATCH /api/suggestions/:id/status      → { status: 'accepted'|... } — Admin+
GET  /api/config                        → Config actual del guild activo — Op
PATCH /api/config                       → { section, data } — Op
PATCH /api/session/guild                → { guildId } — Cambia guild activo en JWT
GET  /api/health                        → { status: 'ok', db: true } — Pública
```

---

## 9. Seguridad

| Capa | Implementación |
|---|---|
| Autenticación | OAuth2 Discord — sin contraseñas propias |
| Anti-CSRF | `state` aleatorio en cookie temporal durante el flujo OAuth2 |
| Sesión | JWT en cookie `httpOnly; SameSite=Strict`. En producción añadir `;Secure` |
| Headers HTTP | `helmet()` activa CSP, HSTS, X-Frame-Options, X-Content-Type |
| Rate limiting | `/auth/*` → 10 req/15min. `/api/*` → 100 req/min por IP |
| SQL injection | 100% prepared statements de `better-sqlite3`. Cero concatenación de strings SQL |
| XSS | EJS escapa HTML por defecto (`<%= %>` siempre, nunca `<%- %>` con input de usuario) |
| IDs de Discord | Siempre tratados como `string`. Validar que son numéricos con regex antes de usar |
| Config editable | Whitelist estricta de campos permitidos en PATCH — nunca `Object.assign(config, body)` |

---

## 10. Roadmap de implementación

### Fase 1 — Scaffolding y auth (base)
- [ ] Crear carpeta `dashboard/` con `package.json`, `.gitignore`, `config/env.js`
- [ ] `server.js`: Express + helmet + cors + cookie-parser + EJS + rate-limit
- [ ] `db/index.js`: conexión a `taco.db` reusando ruta de `BOT_DB_PATH`
- [ ] `routes/auth.js`: `/auth/login` → OAuth2 redirect, `/auth/callback` → JWT, `/auth/logout`
- [ ] `middleware/auth.js` y `middleware/requireLevel.js`
- [ ] Vista `views/login.ejs` con botón Discord
- [ ] Ruta `/api/health` pública para test de arranque

### Fase 2 — API de datos
- [ ] `routes/api/stats.js`: queries de conteo para el panel
- [ ] `routes/api/sanctions.js`: GET paginado + PATCH revocar
- [ ] `routes/api/tickets.js`: GET paginado
- [ ] `routes/api/suggestions.js`: GET paginado + PATCH estado
- [ ] `routes/api/config.js`: GET + PATCH con whitelist

### Fase 3 — Frontend (vistas EJS)
- [ ] `views/layout.ejs`: navbar + sidebar + Bootstrap 5 CDN + Chart.js CDN
- [ ] `views/index.ejs`: cards de stats + gráfico actividad + actividad reciente
- [ ] `views/moderation.ejs`: tabla sanciones con filtros y paginación
- [ ] `views/tickets.ejs`: tabla tickets con filtros
- [ ] `views/suggestions.ejs`: cards/tabla sugerencias + modal cambio estado
- [ ] `views/config.ejs`: formularios por sección (solo Op)
- [ ] `routes/pages.js`: rutas GET que renderizan las vistas y pasan datos iniciales

### Fase 4 — Multi-guild
- [ ] Selector de guild en navbar
- [ ] `PATCH /api/session/guild` → reemite JWT con nuevo `activeGuildId`
- [ ] Verificar que el usuario tiene acceso al guild solicitado antes de cambiar

### Fase 5 — Hardening y preparación de entorno
- [ ] Logging de accesos HTTP con Morgan o Winston
- [ ] Scripts de arranque: `npm start` (producción) y `npm run dev` (con `--watch`)
- [ ] `README_INSTALL.md` con guía completa (ver sección 11)
- [ ] Verificar compatibilidad WAL con escrituras concurrentes bot+dashboard

---

## 11. Guía de instalación (se incluirá en `dashboard/README_INSTALL.md`)

### Requisitos previos
- Node.js 18+
- Bot ya funcionando en `TacoManagment/bot/` con la BD en `bot/data/taco.db`
- Acceso al [Discord Developer Portal](https://discord.com/developers/applications)

### Paso 1 — Discord Developer Portal
1. Abre tu aplicación en developer.discord.com
2. Ve a **OAuth2** → **Redirects**
3. Añade `http://localhost:4000/auth/callback` (para local)
4. Añade `http://TU_IP:4000/auth/callback` (para producción)
5. Copia el **Client ID** y el **Client Secret** (OAuth2 → General)

### Paso 2 — Instalación local
```bash
cd TacoManagment/dashboard
npm install
cp .env.local.example .env.local
# Editar .env.local con tus valores
npm run dev
# Dashboard disponible en http://localhost:4000
```

### Paso 3 — Instalación en VPS (Ubuntu/Debian)
```bash
# En el VPS, asumiendo que el repo está en /opt/TacoManagment
cd /opt/TacoManagment/dashboard
npm install --omit=dev

# Crear el archivo de entorno de producción
cp .env.production.example .env.production
nano .env.production   # Editar con tus valores reales

# Instalar PM2 si no está instalado
npm install -g pm2

# Arrancar el dashboard con PM2
pm2 start server.js --name "taco-dashboard" --env production

# Guardar la lista de procesos de PM2 (sobrevive reinicios)
pm2 save
pm2 startup   # Sigue las instrucciones que imprime

# Ver logs
pm2 logs taco-dashboard
```

### Paso 4 — Abrir el puerto en el VPS
```bash
# Si usas ufw (Ubuntu)
sudo ufw allow 4000/tcp
sudo ufw reload

# Verificar que el dashboard responde
curl http://TU_IP:4000/api/health
# Respuesta esperada: {"status":"ok","db":true}
```

### Acceso
- **Local**: `http://localhost:4000`
- **VPS**: `http://TU_IP_PUBLICA:4000`

### Actualizar el dashboard (VPS)
```bash
cd /opt/TacoManagment
git pull
cd dashboard
npm install --omit=dev
pm2 restart taco-dashboard
```

---

## 12. Notas finales de arquitectura

- **SQLite + WAL**: El bot abre la BD en WAL mode. El dashboard abre la misma BD también en WAL mode. SQLite WAL permite múltiples lectores concurrentes y un solo escritor. El dashboard hará escrituras puntuales (revocar sanción, cambiar estado sugerencia, editar config) que duran microsegundos — la contención con el bot es despreciable para el volumen esperado.
- **IDs de Discord como BigInt**: El bot los guarda como `TEXT` en SQLite. En el frontend nunca transformar a `Number` — siempre `String`. En JSON del API siempre como string.
- **Sin caché de nombres de usuario/roles**: Discord no permite consultar nombres de usuario anónimamente sin el bot activo. El dashboard mostrará IDs con la opción de buscar en Discord si el usuario quiere. Esto se puede mejorar en el futuro guardando un caché básico en la BD.
- **Sin WebSockets en v1**: Las stats no se actualizan en tiempo real. El usuario recarga la página. Se puede añadir SSE o WebSockets en una versión posterior.
- **HTTPS en producción**: Si en el futuro se añade un dominio + Certbot/Caddy, cambiar la cookie a `Secure` y actualizar `DASHBOARD_CALLBACK_URL` a `https://`. Documentado en el README de instalación.


# 📋 Mejoras — TacoManagment Bot

Registro completo de features implementadas y propuestas pendientes, organizado por módulo.

---

## ✅ IMPLEMENTADO

### 🏗️ Infraestructura y Técnico
- **Migración BD** — `sql.js` → `better-sqlite3`. Escritura síncrona, modo WAL, sin archivos `.db-journal`.
- **Logging estructurado** — Winston con niveles y rotación de archivos en `logs/`.
- **Validación de entorno** — `src/config/env.js` con `envalid`. Fallo explícito al arrancar si falta variable crítica.
- **Estado dinámico del bot** — Dev/Test → "En Mantenimiento"; Producción → "Watching Tickets" (`ready.js`).
- **Manejo global de errores** — `processHandler.js` captura `uncaughtException` y `unhandledRejection` con logging y salida controlada.
- **Sistema de migraciones versionado** — Array `MIGRATIONS[]` con tabla `schema_version`. Detecta DBs existentes via `LEGACY_VERSION`. Aplica solo migraciones pendientes al arrancar.
- **Backup automático de BD** — `scripts/backup_db.js` copia la BD con timestamp al arrancar y cada 24h. Rotación automática de los últimos 5 días. Disponible también con `npm run backup`.

### 🎫 Tickets
- **Transcripciones HTML por DM** — Al cierre, el usuario recibe el transcript HTML adjunto por DM. Si el DM falla (privacidad), el cierre continúa igualmente.
- **Auto-cierre por inactividad** — `/tickets config auto-close <horas>`. Checker cada 15 min via `messageCreate`. 0 = desactivado.
- **Reclamación de ticket** — Botones `ticket_claim`/`ticket_unclaim`. Restringe acceso al canal al claimer, actualiza embed en tiempo real, registra en auditoría. También disponible como slash command.
- **Rating de atención** — DM automático con botones 1–5 estrellas al cerrar. Modal de feedback opcional. Consultable con `/tickets ratings`. Guardado en BD.
- **Límite de tickets por usuario** — `/tickets config max-tickets <N>` (1–10). Verificado en `openTicket()`.
- **Departamentos con formularios** — Select menu en el panel, formularios modales personalizables por departamento con múltiples preguntas (`form_json`).
- **Contador global o por categoría** — Configurable con `/tickets config contador`.

### 🛡️ Moderación
- **Warn acumulativo con acción automática** — `/moderation warn-config umbral accion [duracion]`. Al alcanzar X warns activos: timeout/kick/ban automático. Solo Op puede configurar.
- **Expiración automática de warns** — Parámetro `expiracion` opcional en `/moderation warn` (ej: `7d`, `30d`). Checker cada 10 min (`warnExpirationChecker.js`). Los warns expirados no cuentan para el umbral. Historial muestra la fecha de expiración.
- **Tempban con desbaneo automático** — `/moderation ban` con duración opcional. `tempbanChecker.js` desbaneá cada minuto y marca la sanción como `expired` en el historial.
- **Slow mode** — `/moderation slowmode <canal> <segundos>`. Mod+. 0 = desactivar. Máximo 6h (21600s).
- **Rol de Silenciado** — Se asigna automáticamente al aplicar timeout. Se retira al expirar o al revocar la sanción. Los silenciados pueden escribir en sus propios tickets.
- **Timeout permanente** — Se reaaplica automáticamente cada vez que el límite de 28 días de Discord expira (`permTimeoutChecker.js`).
- **Historial de sanciones** — Tabla `sanctions` con tipo, razón, duración, estado y fecha. Consultable con `/moderation history`.

### 🔍 Auditoría
- **Logs automáticos por evento** — Borrado/edición de mensajes, cambios de roles, entradas/salidas de miembros, creación/borrado de canales y roles.
- **Toggle individual** — `/audit toggle` activa/desactiva cada tipo de evento por separado.
- **Expediente por usuario** — `/audit lookup` muestra sanciones + historial de tickets con enlaces a transcripciones.

### 📢 Sugerencias
- **Flujo completo de estados** — Pendiente → Aceptada / Denegada / En Desarrollo / Implementada.
- **Anuncio automático al marcar "Implementada"** — Se publica en el canal de novedades configurado.
- **Votación automática** — ✅/❌ al publicar la sugerencia.

### 📊 Encuestas
- **Encuestas nativas de Discord** — `/poll create` con múltiples opciones, emoji, descripción, duración y opción de multivoto. Admin+.
- **Gestión completa** — `/poll end`, `/poll results`, `/poll list`, `/poll clear`.
- **Visibilidad configurable** — Pública o solo staff.

### 👋 Bienvenida
- **Mensajes personalizables** — Variables `{user}`, `{username}`, `{server}`, `{member_count}`. Bienvenida y despedida independientes.
- **Auto-roles al entrar** — Lista configurable de roles que se asignan automáticamente.
- **Vista previa** — `/moderation bienvenida-vista` muestra el mensaje sin publicarlo de verdad.

### ⚙️ Administración
- **Panel de configuración unificado** — `/config` (solo Op) muestra en un único embed: roles, canales, tickets, bienvenida, auto-roles, warns y auditoría.
- **Sistema de permisos por nivel** — Mod / Admin / Op. Configurable con `/moderation setup-roles`.

---

## 🔲 PENDIENTE DE IMPLEMENTAR

### 🎫 Tickets

- **Categoría y rol de staff por departamento** — Actualmente todos los departamentos comparten una sola categoría de Discord y un solo rol de staff. Propuesta: añadir `discord_category_id` y `staff_role_id` a la tabla `departments` para que cada departamento pueda tener los suyos, con fallback al global.
  *Dificultad: Media.*

- **Notas internas de ticket** — `/tickets note <texto>`. Solo visible para staff dentro del canal. Incluida en el transcript marcada como `[NOTA INTERNA]`; excluida del DM al usuario. Requiere tabla `ticket_notes`.
  *Dificultad: Media.*

- **Reapertura de ticket cerrado** — Botón `ticket_reopen_<id>` en el canal de logs (solo staff). Crea un nuevo canal vinculado al ticket original via columna `parent_ticket_id`. El transcript incluye enlace al historial previo. Persistir en BD para sobrevivir reinicios.
  *Dificultad: Media-Alta.*

- **Prioridad de tickets** — Alta / Media / Baja, asignable al abrir o por el staff. Se refleja en el nombre del canal (🔴 / 🟡 / 🟢) y en el embed. Requiere columna `priority` en `tickets`.
  *Dificultad: Baja-Media.*

- **Plantillas de respuesta rápida** — `/tickets respuesta <nombre>` inserta un mensaje predefinido configurado por Op. Tabla `ticket_templates (guild_id, name, content)`.
  *Dificultad: Baja.*

- **Reasignación de ticket** — `/tickets asignar @staff` para transferir la reclamación sin pasar por unclaim + claim. Registra en auditoría.
  *Dificultad: Baja.*

---

### 🛡️ Moderación

- **Lock/Unlock de canal** — `/moderation lock [#canal] [razon]` deniega `SendMessages` a `@everyone`. `/moderation unlock` lo revierte. Publica un embed informativo en el canal. Nivel Mod+. Sin cambios en BD.
  *Dificultad: Baja (~60 líneas, patrón idéntico a `slowmode.js`).*

- **Purge por usuario** — Añadir opción `usuario` a `chat-clear` para borrar solo los mensajes de un miembro concreto en el canal (hasta 14 días, límite de Discord).
  *Dificultad: Baja.*

- **Anti-spam básico** — Detectar X mensajes en Y segundos del mismo usuario y aplicar silencio automático. Umbrales configurables por Op. Ventana en memoria (sin BD).
  *Dificultad: Media.*

- **Filtro de palabras** — Lista negra configurable por Op (`/moderation filtro add|remove|list`). El bot elimina el mensaje y avisa al usuario; opcionalmente registra en auditoría. Tabla `word_filters (guild_id, word)`.
  *Dificultad: Media.*

- **Notas de usuario** — `/moderation note <usuario> <texto>`. Anotaciones privadas del staff sin crear una sanción formal. Visibles en `/moderation history`. Tabla `user_notes`.
  *Dificultad: Baja.*

- **Sanciones de voz** — `/moderation voice-mute @user` (server mute) y `/moderation voice-deafen @user` (server deafen) con razón y registro en historial.
  *Dificultad: Baja.*

- **Sistema de apelaciones de ban** — Al banear, el bot intenta enviar un DM con formulario de apelación. La respuesta llega a un canal configurable con embed de revisión para el staff. Requiere tabla `ban_appeals`.
  *Dificultad: Alta.*

- **Dashboard de moderación** — `/moderation stats [usuario] [periodo]` con total de warns, bans, kicks y timeouts aplicados por un moderador o en el servidor, filtrable por período.
  *Dificultad: Baja (solo queries SQL y embed).*

---

### 🔔 Auditoría (ampliación)

- **Logs de voz** — Registrar entradas/salidas de canales de voz y movimientos entre salas en el canal de auditoría. Listener `voiceStateUpdate`. Toggle individual como el resto de eventos.
  *Dificultad: Baja.*

- **Log de invitaciones** — Registrar qué invitación usó cada nuevo miembro y quién la creó. Requiere caché de invitaciones al arrancar y listener combinado de `inviteCreate` + `guildMemberAdd`.
  *Dificultad: Media.*

---

### 📢 Sugerencias

- **Estadísticas de sugerencias** — `/suggestions stats [periodo]`. Conteos por estado (aceptadas, denegadas, en desarrollo, pendientes) con porcentaje de resolución. Requiere verificar/añadir columna `resolved_at` en `suggestions`.
  *Dificultad: Baja.*

---

### ⚙️ General / Utilidad

- **Reaction roles / Button roles** — Panel con botones o menú de selección para auto-asignarse roles. Configurable por Op con `/roles-panel setup`. Tabla `role_panels`.
  *Dificultad: Media.*

- **Canales de estadísticas en vivo** — Voice channels que muestran en tiempo real: nº de miembros, tickets abiertos, etc. Actualizados con `setInterval` (mín. 5 min para respetar rate limits).
  *Dificultad: Baja-Media.*

- **Recordatorios** — `/reminder <tiempo> <texto>`. El bot manda un DM al usuario al cabo del tiempo indicado. BD persistente para sobrevivir reinicios. Tabla `reminders (user_id, guild_id, message, remind_at)`.
  *Dificultad: Baja.*

- **Anuncios programados** — `/announce schedule <#canal> <tiempo> <mensaje>`. Mensaje único programado para publicarse en el futuro. BD persistente. Tabla `scheduled_announcements`.
  *Dificultad: Baja-Media.*

- **Mensajes recurrentes** — `/recurring add|remove|list`. Mensajes que se reenvían automáticamente cada X tiempo (reglas, IP del servidor, etc.).
  *Dificultad: Media.*

- **Mensaje de reglas con verificación** — Panel con botón que asigna un rol de "miembro verificado" al aceptar las reglas. Op configura canal y rol con `/moderation reglas-setup`.
  *Dificultad: Baja.*

- **Verificación anti-raid** — Botón de captcha para nuevos miembros antes de ver el servidor. Alerta automática al staff si se detecta una oleada (X entradas en Y minutos). Cuentas nuevas (<7 días) marcadas en el log de entrada.
  *Dificultad: Media-Alta.*

- **Embed personalizado** — `/moderation embed <#canal>` abre un modal donde el Op redacta un embed (título, descripción, color, imagen) y el bot lo publica.
  *Dificultad: Baja.*

- **Sorteos** — `/giveaway start <duración> <premio> [ganadores]` con botón de participación, selección aleatoria al terminar y `/giveaway reroll`. Tabla `giveaways`.
  *Dificultad: Media.*

- **Contador de invitaciones** — Registrar qué usuario invitó a cada nuevo miembro. `/invites top` muestra el ranking. Requiere caché de invitaciones en `guildMemberAdd`.
  *Dificultad: Media.*

- **Notificaciones de streams** — Avisar en un canal cuando un usuario de YouTube o Twitch inicia directo. `/streams setup <plataforma> <usuario> <#canal>`. Requiere polling a API externa.
  *Dificultad: Alta (dependencia de API externa + rate limits).*

- **Modo mantenimiento** — `/maintenance on|off`. Deshabilita comandos no esenciales e informa a los usuarios con mensaje configurable. Útil durante actualizaciones o incidencias.
  *Dificultad: Baja.*

---

### 📊 Estadísticas y Gamificación

- **Sistema de niveles/XP** — Puntos por mensajes enviados. Comandos `/rank` y `/leaderboard`. Roles de nivel automáticos configurables por Op. Tabla `user_xp (guild_id, user_id, xp, level)` + listener `messageCreate`.
  *Dificultad: Media.*

- **Perfil de usuario** — `/profile [@usuario]`. Tarjeta con nivel, warns activos, tickets abiertos, sugerencias aceptadas y tiempo en el servidor.
  *Dificultad: Baja (compila datos ya existentes en BD).*

- **Roles por actividad** — Asignación automática de roles al alcanzar hitos: "Sugeridor Experto" tras 5 sugerencias aceptadas, "Veterano" tras 90 días en el servidor, etc. Configurable por Op.
  *Dificultad: Baja-Media.*

- **Leaderboard de actividad** — Ranking de mensajes por usuario, filtrable por período (7d / 30d / todo). Requiere el sistema de XP o tabla de conteo de mensajes.
  *Dificultad: Baja si XP ya existe; Media si no.*

- **Resumen semanal automático** — Publica cada lunes en canal configurable un embed con estadísticas de la semana: mensajes, tickets, sanciones, sugerencias.
  *Dificultad: Baja (queries + scheduler con `node-cron` o `setInterval`).*

---

### 🔧 Técnico / Calidad

- **Cooldowns por comando** — Sistema de cooldown por usuario+comando para prevenir spam de slash commands. Configurable por comando en su definición. Almacenado en memoria con `Map` + TTL.
  *Dificultad: Baja (se añade un check en `interactionCreate.js` antes de `execute()`).*

- **Sistema de permisos por canal** — Restringir comandos a canales concretos. Op configura con `/config canal-comando <comando> <#canal>`. Verificado en `interactionCreate.js`.
  *Dificultad: Media.*

- **Hot-reload de comandos** — `/reload <comando>` solo para el owner del bot. Recarga un módulo sin reiniciar el proceso (`delete require.cache[require.resolve(...)]`). Útil en producción sin downtime.
  *Dificultad: Media.*

- **Monitoreo de salud** — Endpoint HTTP `GET /health` con Express o `http` nativo. Devuelve `{ status, uptime, dbConnected, guilds }`. Para monitores externos (UptimeRobot, BetterStack).
  *Dificultad: Baja.*

- **Tests unitarios básicos** — Cobertura mínima de funciones de BD (`database.js`), utils (`permCheck`, `parseDuration`, `embeds`) y lógica de moderación. Framework: Jest o Vitest.
  *Dificultad: Media (configuración inicial + primeros tests).*

- **Dockerfile** — Imagen basada en `node:20-alpine`. Variables via `.env` montado como volumen. `docker-compose.yml` con volúmenes para `data/` y `logs/`.
  *Dificultad: Baja.*

- **Dashboard web** — Interfaz web ligera (Express + frontend simple) para ver estadísticas y editar configuración sin Discord. Protegida por OAuth2 de Discord.
  *Dificultad: Alta.*

- **Internacionalización (i18n)** — Soporte multi-idioma con `i18next`. Cadenas de texto externalizadas a `locales/es.json`, `locales/en.json`. Idioma configurable por servidor.
  *Dificultad: Alta (afecta a todos los archivos del bot).*


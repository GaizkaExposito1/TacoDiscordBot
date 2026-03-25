# 📋 Mejoras — TacoManagment Bot

Registro de features implementadas, análisis técnico de pendientes y propuestas nuevas.

---

## ✅ IMPLEMENTADO

### 🏗️ Infraestructura y Técnico
- **Migración de BD** (`sql.js` → `better-sqlite3`) — Acceso síncrono, sin callbacks, más rápido.
- **Sistema de Logging** — Winston con niveles diferenciados por entorno.
- **Validación de entorno** — `src/config/env.js` con `envalid`. Fallo explícito en arranque.
- **Estado dinámico** (Presence) — "En Mantenimiento" en Dev/Test, "Watching Tickets" en Prod.
- **Migraciones de BD versionado** — Array `MIGRATIONS[]` numerado con tabla `schema_version`. Solo aplica migraciones pendientes. Compatible con DBs existentes via `LEGACY_VERSION`.
- **Backups automáticos** — Copia diaria de `database.sqlite` con retención de 5 días.

### 🎫 Tickets
- **Departamentos múltiples** — Select menu para elegir departamento antes de abrir el ticket. Formularios modales personalizados por departamento via `form_json`.
- **Reclamación** — `ticket_claim`/`ticket_unclaim` en buttons y como slash command. Restringe visibilidad al claimer. Registra en auditoría.
- **Transcripciones HTML** — Generadas al cierre, enviadas por DM al usuario y al canal de transcripts. Si el DM falla, el cierre continúa.
- **Auto-cierre por inactividad** — `/tickets config auto-close <horas>`. Checker cada 15 min. 0 = desactivado.
- **Rating de atención** — DM automático con botones 1–5 estrellas al cerrar. Modal de feedback opcional. Guardado en BD.
- **Límite de tickets por usuario** — `/tickets config max-tickets <N>` (1–10). Verificado al abrir.
- **Contador global o por categoría** — configurable por departamento.

### 🛡️ Moderación
- **Sanciones completas** — Warn, timeout (con soporte permanente), kick y ban con historial persistente en BD.
- **Warn acumulativo** — `/moderation warn-config umbral accion [duracion]`. Acción automática al alcanzar el umbral.
- **Expiración de warns** — Parámetro `expiracion` en `/moderation warn`. Checker cada 10 min. warns expirados no cuentan para umbral.
- **Slow mode** — `/moderation slowmode <canal> <segundos>`. 0 = desactivar. Máx 6h. Mod+.
- **Chat-clear** — Limpieza de mensajes en masa.
- **Revocar sanción** — Eliminación individual de sanciones.
- **Auditoría de sanciones** — `bot_warn`, `bot_timeout`, `bot_kick`, `bot_ban` registrados en `audit_logs` tras cada `recordSanction`.

### 📊 Encuestas
- **Sistema completo** — `/poll create`, `/poll end`, `/poll results`, `/poll list`, `/poll clear`.
- **Encuestas nativas de Discord** — Con modal de configuración (pregunta, opciones, duración, multivoto).
- **Visibilidad configurable** — Pública o solo staff.

### 📢 Sugerencias
- **Envío via modal** — Con votación automática (✅/❌).
- **Flujo de estados** — Pendiente → Aceptada / Denegada / En Desarrollo / Implementada.
- **Anuncio de novedades** — Al marcar como "Implementada" se publica en el canal de novedades.
- **Cambio de estado** — Solo Admin+, tanto desde bot como desde panel web.

### 🔍 Auditoría
- **Eventos automáticos** — Borrado/edición de mensajes, entrada/salida de miembros, cambios de roles, creación/borrado de canales.
- **Toggle por tipo** — `/audit toggle` para activar/desactivar eventos individuales.
- **Expediente de usuario** — `/audit lookup`: sanciones + historial de tickets.
- **Log completo** — Todas las acciones del bot y del panel registradas en `audit_logs`.

### 👋 Bienvenida
- **Mensajes personalizables** — Variables: `{user}`, `{server}`, `{count}`, `{mention}`.
- **Activación independiente** — Welcome y goodbye activables por separado.
- **Roles automáticos** — Asignación de roles al entrar al servidor.

### ⚙️ Administración
- **Panel de configuración unificado** — `/config` muestra en un embed el resumen completo: roles, canales, tickets, bienvenida, warns, auditoría. Solo Op.
- **Despliegue de comandos** — `npm run deploy` registra/actualiza Slash Commands en la API de Discord.

---

## 🔄 PENDIENTE

### 🎫 Tickets

- [ ] **Categoría y rol de staff por departamento** — Actualmente todos los departamentos comparten una sola categoría de Discord y el mismo `staff_role_id`. Añadir `discord_category_id` y `staff_role_id` a la tabla `departments` para que cada departamento pueda apuntar a su propio espacio y rol. Dificultad: Baja-Media (infraestructura ya existe).
- [ ] **Notas internas** — `/tickets note <texto>` dentro del canal del ticket. Nota embebida visible solo para staff, marcada como `[INTERNA]` en el transcript. Requiere tabla `ticket_notes`.
- [ ] **Reapertura de ticket cerrado** — Botón `ticket_reopen` en el mensaje de cierre (logs), visible solo para Staff. Genera nuevo canal vinculado al ticket original via `parent_ticket_id`. Dificultad: Media.
- [ ] **Asignación por departamento** — Al abrir ticket, asignar automáticamente al staff del departamento correspondiente si está disponible (según el rol configurado por departamento).
- [ ] **Estadísticas de staff** — `/tickets staff-stats [período]`: tickets resueltos, tiempo medio y rating por moderador. Filtro semanal/mensual.

### 🛡️ Moderación

- [ ] **Lock/Unlock de canal** — `/moderation lock [#canal] [razón]` y `unlock`. Quita permisos de enviar mensajes al rol `@everyone`. Mod+.
- [ ] **Anti-spam básico** — Detectar X mensajes en Y segundos del mismo usuario y silenciar automáticamente. Configurable por Op. Sin BD persistente (en memoria).
- [ ] **Filtro de palabras** — Lista negra configurable por Op (`/moderation filtro add|remove|list`). El bot elimina el mensaje, avisa al usuario y registra en auditoría.
- [ ] **Notas de usuario** — `/moderation note <usuario> <texto>`: anotaciones privadas de staff sobre un miembro, sin ser sanciones formales. Visibles en `/moderation history`.
- [ ] **Desbaneo automático al expirar** — Los bans temporales (con duración) deberían ejecutar el unban en Discord via API al expirar, igual que el timeout. Actualmente solo se marca como expirado en BD.
- [ ] **Historial por moderador** — `/moderation stats <mod>`: cuántos warn/timeout/kick/ban ha aplicado un moderador en total y por período.

### 📊 Encuestas y Sugerencias

- [ ] **Encuestas recurrentes** — Encuesta programada que se lanza automáticamente cada X días en un canal configurado.
- [ ] **Estadísticas de sugerencias** — `/suggestions stats [período]`: resumen de aceptadas/denegadas/en desarrollo por rango de fechas.
- [ ] **Búsqueda de sugerencia** — `/suggestions search <texto>`: buscar en el contenido de las sugerencias por palabras clave.

### 👋 Bienvenida y Comunidad

- [ ] **Reaction roles / Button roles** — Menú de autoasignación de roles configurado por Op. Panel con botones; al hacer clic el bot asigna/retira el rol.
- [ ] **Mensaje de reglas con verificación** — Botón que asigna rol "verificado" al aceptar las reglas. Op configura canal y rol con `/setup reglas`.
- [ ] **Recordatorios** — `/reminder <tiempo> <texto>`: el bot envía DM al usuario tras el tiempo indicado. Persistente en BD para sobrevivir a reinicios.
- [ ] **Canales de estadísticas en tiempo real** — Voice channels que muestran: miembros totales, tickets abiertos, etc. Se actualizan cada 10 min.

### 🎉 Utilidad / Entretenimiento

- [ ] **Sorteos** — `/giveaway start <duración> <premio> [ganadores]` con botón de participación, selección aleatoria y reroll opcional. Requiere tabla `giveaways`.
- [ ] **Contador de invitaciones** — Registrar qué usuario invitó a cada nuevo miembro. `/invites top` muestra el ranking. Requiere escuchar `inviteCreate`.
- [ ] **Embed personalizado** — `/embed <#canal>` abre un modal donde Op redacta un embed (título, descripción, color) y el bot lo publica. Útil para anuncios.
- [ ] **Votación rápida** — `/vote <pregunta>` que crea un mensaje con botones Sí/No/Neutral y muestra el resultado al finalizar un tiempo.

### 📊 Estadísticas

- [ ] **Resumen semanal automático** — El bot publica cada lunes en un canal configurable un embed con estadísticas de la semana: tickets, sanciones, sugerencias.
- [ ] **Leaderboard de actividad** — Ranking de mensajes por usuario. Requiere escuchar `messageCreate` con throttling.
- [ ] **Dashboard de moderación** — `/moderation stats [período]`: total de warns/bans/kicks/timeouts en el servidor, filtrable por fecha y mod.

### 🔧 Técnico / Calidad

- [ ] **Manejo global de errores** — `src/handlers/processHandler.js` capturando `unhandledRejection` y `uncaughtException` con log + notificación al canal de logs del servidor.
- [ ] **Cooldowns por comando** — Sistema de cooldown por usuario y comando para evitar abuso de slash commands. Configurable por Op.
- [ ] **Sistema de permisos por canal** — Restringir ciertos comandos a canales específicos (`/config canal-comando <comando> <#canal>`), además del control por nivel de rol.
- [ ] **Hot-reload de comandos** — Comando `/reload <modulo>` solo para owner del bot que recarga un handler sin reiniciar el proceso. Útil en producción.
- [ ] **Dockerfile** — Imagen oficial para facilitar el despliegue en cualquier servidor sin configurar Node manualmente.
- [ ] **TypeScript (largo plazo)** — Migración progresiva empezando por los módulos más críticos (`database.js`, `ticketService.js`).

---

## 🔍 Análisis Técnico de Features Pendientes

### ⚠️ Múltiples categorías de ticket — PARCIALMENTE implementado

Lo que ya existe:
- Sistema de **departamentos** completo con formularios JSON personalizados.
- Select menu en el panel para elegir departamento.
- Contador por categoría o global configurable.

**Lo que falta:**
- Todos los departamentos comparten `ticket_category_id` y `staff_role_id` globales.
- Necesario: añadir `discord_category_id` y `staff_role_id` a la tabla `departments` (migración), con fallback al valor global si están a NULL.
- En `openTicket()`, usar `department.discord_category_id ?? config.ticket_category_id`.

**Dificultad: Baja-Media.** La infraestructura existe; solo hay que extender el modelo de datos.

---

### ❌ Notas internas de ticket — NO implementado

**Cambios necesarios:**
- Nueva tabla `ticket_notes` (id, ticket_id, staff_id, note, created_at).
- Comando `/tickets note <texto>` que solo funciona dentro de un canal de ticket activo.
- El embed de la nota usa color diferente + `🔒 Nota interna`.
- Incluida en el transcript con marca `[NOTA INTERNA]`; opcionalmente filtrada si el DM va al usuario.

**Dificultad: Media.**

---

### ❌ Reapertura de ticket cerrado — NO implementado

**Cambios necesarios:**
- Botón `ticket_reopen_<ticketId>` en el embed de cierre publicado en el canal de logs, visible solo para Staff (filtro `member.permissions`).
- `handleReopenTicket()` en `ticketService.js`: crea nuevo canal, referencia `parent_ticket_id` en BD, notifica al usuario.
- Nueva columna `parent_ticket_id` en `tickets`.
- El botón debe usar ID persistente en BD para no quedar huérfano tras reinicio del bot.

**Dificultad: Media.**

---

### ❌ Desbaneo automático al expirar — NO implementado

Actualmente los bans temporales solo se marcan como `expired` en BD pero NO se ejecuta el unban en Discord.

**Cambios necesarios:**
- Checker periódico (similar al de warns) que consulta bans con `expires_at <= NOW()` y `status = active`.
- Para cada uno: `guild.members.unban(userId)` via API de Discord + marcar como `expired` en BD + registrar `audit_log`.

**Dificultad: Baja.** El patrón ya existe en el checker de warns.


Este documento recopila las áreas de mejora identificadas en el análisis del proyecto, clasificadas por prioridad e impacto en la estabilidad y escalabilidad del bot.

## ✅ Completado

### ✅ 1. Migración de Base de Datos (`sql.js` → `better-sqlite3`)
- Migración confirmada.

### ✅ 3. Sistema de Logging Estructurado
- Implementado con **Winston** (existente).

### ✅ 2. Validación Centralizada de Entorno (`src/config/env.js`)
- Implementado con **envalid**.

### ✅ 4. Sistema de Estado Dinámico (Presence)
- Implementado en `src/events/ready.js`:
    - Cambia estado a "En Mantenimiento" en entornos Dev/Test.
    - Estado normal "Watching Tickets" en Producción.

### ✅ 5. Auditoría completa de sanciones
- `bot_warn`, `bot_timeout`, `bot_kick`, `bot_ban` registrados en `audit_logs` tras cada `recordSanction` en `actions.js`.

## 🟡 Pendiente (Se necesitan re-aplicar)

### 4. Manejo Global de Errores
- Falta crear `src/handlers/processHandler.js`.
- Falta integrar en `src/client.js`.

### 5. Internacionalización (i18n)
- Falta implementar `i18next`.

### 7. Scripts de Utilidad & Docker
- Falta script de backup.
- Falta script de limpieza.
- Falta Dockerfile.

### 6. TypeScript (Largo Plazo)
- Pendiente.

---

## 🆕 Nuevas Features Identificadas (v1.3.x+)

### 🎫 Tickets

- **Múltiples categorías** — El usuario elige el tipo de ticket (soporte, reporte, apelación...) con botones al abrir; cada categoría tiene su propia categoría de Discord y rol de staff asignado.
- ~~**Transcripciones por DM**~~ ✅ **IMPLEMENTADO** — `processTicketClosure()` envía el HTML del transcript al usuario por DM junto al embed de cierre. Si el DM falla (privacidad), el cierre continúa igualmente.
- ~~**Auto-cierre por inactividad**~~ ✅ **IMPLEMENTADO** — `/tickets config auto-close <horas>`. Timer cada 15 min. Registra actividad con `messageCreate`. 0 = desactivado.
- ~~**Reclamación de ticket**~~ ✅ **IMPLEMENTADO** — Botones `ticket_claim`/`ticket_unclaim` en el embed. Restringe acceso al canal al claimer, actualiza embed en tiempo real, registra en auditoría. También disponible como slash command.
- **Notas internas de ticket** — `/ticket note <texto>` que solo ven los miembros del staff dentro del canal del ticket; se incluyen en el transcript marcadas como internas.
- ~~**Rating de atención**~~ ✅ **IMPLEMENTADO** — DM automático con botones 1–5 estrellas al cerrar. Modal de feedback opcional. Consultable con `/tickets ratings`. Guardado en BD.
- ~~**Límite de tickets por usuario configurable**~~ ✅ **IMPLEMENTADO** — `/tickets config max-tickets <N>` (1–10). Columna `max_tickets_per_user` en guild_config. Verificado en `openTicket()`.
- **Reapertura de ticket cerrado** — Botón en el mensaje de cierre (o comando `/ticket reopen`) que genera un nuevo canal vinculado al ticket original, conservando el historial.

### 🛡️ Moderación

- ~~**Warn acumulativo con acción automática**~~ ✅ **IMPLEMENTADO** — `/moderation warn-config umbral accion [duracion]`. Al alcanzar X warns activos: timeout/kick/ban automático. Solo Op puede configurar.
- **Lock/Unlock de canal** — `/moderation lock` y `/moderation unlock` para que los mods bloqueen canales rápidamente.
- ~~**Slow mode**~~ ✅ **IMPLEMENTADO** — `/moderation slowmode <canal> <segundos>`. Mod+ puede activar/desactivar. 0 = desactivar. Máximo 6h (21600s).
- **Anti-spam básico** — Detectar X mensajes en Y segundos y silenciar automáticamente al usuario.
- **Filtro de palabras** — Lista negra de palabras/expresiones configurada por Op (`/moderation filtro add|remove|list`). El bot elimina el mensaje y avisa al usuario; opcionalmente registra en auditoría.
- **Notas de usuario** — `/moderation note <usuario> <texto>` para que el staff deje anotaciones privadas sobre un miembro sin que sean sanciones formales. Visibles en `/moderation history`.
- **Expiración automática de warns** — Configurar tras cuántos días un warn pasa de `active` a `expired` automáticamente (`/moderation warn-config ... expiracion:<días>`).
- **Tempban con razón programada** — `/moderation tempban <usuario> <duración> <razón>` como alias mejorado del ban temporal, con desbaneo automático y log de auditoría al expirar.

### ⚙️ General / Utilidad

- ~~**Comando de encuestas** (`/poll`)~~ ✅ **IMPLEMENTADO** — `/poll create`, `/poll end`, `/poll results`, `/poll list`, `/poll clear`. Admin+ para crear/cerrar, todos para consultar, Op para borrar historial.
- **Reaction roles / Button roles** — Menú de autoasignación de roles configurado por Op.
- **Canales de estadísticas** — Voice channels que muestran en tiempo real: contador de miembros, tickets abiertos, etc.
- **Recordatorios** — `/reminder <tiempo> <texto>` para que el bot mande un DM al usuario tras el tiempo indicado. Sin BD persistente si se usa `setTimeout`; con BD si se quiere sobrevivir a reinicios.
- **Mensaje de reglas con aceptación** — Panel con botón que asigna un rol de "miembro verificado" al aceptar las reglas. Op configura el canal y el rol con `/moderation reglas-setup`.
- **Embed personalizado** — `/moderation embed <#canal>` abre un modal donde el Op redacta un embed (título, descripción, color, imagen) y el bot lo publica. Útil para anuncios formateados sin usar terceros.
- **Sorteos** — `/giveaway start <duración> <premio> [ganadores]` con botón de participación, selección aleatoria al terminar y reroll opcional. Requiere nueva tabla `giveaways`.
- **Contador de invitaciones** — Registrar qué usuario invitó a cada nuevo miembro; `/invites top` muestra el ranking. Requiere escuchar `inviteCreate` y `guildMemberAdd`.

### 📊 Estadísticas

- **Leaderboard de actividad de usuarios** — Ranking de mensajes por usuario (requiere escuchar `messageCreate`), no solo staff.
- **Estadísticas de sugerencias** — Resumen de cuántas aceptadas/denegadas/en desarrollo por período.
- **Dashboard de moderación** — `/moderation stats [usuario]` con total de warns, bans, kicks y timeouts aplicados por un moderador o en el servidor en general, filtrable por período.
- **Estadísticas de tickets** — `/tickets stats [período]` con tickets abiertos, cerrados, tiempo medio de resolución y staff más activo.
- **Resumen semanal automático** — El bot publica cada lunes en un canal configurable un embed con estadísticas de la semana: mensajes, tickets, sanciones, sugerencias.

### 🔧 Técnico / Calidad

- ~~**Sistema de migraciones de DB versionado**~~ ✅ **IMPLEMENTADO** — Array `MIGRATIONS[]` numerado con tabla `schema_version`. Detecta DBs existentes vía `LEGACY_VERSION`, aplica solo las migraciones pendientes y corrige automáticamente inconsistencias entre la versión registrada y las tablas reales.
- **Cooldowns por comando** — Sistema de cooldown por usuario/comando para evitar spam de slash commands.
- **Sistema de permisos por canal** — Restringir ciertos comandos a canales concretos (`/config canal-comando <comando> <#canal>`), en lugar de solo por nivel de rol.
- **Backup automático de BD** — Script/tarea programada que copia `database.sqlite` a un directorio de backups con timestamp, con rotación configurable (últimos N backups).
- **Hot-reload de comandos** — Comando `/reload <comando>` solo para el owner del bot que recarga un módulo sin reiniciar el proceso entero. Útil en desarrollo/producción sin downtime.
- **Panel de configuración unificado** — `/config` que muestra en un solo embed el resumen de toda la configuración del servidor (roles, canales, tickets, auditoría, bienvenida, warns…), en lugar de tener que ejecutar cada `ver` por separado.

---

## 🔍 Análisis Técnico de Features Pendientes

### 🎫 Tickets — Estado real vs. propuestas

> **Nota:** Tras revisar el código de `ticketService.js`, `tickets.js` y `database.js`, varias de las features listadas como pendientes ya están implementadas. Se detalla cada una.

---

#### ✅ Reclamación de ticket — **YA IMPLEMENTADO**

Ya existe completamente:
- Botones `ticket_claim` / `ticket_unclaim` en el embed de bienvenida del ticket.
- `handleClaimTicket()` y `handleUnclaimTicket()` en `ticketService.js`.
- `claimTicket(channelId, userId)` y `unclaimTicket(channelId)` en `database.js`.
- Al reclamar, el staff role pierde `ViewChannel` y solo el claimer (individual) y admins ven el canal.
- El embed original se actualiza en tiempo real con el nombre del reclamador.
- Registro en auditoría con `TICKET_CLAIM` / `TICKET_UNCLAIM`.
- El subcomando `/tickets claim` y `/tickets unclaim` también existen como slash commands.

**No hay nada que añadir aquí.**

---

#### ✅ Rating de atención — **YA IMPLEMENTADO**

Ya existe completamente:
- Al cerrar un ticket, el bot envía un **DM al usuario** con botones de valoración (1–5 estrellas): `ticket_rate_1` … `ticket_rate_5`.
- `handleRating()` gestiona el botón y muestra un modal opcional de feedback (`ticket_feedback_`).
- `handleRatingFeedback()` guarda la valoración con `updateTicketRating()` en BD.
- `/tickets ratings` muestra las últimas valoraciones con filtro opcional por usuario.

**No hay nada que añadir aquí.**

---

#### ✅ Transcripción por DM al usuario — **YA IMPLEMENTADO**

Ya existe:
- En `processTicketClosure()`, tras generar el transcript HTML, se hace `ticketUser.send(dmPayload)` (línea ~540).
- El DM incluye el embed de cierre + el archivo HTML adjunto.
- Si el DM falla (privacidad), se captura el error silenciosamente sin interrumpir el cierre.

**No hay nada que añadir aquí.**

---

#### ✅ Límite de tickets configurable — **YA IMPLEMENTADO**

Ya existe:
- Columna `max_tickets_per_user` en `guild_config` (default: 1).
- Subcomando `/tickets config max-tickets <limite>` (1–10) que actualiza esa columna.
- `openTicket()` consulta `config.max_tickets_per_user` y bloquea si el usuario ya llegó al límite.

**No hay nada que añadir aquí.**

---

#### ⚠️ Múltiples categorías de ticket — **PARCIALMENTE implementado**

Lo que ya existe:
- Sistema de **departamentos** completo: tabla `departments` con nombre, emoji, descripción y formulario JSON personalizado por departamento.
- Select menu en el panel para elegir departamento antes de abrir el ticket.
- El canal toma el nombre del departamento (`soporte-00001`, etc.) y el contador puede ser global o por departamento.

**Lo que falta** (la diferencia real con la feature propuesta):
- Todos los departamentos comparten **una sola categoría de Discord** (`ticket_category_id` en `guild_config`).
- Todos comparten **un solo rol de staff** (`staff_role_id`).
- La feature propone que cada departamento pueda tener su **propia categoría de Discord** y su **propio rol de staff** (ej: Soporte → categoría "Soporte" + rol "Agente Soporte"; Apelaciones → categoría "Legal" + rol "Mod").

**Cambios necesarios:**
- Añadir columnas `discord_category_id` y `staff_role_id` a la tabla `departments` (migración).
- Subcomandos `/tickets config dept-add` y `dept-edit` con opciones de categoría y rol.
- En `openTicket()`, usar `department.discord_category_id ?? config.ticket_category_id` y `department.staff_role_id ?? config.staff_role_id` (con fallback al global).

**Dificultad:** Baja-Media — la infraestructura ya existe, solo hay que extender el modelo de datos del departamento.

---

#### ❌ Notas internas de ticket — **NO implementado**

No existe nada al respecto.

**Cambios necesarios:**
- Nueva tabla `ticket_notes` (id, ticket_id, staff_id, note, created_at).
- Subcomando `/tickets note <texto>` que solo funciona dentro de un canal de ticket.
- El mensaje de nota se publica en el canal con un embed diferenciado (color distinto, texto "🔒 Nota interna — solo staff").
- La nota queda invisible para el usuario porque ya habrá perdido el acceso al canal si fue reclamado, pero se incluye en el transcript con marca `[NOTA INTERNA]`.
- Opcionalmente, filtrar notas del HTML del transcript si el DM va al usuario.

**Dificultad:** Media.

---

#### ❌ Reapertura de ticket cerrado — **NO implementado**

No existe nada al respecto.

**Cambios necesarios:**
- Al cerrar un ticket, además del embed de cierre en el canal de logs, incluir un botón `ticket_reopen_<ticketId>` visible solo para Staff.
- `handleReopenTicket()` en `ticketService.js`: crea un nuevo canal, copia el subject, referencia el `parent_ticket_id` en BD, y notifica al usuario.
- Añadir columna `parent_ticket_id` a la tabla `tickets` para encadenar la reapertura con el original.
- El transcript del nuevo canal puede incluir un enlace al historial del ticket original.

**Dificultad:** Media — el mayor cuidado es evitar que el botón de reopen quede huerfano tras un reinicio del bot (hay que usar persistencia via DB, no en memoria).

---

### 🎫 Múltiples categorías de ticket (análisis original)

**Qué hace:** Al pulsar "Abrir ticket", en lugar de abrir directamente, aparece un selector (botones o select menu) con los tipos configurados (Soporte, Reporte, Apelación…). Cada tipo tiene su propia categoría de Discord y rol de staff asignado.

**Cambios necesarios:**
- Nueva tabla `ticket_categories` (id, guild_id, nombre, category_id, rol_staff_id, emoji, orden).
- Nuevo subcomando `/tickets categoria add|remove|list` para que Op configure los tipos.
- El botón "Abrir ticket" del panel pasa a mostrar un `StringSelectMenu` con las categorías activas.
- `openTicket()` recibe el tipo elegido, crea el canal en la categoría correcta, y menciona el rol de staff correspondiente.
- Si no hay categorías configuradas, mantiene el comportamiento actual (compatibilidad hacia atrás).

**Dificultad:** Alta — es el cambio más invasivo en el sistema de tickets. Afecta al panel, al flujo de apertura, a la BD y a la config de Op.


### 🔒 Lock/Unlock de canal

**Qué hace:** `/moderation lock [#canal]` deniega `SendMessages` (y opcionalmente `AddReactions`) al rol `@everyone` en el canal mediante `channel.permissionOverwrites.edit()`. `/moderation unlock` lo revierte. Puede enviar un embed al canal informando del bloqueo.

**Cambios necesarios:**
- Dos nuevos archivos de subcomando: `lock.js` y `unlock.js` en `src/modules/admin/subcommands/moderation/`, siguiendo el patrón de `slowmode.js`.
- Registrar los subcommands en `moderation.js` (definición + ruta en `execute()`).
- Canal opcional (si no se especifica, usa el canal actual).
- Nivel sugerido: Mod+.

**Dificultad:** Baja — ~60 líneas en total. Sin cambios en BD.

---

### 📊 Estadísticas de sugerencias

**Qué hace:** Nuevo subcomando `/suggestions stats [periodo]` que muestra cuántas sugerencias han sido aceptadas, denegadas, en desarrollo o están pendientes en un período dado (7d, 30d, todo).

**Cambios necesarios:**
- Verificar si la tabla `suggestions` tiene columna `resolved_at`. Si no, añadir en una nueva migración.
- Nuevo subcomando `/suggestions stats` con opción `periodo` (choices: 7d / 30d / todo).
- Query SQL con `GROUP BY status` + filtro `WHERE resolved_at >= ?` según período.
- Embed con conteos por estado y porcentaje de resolución sobre el total.

**Dificultad:** Media — depende del estado actual de la tabla `suggestions`. La query es sencilla; lo más delicado es la migración si falta la columna.


# 🌮 TacoLand Management Bot - Manual de Usuario (v1.4.0)

Este documento detalla todas las funcionalidades, comandos y sistemas automáticos del bot integral de TacoLand.

---

## 1. 🎫 Sistema de Tickets
Sistema avanzado de soporte con departamentos, formularios, transcripciones y valoraciones.

### `/tickets`
Comando raíz para toda la gestión de soporte.

#### Gestión de ticket activo (dentro del canal del ticket)
*   **`add [usuario]`** — Añade un usuario al ticket actual (puede verlo y escribir).
*   **`remove [usuario]`** — Elimina el acceso de un usuario al ticket.
*   **`close [razon]`** — Cierra el ticket, genera una transcripción HTML y permite al usuario valorar la atención.
*   **`claim`** — El staff se asigna el ticket (el rol staff global pierde el acceso, solo el agente asignado lo conserva).
*   **`unclaim`** — Libera el ticket, el rol staff global recupera el acceso.

#### Estadísticas
*   **`stats`** (Staff) — Resumen de tickets activos, cerrados e histórico global.
*   **`staff-stats [usuario] [dias]`** (Admin) — Estadísticas de un agente o ranking del equipo completo.
*   **`ratings [usuario] [limite]`** (Staff) — Últimas valoraciones recibidas.

#### Administración
*   **`setup`** (Admin) — Envía el panel de tickets con el menú desplegable de departamentos.
*   **`delete-history`** (Admin) — ⚠️ Borra **todo** el historial de tickets del servidor.

#### Configuración (`/tickets config`)
*   **`ver`** — Muestra la configuración actual del sistema.
*   **`roles [staff] [admin]`** — Asigna los roles de staff y administración.
*   **`logs [canal]`** — Canal donde se envían los registros de auditoría de tickets.
*   **`transcripciones [canal]`** — Canal exclusivo para las transcripciones HTML.
*   **`categoria [categoria]`** — Categoría de Discord donde se crean los canales de ticket.
*   **`contador [modo]`** — Modo de numeración: **Global** (un único contador compartido para todos los departamentos) o **Por categoría** (contador independiente por departamento).
*   **`mensaje [tipo]`** — Personaliza los mensajes del panel, bienvenida de ticket, cierre y reclamación.
*   **`dept-add [nombre] [emoji] [descripcion]`** — Añade un nuevo departamento.
*   **`dept-del [id]`** — Elimina un departamento.
*   **`preguntas-add [departamento]`** — Añade una pregunta al formulario de un departamento.
*   **`preguntas-edit [departamento] [pregunta_id]`** — Edita una pregunta existente.
*   **`preguntas-del [departamento] [pregunta_id]`** — Elimina una pregunta.
*   **`preguntas-list [departamento]`** — Lista las preguntas configuradas.

---

## 2. 📢 Sistema de Sugerencias
Gestión de feedback de la comunidad con seguimiento de estados y notificaciones automáticas.

### `/suggestions`
*   **`setup [tipo] [canal]`** (Admin) — Configura el canal principal de sugerencias o el canal de implementadas/novedades.
*   **`send`** (Usuario) — Abre un modal para escribir y enviar una sugerencia. Se publica con reacciones ✅/❌ para votación.
*   **`action [url] [estado] [razon]`** (Staff) — Gestiona una sugerencia existente. Estados disponibles: Aceptada, Denegada, En Desarrollo, Implementada. Si se marca como **Implementada**, se publica automáticamente un anuncio en el canal de novedades.

---

## 3. 🛡️ Moderación

### `/moderation`

#### Sanciones
*   **`warn [usuario] [razon] [expiracion]`** — Aplica una advertencia y la guarda en el historial. El parámetro `expiracion` es opcional (ej: `7d`, `30d`); si se indica, el warn expirará automáticamente al cabo del tiempo especificado.
*   **`timeout [usuario] [duracion] [razon]`** — Silencia un usuario temporalmente. Soporta `perm` para timeout permanente (se reaaplica automáticamente).
*   **`kick [usuario] [razon]`** — Expulsa del servidor.
*   **`ban [usuario] [razon] [duracion]`** — Banea al usuario (permanente o temporal con desbaneo automático).
*   **`unban [userid]`** — Desbanea a un usuario por ID.
*   **`remove-sanction [id]`** — Elimina una sanción concreta del historial.
*   **`history [usuario]`** — Muestra el historial de sanciones de un usuario, incluida la fecha de expiración de warns.

#### Utilidad
*   **`chat-clear [cantidad]`** — Borra un número de mensajes del canal actual.
*   **`anuncio [canal] [mensaje]`** — Envía un anuncio embellecido a un canal.

#### Configuración de roles
*   **`setup-roles [tipo] [rol]`** — Define el rol mínimo para cada nivel de moderación (Mod / Admin / Operador).
*   **`roles-info`** — Muestra los roles configurados para cada nivel.

#### Bienvenida y Despedida
*   **`bienvenida-setup [canal]`** — Establece el canal de bienvenida/despedida.
*   **`bienvenida-mensaje [tipo] [mensaje]`** — Personaliza el mensaje de bienvenida o despedida (soporta variables como `{user}`, `{server}`, `{memberCount}`).
*   **`bienvenida-estado [tipo] [estado]`** — Activa o desactiva los mensajes de bienvenida o despedida.
*   **`bienvenida-rol-add [rol]`** — Añade un rol que se asigna automáticamente al entrar.
*   **`bienvenida-rol-remove [rol]`** — Elimina un rol automático.
*   **`bienvenida-rol-lista`** — Lista los roles de bienvenida configurados.
*   **`bienvenida-vista [tipo]`** — Previsualiza el mensaje de bienvenida o despedida.
*   **`bienvenida-info`** — Muestra la configuración actual del sistema de bienvenida.

---

## 4. 🔍 Auditoría

### `/audit`
*   **`lookup [usuario]`** — Expediente completo: historial de sanciones + tickets (con enlaces a transcripciones).
*   **`channel [canal]`** — Establece el canal donde se enviarán los logs automáticos.
*   **`toggle [evento] [on/off]`** — Activa o desactiva el log de un evento específico. Eventos disponibles:
    *   Mensajes borrados / editados.
    *   Cambios de roles de miembros.
    *   Cambios de nick/avatar de miembros.
    *   Creación / borrado / edición de canales.
    *   Creación / borrado / edición de roles.
*   **`toggle-all [on/off]`** — Activa o desactiva todos los eventos de golpe.

---

## 5. 📊 Staff

### `/staff`
*   **`stats [staff] [dias]`** — Muestra las estadísticas de un miembro del staff (tickets reclamados, cerrados, valoración media).
*   **`leaderboard [periodo]`** — Ranking de actividad del staff en un período de tiempo.

---

## 6. ℹ️ General

### `/botinfo`
Muestra la versión (`v1.4.0`), el uptime, uso de memoria, miembros del servidor y estadísticas de tickets abiertos/totales.

### `/help`
Menú visual adaptado al nivel del usuario (Usuario / Mod / Admin / Operador) con acceso rápido a todos los comandos disponibles.

### `/config` *(Solo Operador)*
Panel de configuración unificado. Muestra en un único embed toda la configuración activa del servidor: roles de moderación, canales, sistema de tickets, bienvenida y auto-roles, auto-acción de warns y auditoría.

---

## 💾 Sistemas Automáticos

*   **Backups Diarios:** Copia de seguridad de la base de datos al arrancar y cada 24 horas. Retención de los últimos **5 días**. Formato: `taco_YYYY-MM-DDTHH-mm-ss.db`.
*   **Timeout Permanente:** Los usuarios con timeout permanente son re-silenciados automáticamente cada vez que el timeout de Discord expira.
*   **Roles Automáticos:** Los roles de bienvenida configurados se asignan automáticamente a cada nuevo miembro.
*   **Panel en Vivo:** El panel de tickets se actualiza automáticamente al añadir o eliminar departamentos.
*   **Expiración de Warns:** El bot comprueba cada 10 minutos los warns activos con fecha de expiración. Al expirar, el warn pasa de `activo` a `expirado` automáticamente y deja de contar para el umbral de acción automática.

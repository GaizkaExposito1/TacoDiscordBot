# 🤖 Documentación Oficial del Bot

Bot de Discord integral para la gestión de comunidades: tickets, moderación, auditoría, sugerencias y bienvenida.

## 🛠️ Comandos Disponibles

### 🎫 Tickets (`/tickets`)
Comando principal para el sistema de soporte. Requiere permisos de Administrador para la configuración.

- **/tickets setup**: Envía el panel con el menú de departamentos al canal actual.
- **/tickets add/remove [usuario]**: Gestiona el acceso de usuarios al ticket actual.
- **/tickets close [razon]**: Cierra el ticket y genera una transcripción HTML.
- **/tickets claim / unclaim**: Reclama o libera un ticket (staff).
- **/tickets stats**: Estadísticas globales de tickets del servidor.
- **/tickets staff-stats [usuario] [dias]**: Estadísticas de rendimiento del staff.
- **/tickets ratings [usuario]**: Valoraciones recibidas.
- **/tickets config ver**: Muestra la configuración actual.
- **/tickets config roles [staff] [admin]**: Asigna los roles del sistema.
- **/tickets config logs [canal]**: Canal de logs de auditoría de tickets.
- **/tickets config transcripciones [canal]**: Canal exclusivo para transcripciones.
- **/tickets config categoria [categoria]**: Categoría de Discord donde se crean los tickets.
- **/tickets config contador [modo]**: Modo de numeración — `global` (contador único) o `category` (por departamento).
- **/tickets config dept-add/dept-del**: Gestión de departamentos.
- **/tickets config preguntas-add/edit/del/list [departamento]**: Gestión de preguntas del formulario.

### 📢 Sugerencias (`/suggestions`)
- **/suggestions setup [tipo] [canal]**: Configura el canal de sugerencias y el de implementadas.
- **/suggestions send**: Envía una sugerencia mediante modal.
- **/suggestions action [url] [estado] [razon]**: Gestiona una sugerencia (staff).

### 🛡️ Moderación (`/moderation`)
- **/moderation warn/kick/ban/timeout [usuario] [razon]**: Aplica una sanción y la persiste en base de datos.
- **/moderation unban [userid]**: Desbanea por ID.
- **/moderation remove-sanction [id]**: Elimina una sanción del historial.
- **/moderation history [usuario]**: Historial de sanciones.
- **/moderation chat-clear [cantidad]**: Limpia mensajes del canal.
- **/moderation setup-roles [tipo] [rol]**: Configura el rol mínimo por nivel (Mod/Admin/Op).
- **/moderation roles-info**: Muestra los roles configurados por nivel.
- **/moderation bienvenida-setup/mensaje/estado/rol-add/rol-remove/rol-lista/vista/info**: Gestión del sistema de bienvenida y despedida.

### 🔍 Auditoría (`/audit`)
- **/audit lookup [usuario]**: Expediente completo del usuario (sanciones + tickets).
- **/audit channel [canal]**: Canal de logs automáticos.
- **/audit toggle [evento] [on/off]**: Activa/desactiva el log de un evento específico.
- **/audit toggle-all [on/off]**: Activa/desactiva todos los eventos.

### 📊 Staff (`/staff`)
- **/staff stats [staff] [dias]**: Estadísticas de un miembro del staff.
- **/staff leaderboard [periodo]**: Ranking de actividad del equipo.

### ℹ️ General
- **/botinfo**: Versión, uptime, memoria, miembros y tickets abiertos.
- **/help**: Menú de ayuda adaptado al nivel del usuario.

---

## 🚦 Flujo de Gestión de Tickets

1. **Creación**: El usuario selecciona un departamento en el menú → rellena el formulario → se crea el canal `depto-NNNNN`.
2. **Reclamación**: Staff pulsa **✋ Reclamar Ticket** → el rol staff pierde acceso global, el agente obtiene acceso individual.
3. **Add/Remove**: El agente puede invitar usuarios adicionales sin liberar el ticket.
4. **Liberación**: Staff pulsa **🔓 Liberar Ticket** → el rol staff recupera acceso.
5. **Cierre**: Se pulsa **🔒 Cerrar Ticket** → transcripción HTML generada → enviada al canal de transcripciones y al DM del usuario → canal eliminado → el usuario recibe un formulario de valoración.

---

## 📂 Base de Datos (SQLite)

- **`guild_config`**: Configuración general (roles, canales, límites, modo de contador).
- **`departments`**: Departamentos y formularios (`form_json`), con contador individual.
- **`tickets`**: Registro de tickets (estado, usuario, agente, valoración, transcripción).
- **`ticket_messages`**: Mensajes personalizados del sistema (panel, bienvenida, cierre...).
- **`suggestions`**: Sugerencias con historial de estados.
- **`sanctions`**: Historial de sanciones de moderación.
- **`welcome_roles`**: Roles automáticos de bienvenida.
- **`perm_timeouts`**: Timeouts permanentes (para reaplicado automático).

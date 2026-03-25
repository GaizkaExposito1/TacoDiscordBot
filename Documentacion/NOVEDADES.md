# 📢 Novedades — TacoManagment Bot

---

# 🆕 v1.5.0 — Auditoría completa de sanciones, correcciones y mejoras del panel

## ⚙️ Para operators

```
⚙️ | NOVEDADES — v1.5.0 (INTERNAL)

🔍 AUDITORÍA DE SANCIONES
  Todas las sanciones aplicadas via bot ahora quedan registradas
  en el log de auditoría del panel web:
  • /moderation warn    → acción: bot_warn
  • /moderation timeout → acción: bot_timeout
  • /moderation kick    → acción: bot_kick
  • /moderation ban     → acción: bot_ban

  Esto permite ver desde el panel quién aplicó cada sanción,
  cuándo y con qué razón, junto con las acciones del panel web.

📊 PANEL WEB — NOVEDADES v1.5.0
  • Diseño completo de Tickets, Moderación, Config, Sugerencias
    y Encuestas renovado.
  • Ratings visibles solo para Operadores.
  • Mensajes de bienvenida/despedida configurables desde
    la sección "Mensajes Embed" del panel.
  • Consola SQL: botón de datos de prueba para audit_logs.
```

> Esta versión no incluye cambios en comandos de Discord.

---

# 🆕 v1.4.0 — Encuestas, Slow mode, Warns automáticos, Auto-cierre de tickets y Panel Web

## � Para usuarios

```
📢 | NOVEDADES DEL BOT — v1.4.0

📊 ENCUESTAS
• Ahora puedes consultar los resultados de cualquier encuesta activa con /poll results.
• Usa /poll list para ver todas las encuestas abiertas del servidor.

🎫 TICKETS
• Los tickets inactivos ahora pueden cerrarse automáticamente.
  Si llevas mucho tiempo sin responder, el ticket se cerrará solo
  y recibirás la transcripción por DM como siempre.

Para cualquier duda, abre un ticket. 🌮
```

## 🛡️ Para staff

```
📢 | NOVEDADES DEL BOT — v1.4.0 (STAFF)

📊 ENCUESTAS (Admin+)
• Nuevo sistema de encuestas nativas de Discord.
• /poll create <#canal> → abre un formulario para configurar la encuesta.
  - Pregunta, opciones con emoji opcional (ej: 🔵 Azul), descripción/contexto,
    duración (1-168h) y si permite múltiples respuestas.
• /poll end <id_mensaje>  → cierra la encuesta y publica resultados en el canal.
• /poll results <id>      → consulta votos en tiempo real (ephemeral).
• /poll list              → lista todas las encuestas activas del servidor.
• /poll clear             → ⚠️ borra TODO el historial de encuestas del servidor. (Solo Op)

🛡️ MODERACIÓN
• /moderation slowmode <#canal> <segundos>
  → Configura el modo lento de un canal sin entrar a la configuración de Discord.
  → 0 segundos = desactivar.

⚠️ WARNS ACUMULATIVOS
• Al aplicar /moderation warn, si el usuario acumula el número de warns
  configurado por los operators, se ejecutará automáticamente una acción
  (timeout, kick o ban). El result del warn incluirá un aviso de la acción tomada.

⚠️ EXPIRACIÓN DE WARNS
• /moderation warn ahora acepta el parámetro opcional [expiracion].
  Ejemplos: 7d, 30d, 90d.
• Si se especifica, el warn expirará automáticamente al cabo de ese tiempo,
  pasando de 'activo' a 'expirado' sin intervención del staff.
• El historial (/moderation history) muestra cuándo expira cada warn.
• Los warns expirados NO cuentan para el umbral de acción automática.

🖥️ PANEL WEB (Admin+)
• El servidor ahora tiene un panel de administración web.
• Acceso en http://212.227.95.181 con tu cuenta de Discord.
• Funciones disponibles:
  - Ver y filtrar todos los tickets (abiertos y cerrados).
  - Consultar el historial de sanciones por usuario.
  - Revisar sugerencias y su estado.
  - Ver estadísticas del servidor.
  - Leer transcripts de tickets en HTML desde el navegador.
```

## ⚙️ Para operators

```
⚙️ | NOVEDADES — v1.4.0 (OPERATOR)

ENCUESTAS:
  /poll list                → ver encuestas activas
  /poll create <#canal>     → nueva encuesta (Admin+, opción: pública o solo staff)
  /poll end <id_mensaje>    → cerrar encuesta (Admin+)
  /poll results <id>        → resultados en tiempo real
  /poll clear               → borrar todo el historial de encuestas (Solo Op)

CONFIGURACIÓN NUEVA:

/moderation slowmode <#canal> <segundos>
  → Activar slow mode en un canal. [Mod+]
  → 0 = desactivar. Máximo 21600 (6h).

/moderation warn-config umbral:<N> accion:<timeout|kick|ban|none> [duracion]
  → Configura la acción automática al acumular warns.
  → Ej: umbral:3 accion:timeout duracion:1h
  → umbral:0 = desactivado.
  → Solo Operators pueden configurar esto.

/tickets config auto-close horas:<N>
  → Cierra automáticamente tickets inactivos tras N horas.
  → 0 = desactivado. Máximo 720h (30 días).
  → El bot comprueba cada 15 minutos.

🔧 MEJORA TÉCNICA INTERNA
  La base de datos ahora usa un sistema de migraciones versionado
  (tabla schema_version). Las actualizaciones futuras del bot se
  aplicarán automáticamente al arrancar sin intervención manual.

📋 PANEL DE CONFIGURACIÓN UNIFICADO
  Nuevo /config → muestra en un solo embed toda la configuración del servidor.
  Incluye: roles, canales, tickets, bienvenida, auto-roles, warns y auditoría.
  Solo Operators tienen acceso.

⚠️ EXPIRACIÓN DE WARNS
  /moderation warn usuario:<@> [razon:] [expiracion:]
  → expiracion acepta: 1d, 7d, 30d, 90d, etc.
  → Vacío = warn permanente (comportamiento anterior).
  → El bot comprueba warns expirados cada 10 minutos.

🖥️ PANEL WEB
• Acceso completo en http://212.227.95.181
• Configuración de canales y roles desde el panel (transcripts,
  sugerencias, auditoría, mod mínimo, etc.).

🔧 CORRECCIONES INTERNAS
• /help ya no genera peticiones masivas al API de Discord para
  obtener el número de miembros.
• Corrección de crash al editar mensajes que eran embeds (sin texto).
• Corrección de error al actualizar el log de cierre de un ticket
  cuyo mensaje de auditoría había sido eliminado manualmente.
```

---

# v1.3.0 — Silenciado, Tickets y Auditoría

## 👤 Para usuarios

```
📢 | NOVEDADES DEL BOT — v1.3.0

🎫 TICKETS
• Si tienes el rol de Silenciado puedes seguir escribiendo dentro de tus propios tickets aunque no puedas hablar en el resto del servidor.
• Si intentas abrir más tickets de los permitidos recibirás un aviso indicando el límite actual.

🔇 SILENCIADO
• Al recibir un timeout, se te asignará automáticamente el rol de Silenciado.
• Cuando el timeout expire, el rol se retirará solo.
• Si el staff te levanta la sanción, el rol también se elimina al instante.

ℹ️ /botinfo
• El comando ahora muestra información relevante según tu nivel en el servidor.

Para cualquier duda, abre un ticket. 🌮
```

## 🛡️ Para staff

```
📢 | NOVEDADES DEL BOT — v1.3.0 (STAFF)

🔇 SISTEMA DE SILENCIADO
• Al aplicar /moderation timeout se asigna el rol de Silenciado automáticamente.
• Al expirar el timeout, el rol se retira solo.
• /moderation remove-sanction ahora también revoca el timeout activo en Discord y retira el rol de silenciado.

🎫 TICKETS
• Los usuarios silenciados SÍ pueden escribir en sus propios tickets.

ℹ️ /botinfo
• Usuarios normales ven: IPs, web, tienda, versión, tiempo activo y miembros.
• Staff ve además: memoria, entorno, tickets abiertos y totales.
```

## ⚙️ Para operators — Configuración necesaria

```
⚙️ | GUÍA DE CONFIGURACIÓN — v1.3.0 (OPERATOR)

Acciones recomendadas tras la actualización:

1️⃣ CONFIGURAR ROL DE SILENCIADO
   /moderation silenciado-rol rol:<@rol>
   → Asegúrate de que el rol tiene acceso DENEGADO a SendMessages en los canales generales.
   → El bot se encargará de aplicarlo y retirarlo automáticamente con cada timeout.
   → Los tickets quedan excluidos: el silenciado SÍ puede escribir en los suyos.

2️⃣ AJUSTAR LÍMITE DE TICKETS POR USUARIO  (solo Operators)
   /tickets config max-tickets limite:<número>
   → Rango: 1 – 10. Por defecto: 1.
   → Si un usuario supera el límite, el bot le avisa y bloquea la apertura.

3️⃣ ELEGIR MODO DE NUMERACIÓN DE TICKETS  (solo Operators)
   /tickets config contador modo:<global|category>
   → global    → Un contador único para todos los departamentos (ej: #0042).
   → category  → Contador independiente por departamento.

4️⃣ VERIFICAR CONFIGURACIÓN ACTUAL
   /tickets config ver
   → Muestra todos los valores activos, incluidos los nuevos campos.

━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMPORTAMIENTO AUTOMÁTICO (sin acción requerida):
• /moderation timeout → asigna el rol de silenciado automáticamente.
• Timeout expirado    → el bot retira el rol sin intervención.
• /moderation remove-sanction → revoca timeout activo + retira rol de silenciado.
```

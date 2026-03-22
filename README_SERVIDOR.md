# 🌮 TacoManagment Bot — Guía del Servidor

---

## 👤 Para usuarios

```
📖 | GUÍA DEL BOT — TacoManagment

Hola! Soy el bot oficial de TacoLand 🌮
Aquí tienes todo lo que puedes hacer conmigo.

━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎫 TICKETS
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Abre un ticket desde el panel del canal correspondiente
seleccionando el departamento que necesites.

Una vez dentro de tu ticket:
• /tickets close          → Cierra tu ticket (puedes añadir una razón).
• /tickets add usuario    → Añade a otra persona a tu ticket.
• /tickets remove usuario → Elimina a alguien que hayas añadido.

Al cerrar el ticket recibirás una valoración por DM para puntuar
la atención recibida (1-5 ⭐). ¡Tu opinión nos ayuda a mejorar!

Límite: solo puedes tener un número limitado de tickets abiertos
al mismo tiempo. Si llegas al límite, cierra uno antes de abrir otro.

━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 SUGERENCIAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━
• /suggestions send → Envía una sugerencia al servidor.

Tu sugerencia llegará al canal de sugerencias donde el staff
podrá aprobarla o denegarla con su razón.

━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔇 SILENCIADO
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Si recibes un timeout, se te asignará el rol de Silenciado
automáticamente. Con ese rol:
• No puedes escribir en los canales generales.
• SÍ puedes escribir dentro de tus propios tickets.
• El rol desaparece solo cuando el timeout expira o el staff lo revoca.

━━━━━━━━━━━━━━━━━━━━━━━━━━━
ℹ️ INFORMACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━
• /botinfo → Información del bot y del servidor.
• /help    → Lista de comandos disponibles.

🎮 IP Java: play.tacoland.es  |  Bedrock: bedrock.tacoland.es
🛒 Tienda: tienda.tacoland.es  |  🌐 Web: tacoland.es
```

---

## 🛡️ Para staff

```
📖 | GUÍA DEL BOT — STAFF

━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎫 TICKETS
━━━━━━━━━━━━━━━━━━━━━━━━━━━
• /tickets claim            → Reclamar un ticket (te asigna como responsable).
• /tickets unclaim          → Liberar un ticket reclamado.
• /tickets close            → Cerrar un ticket con razón opcional.
• /tickets add usuario      → Añadir usuario al ticket.
• /tickets remove usuario   → Eliminar usuario del ticket.
• /tickets transcript       → Generar transcripción HTML del ticket.
• /tickets stats            → Estadísticas globales de tickets del servidor.
• /tickets staff-stats      → Estadísticas individuales de un miembro del staff.
• /tickets ratings          → Ver valoraciones recibidas (filtrables por usuario).

━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛡️ MODERACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━
  [Mod]   • /moderation warn            → Advertir a un usuario (queda en historial).
  [Mod]   • /moderation timeout         → Silenciar temporalmente (asigna rol Silenciado).
  [Mod]   • /moderation kick            → Expulsar a un usuario del servidor.
  [Admin] • /moderation ban             → Banear (temporal o permanente).
  [Admin] • /moderation unban           → Desbanear a un usuario por ID.
  [---]   • /moderation history         → Ver historial de sanciones de un usuario.
  [Admin] • /moderation remove-sanction → Revocar sanción: elimina del historial,
                                          revoca timeout activo y retira rol Silenciado.
  [---]   • /moderation chat-clear      → Borrar mensajes en masa.
                                          Con número o tiempo: [Mod+].
                                          Nuke completo (sin args): [Op].

━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 SUGERENCIAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━
• /suggestions action → Aprobar o denegar una sugerencia con razón.

━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 AUDITORÍA
━━━━━━━━━━━━━━━━━━━━━━━━━━━
El bot registra automáticamente: edición/borrado de mensajes,
cambios de roles, entradas/salidas de miembros y más.

• /audit lookup → Ver logs de auditoría de un usuario.
  (Los comandos de configuración de auditoría son exclusivos de Operators)

━━━━━━━━━━━━━━━━━━━━━━━━━━━
ℹ️ INFORMACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━
• /botinfo → Versión, uptime, memoria, tickets abiertos/totales.
• /help    → Lista de comandos disponibles.
```

---

## ⚙️ Para operators

```
📖 | GUÍA DEL BOT — OPERATOR

Acceso completo a toda la configuración del servidor.

━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎫 TICKETS — CONFIGURACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━
• /tickets setup                   → Crear/actualizar el panel de tickets.
• /tickets config ver              → Ver configuración actual completa.
• /tickets config roles            → Configurar rol de staff y admin de tickets.
• /tickets config logs             → Canal de logs de tickets.
• /tickets config transcripciones  → Canal donde se envían las transcripciones.
• /tickets config categoria        → Categoría de Discord donde se crean los tickets.
• /tickets config max-tickets      → Máximo de tickets abiertos por usuario (1-10).
• /tickets config contador         → Modo de numeración: global o por categoría.
• /tickets config mensaje          → Personalizar mensajes del panel, bienvenida, cierre...
• /tickets config dept-add         → Añadir departamento al panel.
• /tickets config dept-del         → Eliminar departamento.
• /tickets config preguntas-add    → Añadir pregunta al formulario de un departamento.
• /tickets config preguntas-edit   → Editar pregunta del formulario.
• /tickets config preguntas-del    → Eliminar pregunta del formulario.
• /tickets config preguntas-list   → Ver preguntas configuradas de un departamento.
• /tickets delete-history          → ⚠️ Borrar TODO el historial de tickets del servidor.

━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛡️ MODERACIÓN — CONFIGURACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━
• /moderation setup-roles    → Configurar nivel mínimo de rol para cada acción
                                (mod, admin, op).
• /moderation roles-info     → Ver la configuración actual de roles por nivel.
• /moderation silenciado-rol → Definir el rol que se asigna al aplicar un timeout.
• /moderation anuncio        → Enviar un anuncio oficial en un canal.
• /moderation update-staff   → Actualizar el rol de un miembro del staff.

━━━━━━━━━━━━━━━━━━━━━━━━━━━
👋 BIENVENIDA — CONFIGURACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━
• /moderation bienvenida-setup      → Canal de bienvenida/despedida.
• /moderation bienvenida-mensaje    → Personalizar mensaje de bienvenida o despedida.
• /moderation bienvenida-estado     → Activar/desactivar bienvenida o despedida.
• /moderation bienvenida-rol-add    → Añadir rol automático al entrar al servidor.
• /moderation bienvenida-rol-remove → Quitar rol automático.
• /moderation bienvenida-rol-lista  → Ver roles automáticos configurados.
• /moderation bienvenida-vista      → Vista previa del mensaje de bienvenida.
• /moderation bienvenida-info       → Ver configuración completa de bienvenida.

━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 SUGERENCIAS — CONFIGURACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━
• /suggestions setup → Configurar canales de sugerencias
                        (principal, aceptadas, denegadas).

━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 AUDITORÍA — CONFIGURACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━
• /audit channel    → Definir el canal donde se registran los logs.
• /audit toggle     → Activar/desactivar eventos individuales.
• /audit toggle-all → Activar/desactivar todos los eventos a la vez.
• /audit status     → Ver estado de todos los eventos.
```

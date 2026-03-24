# 🌮 TacoManagment Bot — Guía del Servidor (v1.4.0)

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
� ENCUESTAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━
• /poll results <id_mensaje> → Consulta los resultados de una encuesta activa.
• /poll list                 → Lista todas las encuestas activas del servidor.

━━━━━━━━━━━━━━━━━━━━━━━━━━━
�🔇 SILENCIADO
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
                                          Opción [expiracion] (ej: 7d, 30d) para que el
                                          warn expire automáticamente. Vacío = permanente.
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
  [Mod]   • /moderation slowmode <#canal> <seg>
                                        → Configura modo lento en un canal.
                                          0 = desactivar. Máximo 21600s (6h).

━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 SUGERENCIAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━
• /suggestions action → Aprobar o denegar una sugerencia con razón.

━━━━━━━━━━━━━━━━━━━━━━━━━━━
� ENCUESTAS (Admin+)
━━━━━━━━━━━━━━━━━━━━━━━━━━━
• /poll create <#canal> → Crea una encuesta nativa de Discord (modal con pregunta,
                          opciones con emoji, descripción, duración y multivoto).
• /poll end <id_mensaje> → Cierra la encuesta y publica los resultados en el canal.
• /poll results <id>    → Consulta votos en tiempo real (ephemeral).
• /poll list             → Lista encuestas activas (cualquier nivel puede verlo).
• /poll clear            → ⚠️ Borrar TODO el historial de encuestas. [Solo Op]

━━━━━━━━━━━━━━━━━━━━━━━━━━━
�🔍 AUDITORÍA
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
• /tickets config auto-close horas:<N> → Cierra tickets inactivos tras N horas. 0 = desactivado.
• /tickets delete-history          → ⚠️ Borrar TODO el historial de tickets del servidor.

━━━━━━━━━━━━━━━━━━━━━━━━━━━
� ENCUESTAS — GESTIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━
• /poll create <#canal>  → Crea una encuesta nativa de Discord.
• /poll end <id_mensaje> → Cierra una encuesta y publica resultados.
• /poll results <id>     → Consulta votos en tiempo real (ephemeral).
• /poll list             → Lista encuestas activas.
• /poll clear            → ⚠️ Borrar TODO el historial de encuestas del servidor.

━━━━━━━━━━━━━━━━━━━━━━━━━━━
�🛡️ MODERACIÓN — CONFIGURACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━
• /moderation setup-roles    → Configurar nivel mínimo de rol para cada acción
                                (mod, admin, op).
• /moderation roles-info     → Ver la configuración actual de roles por nivel.
• /moderation silenciado-rol → Definir el rol que se asigna al aplicar un timeout.
• /moderation warn-config umbral:<N> accion:<timeout|kick|ban|none> [duracion]
                            → Acción automática al acumular N warns. [Solo Op]
                              0 = desactivado. duracion solo aplica a timeout (ej: 1h, 30m).
                              Nota: los warns con [expiracion] expirada NO cuentan.
• /moderation slowmode <#canal> <segundos>
                            → Configura modo lento en un canal. [Mod+]
                              También disponible para uso directo en la sección de staff.
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

━━━━━━━━━━━━━━━━━━━━━━━━━━━
� CONFIGURACIÓN UNIFICADA
━━━━━━━━━━━━━━━━━━━━━━━━━━━
• /config  → Panel completo de toda la configuración del servidor en
             un único embed: roles, canales, tickets, bienvenida,
             auto-roles, warns y auditoría. [Solo Op]

━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 SISTEMA INTERNO
━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Migraciones de BD versionadas — El bot aplica automáticamente los
  cambios de base de datos al arrancar usando la tabla schema_version.
  No es necesaria ninguna intervención manual al actualizar el bot.
• Expiración de warns — El bot comprueba cada 10 minutos los warns
  con fecha de expiración y los marca como 'expirado' automáticamente.
```

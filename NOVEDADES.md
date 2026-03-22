# 📢 Novedades — TacoManagment Bot v1.3.0

---

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

---

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

---

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

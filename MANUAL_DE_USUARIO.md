# 🌮 TacoLand Management Bot - Manual de Usuario (v1.2.0)

Este documento detalla todas las funcionalidades, comandos y sistemas automáticos del bot integral de TacoLand.

---

## 1. 🎫 Sistema de Tickets
Sistema avanzado de soporte con categorías, transcripciones automáticas y sistema de valoraciones.

### `/tickets`
Comando raíz para la gestión del soporte.
*   **Subcomando: `setup`** (Admin)
    *   **Uso:** Configura el sistema inicial (categorías, roles de staff, canales de logs).
*   **Subcomando: `panel`** (Admin)
    *   **Uso:** Envía el mensaje con el menú desplegable para que los usuarios abran tickets.
*   **Subcomando: `add`**
    *   **Parámetro:** `usuario` (Obligatorio)
    *   **Efecto:** Permite a otro usuario ver el ticket actual.
*   **Subcomando: `remove`**
    *   **Parámetro:** `usuario` (Obligatorio)
    *   **Efecto:** Quita el acceso al ticket a un usuario.
*   **Subcomando: `close`**
    *   **Repercusión:** Cierra el canal, genera un **Transcript (Log de chat)** y lo envía al canal de auditoría. Permite al usuario valorar la atención con estrellas.

---

## 2. 📢 Sistema de Sugerencias
Gestión de feedback de la comunidad con seguimiento de estados y notificaciones automáticas.

### `/suggestions`
*   **Subcomando: `setup`** (Admin)
    *   **Parámetros:** `tipo` (Canal Principal, Canal de Implementadas/Novedades), `canal`.
    *   **Configuración:** Solo requiere 2 canales para funcionar. El canal **Principal** (donde se vota) y el canal de **Implementadas** (donde se anuncian las novedades).
*   **Subcomando: `send`** (Usuario)
    *   **Funcionamiento:** Abre un **Modal** (ventana emergente) para escribir la propuesta.
    *   **Repercusión:** Envía la sugerencia al canal principal con reacciones `✅` y `❌` para votación.
*   **Subcomando: `action`** (Staff)
    *   **Parámetros:** 
        *   `url`: Enlace del mensaje de la sugerencia (Obligatorio).
        *   `estado`: Aceptada, Denegada, En Desarrollo, Implementada (Obligatorio).
        *   `razon`: Comentario del staff (Opcional).
    *   **Efecto:** Edita el mensaje original, añade el comentario al historial y, si se marca como **Implementada**, envía un anuncio automático al canal de **Implementadas**.

---

## 3. 🛡️ Moderación y Auditoría
Herramientas de control y vigilancia del servidor.

### `/moderation`
*   **Subcomandos:** `warn`, `timeout`, `kick`, `ban`.
    *   **Parámetros:** `usuario` (Obligatorio), `razon` (Opcional), `duracion` (Solo en timeout).
    *   **Repercusión:** Aplica la sanción y la guarda en la base de datos perpetuamente.
*   **Subcomando: `history`**
    *   **Parámetro:** `usuario` (Opcional).
    *   **Uso:** Muestra todas las sanciones previas del usuario.

### `/audit`
*   **Subcomando: `lookup`**
    *   **Parámetro:** `usuario` (Obligatorio).
    *   **Uso:** Muestra el expediente completo: **Sanciones + Historial de Tickets (con enlaces a sus transcripciones)**.
*   **Sistema de Logs Automáticos:** Detecta y registra en el canal de auditoría:
    *   Edición y borrado de mensajes (con contenido previo).
    *   Entrada/Salida de miembros.
    *   Cambios en roles o nombres.

---

## 4. ⚙️ Utilidad y Administración

### `/botinfo`
*   **Uso:** Muestra la versión actual (`v1.2.0`), el tiempo que lleva encendido (uptime) y datos técnicos como el uso de memoria y servidor.

### `/help`
*   **Uso:** Menú visual con acceso rápido a todas estas explicaciones directamente en Discord.

---

## 💾 Sistemas Automáticos de Seguridad
*   **Backups Diarios:** El bot realiza una copia de seguridad de la base de datos al arrancar y cada 24 horas.
    *   **Retención:** Solo guarda los últimos **5 días**. Los antiguos se borran automáticamente para ahorrar espacio.
    *   **Formato:** `taco_YYYY-MM-DDTHH-mm-ss.db`.
*   **Sincronización UTC:** Todas las fechas y tiempos relativos ("hace 5 minutos") están sincronizados para mostrarse correctamente según la hora local de cada usuario de Discord.

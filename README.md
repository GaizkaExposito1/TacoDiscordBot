# 🌮 TacoManagment Bot

TacoManagment es un bot de Discord integral y modular, diseñado para la gestión completa de comunidades: soporte, moderación, auditoría, sugerencias y bienvenida.

> **Panel Web disponible:** [TacoDiscordBotWeb](https://github.com/GaizkaExposito1/TacoDiscordBotWeb) — dashboard de administración con autenticación Discord OAuth2.

## ✨ Características Principales

*   **🎫 Sistema de Tickets:**
    *   Creación mediante menú desplegable por departamentos.
    *   Formularios modales personalizables por departamento.
    *   Contador de tickets **global** o **por categoría** (configurable).
    *   Transcripciones HTML automáticas al cierre, enviadas también por DM al usuario.
    *   Las transcripciones se guardan en disco y son accesibles desde el panel web.
    *   Sistema de valoraciones con estrellas y comentarios opcionales.
    *   Reclamación de ticket (`ticket_claim`) con restricción de visibilidad al claimer.
    *   Límites de tickets por usuario configurables (`/tickets config max-tickets`).
    *   Auto-cierre por inactividad configurable (`/tickets config auto-close`).
    *   Estadísticas y ranking de staff (`/tickets stats`, `/tickets staff-stats`).

*   **🛡️ Moderación:**
    *   Warn, timeout (con soporte permanente), kick y ban con historial persistente.
    *   Desbaneo y eliminación de sanciones individuales.
    *   Limpieza de mensajes en masa (`chat-clear`).
    *   **Slow mode** por canal (`/moderation slowmode`) — 0 a 6h, activable por Mod+.
    *   **Warn acumulativo** — acción automática (timeout/kick/ban) al alcanzar el umbral configurable (`/moderation warn-config`).
    *   **Expiración automática de warns** — parámetro `expiracion` opcional al aplicar un warn (ej: `7d`, `30d`). El checker corre cada 10 minutos y marca los warns expirados automáticamente.
    *   Permisos granulares por nivel: Mod / Admin / Operador.

*   **📊 Encuestas:**
    *   Creación de encuestas nativas de Discord con modal (pregunta, opciones con emoji, duración, multivoto).
    *   Visibilidad configurable: pública o solo staff.
    *   Gestión completa: `/poll create`, `/poll end`, `/poll results`, `/poll list`, `/poll clear`.

*   **🔍 Auditoría y Logs:**
    *   Registro automático de: borrado/edición de mensajes, entrada/salida de miembros, cambios de roles, creación/borrado de canales.
    *   Toggle individual por tipo de evento (`/audit toggle`).
    *   Expediente completo por usuario (`/audit lookup`): sanciones + historial de tickets.

*   **📢 Sugerencias:**
    *   Envío vía modal con votación automática (✅/❌).
    *   Flujo de estados: Pendiente → Aceptada / Denegada / En Desarrollo / Implementada.
    *   Anuncio automático al canal de novedades al marcar como Implementada.

*   **👋 Bienvenida y Despedida:**
    *   Mensajes de bienvenida/despedida personalizables con variables (`{user}`, `{server}`, etc.).
    *   Roles automáticos al entrar al servidor.
    *   Activación/desactivación independiente de cada mensaje.

*   **⚙️ Administración:**
    *   Estado dinámico del bot (Dev/Test → "En Mantenimiento", Producción → "Watching").
    *   Backups automáticos de la base de datos (retención de 5 días).
    *   Base de datos SQLite local con **sistema de migraciones automáticas versionado** (tabla `schema_version`).
    *   **Panel de configuración unificado** (`/config`) — resumen completo en un solo embed: roles, canales, tickets, bienvenida, warns y auditoría. Solo nivel Operador.

*   **🖥️ Panel Web (dashboard):**
    *   Interfaz React + TypeScript accesible desde el navegador.
    *   Autenticación OAuth2 con Discord (sesión JWT en cookie segura).
    *   Consulta de tickets, sanciones, sugerencias y estadísticas del servidor.
    *   Configuración de canales y roles directamente desde el navegador.
    *   Visualización de transcripts de tickets en HTML.
    *   Repositorio: [TacoDiscordBotWeb](https://github.com/GaizkaExposito1/TacoDiscordBotWeb).

## 🚀 Inicio Rápido

### Requisitos

*   Node.js v18 o superior.
*   Bot de Discord con Privileged Intents activados (`GUILD_MEMBERS`, `MESSAGE_CONTENT`).

### Instalación

1.  **Clonar y configurar**
    ```bash
    git clone https://github.com/GaizkaExposito1/TacoDiscordBot.git
    cd TacoDiscordBot/bot
    npm install
    cp .env.example .env
    ```
2.  **Editar `.env`**
    Rellena `DISCORD_TOKEN`, `CLIENT_ID`, `GUILD_ID` y demás variables.

3.  **Desplegar Comandos**
    ```bash
    npm run deploy
    ```

4.  **Iniciar el Bot**
    ```bash
    npm start
    ```

## 📚 Documentación

Toda la documentación se encuentra en la carpeta [`Documentacion/`](Documentacion/):

*   **[README_SERVIDOR.md](Documentacion/README_SERVIDOR.md):** Referencia rápida de todos los comandos por nivel (usuarios, staff, operators).
*   **[NOVEDADES.md](Documentacion/NOVEDADES.md):** Historial de cambios por versión, con mensajes listos para publicar en Discord.
*   **[IMPROVEMENTS.md](Documentacion/IMPROVEMENTS.md):** Features pendientes, propuestas y análisis técnico.
*   **[MANUAL_DE_USUARIO.md](Documentacion/MANUAL_DE_USUARIO.md):** Guía completa para administradores y staff.
*   **[DEVELOPER_GUIDE.md](Documentacion/DEVELOPER_GUIDE.md):** Estructura técnica, estándares de código y flujos de trabajo.
*   **[GUIA_FORMULARIOS.md](Documentacion/GUIA_FORMULARIOS.md):** Personalización de preguntas por departamento.
*   **[DEPLOY_GUIDE_LINUX.md](Documentacion/DEPLOY_GUIDE_LINUX.md):** Instrucciones para servidores Ubuntu/Debian.
*   **[DASHBOARD_WEB_PLAN.md](Documentacion/DASHBOARD_WEB_PLAN.md):** Arquitectura e integración del panel web.

## 🛠️ Scripts Útiles

*   `npm start` — Inicia el bot.
*   `npm run dev` — Modo desarrollo con auto-reinicio.
*   `npm run deploy` — Registra/actualiza los Slash Commands en Discord.
*   `npm run backup` — Copia de seguridad manual de la base de datos.
*   `npm run clean-commands` — Elimina todos los comandos registrados (útil para limpieza).

## 📄 Licencia

Este proyecto es privado y no licenciado para uso público sin autorización.

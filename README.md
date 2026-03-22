# 🌮 TacoManagment Bot

TacoManagment es un bot de Discord integral y modular, diseñado para la gestión completa de comunidades: soporte, moderación, auditoría, sugerencias y bienvenida.

## ✨ Características Principales

*   **🎫 Sistema de Tickets:**
    *   Creación mediante menú desplegable por departamentos.
    *   Formularios modales personalizables por departamento.
    *   Contador de tickets **global** o **por categoría** (configurable).
    *   Transcripciones HTML automáticas al cierre.
    *   Sistema de valoraciones con estrellas y comentarios.
    *   Límites de tickets por usuario configurables.
    *   Estadísticas y ranking de staff (`/tickets stats`, `/tickets staff-stats`).

*   **🛡️ Moderación:**
    *   Warn, timeout (con soporte permanente), kick y ban con historial persistente.
    *   Desbaneo y eliminación de sanciones individuales.
    *   Limpieza de mensajes (`chat-clear`).
    *   Permisos granulares por nivel: Mod / Admin / Operador.

*   **🔍 Auditoría y Logs:**
    *   Registro automático de: borrado/edición de mensajes, entrada/salida de miembros, cambios de roles, creación/borrado de canales.
    *   Toggle individual por tipo de evento (`/audit toggle`).
    *   Expediente completo por usuario (`/audit lookup`): sanciones + historial de tickets.

*   **📢 Sugerencias:**
    *   Envío vía modal con votación automática (✅/❌).
    *   Flujo de estados: Pendiente → Aceptada / Denegada / En Desarrollo / Implementada.
    *   Anuncio automático al canal de noveedades al marcar como Implementada.

*   **👋 Bienvenida y Despedida:**
    *   Mensajes de bienvenida/despedida personalizables con variables (`{user}`, `{server}`, etc.).
    *   Roles automáticos al entrar al servidor.
    *   Activación/desactivación independiente de cada mensaje.

*   **⚙️ Administración:**
    *   Estado dinámico del bot (Dev/Test → "En Mantenimiento", Producción → "Watching").
    *   Backups automáticos de la base de datos (retención de 5 días).
    *   Base de datos SQLite local con migraciones automáticas.

## 🚀 Inicio Rápido

### Requisitos

*   Node.js v18 o superior.
*   Bot de Discord con Privileged Intents activados.

### Instalación

1.  **Clonar y configurar**
    ```bash
    git clone <repo_url>
    cd TacoManagment/bot
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

*   **[Manual de Usuario](MANUAL_DE_USUARIO.md):** Guía completa de todos los comandos y sistemas para administradores y staff.
*   **[Guía de Desarrollo](DEVELOPER_GUIDE.md):** Estructura técnica, estándares de código y flujos de trabajo.
*   **[Guía de Formularios](GUIA_FORMULARIOS.md):** Personalización de preguntas por departamento en el sistema de tickets.
*   **[Despliegue en Linux](DEPLOY_GUIDE_LINUX.md):** Instrucciones para servidores Ubuntu/Debian.

## 🛠️ Scripts Útiles

*   `npm start` — Inicia el bot.
*   `npm run dev` — Modo desarrollo con auto-reinicio.
*   `npm run deploy` — Registra/actualiza los Slash Commands en Discord.
*   `npm run backup` — Copia de seguridad manual de la base de datos.
*   `npm run clean-commands` — Elimina todos los comandos registrados (útil para limpieza).

## 📄 Licencia

Este proyecto es privado y no licenciado para uso público sin autorización.

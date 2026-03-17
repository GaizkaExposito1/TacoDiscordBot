# 🌮 TacoManagment Bot

TacoManagment es un bot de Discord profesional y modular, diseñado para la gestión eficiente de tickets y soporte.

## ✨ Características Principales

*   **Sistema de Tickets Avanzado:**
    *   Creación mediante menú desplegable (categorías/departamentos).
    *   Formularios modales personalizables (`/config departamento-formulario`).
    *   Límites de tickets por usuario.
    *   Contadores de tickets globales y por departamento.
*   **Gestión de Staff:**
    *   Roles de Staff y Admin configurables.
    *   Sistema de "Reclamar" (`Claim`) y "Liberar" (`Unclaim`) tickets.
    *   Avisos de inactividad (futura expansión).
*   **Auditoría y Logs:**
    *   Registro detallado de acciones (creación, cierre, cambios de config).
    *   Transcripciones HTML de tickets cerrados.
*   **Modularidad:**
    *   Estructura clara (`src/modules/tickets`) para fácil mantenimiento.
    *   Base de datos SQLite local (`better-sqlite3`).
*   **Estado Dinámico:**
    *   Indicador visual de entorno (Dev/Test muestra "En Mantenimiento", Producción muestra "Watching Tickets").

## 🚀 Inicio Rápido

### Requisitos

*   Node.js v18 o superior.
*   Bot de Discord con Privileged Intents activados.

### Instalación

1.  **Clonar y configurar**
    ```bash
    git clone <repo_url>
    cd TacoManagment
    npm install
    cp .env.example .env
    ```
2.  **Editar `.env`**
    Rellena `DISCORD_TOKEN`, `CLIENT_ID`, `GUILD_ID` y demás variables.

3.  **Desplegar Comandos**
    Registra los comandos (Slash Commands) en tu servidor:
    ```bash
    npm run deploy
    ```

4.  **Iniciar el Bot**
    ```bash
    npm start
    ```

## 📚 Documentación

*   **[Documentación de Usuario e Instalación](DOCUMENTACION_BOT.md):** Guía completa de uso y comandos para administradores.
*   **[Guía de Desarrollo](DEVELOPER_GUIDE.md):** Información técnica para contribuidores (estructura, estándares, testing).
*   **[Guía de Formularios](GUIA_FORMULARIOS.md):** Detalles sobre cómo personalizar las preguntas de los tickets.
*   **[Despliegue en Linux](DEPLOY_GUIDE_LINUX.md):** Instrucciones específicas para servidores Linux (Ubuntu/Debian).

## 🛠️ Scripts Útiles

*   `npm test`: Ejecuta las pruebas unitarias.
*   `npm run backup`: Realiza una copia de seguridad de la base de datos.
*   `npm run clean-commands`: Elimina los comandos registrados en Discord (útil para limpieza).

## 📄 Licencia

Este proyecto es privado y no licenciado para uso público sin autorización.

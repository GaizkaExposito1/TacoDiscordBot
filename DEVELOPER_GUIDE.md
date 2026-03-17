# 🛠️ Guía de Desarrollo - TacoManagment

Esta guía está destinada a los desarrolladores que deseen contribuir o mantener el bot TacoManagment. Aquí se detallan la estructura del proyecto, las convenciones de código y los flujos de trabajo recomendados.

## 📂 Estructura del Proyecto

El proyecto sigue una estructura modular basada en características:

```
src/
├── database/           # Configuración y esquemas de la base de datos (SQLite)
├── handlers/           # Manejadores de eventos y comandos
├── modules/            # Módulos principales del bot
│   └── tickets/        # Módulo de Sistema de Tickets
│       ├── commands/   # Comandos Slash (config, ticket, setup-tickets)
│       ├── events/     # Eventos específicos del módulo (interacciones)
│       └── services/   # Lógica de negocio (crear, cerrar, reclamar tickets)
├── utils/              # Utilidades compartidas (logger, respuestas, embeds)
├── index.js            # Punto de entrada de la aplicación
└── client.js           # Configuración del cliente de Discord
tests/                  # Pruebas unitarias e integración
```

## 🧩 Estándares de Código

### Respuestas Estandarizadas (`src/utils/responses.js`)

Para mantener la consistencia en las respuestas del bot y manejar correctamente los estados de interacción (deferred, replied, ephemeral), **SIEMPRE** utiliza las funciones helper en lugar de `interaction.reply` directamente.

**Importación:**
```javascript
const { replyError, replySuccess, replyInfo, replyWarning } = require('../../utils/responses');
```

**Uso:**

1.  **✅ Éxito (`replySuccess`)**:
    Usado para confirmar que una acción se completó correctamente.
    ```javascript
    // Por defecto es público (ephemeral: false)
    await replySuccess(interaction, 'La configuración ha sido guardada.');
    
    // Para hacerlo privado (ephemeral: true)
    await replySuccess(interaction, 'Datos guardados.', true);
    ```

2.  **❌ Error (`replyError`)**:
    Usado para errores de validación, permisos o fallos internos.
    ```javascript
    // Por defecto es privado (ephemeral: true)
    await replyError(interaction, 'No tienes permisos para usar este comando.');
    ```

3.  **ℹ️ Información (`replyInfo`)**:
    Usado para mostrar datos informativos o listas.
    ```javascript
    // Por defecto es privado (ephemeral: true)
    await replyInfo(interaction, 'Lista de Roles', 'Aquí están los roles configurados...');
    ```

4.  **⚠️ Advertencia (`replyWarning`)**:
    Usado para acciones que requieren atención pero no son errores bloqueantes.
    ```javascript
    // Por defecto es privado (ephemeral: true)
    await replyWarning(interaction, 'Este comando está en fase beta.');
    ```

**Ventajas:**
*   Maneja automáticamente `interaction.deferReply`, `interaction.editReply`, `interaction.followUp` y `interaction.reply`.
*   Asegura colores y formatos consistentes en los Embeds.

### Logging (`src/utils/logger.js`)

Utiliza el logger basado en `winston` para registrar eventos. No uses `console.log`.

```javascript
const logger = require('../../utils/logger');

logger.info('Bot iniciado correctamente.');
logger.error('Error al conectar con la base de datos:', error);
logger.warn('Configuración falta en el servidor X');
```

## 🧪 Testing

El proyecto utiliza **Jest** para pruebas unitarias.

**Ejecutar pruebas:**
```bash
npm test
```

**Estructura de Tests:**
Los tests se encuentran en la carpeta `tests/`. Se recomienda crear un archivo de test por cada módulo o utilidad crítica.

Ejemplo: `tests/utils/responses.test.js` prueba la utilidad de respuestas estandarizadas, usando mocks para `discord.js`.

## 🗄️ Base de Datos

Se utiliza `better-sqlite3` para una gestión eficiente y síncrona de SQLite.

*   El archivo de la base de datos se encuentra en `data/database.sqlite`.
*   Las migraciones o la estructura inicial se definen en `src/database/database.js` (función `initDB`).

## 🚀 Añadir un Nuevo Comando

1.  Crea el archivo en `src/modules/<modulo>/commands/<nombre>.js`.
2.  Exporta un objeto con `data` (SlashCommandBuilder) y `execute`.
3.  Usa `replySuccess`, `replyError`, etc. para las respuestas.
4.  Si es un comando nuevo, regístralo ejecutando:
    ```bash
    node deploy-commands.js
    ```

## 🤝 Contribución

1.  Asegúrate de que los tests pasen (`npm test`).
2.  Sigue el estilo de código existente.
3.  Documenta cualquier nuevo módulo o función compleja.

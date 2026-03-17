const { createLogger, format, transports } = require('winston');
const path = require('path');
// Importar configuración de entorno validada
let env;
try {
    env = require('../config/env');
} catch (e) {
    // Fallback por si hay un error circular o de carga inicial
    env = process.env;
}

const { combine, timestamp, printf, colorize, errors } = format;

// Directorio de logs
const LOG_DIR = path.join(__dirname, '..', '..', 'logs');

// Formato personalizado para consola: [timestamp] [level]: mensaje
const customFormat = printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} [${level}]: ${stack || message}`;
});

const logger = createLogger({
    level: (env.NODE_ENV === 'test' || env.NODE_ENV === 'Test') ? 'silent' : 'info',
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }), // Captura stack traces
        format.json() // Formato interno JSON para archivos
    ),
    defaultMeta: { service: 'taco-managment' },
    transports: [
        // Errores graves en archivo separado
        new transports.File({ 
            filename: path.join(LOG_DIR, 'error.log'), 
            level: 'warn', 
        }),
        // Todo lo demás en archivo combinado
        new transports.File({ 
            filename: path.join(LOG_DIR, 'combined.log') 
        }),
    ],
    // Manejo de excepciones no capturadas globalmente
    exceptionHandlers: [
        new transports.File({ filename: path.join(LOG_DIR, 'exceptions.log') })
    ],
    rejectionHandlers: [
        new transports.File({ filename: path.join(LOG_DIR, 'rejections.log') })
    ], 
});

// En desarrollo, también imprimimos en consola con colores
if (env.NODE_ENV !== 'production' && env.NODE_ENV !== 'Produccion') {
    logger.add(new transports.Console({
        format: combine(
            colorize(),
            timestamp({ format: 'HH:mm:ss' }),
            customFormat
        ),
    }));
} else {
    // Incluso en producción, es útil ver logs en la consola del contenedor/servicio
    logger.add(new transports.Console({
        format: combine(
            timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            customFormat
        ),
    }));
}

module.exports = logger;

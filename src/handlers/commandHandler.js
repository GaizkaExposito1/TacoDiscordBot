const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');
const env = require('../config/env');
const logger = require('../utils/logger'); // Importar logger

/**
 * Carga todos los comandos de todos los módulos recursivamente.
 * Estructura esperada: src/modules/<modulo>/commands/<comando>.js
 * @param {import('discord.js').Client} client
 */
function loadCommands(client) {
    client.commands = new Collection();
    const modulesPath = path.join(__dirname, '..', 'modules');

    if (!fs.existsSync(modulesPath)) return;

    const modules = fs.readdirSync(modulesPath).filter(f =>
        fs.statSync(path.join(modulesPath, f)).isDirectory()
    );

    for (const mod of modules) {
        const commandsPath = path.join(modulesPath, mod, 'commands');
        if (!fs.existsSync(commandsPath)) continue;

        const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

        for (const file of commandFiles) {
            const command = require(path.join(commandsPath, file));
            if (command.data && command.execute) {
                // Clonamos el objeto comando para no modificar la referencia original del require
                const cmd = { ...command };
                cmd.module = mod; // Carpeta del módulo (admin / audit / general / tickets)

                // Si estamos en entorno de desarrollo, añadir prefijo 'd'
                if (env.NODE_ENV === 'development') {
                   try {
                       // Intento de clonación segura para SlashCommandBuilder
                       // Requerimos clonar porque .setName() muta la instancia
                       if (typeof cmd.data.toJSON === 'function') {
                           // Opción A: Crear una nueva instancia basada en json (si tuviéramos acceso al constructor fácilmente)
                           // Opción B (Más simple): Mutar una copia del builder si tiene metodo clone, o asumir riesgo controlado
                           // Como JS no tiene clone nativo profudo fácil para clases privadas, 
                           // lo más efectivo aquí es modificar el nombre PERO asegurando que limpiamos cache si recargamos.
                           
                           // Hack: Si ya tiene el prefijo 'd', no lo ponemos otra vez (idempotencia)
                           if (!cmd.data.name.startsWith('d')) {
                               cmd.data.setName(`d${cmd.data.name}`);
                           }
                       } 
                   } catch (e) {
                       logger.warn(`[Commands] No se pudo renombrar ${cmd.data.name}:`, e.message);
                   }
                }

                client.commands.set(cmd.data.name, cmd);
                logger.info(`[Commands] ✔ /${cmd.data.name} (${mod})`);
            } else {
                logger.warn(`[Commands] ⚠ ${file} en ${mod} no tiene data/execute.`);
            }
        }
    }

    logger.info(`[Commands] ${client.commands.size} comando(s) cargado(s).`);
}

module.exports = { loadCommands };

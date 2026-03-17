const { ActivityType, Events } = require('discord.js');
const logger = require('../utils/logger');
const env = require('../config/env');
const { exec } = require('child_process');
const path = require('path');

module.exports = {
    name: Events.ClientReady, // v15 ready replacement
    once: true,
    execute(client) {
        logger.info('━'.repeat(50));
        logger.info(`[Bot] ✅ ${client.user.tag} está en línea.`);
        logger.info(`[Bot] 📡 Servidores: ${client.guilds.cache.size}`);
        logger.info(`[Bot] 🔧 Comandos: ${client.commands.size}`);
        logger.info('━'.repeat(50));

        // Programar backup cada 24 horas y ejecutar una al iniciar
        const runBackup = () => {
            const scriptPath = path.join(__dirname, '../../scripts/backup_db.js');
            exec(`node ${scriptPath}`, (error, stdout, stderr) => {
                if (error) {
                    logger.error(`[Backup] Error al ejecutar backup: ${error.message}`);
                    return;
                }
                if (stdout) logger.info(`[Backup] ${stdout.trim()}`);
                if (stderr) logger.warn(`[Backup] ${stderr.trim()}`);
            });
        };

        // Ejecutar backup al iniciar
        runBackup();

        // Programar intervalo de 24 horas (86400000 ms)
        setInterval(runBackup, 24 * 60 * 60 * 1000);

        if (env.isDev || env.isTest) {
            client.user.setPresence({
                activities: [{ 
                    name: 'customstatus',
                    state: '🛠️ En Mantenimiento', 
                    type: ActivityType.Custom,
                }],
                status: 'dnd',
            });
        } else {
            client.user.setPresence({
                activities: [{ 
                    name: 'Gestión Integral | /help', 
                    type: ActivityType.Playing 
                }],
                status: 'online',
            });
        }
    },
};

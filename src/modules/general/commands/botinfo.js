const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { version } = require('../../../../package.json');
const os = require('os');
const env = require('../../../config/env');
const logger = require('../../../utils/logger');
const { getTicketStats } = require('../../../database/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('botinfo')
        .setDescription('Muestra información y biografía del bot.'),

    async execute(interaction) {
        try {
            const uptime = process.uptime();
            const days = Math.floor(uptime / 86400);
            const hours = Math.floor(uptime / 3600) % 24;
            const minutes = Math.floor(uptime / 60) % 60;
            const seconds = Math.floor(uptime % 60);

            // Obtener estadísticas de tickets si estamos en un servidor
            // (Ya no se muestran en el embed, pero mantenemos la llamada por si acaso se re-habilita,
            // aunque si getTicketStats cambió su estructura, esto no importa porque no lo usamos).
            // let ticketStats = { total: 0, currentOpen: 0, closed: 0 };
            // if (interaction.guild) {
            //    ticketStats = getTicketStats(interaction.guild.id);
            // }

            // Traducir nombre del entorno para mostrar
            let entornoDisplay = env.NODE_ENV;
            if (env.NODE_ENV === 'production' || env.NODE_ENV === 'Produccion') entornoDisplay = 'Producción';
            else if (env.NODE_ENV === 'development' || env.NODE_ENV === 'Desarrollo') entornoDisplay = 'Desarrollo';
            else if (env.NODE_ENV === 'test' || env.NODE_ENV === 'Test') entornoDisplay = 'Test';

            const embed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle(`🌮 Información de ${interaction.client.user.username}`)
                .setDescription(
                    '**¡Hola!** Soy el asistente virtual oficial de **TacoLand**. 🌮\n\n' +
                    'Mi misión es ayudarte a gestionar tus tickets de soporte de manera rápida y eficiente, ' +
                    'asegurando que disfrutes al máximo de tu experiencia en nuestro servidor de Minecraft.\n\n' +
                    '🎮 **IP del Servidor en Java:** `play.tacoland.es`\n' +
                    '🎮 **IP del Servidor en Bedrock:** `bedrock.tacoland.es`\n' +
                    '🛒 **Tienda:** [tienda.tacoland.net](https://tienda.tacoland.es)\n' +
                    '🌐 **Web:** [tacoland.net](https://tacoland.es)\n\n' +
                    '¿Necesitas ayuda? ¡Abre un ticket y nuestro staff te atenderá encantado!'
                )
                .addFields(
                    // Separador visual (campo vacío) para separar la sección de tickets
                    { name: '\u200B', value: '', inline: false },
                    { name: '🛠️ Desarrollador', value: 'Marven', inline: true },
                    { name: '🏷️ Versión', value: `v${version}`, inline: true },
                    { name: '🌍 Entorno', value: `${entornoDisplay}`, inline: true },
                    { name: '⏱️ Tiempo Activo ', value: `${days}d ${hours}h ${minutes}m ${seconds}s`, inline: true },
                    { name: '💾 Memoria Usada', value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, inline: true },
                    // { name: '📡 Servidores', value: `${interaction.client.guilds.cache.size}`, inline: true },
                    { name: '👥 Miembros ', value: `${interaction.guild?.memberCount || 'N/A'}`, inline: true }
                )
                .setThumbnail(interaction.client.user.displayAvatarURL())
                .setFooter({ text: 'Tacoland Network', iconURL: interaction.client.user.displayAvatarURL() })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            logger.error('[BotInfo] Error executing command:', error);
            await interaction.reply({ content: 'Hubo un error al ejecutar el comando.', ephemeral: true });
        }
    },
};

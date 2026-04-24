const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { version } = require('../../../../package.json');
const env = require('../../../config/env');
const logger = require('../../../utils/logger');
const { getTicketStats, getGuildConfig } = require('../../../database/database');
const { getMemberLevel } = require('../../../utils/permCheck');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('botinfo')
        .setDescription('Muestra información y estadísticas del bot.'),

    async execute(interaction) {
        try {
            const uptime = process.uptime();
            const days = Math.floor(uptime / 86400);
            const hours = Math.floor(uptime / 3600) % 24;
            const minutes = Math.floor(uptime / 60) % 60;
            const seconds = Math.floor(uptime % 60);

            // Traducir nombre del entorno
            let entornoDisplay = env.NODE_ENV;
            if (env.NODE_ENV === 'production' || env.NODE_ENV === 'Produccion') entornoDisplay = 'Producción';
            else if (env.NODE_ENV === 'development' || env.NODE_ENV === 'Desarrollo') entornoDisplay = 'Desarrollo';
            else if (env.NODE_ENV === 'test' || env.NODE_ENV === 'Test') entornoDisplay = 'Test';

            // Determinar nivel del usuario
            const config = interaction.guild ? getGuildConfig(interaction.guild.id) : null;
            const level = interaction.member ? getMemberLevel(interaction.member, config) : 'user';
            const isStaff = ['mod', 'admin', 'op'].includes(level);

            // Contar miembros aproximado (sin fetch masivo que causa rate limits)
            let humanCount = 'N/A';
            if (interaction.guild) {
                humanCount = interaction.guild.approximateMemberCount ?? interaction.guild.memberCount ?? 'N/A';
            }

            const embed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle(`🌮 Información de ${interaction.client.user.username}`)
                .setDescription(
                    '**¡Hola!** Soy el asistente oficial de **TacoLand** 🌮\n\n' +
                    '🎮 **IP Java:** `play.tacoland.es` | **Bedrock:** `bedrock.tacoland.es`\n' +
                    '🛒 **Tienda:** [tienda.tacoland.es](https://tienda.tacoland.es) · 🌐 **Web:** [tacoland.es](https://tacoland.es)\n\n' +
                    '¿Necesitas ayuda? ¡Abre un ticket y nuestro staff te atenderá!'
                )
                .addFields(
                    { name: '🏷️ Versión', value: `v${version}`, inline: true },
                    { name: '⏱️ Tiempo Activo', value: `${days}d ${hours}h ${minutes}m ${seconds}s`, inline: true },
                    { name: '👥 Miembros', value: `${humanCount}`, inline: true },
                )
                .setThumbnail(interaction.client.user.displayAvatarURL())
                .setFooter({ text: 'Tacoland Network', iconURL: interaction.client.user.displayAvatarURL() })
                .setTimestamp();

            // Información adicional solo para staff
            if (isStaff) {
                let ticketsAbiertos = 'N/A';
                let ticketsTotal = 'N/A';
                if (interaction.guild) {
                    const stats = getTicketStats(interaction.guild.id);
                    ticketsAbiertos = String(stats.currentOpen ?? 0);
                    ticketsTotal = String(stats.total ?? 0);
                }
                embed.addFields(
                    { name: '\u200B', value: '**— Sistema —**', inline: false },
                    { name: '🛠️ Desarrollador', value: 'Marven', inline: true },
                    { name: '🌍 Entorno', value: `${entornoDisplay}`, inline: true },
                    { name: '💾 Memoria', value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, inline: true },
                    { name: '🟢 Tickets Abiertos', value: ticketsAbiertos, inline: true },
                    { name: '📦 Tickets Totales', value: ticketsTotal, inline: true },
                );
            }

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            logger.error('[BotInfo] Error executing command:', error);
            await interaction.reply({ content: 'Hubo un error al ejecutar el comando.', ephemeral: true });
        }
    },
};

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Muestra la lista de comandos disponibles y ayuda sobre el bot.'),

    async execute(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setTitle(`🌮 Ayuda de ${interaction.client.user.username}`)
                .setDescription(
                    '¡Hola! Soy el asistente integral de **TacoLand**. Aquí tienes una lista de mis capacidades y comandos principales.\n\n' +
                    'Usa los comandos empezando con `/` para interactuar conmigo.'
                )
                .setColor('#FF9900')
                .setThumbnail(interaction.client.user.displayAvatarURL())
                .addFields(
                    { 
                        name: '🎫 Soporte y Tickets', 
                        value: '`/tickets setup` - Configura el sistema de tickets (Admin).\n' +
                                '`/tickets panel` - Crea un panel de apertura de tickets.\n' +
                                '`/tickets add/remove` - Gestiona usuarios en un ticket.\n' +
                                '`/tickets close` - Cierra un ticket de soporte.'
                    },
                    { 
                        name: '📢 Sugerencias', 
                        value: '`/suggestions setup` - Configura los canales de sugerencias (Admin).\n' +
                                '`/suggestions send` - Envía una nueva sugerencia a la comunidad.\n' +
                                '`/suggestions action` - Acepta o deniega sugerencias (Staff).'
                    },
                    { 
                        name: '🛡️ Moderación', 
                        value: '`/moderation warn` - Aplica una advertencia a un usuario.\n' +
                                '`/moderation timeout` - Silencia a un usuario temporalmente.\n' +
                                '`/moderation kick/ban` - Expulsa o prohíbe la entrada a un usuario.\n' +
                                '`/moderation history` - Consulta el historial de sanciones.'
                    },
                    { 
                        name: '🔍 Auditoría y Utilidad', 
                        value: '`/audit lookup` - Investiga el historial completo de un usuario (Tickets + Sanciones).\n' +
                                '`/botinfo` - Muestra estadísticas y detalles técnicos del bot.\n' +
                                '`/help` - Muestra este mensaje de ayuda.'
                    },
                    {
                        name: '🌐 Enlaces Útiles',
                        value: '🔗 **IP:** `play.tacoland.es` / `bedrock.tacoland.es`\n' +
                                '🛒 **Tienda:** [tienda.tacoland.es](https://tienda.tacoland.es)\n' +
                                '🌐 **Web:** [tacoland.es](https://tacoland.es)'
                    }
                )
                .setFooter({ 
                    text: `Solicitado por ${interaction.user.tag}`, 
                    iconURL: interaction.user.displayAvatarURL() 
                })
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            logger.error('[HelpCommand] Error al ejecutar:', error);
            await interaction.reply({ 
                content: '❌ Hubo un error al intentar mostrar el menú de ayuda.', 
                ephemeral: true 
            });
        }
    },
};

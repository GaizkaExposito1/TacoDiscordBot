const logger = require('./logger');
const { simpleEmbed } = require('./embeds');
const { COLORS } = require('./constants');

/**
 * Ejecuta una función de comando de forma segura, capturando errores y respondiendo al usuario.
 * @param {import('discord.js').Interaction} interaction
 * @param {Function} executeFunction - La función async a ejecutar
 */
async function safeExecute(interaction, executeFunction) {
    try {
        await executeFunction(interaction);
    } catch (error) {
        // Identificar contexto (comando o componente)
        const context = interaction.commandName 
            ? `/${interaction.commandName}` 
            : `Component: ${interaction.customId}`;
            
        logger.error(`[Runtime Error] ${context}:`, error);

        const errorEmbed = simpleEmbed(
            '❌ Error Inesperado',
            'Ha ocurrido un error interno al procesar tu solicitud.\nEl incidente ha sido registrado automáticamente.',
            COLORS.DANGER
        );

        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        } catch (deliveryError) {
            logger.error(`[Error Delivery] No se pudo enviar el mensaje de error al usuario en ${context}:`, deliveryError);
        }
    }
}

module.exports = { safeExecute };

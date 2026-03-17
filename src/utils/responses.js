const { simpleEmbed } = require('./embeds');
const { COLORS } = require('./constants');

// NOTA: Como hemos pospuesto i18n, estas funciones aceptan strings directos
// En el futuro, se puede integrar i18next aquí mismo de forma transparente.

/**
 * Responde a una interacción con un mensaje de error estandarizado.
 * @param {import('discord.js').Interaction} interaction 
 * @param {string} message - Mensaje de error.
 * @param {boolean} ephemeral - Si el mensaje debe ser visible solo para el usuario (default: true).
 */
async function replyError(interaction, message, ephemeral = true) {
    const embed = simpleEmbed('❌ Error', message, COLORS.DANGER)
        .setTimestamp();

    if (interaction.deferred) {
        return interaction.editReply({ embeds: [embed] });
    }
    if (interaction.replied) {
        return interaction.followUp({ embeds: [embed], ephemeral });
    }
    return interaction.reply({ embeds: [embed], ephemeral });
}

/**
 * Responde a una interacción con un mensaje de éxito estandarizado.
 * @param {import('discord.js').Interaction} interaction 
 * @param {string} message - Mensaje de éxito.
 * @param {boolean} ephemeral - Si el mensaje debe ser visible solo para el usuario (default: false).
 */
async function replySuccess(interaction, message, ephemeral = false) {
    const embed = simpleEmbed('✅ Éxito', message, COLORS.SUCCESS);

    if (interaction.deferred) {
        return interaction.editReply({ embeds: [embed] });
    }
    if (interaction.replied) {
        return interaction.followUp({ embeds: [embed], ephemeral });
    }
    return interaction.reply({ embeds: [embed], ephemeral });
}

/**
 * Responde a una interacción con un mensaje informativo estandarizado.
 * @param {import('discord.js').Interaction} interaction 
 * @param {string} title - Título del mensaje.
 * @param {string} message - Contenido del mensaje.
 * @param {boolean} ephemeral - Si el mensaje debe ser visible solo para el usuario (default: true).
 */
async function replyInfo(interaction, title, message, ephemeral = true) {
    // Si title y message son lo mismo o title es null, ajustar
    if (!message && title) {
        message = title;
        title = 'ℹ️ Información';
    }
    
    const embed = simpleEmbed(title || 'ℹ️ Información', message, COLORS.INFO);

    if (interaction.deferred) {
        return interaction.editReply({ embeds: [embed] });
    }
    if (interaction.replied) {
        return interaction.followUp({ embeds: [embed], ephemeral });
    }
    return interaction.reply({ embeds: [embed], ephemeral });
}

/**
 * Responde a una interacción con un mensaje de advertencia estandarizado.
 * @param {import('discord.js').Interaction} interaction 
 * @param {string} message - Contenido del mensaje.
 * @param {boolean} ephemeral - Si el mensaje debe ser visible solo para el usuario (default: true).
 */
async function replyWarning(interaction, message, ephemeral = true) {
    const embed = simpleEmbed('⚠️ Advertencia', message, COLORS.WARNING);

    if (interaction.deferred) {
        return interaction.editReply({ embeds: [embed] });
    }
    if (interaction.replied) {
        return interaction.followUp({ embeds: [embed], ephemeral });
    }
    return interaction.reply({ embeds: [embed], ephemeral });
}

module.exports = { replyError, replySuccess, replyInfo, replyWarning };

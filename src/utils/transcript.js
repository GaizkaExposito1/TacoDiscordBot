const discordTranscripts = require('discord-html-transcripts');
const { AttachmentBuilder } = require('discord.js');

/**
 * Genera una transcripción HTML del canal y la retorna como attachment.
 * @param {import('discord.js').TextChannel} channel
 * @param {Object} options
 * @returns {Promise<AttachmentBuilder>}
 */
async function generateTranscript(channel, options = {}) {
    
    // Opciones base mejoradas (Improved HTML Transcripts)
    const transcript = await discordTranscripts.createTranscript(channel, {
        returnType: 'attachment',
        filename: `ticket-${options.ticketId ?? channel.name}.html`,
        poweredBy: false,
        saveImages: true, // Guarda imágenes locales para que el HTML sea autosuficiente
        footerText: `Exportado desde ${channel.guild.name} • ${new Date().toLocaleDateString()}`,
        hydrate: true, // Hidrata el HTML para mejor rendimiento/funcionalidad
        limit: -1, // Exportar todo el canal
        ...options, // Sobrescribe con opciones específicas si las hay
    });

    return transcript;
}

module.exports = { generateTranscript };

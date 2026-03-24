const discordTranscripts = require('discord-html-transcripts');
const { AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const TRANSCRIPTS_DIR = path.join(__dirname, '../../../dashboard/server/transcripts');

/**
 * Genera una transcripción HTML del canal.
 * - Crea un AttachmentBuilder para adjuntar en Discord.
 * - Guarda el HTML en disco para el panel web.
 * @param {import('discord.js').TextChannel} channel
 * @param {Object} options
 * @returns {Promise<{ attachment: AttachmentBuilder, localUrl: string|null }>}
 */
async function generateTranscript(channel, options = {}) {
    const filename = options.filename ?? `ticket-${options.ticketId ?? channel.name}.html`;

    let htmlBuffer;
    try {
        htmlBuffer = await discordTranscripts.createTranscript(channel, {
            poweredBy: false,
            footerText: `Exportado desde ${channel.guild.name} • ${new Date().toLocaleDateString()}`,
            limit: -1,
            returnType: 'buffer',
            filename,
        });
    } catch (err) {
        logger.error('[Transcript] Error generando HTML con discord-html-transcripts:', err);
        throw err;
    }

    const attachment = new AttachmentBuilder(htmlBuffer, { name: filename });

    // Guardar en disco para el panel web
    let localUrl = null;
    try {
        fs.mkdirSync(TRANSCRIPTS_DIR, { recursive: true });
        fs.writeFileSync(path.join(TRANSCRIPTS_DIR, filename), htmlBuffer);
        localUrl = `/transcripts/${filename}`;
        logger.info(`[Transcript] Guardado en disco: ${filename}`);
    } catch (err) {
        logger.error('[Transcript] Error guardando HTML en disco:', err);
    }

    return { attachment, localUrl };
}

module.exports = { generateTranscript };

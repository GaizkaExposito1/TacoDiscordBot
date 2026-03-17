const { EmbedBuilder } = require('discord.js');

const COLORS = {
    CREATE: '#43b581', // Verde
    DELETE: '#f04747', // Rojo
    UPDATE: '#faa61a', // Naranja/Amarillo
    MEMBER: '#7289da'  // Azul Discord
};

/**
 * Crea un embed base para logs de auditoría.
 * @param {object} params
 * @param {string} params.title Título del embed (ej: "Mensaje Eliminado")
 * @param {string} params.color Color del embed (CREATE, DELETE, UPDATE, MEMBER)
 * @param {import('discord.js').User|null} params.executor Usuario que realizó la acción
 * @param {import('discord.js').User|null} params.target Usuario/Canal target (opcional)
 * @param {string} params.details Texto principal o descripción (opcional)
 */
function createLogEmbed({ title, color, executor, target, details }) {
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setColor(COLORS[color] || COLORS.UPDATE)
        .setTimestamp();

    if (details) {
        embed.setDescription(details);
    }

    if (executor) {
        embed.addFields({ name: 'Ejecutado por', value: `${executor} (\`${executor.id}\`)`, inline: true });
        embed.setFooter({ text: `ID Usuario: ${executor.id}`, iconURL: executor.displayAvatarURL() });
    }

    if (target) {
        // Si es usuario
        if (target.username) {
             embed.addFields({ name: 'Usuario Afectado', value: `${target} (\`${target.id}\`)`, inline: true });
        } else {
             // Si es canal o rol (tiene name)
             embed.addFields({ name: 'Objetivo', value: `\`${target.name}\` (\`${target.id}\`)`, inline: true });
        }
    }

    return embed;
}

module.exports = { createLogEmbed, COLORS };

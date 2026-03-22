const { getDatabase, getGuildConfig } = require('../../../../database/database');
const { requireLevel } = require('../../../../utils/permCheck');
const logger = require('../../../../utils/logger');
const { simpleEmbed } = require('../../../../utils/embeds');

module.exports = {
    async execute(interaction) {
        const userId = interaction.options.getString('usuario_id');
        const reason = interaction.options.getString('razon') || 'Sin razón proporcionada';
        const guild = interaction.guild;
        const db = getDatabase();

        // --- VERIFICACIÓN DE ROLES ---
        const config = getGuildConfig(guild.id);
        if (!await requireLevel(interaction, config, 'admin')) return;

        try {
            // Intentar desbanear en Discord
            await guild.members.unban(userId, reason);

            // Marcar cualquier baneo pendiente en el historial como revocado
            db.prepare("UPDATE sanctions SET status = 'revoked' WHERE guild_id = ? AND user_id = ? AND type = 'ban' AND status = 'active'").run(guild.id, userId);

            // Eliminar de temp_bans si existía
            db.prepare('DELETE FROM temp_bans WHERE guild_id = ? AND user_id = ?').run(guild.id, userId);

            return interaction.reply({ 
                embeds: [simpleEmbed('Usuario Desbaneado', `✅ Se ha retirado el baneo de <@${userId}> (\`${userId}\`).\n**Razón:** ${reason}`, '#00ff00')] 
            });

        } catch (error) {
            if (error.code === 10013 || error.code === 10026) { // Unknown User o Unknown Ban
                return interaction.reply({ content: `❌ El usuario con ID \`${userId}\` no está baneado en este servidor.`, ephemeral: true });
            }
            logger.error(`Error al retirar baneo para ${userId}:`, error);
            return interaction.reply({ content: `❌ Ocurrió un error al intentar desbanear al usuario: ${error.message}`, ephemeral: true });
        }
    }
};
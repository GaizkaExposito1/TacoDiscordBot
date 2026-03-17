const { PermissionFlagsBits } = require('discord.js');
const { getDatabase, getGuildConfig } = require('../../../../database/database');
const logger = require('../../../../utils/logger');
const { simpleEmbed } = require('../../../../utils/embeds');

module.exports = {
    async execute(interaction) {
        const targetUser = interaction.options.getUser('usuario');
        const sanctionId = interaction.options.getInteger('id_sancion');
        const guild = interaction.guild;
        const db = getDatabase();

        // --- VERIFICACIÓN DE ROLES ---
        const config = getGuildConfig(guild.id);
        const adminRoleId = config.admin_min_role_id;

        if (adminRoleId) {
            const hasRole = interaction.member.roles.cache.has(adminRoleId);
            const isDiscordAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
            
            if (!hasRole && !isDiscordAdmin) {
                return interaction.reply({ 
                    content: `❌ No tienes el rol de Administración configurado para retirar sanciones.`, 
                    ephemeral: true 
                });
            }
        } else {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ 
                    content: '❌ No se ha configurado el rol de Administración. Un administrador de Discord debe usar `/moderation setup-roles` primero.', 
                    ephemeral: true 
                });
            }
        }
        // --- FIN VERIFICACIÓN ---

        try {
            if (sanctionId) {
                // Marcar sanción específica como revocada
                const sanction = db.prepare('SELECT * FROM sanctions WHERE id = ? AND guild_id = ?').get(sanctionId, guild.id);

                if (!sanction) {
                    return interaction.reply({ content: `❌ No se encontró ninguna sanción con el ID **#${sanctionId}** en este servidor.`, ephemeral: true });
                }

                if (sanction.status === 'revoked') {
                    return interaction.reply({ content: `❌ La sanción **#${sanctionId}** ya está marcada como revocada.`, ephemeral: true });
                }

                db.prepare("UPDATE sanctions SET status = 'revoked' WHERE id = ?").run(sanctionId);

                return interaction.reply({ 
                    embeds: [simpleEmbed('Sanción Revocada', `✅ Se ha marcado la sanción **#${sanctionId}** (${sanction.type}) de <@${sanction.user_id}> como **revocada**.`, '#00ff00')] 
                });
            } else if (targetUser) {
                // Marcar la última sanción activa del usuario como revocada
                const lastSanction = db.prepare("SELECT * FROM sanctions WHERE guild_id = ? AND user_id = ? AND status = 'active' ORDER BY timestamp DESC LIMIT 1").get(guild.id, targetUser.id);

                if (!lastSanction) {
                    return interaction.reply({ content: `❌ El usuario **${targetUser.tag}** no tiene sanciones activas registradas.`, ephemeral: true });
                }

                db.prepare("UPDATE sanctions SET status = 'revoked' WHERE id = ?").run(lastSanction.id);

                return interaction.reply({ 
                    embeds: [simpleEmbed('Sanción Revocada', `✅ Se ha marcado la última sanción activa (**#${lastSanction.id}** - ${lastSanction.type}) de **${targetUser.tag}** como **revocada**.`, '#00ff00')] 
                });
            } else {
                return interaction.reply({ content: '❌ Debes especificar un usuario o un ID de sanción.', ephemeral: true });
            }

        } catch (error) {
            logger.error(`Error al retirar sanción:`, error);
            return interaction.reply({ content: '❌ Ocurrió un error al intentar retirar la sanción.', ephemeral: true });
        }
    }
};
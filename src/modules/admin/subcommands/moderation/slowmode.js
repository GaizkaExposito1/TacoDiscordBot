const { getGuildConfig } = require('../../../../database/database');
const { requireLevel } = require('../../../../utils/permCheck');
const logger = require('../../../../utils/logger');

module.exports = {
    async execute(interaction) {
        const config = getGuildConfig(interaction.guild.id);
        if (!await requireLevel(interaction, config, 'mod')) return;

        const canal    = interaction.options.getChannel('canal');
        const segundos = interaction.options.getInteger('segundos');

        try {
            await canal.setRateLimitPerUser(segundos, `Slowmode por ${interaction.user.tag}`);

            const msg = segundos === 0
                ? `✅ Slow mode **desactivado** en ${canal}.`
                : `✅ Slow mode configurado a **${segundos}s** en ${canal}.`;

            return interaction.reply({ content: msg, ephemeral: true });
        } catch (error) {
            logger.error('[Slowmode] Error al configurar slow mode:', error);
            return interaction.reply({
                content: `❌ No se pudo configurar el slow mode: ${error.message}`,
                ephemeral: true,
            });
        }
    },
};

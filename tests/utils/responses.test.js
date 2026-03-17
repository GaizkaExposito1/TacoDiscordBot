const { replyError, replySuccess, replyInfo, replyWarning } = require('../../src/utils/responses');
const { simpleEmbed } = require('../../src/utils/embeds');
const { COLORS } = require('../../src/utils/constants');

// Mock dependencies
jest.mock('../../src/utils/embeds', () => ({
    simpleEmbed: jest.fn((title, msg, color) => ({ title, description: msg, color })),
}));

jest.mock('../../src/utils/constants', () => ({
    COLORS: {
        DANGER: '#ff0000',
        SUCCESS: '#00ff00',
        INFO: '#0000ff',
        WARNING: '#ffff00',
    },
}));

describe('responses.js Utility Functions', () => {
    let interaction;

    beforeEach(() => {
        // Reset mock implementations
        simpleEmbed.mockClear();
        
        // Mock Interaction
        interaction = {
            deferred: false,
            replied: false,
            reply: jest.fn().mockResolvedValue(true),
            editReply: jest.fn().mockResolvedValue(true),
            followUp: jest.fn().mockResolvedValue(true),
        };
    });

    // ---------------------------------------------------------
    // replyError
    // ---------------------------------------------------------
    test('replyError calls reply() when not deferred/replied', async () => {
        await replyError(interaction, 'Error occurred');
        expect(simpleEmbed).toHaveBeenCalledWith('❌ Error', 'Error occurred', COLORS.DANGER);
        expect(interaction.reply).toHaveBeenCalledWith({
            embeds: [expect.any(Object)],
            ephemeral: true
        });
        expect(interaction.editReply).not.toHaveBeenCalled();
        expect(interaction.followUp).not.toHaveBeenCalled();
    });

    test('replyError calls editReply() when deferred', async () => {
        interaction.deferred = true;
        await replyError(interaction, 'Error occurred');
        expect(interaction.editReply).toHaveBeenCalledWith({
            embeds: [expect.any(Object)]
        });
        expect(interaction.reply).not.toHaveBeenCalled();
    });

    test('replyError calls followUp() when replied', async () => {
        interaction.replied = true;
        await replyError(interaction, 'Error occurred');
        expect(interaction.followUp).toHaveBeenCalledWith({
            embeds: [expect.any(Object)],
            ephemeral: true
        });
        expect(interaction.reply).not.toHaveBeenCalled();
    });

    // ---------------------------------------------------------
    // replySuccess
    // ---------------------------------------------------------
    test('replySuccess defaults ephemeral to false', async () => {
        await replySuccess(interaction, 'Success!');
        expect(simpleEmbed).toHaveBeenCalledWith('✅ Éxito', 'Success!', COLORS.SUCCESS);
        expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({ ephemeral: false }));
    });

    test('replySuccess handles deferred state', async () => {
        interaction.deferred = true;
        await replySuccess(interaction, 'Success!');
        expect(interaction.editReply).toHaveBeenCalled();
    });

    // ---------------------------------------------------------
    // replyInfo
    // ---------------------------------------------------------
    test('replyInfo handles deferred state', async () => {
        interaction.deferred = true;
        await replyInfo(interaction, 'Title', 'Info message');
        expect(interaction.editReply).toHaveBeenCalled();
    });

    test('replyInfo adjusts title if only message provided', async () => {
        await replyInfo(interaction, 'Just a message');
        // Logic: if (!message && title) -> message = title, title = 'ℹ️ Información'
        expect(simpleEmbed).toHaveBeenCalledWith('ℹ️ Información', 'Just a message', COLORS.INFO);
    });

    test('replyInfo uses provided title and message', async () => {
        await replyInfo(interaction, 'My Title', 'My Message');
        expect(simpleEmbed).toHaveBeenCalledWith('My Title', 'My Message', COLORS.INFO);
    });

    // ---------------------------------------------------------
    // replyWarning
    // ---------------------------------------------------------
    test('replyWarning defaults ephemeral to true', async () => {
        await replyWarning(interaction, 'Watch out!');
        expect(simpleEmbed).toHaveBeenCalledWith('⚠️ Advertencia', 'Watch out!', COLORS.WARNING);
        expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({ ephemeral: true }));
    });
});

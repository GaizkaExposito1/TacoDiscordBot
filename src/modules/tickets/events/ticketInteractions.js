const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    StringSelectMenuBuilder,
} = require('discord.js');
const { getDepartments } = require('../../../database/database');
const { replyError } = require('../../../utils/responses');
const {
    openTicket,
    handleClaimTicket,
    handleUnclaimTicket,
    handleCloseTicketButton,
    handleCloseTicketModal,
    handleRating,
    handleRatingFeedback,
} = require('../services/ticketService');
const logger = require('../../../utils/logger');

module.exports = {
    name: 'ready',
    once: true,

    execute(client) {
        // (Botón ticket_open_btn eliminado en favor del Select Menu directo)

        // ─── Select Menu: Selección de departamento ───
        client.selectMenus.set('ticket_department_select', async (interaction) => {
            const departmentId = interaction.values[0];
            const departments = getDepartments(interaction.guild.id);
            const department = departments.find(d => String(d.id) === departmentId);

            if (!department) {
                return replyError(interaction, 'Departamento no encontrado.', true);
            }

            // Cargar configuración de formulario
            let questions = [{
                id: 'ticket_subject',
                label: '¿Cuál es el motivo de tu ticket?',
                placeholder: 'Describe brevemente tu consulta o problema...',
                style: 2, // Paragraph
                required: true
            }];

            if (department.form_json) {
                try {
                    const parsed = JSON.parse(department.form_json);
                    
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        questions = parsed;
                    } else if (!Array.isArray(parsed) && parsed.label) {
                        // Legacy object support
                        questions = [{
                            id: 'ticket_subject',
                            label: parsed.label,
                            placeholder: parsed.placeholder,
                            style: parsed.style,
                            required: true
                        }];
                    }
                } catch (e) {
                    logger.error('[TicketModal] Error parseando JSON de form:', e);
                }
            }

            // Mostrar Modal con las preguntas personalizadas
            const modal = new ModalBuilder()
                .setCustomId(`ticket_modal_${departmentId}`)
                .setTitle(`📩 ${department.name.substring(0, 40)}`); // Max 45 chars for title

            // Añadir campos (máximo 5)
            questions.slice(0, 5).forEach((q, index) => {
                // Asegurar ID único
                const customId = q.id || `field_${index}`;

                const input = new TextInputBuilder()
                    .setCustomId(customId)
                    .setLabel(q.label.substring(0, 45)) // Max 45 chars for label
                    .setPlaceholder((q.placeholder || '').substring(0, 100))
                    .setStyle(q.style === 1 ? TextInputStyle.Short : TextInputStyle.Paragraph)
                    .setRequired(q.required !== false);
                
                if (q.minLength) input.setMinLength(q.minLength);
                if (q.maxLength) input.setMaxLength(q.maxLength);

                modal.addComponents(new ActionRowBuilder().addComponents(input));
            });

            await interaction.showModal(modal);
        });

        // ─── Modal Submit: Crear ticket ───
        client.modals.set('ticket_modal_', async (interaction) => {
            // Extraer departmentId del customId (ticket_modal_<id>)
            const departmentId = interaction.customId.replace('ticket_modal_', '');
            
            // Recopilar respuestas
            const answers = interaction.fields.fields.map(field => ({
                 customId: field.customId,
                 value: field.value
            }));

            // Intentar mapear customIds a las preguntas originales para obtener el label
            const departments = getDepartments(interaction.guild.id);
            const department = departments.find(d => String(d.id) === departmentId);

            if (!department) {
                return replyError(interaction, 'Departamento no encontrado.', true);
            }

            let questions = [];
             if (department.form_json) {
                try {
                    const parsed = JSON.parse(department.form_json);
                    questions = Array.isArray(parsed) ? parsed : [{ id: 'ticket_subject', label: parsed.label }];
                } catch(e) {}
            }

            // Enriquecer respuestas con el label de la pregunta
            const formattedAnswers = answers.map(ans => {
                const q = questions.find(q => q.id === ans.customId) || 
                          questions.find(q => !q.id && ans.customId === 'ticket_subject'); // Legacy match
                
                return {
                    question: q ? q.label : 'Pregunta',
                    answer: ans.value
                };
            });

            // Si no hay preguntas configuradas (default), usar el subject
            if (formattedAnswers.length === 0 && answers.length > 0) {
                 formattedAnswers.push({ question: 'Asunto', answer: answers[0].value });
            }

            await openTicket(interaction, department.id, department.name, formattedAnswers);
        });

        // ─── Botón: Reclamar Ticket ───
        client.buttons.set('ticket_claim', handleClaimTicket);

        // ─── Botón: Liberar Ticket ───
        client.buttons.set('ticket_unclaim', handleUnclaimTicket);

        // ─── Botón: Cerrar Ticket ───
        client.buttons.set('ticket_close', handleCloseTicketButton);

        // ─── Modal: Cerrar Ticket ───
        client.modals.set('ticket_close_modal', handleCloseTicketModal);

        // ─── Botón: Valorar Ticket ───
        client.buttons.set('ticket_rate_', handleRating);

        // ─── Modal: Feedback de Valoración ───
        client.modals.set('ticket_feedback_', handleRatingFeedback);

        console.log('[Tickets] ✔ Interacciones de tickets registradas.');
    },
};

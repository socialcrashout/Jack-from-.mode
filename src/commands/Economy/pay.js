import { SlashCommandBuilder } from 'discord.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import EconomyService from '../../services/economyService.js';

export default {
    data: new SlashCommandBuilder()
        .setName('pay')
        .setDescription('Pay another user some of your cash')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('User to pay')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName('amount')
                .setDescription('Amount to pay')
                .setRequired(true)
                .setMinValue(1)
        ),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

        const senderId = interaction.user.id;
        const receiver = interaction.options.getUser("user");
        const amount = interaction.options.getInteger("amount");
        const guildId = interaction.guildId;

        logger.debug(`[ECONOMY] Pay command initiated`, {
            senderId,
            receiverId: receiver.id,
            amount,
            guildId
        });

        if (receiver.bot) {
            throw createError(
                "Cannot pay bot",
                ErrorTypes.VALIDATION,
                "You cannot pay a bot.",
                { receiverId: receiver.id, isBot: true }
            );
        }

        if (receiver.id === senderId) {
            throw createError(
                "Cannot pay self",
                ErrorTypes.VALIDATION,
                "You cannot pay yourself.",
                { senderId, receiverId: receiver.id }
            );
        }

        if (amount <= 0) {
            throw createError(
                "Invalid payment amount",
                ErrorTypes.VALIDATION,
                "Amount must be greater than zero.",
                { amount, senderId }
            );
        }

        const [senderData, receiverData] = await Promise.all([
            getEconomyData(client, guildId, senderId),
            getEconomyData(client, guildId, receiver.id)
        ]);

        if (!senderData) {
            throw createError(
                "Failed to load sender economy data",
                ErrorTypes.DATABASE,
                "Failed to load your economy data. Please try again later.",
                { userId: senderId, guildId }
            );
        }

        if (!receiverData) {
            throw createError(
                "Failed to load receiver economy data",
                ErrorTypes.DATABASE,
                "Failed to load the receiver's economy data. Please try again later.",
                { userId: receiver.id, guildId }
            );
        }

        await EconomyService.transferMoney(client, guildId, senderId, receiver.id, amount);

        const [updatedSenderData, updatedReceiverData] = await Promise.all([
            getEconomyData(client, guildId, senderId),
            getEconomyData(client, guildId, receiver.id)
        ]);

        await InteractionHelper.safeEditReply(interaction, {
            components: [
                {
                    type: 17,
                    accent_color: 0x2ECC71,
                    components: [
                        {
                            type: 10,
                            content: "# 💸 Payment Sent!"
                        },
                        {
                            type: 14,
                            divider: true
                        },
                        {
                            type: 10,
                            content: `✅ You successfully paid **${receiver.username}** the amount of **$${amount.toLocaleString()}**!`
                        },
                        {
                            type: 14,
                            divider: false
                        },
                        {
                            type: 10,
                            content: `💳 **Payment Amount:** $${amount.toLocaleString()}\n💵 **Your New Balance:** $${updatedSenderData.wallet.toLocaleString()}`
                        },
                        {
                            type: 14,
                            divider: true
                        },
                        {
                            type: 10,
                            content: `-# 🕒 Requested by ${interaction.user}`
                        }
                    ]
                }
            ],
            flags: 32768
        });

        logger.info(`[ECONOMY] Payment sent successfully`, {
            senderId,
            receiverId: receiver.id,
            amount,
            senderBalance: updatedSenderData.wallet,
            receiverBalance: updatedReceiverData.wallet
        });

        try {
            await receiver.send({
                components: [
                    {
                        type: 17,
                        accent_color: 0x2ECC71,
                        components: [
                            {
                                type: 10,
                                content: "# 💰 Incoming Payment!"
                            },
                            {
                                type: 14,
                                divider: true
                            },
                            {
                                type: 10,
                                content: `**${interaction.user.username}** paid you **$${amount.toLocaleString()}**!`
                            },
                            {
                                type: 14,
                                divider: false
                            },
                            {
                                type: 10,
                                content: `💵 **Your New Balance:** $${updatedReceiverData.wallet.toLocaleString()}`
                            },
                            {
                                type: 14,
                                divider: true
                            },
                            {
                                type: 10,
                                content: `-# 💸 Sent from ${interaction.guild?.name || 'a server'}`
                            }
                        ]
                    }
                ],
                flags: 32768
            });
        } catch (e) {
            logger.warn(`Could not DM user ${receiver.id}: ${e.message}`);
        }
    }, { command: 'pay' })
};

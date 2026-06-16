import { SlashCommandBuilder } from 'discord.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName('withdraw')
        .setDescription('Withdraw money from your bank to your wallet')
        .addIntegerOption(option =>
            option
                .setName('amount')
                .setDescription('Amount to withdraw')
                .setRequired(true)
                .setMinValue(1)
        ),

    execute: withErrorHandling(async (interaction, config, client) => {
        await InteractionHelper.safeDefer(interaction);

        const userId = interaction.user.id;
        const guildId = interaction.guildId;
        const amountInput = interaction.options.getInteger("amount");

        const userData = await getEconomyData(client, guildId, userId);

        if (!userData) {
            throw createError(
                "Failed to load economy data",
                ErrorTypes.DATABASE,
                "Failed to load your economy data. Please try again later.",
                { userId, guildId }
            );
        }

        let withdrawAmount = amountInput;

        if (withdrawAmount <= 0) {
            await InteractionHelper.safeEditReply(interaction, {
                components: [
                    {
                        type: 17,
                        accent_color: 0xE74C3C,
                        components: [
                            { type: 10, content: '# ❌ Invalid Amount' },
                            { type: 14, divider: true },
                            { type: 10, content: 'You must withdraw a positive amount.' },
                            { type: 14, divider: true },
                            { type: 10, content: `-# 🕒 Requested by ${interaction.user}` }
                        ]
                    }
                ],
                flags: 32768
            });
            return;
        }

        if (userData.bank === 0) {
            await InteractionHelper.safeEditReply(interaction, {
                components: [
                    {
                        type: 17,
                        accent_color: 0xE74C3C,
                        components: [
                            { type: 10, content: '# ❌ Empty Bank Account' },
                            { type: 14, divider: true },
                            { type: 10, content: 'Your bank account is empty.' },
                            { type: 14, divider: true },
                            { type: 10, content: `-# 🕒 Requested by ${interaction.user}` }
                        ]
                    }
                ],
                flags: 32768
            });
            return;
        }

        if (withdrawAmount > userData.bank) {
            withdrawAmount = userData.bank;
        }

        userData.wallet += withdrawAmount;
        userData.bank -= withdrawAmount;

        await setEconomyData(client, guildId, userId, userData);

        await InteractionHelper.safeEditReply(interaction, {
            components: [
                {
                    type: 17,
                    accent_color: 0x2ECC71,
                    components: [
                        { type: 10, content: '# 🏦 Withdrawal Successful' },
                        { type: 14, divider: true },
                        { type: 10, content: `You successfully withdrew **$${withdrawAmount.toLocaleString()}** from your bank.` },
                        { type: 14, divider: true },
                        {
                            type: 10,
                            content: `💵 **New Wallet Balance:** $${userData.wallet.toLocaleString()}\n🏦 **New Bank Balance:** $${userData.bank.toLocaleString()}`
                        },
                        { type: 14, divider: true },
                        { type: 10, content: `-# 🕒 Requested by ${interaction.user}` }
                    ]
                }
            ],
            flags: 32768
        });
    }, { command: 'withdraw' })
};

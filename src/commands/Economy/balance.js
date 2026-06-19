import { SlashCommandBuilder } from 'discord.js';
import { getEconomyData } from '../../utils/economy.js';
import { withErrorHandling } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription("Check your or someone else's balance")
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('User to check balance for')
                .setRequired(false)
        ),
    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

        const targetUser = interaction.options.getUser("user") || interaction.user;
        const wallet = 5000;
        const bank = 10000;
        const maxBank = 50000;
        const netWorth = wallet + bank;
        const bankPercent = Math.round((bank / maxBank) * 100);

        await InteractionHelper.safeEditReply(interaction, {
            components: [
                {
                    // Outer Container (card)
                    type: 17,
                    accent_color: 0xF1C40F,
                    components: [
                        // Header section: title + user avatar as thumbnail accessory
                        {
                            type: 9, // Section
                            components: [
                                {
                                    type: 10, // Text Display
                                    content: "# 💰 Balance Overview"
                                },
                                {
                                    type: 10,
                                    content: `👤 **${targetUser.username}**`
                                }
                            ],
                            accessory: {
                                type: 11, // Thumbnail
                                media: {
                                    url: targetUser.displayAvatarURL({ size: 256 })
                                }
                            }
                        },
                        {
                            type: 14, // Separator
                            divider: true
                        },
                        {
                            type: 10,
                            content: `💵 **Wallet:** $${wallet.toLocaleString()}`
                        },
                        {
                            type: 10,
                            content: `🏦 **Bank:** $${bank.toLocaleString()} / $${maxBank.toLocaleString()} \`${bankPercent}% full\``
                        },
                        {
                            type: 10,
                            content: `💎 **Net Worth:** $${netWorth.toLocaleString()}`
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
    }, { command: "balance" })
};

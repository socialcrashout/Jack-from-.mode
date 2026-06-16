import { SlashCommandBuilder } from 'discord.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { botConfig } from '../../config/bot.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const COOLDOWN = 30 * 60 * 1000;
const MIN_WIN = 50;
const MAX_WIN = 200;
const SUCCESS_CHANCE = 0.7;

export default {
    data: new SlashCommandBuilder()
        .setName('beg')
        .setDescription('Beg for a small amount of money'),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

        const userId = interaction.user.id;
        const guildId = interaction.guildId;

        let userData = await getEconomyData(client, guildId, userId);

        if (!userData) {
            throw createError(
                "Failed to load economy data",
                ErrorTypes.DATABASE,
                "Failed to load your economy data. Please try again later.",
                { userId, guildId }
            );
        }

        const lastBeg = userData.lastBeg || 0;
        const remainingTime = lastBeg + COOLDOWN - Date.now();

        if (remainingTime > 0) {
            const minutes = Math.floor(remainingTime / 60000);
            const seconds = Math.floor((remainingTime % 60000) / 1000);
            const timeMessage = minutes > 0 ? `${minutes} minute(s)` : `${seconds} second(s)`;

            await InteractionHelper.safeEditReply(interaction, {
                components: [
                    {
                        type: 17,
                        accent_color: 0xE74C3C,
                        components: [
                            {
                                type: 10,
                                content: "# 😴 Too Tired to Beg"
                            },
                            {
                                type: 14,
                                divider: true
                            },
                            {
                                type: 10,
                                content: `You are tired from begging! Try again in **${timeMessage}**.`
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
            return;
        }

        const success = Math.random() < SUCCESS_CHANCE;
        let newCash = userData.wallet;

        const successMessages = [
            "A kind stranger drops **${amount}** into your cup.",
            "You spotted an unattended wallet! You grab **${amount}** and run.",
            "Someone took pity on you and gave you **${amount}**!",
            "You found **${amount}** under a park bench.",
        ];

        const failMessages = [
            "The police chased you off. You got nothing.",
            "Someone yelled, 'Get a job!' and walked past.",
            "A squirrel stole the single coin you had.",
            "You tried to beg, but you were too embarrassed and gave up.",
        ];

        let components;

        if (success) {
            const amountWon = Math.floor(Math.random() * (MAX_WIN - MIN_WIN + 1)) + MIN_WIN;
            newCash += amountWon;

            const message = successMessages[Math.floor(Math.random() * successMessages.length)]
                .replace('${amount}', `$${amountWon.toLocaleString()}`);

            components = [
                {
                    type: 17,
                    accent_color: 0x2ECC71,
                    components: [
                        {
                            type: 10,
                            content: "# 🙏 Begging Result"
                        },
                        {
                            type: 14,
                            divider: true
                        },
                        {
                            type: 10,
                            content: `✅ **Success!**\n${message}`
                        },
                        {
                            type: 10,
                            content: `💵 **New Wallet Balance:** $${newCash.toLocaleString()}`
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
            ];
        } else {
            const message = failMessages[Math.floor(Math.random() * failMessages.length)];

            components = [
                {
                    type: 17,
                    accent_color: 0xE74C3C,
                    components: [
                        {
                            type: 10,
                            content: "# 🙏 Begging Result"
                        },
                        {
                            type: 14,
                            divider: true
                        },
                        {
                            type: 10,
                            content: `❌ **Failed!**\n${message}`
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
            ];
        }

        userData.wallet = newCash;
        userData.lastBeg = Date.now();

        await setEconomyData(client, guildId, userId, userData);

        await InteractionHelper.safeEditReply(interaction, { components, flags: 32768 });
    }, { command: 'beg' })
};

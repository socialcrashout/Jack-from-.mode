import { SlashCommandBuilder } from 'discord.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { getGuildConfig } from '../../services/guildConfig.js';
import { formatDuration } from '../../utils/helpers.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const DAILY_COOLDOWN = 24 * 60 * 60 * 1000;
const DAILY_AMOUNT = 1000;
const PREMIUM_BONUS_PERCENTAGE = 0.1;

export default {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Claim your daily cash reward'),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

        const userId = interaction.user.id;
        const guildId = interaction.guildId;
        const now = Date.now();

        logger.debug(`[ECONOMY] Daily claimed started for ${userId}`, { userId, guildId });

        const userData = await getEconomyData(client, guildId, userId);

        if (!userData) {
            throw createError(
                "Failed to load economy data for daily",
                ErrorTypes.DATABASE,
                "Failed to load your economy data. Please try again later.",
                { userId, guildId }
            );
        }

        const lastDaily = userData.lastDaily || 0;
        if (now < lastDaily + DAILY_COOLDOWN) {
            const timeRemaining = lastDaily + DAILY_COOLDOWN - now;

            await InteractionHelper.safeEditReply(interaction, {
                components: [
                    {
                        type: 17,
                        components: [
                            {
                                type: 10,
                                content: "# ⏰ Already Claimed"
                            },
                            {
                                type: 14,
                                divider: true
                            },
                            {
                                type: 10,
                                content: `You have already claimed your daily reward! Try again in **${formatDuration(timeRemaining)}**.`
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

        const guildConfig = await getGuildConfig(client, guildId);
        const PREMIUM_ROLE_ID = guildConfig.premiumRoleId;

        let earned = DAILY_AMOUNT;
        let bonusText = '';
        let hasPremiumRole = false;

        if (
            PREMIUM_ROLE_ID &&
            interaction.member &&
            interaction.member.roles.cache.has(PREMIUM_ROLE_ID)
        ) {
            const bonusAmount = Math.floor(DAILY_AMOUNT * PREMIUM_BONUS_PERCENTAGE);
            earned += bonusAmount;
            bonusText = `\n✨ **Premium Bonus:** +$${bonusAmount.toLocaleString()}`;
            hasPremiumRole = true;
        }

        userData.wallet = (userData.wallet || 0) + earned;
        userData.lastDaily = now;

        await setEconomyData(client, guildId, userId, userData);

        logger.info(`[ECONOMY_TRANSACTION] Daily claimed`, {
            userId,
            guildId,
            amount: earned,
            newWallet: userData.wallet,
            hasPremium: hasPremiumRole,
            timestamp: new Date().toISOString()
        });

        await InteractionHelper.safeEditReply(interaction, {
            components: [
                {
                    type: 17,
                    components: [
                        {
                            type: 10,
                            content: "# ✅ Daily Claimed!"
                        },
                        {
                            type: 14,
                            divider: true
                        },
                        {
                            type: 10,
                            content: `You have claimed your daily **$${earned.toLocaleString()}**!${bonusText}`
                        },
                        {
                            type: 14,
                            divider: false
                        },
                        {
                            type: 10,
                            content: `💵 **New Wallet Balance:** $${userData.wallet.toLocaleString()}`
                        },
                        {
                            type: 14,
                            divider: false
                        },
                        {
                            type: 10,
                            content: `🕐 **Next Claim:** 24 hours${hasPremiumRole ? ' *(Premium Active)*' : ''}`
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
    }, { command: 'daily' })
};

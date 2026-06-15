import { SlashCommandBuilder } from 'discord.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName("eleaderboard")
        .setDescription("View the server's top 10 richest users.")
        .setDMPermission(false),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

        const guildId = interaction.guildId;
        logger.debug(`[ECONOMY] Leaderboard requested`, { guildId });

        const prefix = `economy:${guildId}:`;
        let allKeys = await client.db.list(prefix);
        if (!Array.isArray(allKeys)) allKeys = [];

        if (allKeys.length === 0) {
            throw createError(
                "No economy data found",
                ErrorTypes.VALIDATION,
                "No economy data found for this server."
            );
        }

        let allUserData = [];
        for (const key of allKeys) {
            const userId = key.replace(prefix, "");
            const userData = await client.db.get(key);
            if (userData) {
                allUserData.push({
                    userId,
                    net_worth: (userData.wallet || 0) + (userData.bank || 0),
                });
            }
        }

        allUserData.sort((a, b) => b.net_worth - a.net_worth);
        const topUsers = allUserData.slice(0, 10);
        const userRank = allUserData.findIndex(u => u.userId === interaction.user.id) + 1;

        const rankEmoji = ["🥇", "🥈", "🥉"];
        const leaderboardLines = topUsers.map((user, i) => {
            const emoji = rankEmoji[i] || `**#${i + 1}**`;
            return `${emoji} <@${user.userId}> — $${user.net_worth.toLocaleString()}`;
        });

        logger.info(`[ECONOMY] Leaderboard generated`, {
            guildId,
            userCount: allUserData.length,
            userRank
        });

        const leaderboardText = leaderboardLines.length > 0
            ? leaderboardLines.join("\n")
            : "No economy data is available for this server yet.";

        await InteractionHelper.safeEditReply(interaction, {
            components: [
                {
                    type: 17,
                    accent_color: 0xF1C40F,
                    components: [
                        {
                            type: 10,
                            content: "# 🏆 Economy Leaderboard"
                        },
                        {
                            type: 14,
                            divider: true
                        },
                        {
                            type: 10,
                            content: leaderboardText
                        },
                        {
                            type: 14,
                            divider: true
                        },
                        {
                            type: 10,
                            content: `📊 **Your Rank:** ${userRank > 0 ? `#${userRank}` : "Not ranked yet"}`
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
    }, { command: 'eleaderboard' })
};

import { SlashCommandBuilder } from 'discord.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const MINE_COOLDOWN = 60 * 60 * 1000;
const BASE_MIN_REWARD = 400;
const BASE_MAX_REWARD = 1200;
const PICKAXE_MULTIPLIER = 1.2;
const DIAMOND_PICKAXE_MULTIPLIER = 2.0;

const MINE_LOCATIONS = [
    "abandoned gold mine",
    "dark, damp cave",
    "backyard rock quarry",
    "volcanic obsidian vent",
    "deep-sea mineral trench",
];

export default {
    data: new SlashCommandBuilder()
        .setName('mine')
        .setDescription('Go mining to earn money'),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

        const userId = interaction.user.id;
        const guildId = interaction.guildId;
        const now = Date.now();

        const userData = await getEconomyData(client, guildId, userId);
        const lastMine = userData.lastMine || 0;
        const hasDiamondPickaxe = userData.inventory["diamond_pickaxe"] || 0;
        const hasPickaxe = userData.inventory["pickaxe"] || 0;

        if (now < lastMine + MINE_COOLDOWN) {
            const remaining = lastMine + MINE_COOLDOWN - now;
            const hours = Math.floor(remaining / (1000 * 60 * 60));
            const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

            throw createError(
                "Mining cooldown active",
                ErrorTypes.RATE_LIMIT,
                `Your pickaxe is cooling down. Wait for **${hours}h ${minutes}m** before mining again.`,
                { remaining, cooldownType: 'mine' }
            );
        }

        const baseEarned = Math.floor(Math.random() * (BASE_MAX_REWARD - BASE_MIN_REWARD + 1)) + BASE_MIN_REWARD;
        let finalEarned = baseEarned;
        let multiplierText = '';

        if (hasDiamondPickaxe > 0) {
            finalEarned = Math.floor(baseEarned * DIAMOND_PICKAXE_MULTIPLIER);
            multiplierText = `\n💎 **Diamond Pickaxe Bonus: +100%**`;
        } else if (hasPickaxe > 0) {
            finalEarned = Math.floor(baseEarned * PICKAXE_MULTIPLIER);
            multiplierText = `\n⛏️ **Pickaxe Bonus: +20%**`;
        }

        const location = MINE_LOCATIONS[Math.floor(Math.random() * MINE_LOCATIONS.length)];

        userData.wallet += finalEarned;
        userData.lastMine = now;

        await setEconomyData(client, guildId, userId, userData);

        await InteractionHelper.safeEditReply(interaction, {
            components: [
                {
                    type: 17,
                    accent_color: 0x95A5A6,
                    components: [
                        {
                            type: 10,
                            content: "# ⛏️ Mining Expedition Successful!"
                        },
                        {
                            type: 14,
                            divider: true
                        },
                        {
                            type: 10,
                            content: `You explored a **${location}** and found minerals worth **$${finalEarned.toLocaleString()}**!${multiplierText}`
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
                            content: `🕐 **Next Mine:** Available in 1 hour`
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
    }, { command: 'mine' })
};

import { SlashCommandBuilder } from 'discord.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const FISH_COOLDOWN = 45 * 60 * 1000;
const BASE_MIN_REWARD = 300;
const BASE_MAX_REWARD = 900;
const FISHING_ROD_MULTIPLIER = 1.5;

const FISH_TYPES = [
    { name: 'Bass', emoji: '🐟', rarity: 'common' },
    { name: 'Salmon', emoji: '🐟', rarity: 'common' },
    { name: 'Trout', emoji: '🐟', rarity: 'common' },
    { name: 'Tuna', emoji: '🐟', rarity: 'uncommon' },
    { name: 'Swordfish', emoji: '🐟', rarity: 'uncommon' },
    { name: 'Octopus', emoji: '🐙', rarity: 'rare' },
    { name: 'Lobster', emoji: '🦞', rarity: 'rare' },
    { name: 'Shark', emoji: '🦈', rarity: 'epic' },
    { name: 'Whale', emoji: '🐋', rarity: 'legendary' },
];

const CATCH_MESSAGES = [
    "You cast your line into the crystal clear waters...",
    "You wait patiently as your bobber floats...",
    "After a few minutes of waiting, you feel a tug...",
    "The water ripples as something takes your bait...",
    "You reel in your catch with expert precision...",
];

const RARITY_COLORS = {
    common: 0x95A5A6,
    uncommon: 0x2ECC71,
    rare: 0x3498DB,
    epic: 0x9B59B6,
    legendary: 0xF1C40F
};

export default {
    data: new SlashCommandBuilder()
        .setName('fish')
        .setDescription('Go fishing to catch fish and earn money'),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

        const userId = interaction.user.id;
        const guildId = interaction.guildId;
        const now = Date.now();

        const userData = await getEconomyData(client, guildId, userId);
        const lastFish = userData.lastFish || 0;
        const hasFishingRod = userData.inventory["fishing_rod"] || 0;

        if (now < lastFish + FISH_COOLDOWN) {
            const remaining = lastFish + FISH_COOLDOWN - now;
            const hours = Math.floor(remaining / (1000 * 60 * 60));
            const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

            throw createError(
                "Fishing cooldown active",
                ErrorTypes.RATE_LIMIT,
                `You're too tired to fish right now. Rest for **${hours}h ${minutes}m** before fishing again.`,
                { remaining, cooldownType: 'fish' }
            );
        }

        const rand = Math.random();
        let fishCaught;

        if (rand < 0.5) {
            fishCaught = FISH_TYPES.filter(f => f.rarity === 'common')[Math.floor(Math.random() * 3)];
        } else if (rand < 0.75) {
            fishCaught = FISH_TYPES.filter(f => f.rarity === 'uncommon')[Math.floor(Math.random() * 2)];
        } else if (rand < 0.9) {
            fishCaught = FISH_TYPES.filter(f => f.rarity === 'rare')[Math.floor(Math.random() * 2)];
        } else if (rand < 0.98) {
            fishCaught = FISH_TYPES.find(f => f.rarity === 'epic');
        } else {
            fishCaught = FISH_TYPES.find(f => f.rarity === 'legendary');
        }

        const baseEarned = Math.floor(Math.random() * (BASE_MAX_REWARD - BASE_MIN_REWARD + 1)) + BASE_MIN_REWARD;
        let finalEarned = baseEarned;
        let multiplierText = '';

        if (hasFishingRod > 0) {
            finalEarned = Math.floor(baseEarned * FISHING_ROD_MULTIPLIER);
            multiplierText = `\n🎣 **Fishing Rod Bonus: +50%**`;
        }

        const catchMessage = CATCH_MESSAGES[Math.floor(Math.random() * CATCH_MESSAGES.length)];
        const rarityLabel = fishCaught.rarity.charAt(0).toUpperCase() + fishCaught.rarity.slice(1);

        userData.wallet += finalEarned;
        userData.lastFish = now;

        await setEconomyData(client, guildId, userId, userData);

        await InteractionHelper.safeEditReply(interaction, {
            components: [
                {
                    type: 17,
                    accent_color: RARITY_COLORS[fishCaught.rarity],
                    components: [
                        {
                            type: 10,
                            content: "# 🎣 Fishing Success!"
                        },
                        {
                            type: 14,
                            divider: true
                        },
                        {
                            type: 10,
                            content: `${catchMessage}\n\nYou caught a **${fishCaught.emoji} ${fishCaught.name}**! You sold it for **$${finalEarned.toLocaleString()}**!${multiplierText}`
                        },
                        {
                            type: 14,
                            divider: false
                        },
                        {
                            type: 10,
                            content: `💵 **New Wallet Balance:** $${userData.wallet.toLocaleString()}\n✨ **Rarity:** ${rarityLabel}`
                        },
                        {
                            type: 14,
                            divider: false
                        },
                        {
                            type: 10,
                            content: `🕐 **Next Trip:** Available in 45 minutes`
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
    }, { command: 'fish' })
};

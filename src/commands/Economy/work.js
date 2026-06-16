import { SlashCommandBuilder } from 'discord.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const WORK_COOLDOWN = 30 * 60 * 1000;
const MIN_WORK_AMOUNT = 50;
const MAX_WORK_AMOUNT = 300;
const LAPTOP_MULTIPLIER = 1.5;
const WORK_JOBS = [
    "Software Developer",
    "Barista",
    "Janitor",
    "YouTuber",
    "Discord Bot Developer",
    "Cashier",
    "Pizza Delivery Driver",
    "Librarian",
    "Gardener",
    "Data Analyst",
];

export default {
    data: new SlashCommandBuilder()
        .setName('work')
        .setDescription('Work to earn some money'),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

        const userId = interaction.user.id;
        const guildId = interaction.guildId;
        const now = Date.now();

        const userData = await getEconomyData(client, guildId, userId);

        if (!userData) {
            throw createError(
                "Failed to load economy data for work",
                ErrorTypes.DATABASE,
                "Failed to load your economy data. Please try again later.",
                { userId, guildId }
            );
        }

        logger.debug(`[ECONOMY] Work command started for ${userId}`, { userId, guildId });

        const lastWork = userData.lastWork || 0;
        const inventory = userData.inventory || {};
        const extraWorkShifts = inventory["extra_work"] || 0;
        const hasLaptop = inventory["laptop"] || 0;

        let cooldownActive = now < lastWork + WORK_COOLDOWN;
        let usedConsumable = false;

        if (cooldownActive) {
            if (extraWorkShifts > 0) {
                inventory["extra_work"] = (inventory["extra_work"] || 0) - 1;
                usedConsumable = true;
            } else {
                const remaining = lastWork + WORK_COOLDOWN - now;
                const hours = Math.floor(remaining / 3600000);
                const minutes = Math.floor((remaining % 3600000) / 60000);
                const timeMessage = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

                await InteractionHelper.safeEditReply(interaction, {
                    components: [
                        {
                            type: 17,
                            accent_color: 0xE74C3C,
                            components: [
                                { type: 10, content: '# 😴 Too Tired to Work' },
                                { type: 14, divider: true },
                                { type: 10, content: `You're working too fast! Wait **${timeMessage}** before working again.` },
                                { type: 14, divider: true },
                                { type: 10, content: `-# 🕒 Requested by ${interaction.user}` }
                            ]
                        }
                    ],
                    flags: 32768
                });
                return;
            }
        }

        let earned = Math.floor(Math.random() * (MAX_WORK_AMOUNT - MIN_WORK_AMOUNT + 1)) + MIN_WORK_AMOUNT;
        const job = WORK_JOBS[Math.floor(Math.random() * WORK_JOBS.length)];

        let laptopLine = '';
        if (hasLaptop > 0) {
            earned = Math.floor(earned * LAPTOP_MULTIPLIER);
            laptopLine = '\n💻 **Laptop Bonus:** +50% earnings!';
        }

        let consumableLine = '';
        if (usedConsumable) {
            consumableLine = `\n🎟️ **Extra Work Shift used** (${extraWorkShifts - 1} remaining)`;
        }

        userData.wallet = (userData.wallet || 0) + earned;
        userData.lastWork = now;

        await setEconomyData(client, guildId, userId, userData);

        logger.info(`[ECONOMY_TRANSACTION] Work completed`, {
            userId,
            guildId,
            amount: earned,
            job,
            usedConsumable,
            hasLaptop: hasLaptop > 0,
            newWallet: userData.wallet,
            timestamp: new Date().toISOString()
        });

        const nextWork = `<t:${Math.floor((now + WORK_COOLDOWN) / 1000)}:R>`;

        await InteractionHelper.safeEditReply(interaction, {
            components: [
                {
                    type: 17,
                    accent_color: 0x2ECC71,
                    components: [
                        { type: 10, content: '# 💼 Work Complete!' },
                        { type: 14, divider: true },
                        { type: 10, content: `You worked as a **${job}** and earned **$${earned.toLocaleString()}**!${laptopLine}${consumableLine}` },
                        { type: 14, divider: true },
                        {
                            type: 10,
                            content: `💰 **New Balance:** $${userData.wallet.toLocaleString()}\n⏰ **Next Work:** ${nextWork}`
                        },
                        { type: 14, divider: true },
                        { type: 10, content: `-# 🕒 Requested by ${interaction.user}` }
                    ]
                }
            ],
            flags: 32768
        });
    }, { command: 'work' })
};

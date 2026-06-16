import { SlashCommandBuilder } from 'discord.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const CRIME_COOLDOWN = 60 * 60 * 1000;
const JAIL_TIME = 2 * 60 * 60 * 1000;

const CRIME_TYPES = [
    { name: "Pickpocketing", min: 100, max: 500, risk: 0.3 },
    { name: "Burglary", min: 300, max: 1000, risk: 0.4 },
    { name: "Bank Heist", min: 1000, max: 5000, risk: 0.6 },
    { name: "Art Theft", min: 2000, max: 10000, risk: 0.7 },
    { name: "Cybercrime", min: 5000, max: 20000, risk: 0.8 },
];

export default {
    data: new SlashCommandBuilder()
        .setName('crime')
        .setDescription('Commit a crime to earn money (risky)')
        .addStringOption(option =>
            option
                .setName('type')
                .setDescription('Type of crime to commit')
                .setRequired(true)
                .addChoices(
                    { name: 'Pickpocketing', value: 'pickpocketing' },
                    { name: 'Burglary', value: 'burglary' },
                    { name: 'Bank Heist', value: 'bank-heist' },
                    { name: 'Art Theft', value: 'art-theft' },
                    { name: 'Cybercrime', value: 'cybercrime' },
                )
        ),

    execute: withErrorHandling(async (interaction, config, client) => {
        await InteractionHelper.safeDefer(interaction);

        const userId = interaction.user.id;
        const guildId = interaction.guildId;
        const now = Date.now();

        const userData = await getEconomyData(client, guildId, userId);
        const lastCrime = userData.cooldowns?.crime || 0;
        const isJailed = userData.jailedUntil && userData.jailedUntil > now;

        if (isJailed) {
            const timeLeft = Math.ceil((userData.jailedUntil - now) / (1000 * 60));

            await InteractionHelper.safeEditReply(interaction, {
                components: [
                    {
                        type: 17,
                        accent_color: 0xE74C3C,
                        components: [
                            {
                                type: 10,
                                content: "# 🔒 You're in Jail"
                            },
                            {
                                type: 14,
                                divider: true
                            },
                            {
                                type: 10,
                                content: `You can't commit crimes while in jail! You'll be released in **${timeLeft} minute(s)**.`
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

        if (now < lastCrime + CRIME_COOLDOWN) {
            const timeLeft = Math.ceil((lastCrime + CRIME_COOLDOWN - now) / (1000 * 60));

            await InteractionHelper.safeEditReply(interaction, {
                components: [
                    {
                        type: 17,
                        accent_color: 0xE74C3C,
                        components: [
                            {
                                type: 10,
                                content: "# ⏰ Laying Low"
                            },
                            {
                                type: 14,
                                divider: true
                            },
                            {
                                type: 10,
                                content: `You need to lay low for a bit! Try again in **${timeLeft} minute(s)**.`
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

        const crimeType = interaction.options.getString("type").toLowerCase();
        const crime = CRIME_TYPES.find(
            c => c.name.toLowerCase().replace(/\s+/g, '-') === crimeType
        );

        if (!crime) {
            throw createError(
                "Invalid crime type",
                ErrorTypes.VALIDATION,
                "Please select a valid crime type.",
                { crimeType }
            );
        }

        const isSuccess = Math.random() > crime.risk;
        const amountEarned = isSuccess
            ? Math.floor(Math.random() * (crime.max - crime.min + 1)) + crime.min
            : 0;

        userData.cooldowns = userData.cooldowns || {};
        userData.cooldowns.crime = now;

        if (isSuccess) {
            userData.wallet = (userData.wallet || 0) + amountEarned;
            await setEconomyData(client, guildId, userId, userData);

            await InteractionHelper.safeEditReply(interaction, {
                components: [
                    {
                        type: 17,
                        accent_color: 0x2ECC71,
                        components: [
                            {
                                type: 10,
                                content: "# 🦹 Crime Successful!"
                            },
                            {
                                type: 14,
                                divider: true
                            },
                            {
                                type: 10,
                                content: `✅ You successfully committed **${crime.name}** and got away with it!`
                            },
                            {
                                type: 14,
                                divider: false
                            },
                            {
                                type: 10,
                                content: `💵 **Earned:** $${amountEarned.toLocaleString()}\n💰 **New Wallet Balance:** $${userData.wallet.toLocaleString()}`
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
        } else {
            const fine = Math.floor((crime.min * 0.2));
            userData.wallet = Math.max(0, (userData.wallet || 0) - fine);
            userData.jailedUntil = now + JAIL_TIME;
            await setEconomyData(client, guildId, userId, userData);

            await InteractionHelper.safeEditReply(interaction, {
                components: [
                    {
                        type: 17,
                        accent_color: 0xE74C3C,
                        components: [
                            {
                                type: 10,
                                content: "# 🚔 Crime Failed!"
                            },
                            {
                                type: 14,
                                divider: true
                            },
                            {
                                type: 10,
                                content: `❌ You were caught attempting **${crime.name}** and sent to jail!`
                            },
                            {
                                type: 14,
                                divider: false
                            },
                            {
                                type: 10,
                                content: `💸 **Fine:** $${fine.toLocaleString()}\n🔒 **Jail Time:** 2 hours\n💰 **New Wallet Balance:** $${userData.wallet.toLocaleString()}`
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
        }
    }, { command: 'crime' })
};

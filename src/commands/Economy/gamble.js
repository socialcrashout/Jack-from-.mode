import { SlashCommandBuilder } from 'discord.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const BASE_WIN_CHANCE = 0.4;
const CLOVER_WIN_BONUS = 0.1;
const CHARM_WIN_BONUS = 0.08;
const PAYOUT_MULTIPLIER = 2.0;
const GAMBLE_COOLDOWN = 5 * 60 * 1000;

export default {
    data: new SlashCommandBuilder()
        .setName('gamble')
        .setDescription('Gamble your money for a chance to win more')
        .addIntegerOption(option =>
            option
                .setName('amount')
                .setDescription('Amount of cash to gamble')
                .setRequired(true)
                .setMinValue(1)
        ),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

        const userId = interaction.user.id;
        const guildId = interaction.guildId;
        const betAmount = interaction.options.getInteger("amount");
        const now = Date.now();

        const userData = await getEconomyData(client, guildId, userId);
        const lastGamble = userData.lastGamble || 0;
        let cloverCount = userData.inventory["lucky_clover"] || 0;
        let charmCount = userData.inventory["lucky_charm"] || 0;

        if (now < lastGamble + GAMBLE_COOLDOWN) {
            const remaining = lastGamble + GAMBLE_COOLDOWN - now;
            const minutes = Math.floor(remaining / (1000 * 60));
            const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

            throw createError(
                "Gamble cooldown active",
                ErrorTypes.RATE_LIMIT,
                `You need to cool down before gambling again. Wait **${minutes}m ${seconds}s**.`,
                { remaining, cooldownType: 'gamble' }
            );
        }

        if (userData.wallet < betAmount) {
            throw createError(
                "Insufficient cash for gamble",
                ErrorTypes.VALIDATION,
                `You only have $${userData.wallet.toLocaleString()} cash, but you are trying to bet $${betAmount.toLocaleString()}.`,
                { required: betAmount, current: userData.wallet }
            );
        }

        let winChance = BASE_WIN_CHANCE;
        let boostText = '';
        let usedClover = false;
        let usedCharm = false;

        if (cloverCount > 0) {
            winChance += CLOVER_WIN_BONUS;
            userData.inventory["lucky_clover"] -= 1;
            boostText = `\n🍀 **Lucky Clover Consumed:** Your win chance was boosted!`;
            usedClover = true;
        } else if (charmCount > 0) {
            winChance += CHARM_WIN_BONUS;
            userData.inventory["lucky_charm"] -= 1;
            boostText = `\n🍀 **Lucky Charm Used (${charmCount - 1} uses remaining):** Your win chance was boosted!`;
            usedCharm = true;
        }

        const win = Math.random() < winChance;
        let cashChange = 0;
        let footerText = '';

        if (usedClover) {
            footerText = `${userData.inventory["lucky_clover"]} Lucky Clovers left • Win chance was ${Math.round(winChance * 100)}%`;
        } else if (usedCharm) {
            footerText = `${userData.inventory["lucky_charm"]} Lucky Charm uses left • Win chance was ${Math.round(winChance * 100)}%`;
        } else {
            footerText = `Next gamble in 5 minutes • Base win chance: ${Math.round(BASE_WIN_CHANCE * 100)}%`;
        }

        if (win) {
            const amountWon = Math.floor(betAmount * PAYOUT_MULTIPLIER);
            cashChange = amountWon;
            userData.wallet = (userData.wallet || 0) + cashChange;
            userData.lastGamble = now;
            await setEconomyData(client, guildId, userId, userData);

            await InteractionHelper.safeEditReply(interaction, {
                components: [
                    {
                        type: 17,
                        accent_color: 0x2ECC71,
                        components: [
                            {
                                type: 10,
                                content: "# 🎉 You Won!"
                            },
                            {
                                type: 14,
                                divider: true
                            },
                            {
                                type: 10,
                                content: `✅ You turned your **$${betAmount.toLocaleString()}** bet into **$${amountWon.toLocaleString()}**!${boostText}`
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
                                content: `📊 ${footerText}`
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
            cashChange = -betAmount;
            userData.wallet = (userData.wallet || 0) + cashChange;
            userData.lastGamble = now;
            await setEconomyData(client, guildId, userId, userData);

            await InteractionHelper.safeEditReply(interaction, {
                components: [
                    {
                        type: 17,
                        accent_color: 0xE74C3C,
                        components: [
                            {
                                type: 10,
                                content: "# 💔 You Lost..."
                            },
                            {
                                type: 14,
                                divider: true
                            },
                            {
                                type: 10,
                                content: `❌ The dice rolled against you. You lost your **$${betAmount.toLocaleString()}** bet.`
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
                                content: `📊 ${footerText}`
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
    }, { command: 'gamble' })
};

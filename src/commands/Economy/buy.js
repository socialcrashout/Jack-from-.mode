import { SlashCommandBuilder } from 'discord.js';
import { shopItems } from '../../config/shop/items.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { getGuildConfig } from '../../services/guildConfig.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const SHOP_ITEMS = shopItems;

const errorContainer = (title, description, user) => ({
    components: [
        {
            type: 17,
            components: [
                { type: 10, content: `# ${title}` },
                { type: 14, divider: true },
                { type: 10, content: description },
                { type: 14, divider: true },
                { type: 10, content: `-# 🕒 Requested by ${user}` }
            ]
        }
    ],
    flags: 32768
});

export default {
    data: new SlashCommandBuilder()
        .setName('buy')
        .setDescription('Buy an item from the shop')
        .addStringOption(option =>
            option
                .setName('item_id')
                .setDescription('ID of the item to buy')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName('quantity')
                .setDescription('Quantity to buy (default: 1)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(10)
        ),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

        const userId = interaction.user.id;
        const guildId = interaction.guildId;
        const itemId = interaction.options.getString("item_id").toLowerCase();
        const quantity = interaction.options.getInteger("quantity") || 1;

        const item = SHOP_ITEMS.find(i => i.id === itemId);

        if (!item) {
            await InteractionHelper.safeEditReply(interaction, errorContainer(
                "❌ Item Not Found",
                `The item ID \`${itemId}\` does not exist in the shop.`,
                interaction.user
            ));
            return;
        }

        if (quantity < 1) {
            await InteractionHelper.safeEditReply(interaction, errorContainer(
                "❌ Invalid Quantity",
                "You must purchase a quantity of 1 or more.",
                interaction.user
            ));
            return;
        }

        const totalCost = item.price * quantity;

        const guildConfig = await getGuildConfig(client, guildId);
        const PREMIUM_ROLE_ID = guildConfig.premiumRoleId;

        const userData = await getEconomyData(client, guildId, userId);

        if (userData.wallet < totalCost) {
            await InteractionHelper.safeEditReply(interaction, errorContainer(
                "❌ Insufficient Funds",
                `You need **$${totalCost.toLocaleString()}** to purchase ${quantity}x **${item.name}**, but you only have **$${userData.wallet.toLocaleString()}** in your wallet.`,
                interaction.user
            ));
            return;
        }

        if (item.type === "role" && itemId === "premium_role") {
            if (!PREMIUM_ROLE_ID) {
                await InteractionHelper.safeEditReply(interaction, errorContainer(
                    "❌ Not Configured",
                    "The **Premium Shop Role** has not been configured by a server administrator yet.",
                    interaction.user
                ));
                return;
            }
            if (interaction.member.roles.cache.has(PREMIUM_ROLE_ID)) {
                await InteractionHelper.safeEditReply(interaction, errorContainer(
                    "❌ Already Owned",
                    `You already have the **${item.name}** role.`,
                    interaction.user
                ));
                return;
            }
            if (quantity > 1) {
                await InteractionHelper.safeEditReply(interaction, errorContainer(
                    "❌ Invalid Quantity",
                    `You can only purchase the **${item.name}** role once.`,
                    interaction.user
                ));
                return;
            }
        }

        userData.wallet -= totalCost;

        let extraText = '';

        if (item.type === "role" && itemId === "premium_role") {
            const member = interaction.member;
            const role = interaction.guild.roles.cache.get(PREMIUM_ROLE_ID);

            if (!role) {
                throw createError(
                    "Role not found",
                    ErrorTypes.CONFIGURATION,
                    "The configured premium role no longer exists in this guild.",
                    { roleId: PREMIUM_ROLE_ID }
                );
            }

            try {
                await member.roles.add(role, `Purchased role: ${item.name}`);
                extraText = `\n👑 **The role ${role.toString()} has been granted to you!**`;
            } catch (roleError) {
                userData.wallet += totalCost;
                await setEconomyData(client, guildId, userId, userData);
                throw createError(
                    "Role assignment failed",
                    ErrorTypes.DISCORD_API,
                    "Successfully deducted money, but failed to grant the role. Your cash has been refunded.",
                    { roleId: PREMIUM_ROLE_ID, originalError: roleError.message }
                );
            }
        } else if (item.type === "upgrade") {
            userData.upgrades[itemId] = true;
            extraText = `\n✨ **Your upgrade is now active!**`;
        } else if (item.type === "consumable") {
            userData.inventory[itemId] = (userData.inventory[itemId] || 0) + quantity;
        }

        await setEconomyData(client, guildId, userId, userData);

        await InteractionHelper.safeEditReply(interaction, {
            components: [
                {
                    type: 17,
                    components: [
                        { type: 10, content: "# 💰 Purchase Successful" },
                        { type: 14, divider: true },
                        {
                            type: 10,
                            content: `✅ You purchased ${quantity}x **${item.name}** for **$${totalCost.toLocaleString()}**!${extraText}`
                        },
                        { type: 14, divider: false },
                        {
                            type: 10,
                            content: `💵 **New Wallet Balance:** $${userData.wallet.toLocaleString()}`
                        },
                        { type: 14, divider: true },
                        { type: 10, content: `-# 🕒 Requested by ${interaction.user}` }
                    ]
                }
            ],
            flags: 32768
        });
    }, { command: 'buy' })
};

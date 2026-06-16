import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { shopItems } from '../../../config/shop/items.js';
import { logger } from '../../../utils/logger.js';

const ITEMS_PER_PAGE = Math.max(1, Math.ceil(shopItems.length / 3));
const TOTAL_PAGES = Math.ceil(shopItems.length / ITEMS_PER_PAGE);

const TYPE_EMOJI = {
    consumable: '🧪',
    upgrade: '⬆️',
    tool: '🔧',
    role: '👑',
};

const createShopContainer = (page) => {
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const pageItems = shopItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const components = [
        { type: 10, content: '# 🛒 Store' },
        { type: 14, divider: true },
        { type: 10, content: 'Use `/buy item_id:<id> quantity:<amount>` to purchase an item.' },
        { type: 14, divider: true },
    ];

    pageItems.forEach((item, index) => {
        const emoji = TYPE_EMOJI[item.type] || '🏷️';
        components.push({
            type: 10,
            content: `### ${item.name} \`${item.id}\`\n${emoji} **Type:** ${item.type}\n💰 **Price:** $${item.price.toLocaleString()}\n${item.description}`
        });
        if (index < pageItems.length - 1) {
            components.push({ type: 14, divider: false });
        }
    });

    components.push({ type: 14, divider: true });
    components.push({ type: 10, content: `-# Page ${page}/${TOTAL_PAGES}` });

    return {
        type: 17,
        accent_color: 0x3498DB,
        components
    };
};

const createButtons = (page, disabled = false) => {
    if (TOTAL_PAGES <= 1) return [];
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('shop_prev')
                .setLabel('Previous')
                .setEmoji('⬅️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disabled || page === 1),
            new ButtonBuilder()
                .setCustomId('shop_next')
                .setLabel('Next')
                .setEmoji('➡️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disabled || page === TOTAL_PAGES),
        )
    ];
};

export default {
    async execute(interaction, config, client) {
        try {
            let currentPage = 1;

            const message = await interaction.editReply({
                components: [createShopContainer(currentPage), ...createButtons(currentPage)],
                flags: 32768,
            });

            if (TOTAL_PAGES <= 1) return;

            const collector = message.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 300000,
            });

            collector.on('collect', async (buttonInteraction) => {
                if (buttonInteraction.user.id !== interaction.user.id) {
                    await buttonInteraction.reply({
                        content: '❌ You cannot use these buttons. Run `/shop browse` to get your own shop view.',
                        flags: 64
                    });
                    return;
                }

                await buttonInteraction.deferUpdate();

                if (buttonInteraction.customId === 'shop_prev' && currentPage > 1) currentPage--;
                else if (buttonInteraction.customId === 'shop_next' && currentPage < TOTAL_PAGES) currentPage++;

                await buttonInteraction.editReply({
                    components: [createShopContainer(currentPage), ...createButtons(currentPage)],
                });
            });

            collector.on('end', async () => {
                try {
                    await message.edit({
                        components: [createShopContainer(currentPage), ...createButtons(currentPage, true)],
                    });
                } catch (_) {}
            });
        } catch (error) {
            logger.error('shop_browse error:', error);
            await interaction.editReply({
                components: [
                    {
                        type: 17,
                        accent_color: 0xE74C3C,
                        components: [
                            { type: 10, content: '## ❌ Error' },
                            { type: 14, divider: true },
                            { type: 10, content: 'An error occurred while loading the shop.' },
                        ]
                    }
                ],
                flags: 32768,
            });
        }
    },
};

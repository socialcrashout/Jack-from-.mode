import { SlashCommandBuilder } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import shopBrowse from './modules/shop_browse.js';
import shopConfigSetrole from './modules/shop_config_setrole.js';

export function errorContainer(title, description) {
    return {
        type: 17,
        accent_color: 0xE74C3C,
        components: [
            { type: 10, content: `## ❌ ${title}` },
            { type: 14, divider: true },
            { type: 10, content: description },
        ]
    };
}

export default {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Economy shop commands.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('browse')
                .setDescription('Browse the economy shop.'),
        )
        .addSubcommandGroup(group =>
            group
                .setName('config')
                .setDescription('Configure shop settings. (Manage Server required)')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('setrole')
                        .setDescription('Set the Discord role granted when the Premium Role shop item is purchased.')
                        .addRoleOption(option =>
                            option
                                .setName('role')
                                .setDescription('The role to grant for Premium Role purchases.')
                                .setRequired(true),
                        ),
                ),
        ),

    async execute(interaction, config, client) {
        const deferred = await InteractionHelper.safeDefer(interaction, { flags: 32768 });
        if (!deferred) return;

        try {
            const subcommandGroup = interaction.options.getSubcommandGroup(false);
            const subcommand = interaction.options.getSubcommand();

            if (subcommand === 'browse') {
                return await shopBrowse.execute(interaction, config, client);
            }

            if (subcommandGroup === 'config' && subcommand === 'setrole') {
                return await shopConfigSetrole.execute(interaction, config, client);
            }

            return await InteractionHelper.safeEditReply(interaction, {
                components: [errorContainer('Unknown Subcommand', 'The subcommand you used is not recognized.')],
                flags: 32768,
            });
        } catch (error) {
            logger.error('shop command error:', error);
            await InteractionHelper.safeEditReply(interaction, {
                components: [errorContainer('Error', 'An error occurred while running the shop command.')],
                flags: 32768,
            }).catch(() => {});
        }
    },
};

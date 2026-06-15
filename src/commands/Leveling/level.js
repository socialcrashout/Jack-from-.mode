import { getColor } from '../../config/bot.js';
import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags, ComponentType, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize } from 'discord.js';
import { createEmbed, errorEmbed } from '../../utils/embeds.js';
import { getLevelingConfig, saveLevelingConfig } from '../../services/leveling.js';
import { botHasPermission } from '../../utils/permissionGuard.js';
import { TitanBotError, ErrorTypes, handleInteractionError } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { logger } from '../../utils/logger.js';
import levelDashboard from './modules/level_dashboard.js';

// Hardcoded level-up notification channel ID
const LEVEL_UP_CHANNEL_ID = '1508652996257386516';

/**
 * Builds a Components v2 container message for level-up notifications.
 * @param {import('discord.js').GuildMember} member - The member who leveled up
 * @param {number} level - The new level reached
 * @param {string} [customMessage] - Optional custom message template with {user} and {level} placeholders
 * @returns {import('discord.js').BaseMessageOptions} Message options with components v2 container
 */
export function buildLevelUpMessage(member, level, customMessage) {
    const template = customMessage ?? '{user} has leveled up to level {level}!';
    const resolvedText = template
        .replace('{user}', `<@${member.id}>`)
        .replace('{level}', String(level));

    const container = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`🎉 **Level Up!**`),
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false),
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(resolvedText),
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`-# Level **${level}** reached`),
        );

    return {
        components: [container],
        flags: MessageFlags.IsComponentsV2,
    };
}

export default {
    data: new SlashCommandBuilder()
        .setName('level')
        .setDescription('Manage the leveling system')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setDMPermission(false)
        .addSubcommand((subcommand) =>
            subcommand
                .setName('setup')
                .setDescription('Set up the leveling system — this also enables it')
                .addIntegerOption((option) =>
                    option
                        .setName('xp_min')
                        .setDescription('Minimum XP awarded per message (default: 15)')
                        .setMinValue(1)
                        .setMaxValue(500)
                        .setRequired(false),
                )
                .addIntegerOption((option) =>
                    option
                        .setName('xp_max')
                        .setDescription('Maximum XP awarded per message (default: 25)')
                        .setMinValue(1)
                        .setMaxValue(500)
                        .setRequired(false),
                )
                .addStringOption((option) =>
                    option
                        .setName('message')
                        .setDescription(
                            'Level-up message. Use {user} and {level} as placeholders (default provided)',
                        )
                        .setMaxLength(500)
                        .setRequired(false),
                )
                .addIntegerOption((option) =>
                    option
                        .setName('xp_cooldown')
                        .setDescription('Seconds between XP grants per user (default: 60)')
                        .setMinValue(0)
                        .setMaxValue(3600)
                        .setRequired(false),
                ),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName('dashboard')
                .setDescription('Open the interactive leveling configuration dashboard'),
        ),
    category: 'Leveling',

    async execute(interaction, config, client) {
        try {
            const deferred = await InteractionHelper.safeDefer(interaction, {
                flags: MessageFlags.Ephemeral,
            });
            if (!deferred) return;

            if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
                return await InteractionHelper.safeEditReply(interaction, {
                    embeds: [
                        errorEmbed(
                            'Missing Permissions',
                            'You need the **Manage Server** permission to use this command.',
                        ),
                    ],
                });
            }

            const subcommand = interaction.options.getSubcommand();

            if (subcommand === 'dashboard') {
                return levelDashboard.execute(interaction, config, client);
            }

            if (subcommand === 'setup') {
                const xpMin = interaction.options.getInteger('xp_min') ?? 15;
                const xpMax = interaction.options.getInteger('xp_max') ?? 25;
                const message =
                    interaction.options.getString('message') ??
                    '{user} has leveled up to level {level}!';
                const xpCooldown = interaction.options.getInteger('xp_cooldown') ?? 60;

                if (xpMin > xpMax) {
                    return await InteractionHelper.safeEditReply(interaction, {
                        embeds: [
                            errorEmbed(
                                'Invalid XP Range',
                                `Minimum XP (**${xpMin}**) cannot be greater than maximum XP (**${xpMax}**).`,
                            ),
                        ],
                    });
                }

                // Resolve the hardcoded channel
                const channel = await interaction.guild.channels.fetch(LEVEL_UP_CHANNEL_ID).catch(() => null);

                if (!channel) {
                    return await InteractionHelper.safeEditReply(interaction, {
                        embeds: [
                            errorEmbed(
                                'Channel Not Found',
                                `Could not find the level-up channel (<#${LEVEL_UP_CHANNEL_ID}>). Make sure it exists and the bot can see it.`,
                            ),
                        ],
                    });
                }

                if (!botHasPermission(channel, ['SendMessages', 'EmbedLinks'])) {
                    throw new TitanBotError(
                        'Bot missing permissions in the level-up channel',
                        ErrorTypes.PERMISSION,
                        `I need **SendMessages** and **EmbedLinks** permissions in ${channel} to send level-up notifications.`,
                    );
                }

                const existingConfig = await getLevelingConfig(client, interaction.guildId);

                if (existingConfig.configured) {
                    return await InteractionHelper.safeEditReply(interaction, {
                        embeds: [
                            errorEmbed(
                                'Leveling System Already Active',
                                `The leveling system is already set up on this server (level-up notifications go to <#${existingConfig.levelUpChannel}>).\n\nUse \`/level dashboard\` to adjust any settings.`,
                            ),
                        ],
                    });
                }

                const newConfig = {
                    ...existingConfig,
                    configured: true,
                    enabled: true,
                    levelUpChannel: LEVEL_UP_CHANNEL_ID,
                    xpRange: { min: xpMin, max: xpMax },
                    xpCooldown: xpCooldown,
                    levelUpMessage: message,
                    announceLevelUp: true,
                };

                await saveLevelingConfig(client, interaction.guildId, newConfig);

                logger.info(`Leveling system set up in guild ${interaction.guildId}`, {
                    channelId: LEVEL_UP_CHANNEL_ID,
                    xpMin,
                    xpMax,
                    xpCooldown,
                    userId: interaction.user.id,
                });

                return await InteractionHelper.safeEditReply(interaction, {
                    embeds: [
                        createEmbed({
                            title: '✅ Leveling System Set Up',
                            description:
                                `The leveling system is now **enabled** and ready to go.\n\n` +
                                `**Level-up Channel:** <#${LEVEL_UP_CHANNEL_ID}>\n` +
                                `**XP per Message:** ${xpMin} – ${xpMax}\n` +
                                `**XP Cooldown:** ${xpCooldown}s\n` +
                                `**Level-up Message:** \`${message}\`\n\n` +
                                `Use \`/level dashboard\` to adjust any of these settings at any time.`,
                            color: 'success',
                        }),
                    ],
                });
            }
        } catch (error) {
            logger.error('Level command error:', error);
            await handleInteractionError(interaction, error, {
                type: 'command',
                commandName: 'level',
            });
        }
    },
};

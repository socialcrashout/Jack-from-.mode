import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getEconomyData } from '../../utils/economy.js';
import { withErrorHandling } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription("Check your or someone else's balance")
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('User to check balance for')
                .setRequired(false)
        ),
    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

        const targetUser = interaction.options.getUser("user") || interaction.user;

        const wallet = 5000;
        const bank = 10000;
        const maxBank = 50000;
        const netWorth = wallet + bank;
        const bankPercent = Math.round((bank / maxBank) * 100);

        const embed = new EmbedBuilder()
            .setTitle('💰 Balance Overview')
            .setColor(0xF1C40F)
            .setThumbnail(targetUser.displayAvatarURL())
            .addFields(
                { name: '👤 User', value: `${targetUser}`, inline: false },
                { name: '💵 Wallet', value: `$${wallet.toLocaleString()}`, inline: true },
                { name: '🏦 Bank', value: `$${bank.toLocaleString()} / $${maxBank.toLocaleString()} \`${bankPercent}% full\``, inline: true },
                { name: '💎 Net Worth', value: `$${netWorth.toLocaleString()}`, inline: true }
            )
            .setFooter({ text: `Requested by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

        await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    }, { command: "balance" })
};

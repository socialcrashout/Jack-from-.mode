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

        // Get your economy data here...
        const wallet = 5000;
        const bank = 10000;
        const maxBank = 50000;

        const components = [
            {
                type: 17,
                accent_color: 0xF1C40F,
                components: [
                    {
                        type: 10,
                        content: "# 💰 Balance Overview"
                    },
                    {
                        type: 14,
                        divider: true
                    },
                    {
                        type: 10,
                        content: `## 👤 User\n${targetUser}`
                    },
                    {
                        type: 10,
                        content:
                            `### 💵 Wallet\n**$${wallet.toLocaleString()}**\n\n` +
                            `### 🏦 Bank\n**$${bank.toLocaleString()} / $${maxBank.toLocaleString()}**\n\n` +
                            `### 💎 Net Worth\n**$${(wallet + bank).toLocaleString()}**`
                    }
                ]
            }
        ];

        await InteractionHelper.safeEditReply(interaction, {
            components,
            flags: 32768
        });
    }, { command: "balance" })
};

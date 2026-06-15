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
        const netWorth = wallet + bank;
        const bankPercent = Math.round((bank / maxBank) * 100);

        const components = [
            {
                type: 17, // Container
                accent_color: 0xF1C40F,
                components: [
                    {
                        type: 10, // Text Display
                        content: "# 💰 Balance Overview"
                    },
                    {
                        type: 14, // Separator
                        divider: true
                    },
                    {
                        type: 10,
                        content: `👤 **User:** ${targetUser}`
                    },
                    {
                        type: 14,
                        divider: false
                    },
                    {
                        type: 10,
                        content: `💵 **Wallet:** $${wallet.toLocaleString()}`
                    },
                    {
                        type: 10,
                        content: `🏦 **Bank:** $${bank.toLocaleString()} / $${maxBank.toLocaleString()} \`${bankPercent}% full\``
                    },
                    {
                        type: 10,
                        content: `💎 **Net Worth:** $${netWorth.toLocaleString()}`
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
        ];

        await InteractionHelper.safeEditReply(interaction, {
            components,
            flags: 32768
        });
    }, { command: "balance" })
};

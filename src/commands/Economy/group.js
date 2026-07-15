const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");
const noblox = require("noblox.js");

const GROUP_ID = 425292002; // Replace with your Mode group ID

module.exports = {
    name: "group",

    data: new SlashCommandBuilder()
        .setName("group")
        .setDescription("Displays the official Mode Roblox group."),

    async execute(client, ctx) {
        try {
            const group = await noblox.getGroup(GROUP_ID);

            const embed = new EmbedBuilder()
                .setColor("#ff5b5b")
                .setTitle(group.name)
                .setDescription(
                    `**Owned by:** ${group.owner ? group.owner.username : "Nobody"}\n` +
                    `**Members:** ${group.memberCount}\n` +
                    `**Created:** <t:${Math.floor(new Date(group.created).getTime() / 1000)}:F>`
                )
                .setFooter({ text: "Mode" });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel("Roblox Group")
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://www.roblox.com/groups/${GROUP_ID}`)
            );

            await ctx.reply({
                embeds: [embed],
                components: [row]
            });

        } catch (err) {
            console.error(err);
            await ctx.reply("❌ Unable to fetch the group information.");
        }
    }
};

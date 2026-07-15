import { SlashCommandBuilder } from "discord.js";
import noblox from "noblox.js";
import { withErrorHandling } from "../../utils/errorHandler.js";
import { InteractionHelper } from "../../utils/interactionHelper.js";

const GROUP_ID = 425292002; // <-- Replace with your Roblox Group ID

export default {
    data: new SlashCommandBuilder()
        .setName("group")
        .setDescription("View the official Mode Roblox group."),

    execute: withErrorHandling(async (interaction) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

        try {
            const group = await noblox.getGroup(GROUP_ID);

            const owner = group.owner ? group.owner.username : "Nobody";

            await InteractionHelper.safeEditReply(interaction, {
                components: [
                    {
                        type: 17,
                        components: [
                            {
                                type: 9,
                                components: [
                                    {
                                        type: 10,
                                        content: `# 🏢 ${group.name}`
                                    },
                                    {
                                        type: 10,
                                        content: `Official Roblox Group`
                                    }
                                ],
                                accessory: {
                                    type: 11,
                                    media: {
                                        url: `https://www.roblox.com/headshot-thumbnail/image?userId=${group.owner?.userId || 1}&width=420&height=420&format=png`
                                    }
                                }
                            },
                            {
                                type: 14,
                                divider: true
                            },
                            {
                                type: 10,
                                content: `👑 **Owner:** ${owner}`
                            },
                            {
                                type: 10,
                                content: `👥 **Members:** ${group.memberCount.toLocaleString()}`
                            },
                            {
                                type: 10,
                                content: `📝 **Description:**\n${group.description || "No description."}`
                            },
                            {
                                type: 14,
                                divider: true
                            },
                            {
                                type: 10,
                                content: `🔗 https://www.roblox.com/groups/${GROUP_ID}`
                            },
                            {
                                type: 14,
                                divider: true
                            },
                            {
                                type: 10,
                                content: `-# Requested by ${interaction.user}`
                            }
                        ]
                    }
                ],
                flags: 32768
            });

        } catch (err) {
            console.error(err);

            await InteractionHelper.safeEditReply(interaction, {
                content: "❌ Failed to retrieve the Roblox group."
            });
        }
    }, { command: "group" })
};

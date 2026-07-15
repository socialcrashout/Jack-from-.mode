import { SlashCommandBuilder } from "discord.js";
import axios from "axios";
import { withErrorHandling } from "../../utils/errorHandler.js";
import { InteractionHelper } from "../../utils/interactionHelper.js";

const GROUP_ID = 425292002;

export default {
    data: new SlashCommandBuilder()
        .setName("group")
        .setDescription("View the official Mode Roblox group."),

    execute: withErrorHandling(async (interaction) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

        try {
            const { data: group } = await axios.get(
                `https://groups.roblox.com/v1/groups/${GROUP_ID}`
            );

            const { data: icon } = await axios.get(
                `https://thumbnails.roblox.com/v1/groups/icons?groupIds=${GROUP_ID}&size=420x420&format=Png&isCircular=false`
            );

            const iconUrl = icon.data?.[0]?.imageUrl ?? null;

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
                                        content: "Official Roblox Group"
                                    }
                                ],
                                ...(iconUrl && {
                                    accessory: {
                                        type: 11,
                                        media: {
                                            url: iconUrl
                                        }
                                    }
                                })
                            },
                            {
                                type: 14,
                                divider: true
                            },
                            {
                                type: 10,
                                content: `👥 **Members:** ${group.memberCount.toLocaleString()}`
                            },
                            {
                                type: 10,
                                content: `👑 **Owner:** ${group.owner?.username ?? "Unknown"}`
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
                                content: `🔗 https://www.roblox.com/communities/${GROUP_ID}`
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

        } catch (error) {
            console.error(error);

            await InteractionHelper.safeEditReply(interaction, {
                content: "❌ Failed to retrieve the Roblox group."
            });
        }
    }, { command: "group" })
};

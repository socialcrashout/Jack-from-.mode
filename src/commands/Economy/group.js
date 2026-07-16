import { SlashCommandBuilder } from "discord.js";
import axios from "axios";
import { withErrorHandling } from "../../utils/errorHandler.js";
import { InteractionHelper } from "../../utils/interactionHelper.js";

const GROUP_ID = 425292002;

// Set this to your footer image URL (shown at the bottom of the embed)
const FOOTER_IMAGE_URL = "https://cdn.discordapp.com/attachments/1502518130616963166/1518310251361730672/22_20260510_032209_0020.png?ex=6a59c0dc&is=6a586f5c&hm=f7492c4909f6d8427524bbf25a4edd8d4e7d03ee9a05948bedcab1137a87bffd";

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

            const createdDate = group.created
                ? new Date(group.created).toLocaleString("en-US", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit"
                  })
                : "Unknown";

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
                                        content: `# ${group.name}`
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
                                type: 10,
                                content: `**Owned by:** ${group.owner?.username ?? "Unknown"}`
                            },
                            {
                                type: 10,
                                content: `**Members:** ${group.memberCount.toLocaleString()}`
                            },
                            {
                                type: 10,
                                content: `**Created:** ${createdDate}`
                            },
                            {
                                type: 14,
                                divider: true
                            },
                            {
                                type: 10,
                                content: "Roblox Group"
                            },
                            {
                                type: 1,
                                components: [
                                    {
                                        type: 2,
                                        style: 5,
                                        label: "Mode",
                                        url: `https://www.roblox.com/communities/${425292002}`
                                    }
                                ]
                            },
                            {
                                type: 14,
                                divider: true
                            },
                            {
                                type: 12,
                                items: [
                                    {
                                        media: {
                                            url: https://cdn.discordapp.com/attachments/1502518130616963166/1518310251361730672/22_20260510_032209_0020.png?ex=6a59c0dc&is=6a586f5c&hm=f7492c4909f6d8427524bbf25a4edd8d4e7d03ee9a05948bedcab1137a87bffd
                                        }
                                    }
                                ]
                            }
                        ]
                    }
                ],
                flags: 32768
            });
        } catch (error) {
            console.error(error);
            await InteractionHelper.safeEditReply(interaction, {
                content: "Failed to retrieve the Roblox group."
            });
        }
    }, { command: "group" })
};

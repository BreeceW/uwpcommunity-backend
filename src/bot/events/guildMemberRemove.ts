import { GuildMember, TextChannel } from "discord.js";
import { getUserByDiscordId } from "../../models/User";
import { getOwnedProjectsByDiscordId } from "../../models/Project";

export default async (guildMember: GuildMember) => {
    let user = await getUserByDiscordId(guildMember.id);
    if (user) {
        let removalMessage: string = `Registered user ${guildMember.user.username}#${guildMember.user.discriminator} ${guildMember.nickname ? `(${guildMember.nickname})` : ""} has left the server, information has been deleted from database`;
        console.log(removalMessage);
        sendMessageWithBackups(guildMember, removalMessage);

        await removeUserProjectsFromDb(user.discordId).catch(message => sendMessageWithBackups(guildMember, `Internal error whild removing user projects: ${message}`));
        await removeUserFromDb(user.discordId).catch(message => sendMessageWithBackups(guildMember, `Internal error while removing user: ${message}`));
    }
}

function sendMessageWithBackups(guildMember: GuildMember, message: string) {
    // Uses a bot channel as primary message vessel, notifies mod-chat as a backup, and then general if that fails, too.
    let botChannel = (guildMember.guild.channels.find("name", "bot-stuff") as TextChannel)
    if (botChannel) botChannel.send(message);
    else {
        let modChannel = (guildMember.guild.channels.find("name", "mod-chat") as TextChannel);
        if (modChannel) modChannel.send("Something went wrong with the bot, please have an Admin take a look.");
        else {
            let generalChannel = (guildMember.guild.channels.find("name", "general") as TextChannel);
            if (!generalChannel) throw "Couldn't find bot channel, mod channel, or general channel";
            else generalChannel.send("A few things went wrong went wrong with the bot, please have an Admin take a look.");
        }
        return;
    }
}

/**
 * @returns True if successful, false if user not found
 * @param user User who's projects are to be deleted
 */
async function removeUserProjectsFromDb(discordId: string) {
    return new Promise(async (resolve, reject) => {
        // Find the projects
        const projects = await getOwnedProjectsByDiscordId(discordId).catch(reject);
        if (!projects) return;

        // Delete all associated projects with this user
        let isRejected: boolean = false;
        for (let project of projects) {
            await project.destroy().catch((error) => {
                isRejected = true;
                reject(error);
            });
        }

        if (!isRejected) resolve();
    });
}

/**
 * @returns True if successful, false if user not found
 * @param user User to delete
 */
async function removeUserFromDb(discordId: string) {
    return new Promise(async (resolve, reject) => {

        // Find the user
        const userOnDb = await getUserByDiscordId(discordId).catch(reject);
        if (!userOnDb) { resolve(false); return; }

        // Delete the user
        userOnDb.destroy().then(resolve).catch(reject);
    });
}

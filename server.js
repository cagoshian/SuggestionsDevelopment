const Eris = require('eris');
const fs = require('fs');
const settings = require("./settings.json")
const arkdb = require('ark.db');
const db = new arkdb.Database()
const version = "1.0-underwork";
const {manageSuggestion, deleteSuggestion, sendSuggestion, verifySuggestion} = require('./functions')

const type3cmds = ["Mark Suggestion as Approved", "Mark Suggestion as Denied", "Mark Suggestion as Invalid", "Mark Suggestion as Implemented", "Follow Suggestion"]

const client = new Eris(`Bot ${settings.token}`, {intents: ["all"]})

client.db = db
client.commands = new Eris.Collection(undefined, undefined);

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

client.on('ready', async () => {
	client.editStatus("online", {name: `.help | .invite | v${version}`, type: 1})
	
	fs.readdir("languages", async (err, files) => {
		const jsonfile = files.filter(f => f.split(".").pop() == "json").map(s => s.split(".")[0]);
		if (jsonfile.length <= 0 || err || !files) {
			console.log("Unable to find languages.");
			return process.exit(0)
		}
		client.languages = jsonfile
		console.log(`Loaded languages: ${jsonfile}`)
	});
	
	fs.readdir("commands", (err, files) => {
		const jsfile = files.filter(f => f.split(".").pop() == "js");
		if (jsfile.length <= 0 || err || !files) {
			console.log("Unable to find commands.");
			return process.exit(0)
		}
		client.getGuildCommands("876111560244887553").then(async cmds => {
			for (const f of jsfile) {
				const props = require(`./commands/${f}`);
				client.commands.set(props.help.name, props);
				if (props.help.supportsSlash) {
					if (!cmds.find(c => c.name == props.help.name)) {
						client.createGuildCommand("876111560244887553", {
							name: props.help.name,
							description: props.help.description || props.help.descriptionen,
							options: props.help.options || []
						})
						console.log(`${f} added to slash commands`)
					}else{
						client.editGuildCommand("876111560244887553", cmds.find(c => c.name == props.help.name).id, {
							name: props.help.name,
							description: props.help.description || props.help.descriptionen,
							options: props.help.options || []
						})
						console.log(`${f} edited in slash commands`)
					}
				}
				console.log(`${f} loaded`);
			}
			for (let data of cmds) {
				if (data.type == 1 && (!client.commands.has(data.name) || client.commands.get(data.name).help.supportsSlash === false)) {
					client.deleteGuildCommand("876111560244887553", data.id)
					console.log(`${data.name} deleted from slash commands`)
				}
				if (data.type == 3 && !type3cmds.includes(data.name)) {
					await client.deleteGuildCommand("876111560244887553", data.id)
					console.log(`${data.name} deleted from type-3 commands`)
				}
			}
		})
		console.log("All commands have been loaded successfully.")
	});
	
	client.getGuildCommands("876111560244887553").then(async cmds => {
		for (let cmd of type3cmds) {
			if (!cmds.find(c => c.name == cmd)) {
				client.createGuildCommand("876111560244887553", {
					name: cmd,
					type: 3
				})
			}
		}
	})
})

client.on("messageCreate", async message => {
	if (message.author.bot) return;
	if (!message.guildID) return message.channel.createMessage(`You can't use commands via DMs, you can only receive suggestion updates.`)
	const prefix = db.fetch(`prefix_${message.guildID}`) || ".";
	if (message.content.startsWith(prefix)) {
		const messageArray = message.content.trim().split(" ").filter(item => item)
		const cmd = messageArray[0];
		let commandfile = client.commands.get(cmd.slice(prefix.length));
		if (!commandfile) return;
		const args = messageArray.slice(1);
		const guild = client.guilds.get(message.guildID)
		guild.fetchMembers({userIDs: [client.user.id]})
		const guildme = guild.members.get(client.user.id)
		if (!guildme.permissions.has('sendMessages')) return message.author.getDMChannel().then(ch => ch.createMessage(`The bot doesn't have send messages permission in this guild.`))
		if (!guildme.permissions.has('manageMessages') || !guildme.permissions.has('embedLinks') || !guildme.permissions.has('addReactions')) return message.channel.createMessage(`The bot should have Manage Messages, Embed Links and Add Reactions permissions in order to work properly.`)
		commandfile.run(client, message, args);
	} else {
		if (!db.has(`suggestionchannel_${message.guildID}`)) return;
		if (db.fetch(`suggestionchannel_${message.guildID}`) != message.channel.id) return;
		if (db.has(`disablemessagechannel_${message.guildID}`)) return;
		
		let language = db.fetch(`dil_${message.guildID}`) || "english";
		let langfile = require(`./languages/english.json`)
		if (language && language != "english") langfile = require(`./languages/${language}.json`)
		
		const approvalOrNew = await sendSuggestion(message.author, message.content.slice(0, 1024), client.guilds.get(message.guildID), client)
		message.delete()
		if (approvalOrNew == "approval") return message.channel.createMessage(langfile.suggestionSentApproval).then(async msg => {
			await sleep(7500)
			msg.delete()
		})
	}
})

/*client.on('guildCreate', async guild => {
	let role = null;
	const everyonerole = guild.roles.find(r => r.name.toLowerCase().includes("everyone"))
	if (guild.memberCount >= 5000) role = everyonerole
	else {
		guild.fetchMembers({limit: 5000}).then(async members => {
			for (const r of guild.roles) {
				const currentnumber = members.filter(m => m.roles.includes(r.id)).length;
				if (currentnumber / guild.memberCount >= 0.75) {
					if (role === null) role = r;
					else {
						if (currentnumber > members.filter(m => m.roles.includes(role.id)).length) role = r;
					}
				}
			}
		})
		if (role === null) role = everyonerole
	}
	let channels = guild.channels.filter(c => c.type == 0 && c.permissionOverwrites.has(role.id) && JSON.stringify(c.permissionOverwrites.get(role.id).json).includes('sendMessages') && c.permissionOverwrites.get(role.id).json.sendMessages != false)
	if (channels.length <= 0) channels = guild.channels.filter(c => c.type == 0 && !c.permissionOverwrites.has(role.id) && !c.permissionOverwrites.has(everyonerole.id));
	let channel = 0;
	if (channels.length > 1) {
		let lasttimestamp = 0;
		for (const ch of channels) {
			ch.getMessages({limit: 1}).then(async msg => {
				if (msg[0] && msg[0].timestamp > lasttimestamp) {
					lasttimestamp = msg[0].timestamp
					channel = ch
				}
			})
		}
	}
	if (channels.length === 0) {
		let lasttimestamp = 0;
		for (const ch of guild.channels.filter(c => c.type == 0)) {
			ch.getMessages({limit: 1}).then(async msg => {
				if (msg[0] && msg[0].timestamp > lasttimestamp) {
					lasttimestamp = msg[0].timestamp
					channel = ch
				}
			})
		}
	}
	if (channel === 0) channel = channels[0]
	channel.createMessage({
		embed: {
			title: '**__Thanks for adding Suggestions bot!__**',
			description: `This bot allows you to manage your suggestions in server easily. You can see the possible commands with **.help** command.\nThis bot won't work if you don't set any suggestion channel.\n \n**You can get help about the bot setup** With **.setupinfo** command.\n \n**This bot made by** ${user.username}#${user.discriminator}\n \n**If you have any cool idea for bot** Use **.botsuggest** command to send suggestions to owner.\n \n**Note:** In order to work properly, bot should have Manage Messages, Embed Links and Add Reactions permission.\n \n**Note for Turkish:** Eğer botu Türkçe kullanmak istiyorsanız \`.language turkish\` komuduyla botu Türkçe yapabilirsiniz, Türkçe yaptıktan sonra \`.kurulumbilgi\` ile bilgi alabilirsiniz`,
			color: colorToSignedBit("#2F3136"),
			author: {
				name: client.user.username,
				icon_url: client.user.avatarURL || client.user.defaultAvatarURL
			},
			footer: {
				text: client.user.username,
				icon_url: client.user.avatarURL || client.user.defaultAvatarURL
			}
		}
	})
})*/

client.on('messageReactionAdd', async (message, emoji, user) => {
	if (!db.has(`reviewchannel_${message.guildID}`)) return;
	if (db.fetch(`reviewchannel_${message.guildID}`) != message.channel.id) return;
	if (!client.users.has(user.id)) client.guilds.get(message.guildID).fetchMembers({userIDs: [ user.id ]})
	if (client.users.get(user.id).bot) return;
	const guild = client.guilds.get(message.guildID)
	if (!db.has(`staffrole_${guild.id}`) && !guild.members.get(user.id).permissions.has('manageMessages')) return;
	if (db.has(`staffrole_${guild.id}`) && !guild.members.get(user.id).roles.some(r => db.fetch(`staffrole_${guild.id}`).includes(r)) && !guild.members.get(user.id).permissions.has('administrator')) return;
	guild.channels.get(message.channel.id).getMessage(message.id).then(async msg => {
		if (emoji.name == `✅`) return verifySuggestion(msg, msg.channel.guild, client)
		if (emoji.name == `❌`) return deleteSuggestion(client.guilds.get(msg.guildID), Number(msg.embeds[0].title.split(' ').find(s => s.includes("#")).replace('#', '')), client, "-")
	})
})

client.on('messageDelete', async message => {
	const data = Object.values(db.fetch(`suggestions_${message.guildID}`)).find(s => s.msgid == message.id)
	if (!data) return;
	deleteSuggestion(client.guilds.get(message.guildID), data.sugid, client, "-", true)
})

client.on('error', async error => console.error(error.stack))

client.on("interactionCreate", async interaction => {
	if(interaction instanceof Eris.CommandInteraction) {
		if (interaction.data.type == 3) {
			let language = db.fetch(`dil_${interaction.guildID}`) || "english";
			let langfile = require(`./languages/english.json`)
			if (language && language != "english") langfile = require(`./languages/${language}.json`)
			
			if (interaction.data.name.startsWith("Mark Suggestion as")) {
				const status = interaction.data.name.split("Mark Suggestion as ")[1].toLowerCase()
				if (!db.has(`staffrole_${interaction.guildID}`) && !interaction.member.permissions.has('manageMessages')) return interaction.createMessage(langfile.noStaffRoleAndNoPerm)
				if (db.has(`staffrole_${interaction.guildID}`) && !interaction.member.roles.some(r => db.fetch(`staffrole_${interaction.guildID}`).includes(r)) && !interaction.member.permissions.has('administrator')) return interaction.createMessage(langfile.staffRoleButNoPerm)
				const interactedMessage = await interaction.channel.getMessage(interaction.data.target_id)
				if (!interactedMessage.author.bot) return;
				const data = Object.values(db.fetch(`suggestions_${interaction.guildID}`)).find(s => s.msgid == interactedMessage.id)
				if (!data) return interaction.createMessage(langfile.noSuggestionWithThisNumber)
				if (data.status == "awaiting") return interaction.createMessage(langfile.reviewFirst)
				if (data.status == "deleted") return interaction.createMessage(langfile.suggestionAlreadyDeleted)
				if (data.status == status) return interaction.createMessage(langfile.thisSuggestionIsAlreadyMarkedAs.replace('%type%', langfile[status]))
				await manageSuggestion(interaction.member.user, client.guilds.get(interaction.guildID), data.sugid, status, client, "-")
				interaction.createMessage(langfile.suggestionMarkedAs.replace('%type%', langfile[status]))
			} else if (interaction.data.name == "Follow Suggestion") {
				const interactedMessage = await interaction.channel.getMessage(interaction.data.target_id)
				if (!interactedMessage.author.bot) return;
				const data = Object.values(db.fetch(`suggestions_${interaction.guildID}`)).find(s => s.msgid == interactedMessage.id)
				if (!data) return interaction.createMessage(langfile.noSuggestionWithThisNumber)
				if (data.status == "deleted") return interaction.createMessage(langfile.suggestionAlreadyDeleted)
				data.followers.push(interaction.member.user.id)
				db.set(`suggestions_${interaction.guildID}.${data.sugid}`, data)
				interaction.createMessage(langfile.suggestionFollowed)
			}
		} else {
			if (client.commands.has(interaction.data.name)) {
				const command = client.commands.get(interaction.data.name)
				command.run(client, interaction)
			}
		}
	}
})

client.connect()

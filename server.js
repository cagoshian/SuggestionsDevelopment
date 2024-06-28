const Eris = require('eris');
const fs = require('fs');
const settings = require("./settings.json")
const arkdb = require('ark.db');
const db = new arkdb.Database()
const version = "1.0-underwork";
const {manageSuggestion, deleteSuggestion, sendSuggestion, verifySuggestion, staffPermCheck} = require('./functions')

function colorToSignedBit(s) {
	return (parseInt(s.slice(1), 16) << 8) / 256;
}

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
})

client.on('guildCreate', async guild => {
	let language = db.fetch(`dil_${guild.id}`) || "english";
	let langfile = require(`./languages/english.json`)
	if (language && language != "english") langfile = require(`./languages/${language}.json`)
	
	let role = 0;
	
	for (const r of guild.roles) {
		const currentnumber = r.members ? r.members.size : 0;
		if (currentnumber / guild.memberCount >= 0.75) {
			if (role === null) role = r;
			else {
				if (currentnumber > role.members.size) role = r;
			}
		}
	}
	
	if (role === 0) role = guild.roles.find(p => p.name == '@everyone')
	if (!role) return;
	
	let channels = guild.channels.filter(c => c.type === 0 && c.permissionOverwrites.has(role.id) && c.permissionOverwrites.get(role.id).has('viewChannel') && c.permissionOverwrites.get(role.id).has('sendMessages'))
	if (channels.length <= 0) channels = guild.channels.filter(c => c.type === 0 && !c.permissionOverwrites.has(role.id));
	if (channels.length === 0) return;
	let channel = 0;
	if (channels.length == 1) channel = channels[0]
	else if (channels.length > 1) {
		let lasttimestamp = 0;
		for (const ch of channels) {
			await ch.getMessages({limit: 1}).then(async msg => {
				if (msg[0] && msg[0].timestamp > lasttimestamp) {
					lasttimestamp = msg[0].timestamp
					channel = ch
				}
			})
		}
	}
	
	if (!channel) return;
	
	channel.createMessage({
		embed: {
			title: langfile.newGuildTitle,
			description: langfile.newGuildContent,
			color: colorToSignedBit("#2F3136"),
			footer: {
				text: client.user.username,
				icon_url: client.user.avatarURL || client.user.defaultAvatarURL
			}
		}
	})
})

client.on('messageReactionAdd', async (message, emoji, user) => {
	if (!db.has(`reviewchannel_${message.guildID}`)) return;
	if (db.fetch(`reviewchannel_${message.guildID}`) != message.channel.id) return;
	if (!client.users.has(user.id)) client.guilds.get(message.guildID).fetchMembers({userIDs: [ user.id ]})
	if (client.users.get(user.id).bot) return;
	const guild = client.guilds.get(message.guildID)
	const noperm = staffPermCheck(user, client)
	if (noperm === true) return;
	guild.channels.get(message.channel.id).getMessage(message.id).then(async msg => {
		if (emoji.name == `✅`) return verifySuggestion(msg, msg.channel.guild, client)
		if (emoji.name == `❌`) return deleteSuggestion(client.guilds.get(msg.guildID), Number(msg.embeds[0].title.split(' ').find(s => s.includes("#")).replace('#', '')), client, "-")
	})
})

client.on('messageDelete', async message => {
	await sleep(1000)
	if (!db.has(`suggestions_${message.guildID}`)) return;
	const data = Object.values(db.fetch(`suggestions_${message.guildID}`)).find(s => s.msgid == message.id)
	if (!data) return;
	deleteSuggestion(client.guilds.get(message.guildID), data.sugid, client, "-", true)
})

client.on('error', async error => console.error(error.stack))

client.on("interactionCreate", async interaction => {
	if(interaction instanceof Eris.CommandInteraction) {
		let language = db.fetch(`dil_${interaction.guildID}`) || "english";
		let langfile = require(`./languages/english.json`)
		if (language && language != "english") langfile = require(`./languages/${language}.json`)
		
		if (interaction.data.type == 3) {
			const interactedMessage = await interaction.channel.getMessage(interaction.data.target_id)
			if (!interactedMessage.author.bot) return interaction.createMessage({content: langfile.thisIsNotSuggestion, flags: 64})
			
			const data = Object.values(db.fetch(`suggestions_${interaction.guildID}`)).find(s => s.msgid == interactedMessage.id)
			if (!data) return interaction.createMessage({content: langfile.thisIsNotSuggestion, flags: 64});
			
			if (data.status == "deleted") return interaction.createMessage({content: langfile.suggestionAlreadyDeleted, flags: 64})
			
			if (interaction.data.name.startsWith("Mark Suggestion as")) {
				const status = interaction.data.name.split("Mark Suggestion as ")[1].toLowerCase()
				
				const noperm = staffPermCheck(interaction.member, client)
				if (noperm === true) return interaction.createMessage({content: langfile.staffNotEnoughPerm, flags: 64})
				
				if (data.status == "awaiting") return interaction.createMessage({content: langfile.reviewFirst, flags: 64})
				if (data.status == status) return interaction.createMessage({content: langfile.thisSuggestionIsAlreadyMarkedAs.replace('%type%', langfile[status]), flags: 64})
				
				await manageSuggestion(interaction.member.user, client.guilds.get(interaction.guildID), data.sugid, status, client, "-")
				interaction.createMessage({content: langfile.suggestionMarkedAs.replace('%type%', langfile[status]), flags: 64})
			} else if (interaction.data.name == "Follow Suggestion") {
				if (data.followers.includes(interaction.member.user.id)) {
					data.followers = data.followers.filter(f => f !== interaction.member.user.id)
					db.set(`suggestions_${interaction.guildID}.${data.sugid}`, data)
					return interaction.createMessage({content: langfile.suggestionUnfollowed, flags: 64})
				}else {
					data.followers.push(interaction.member.user.id)
					db.set(`suggestions_${interaction.guildID}.${data.sugid}`, data)
					interaction.createMessage({content: langfile.suggestionFollowed, flags: 64})
				}
			}
		} else {
			if (client.commands.has(interaction.data.name)) {
				const command = client.commands.get(interaction.data.name)
				if (command.help.category == "admin") {
					if (!interaction.member.permissions.has('administrator')) return interaction.createMessage({content: langfile.adminNotEnoughPerm, flags: 64})
				} else if (command.help.category == "staff") {
					const noperm = staffPermCheck(interaction.member, client)
					if (noperm === true) return interaction.createMessage({content: langfile.staffNotEnoughPerm, flags: 64})
				}
				command.run(client, interaction, langfile)
			}
		}
	}
})

client.connect()

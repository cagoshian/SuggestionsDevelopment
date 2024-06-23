const Eris = require("eris");

module.exports.run = async (client, interaction) => {
	const db = client.db
	let dil = db.fetch(`dil_${interaction.guildID}`) || "english";
	let langfile = require(`../languages/english.json`)
	if (dil && dil != "english") langfile = require(`../languages/${dil}.json`)
	
	const allow = interaction.data.options[0].value
	const allowedCurrently = !db.has(`denysuggestcommand_${interaction.guildID}`)
	
	if (allow === allowedCurrently) return interaction.createMessage({content: langfile.alreadyThisSelected.replace('%thing%', langfile.option), flags: 64})
	
	if (allow === false) {
		if (db.has(`disablemessagechannel_${interaction.guildID}`)) return interaction.createMessage({content: langfile.youMustAllowMessagingChannel.replace('%command', `\`/allow-messaging-suggestion-channel\``), flags: 64})
		db.set(`denysuggestcommand_${interaction.guildID}`, 'true')
		interaction.createMessage(langfile.yourMembersCannotUseCommand.replace('%thing%', `suggest`))
	} else {
		db.delete(`denysuggestcommand_${interaction.guildID}`)
		interaction.createMessage(langfile.yourMembersCanUseCommand.replace('%thing%', `suggest`))
	}
}

module.exports.help = {
	name: "allow-suggest-command",
	description: "Sets your members can use suggest command without messaging to suggestion channel or not.",
	category: 'admin',
	options: [
		{
			name: "allow-or-not",
			description: "Do you want to allow your members to use suggest command without messaging to suggestion channel?",
			type: Eris.Constants.ApplicationCommandOptionTypes.BOOLEAN,
			required: true
		}
	],
	supportsSlash: true
}

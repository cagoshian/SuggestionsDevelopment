const Eris = require("eris");

module.exports.run = async (client, interaction, langfile) => {
	const db = client.db
	
	const allow = interaction.data.options[0].value
	const allowedCurrently = !db.has(`denydm_${interaction.member.user.id}`)
	
	if (allow === allowedCurrently) return interaction.createMessage({content: langfile.alreadyThisSelected.replace('%thing%', langfile.option), flags: 64})
	
	if (allow === false) {
		db.set(`denydm_${interaction.member.user.id}`, 'true')
		interaction.createMessage({content: langfile.youWillNotGetDMs, flags: 64})
	} else {
		db.delete(`denydm_${interaction.member.user.id}`)
		interaction.createMessage({content: langfile.youWillGetDMs, flags: 64})
	}
}

module.exports.help = {
	name: "allow-notifications",
	description: "Allows to enable/disable DM notifications for events of followed suggestions. (default: true)",
	category: 'public',
	options: [
		{
			name: "allow-or-not",
			description: "Do you want to get DM notifications for events of your followed suggestions?",
			type: Eris.Constants.ApplicationCommandOptionTypes.BOOLEAN,
			required: true
		}
	],
	supportsSlash: true
}

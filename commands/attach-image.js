const Eris = require("eris");
const { attachImage } = require('../functions')

module.exports.run = async (client, interaction) => {
	const db = client.db
	let dil = db.fetch(`dil_${interaction.guildID}`) || "english";
	let langfile = require(`../languages/english.json`)
	if (dil && dil != "english") langfile = require(`../languages/${dil}.json`)

	if (!db.has(`staffrole_${interaction.guildID}`) && !interaction.member.permissions.has('manageMessages')) return interaction.createMessage(langfile.noStaffRoleAndNoPerm)
	if (db.has(`staffrole_${interaction.guildID}`) && !interaction.member.roles.some(r => db.fetch(`staffrole_${interaction.guildID}`).includes(r)) && !interaction.member.permissions.has('administrator')) return interaction.createMessage(langfile.staffRoleButNoPerm)
	if (!db.has(`suggestionchannel_${interaction.guildID}`) || !client.guilds.get(interaction.guildID).channels.get(db.fetch(`suggestionchannel_${interaction.guildID}`))) return interaction.createMessage(langfile.noSuggestionChannel)
	
	const sugid = interaction.data.options[0].value
	const attachmentLink = interaction.data.options[1].value
	
	const data = db.fetch(`suggestions_${interaction.guildID}.${sugid}`)
	
	if (!data) return interaction.createMessage(langfile.noSuggestionWithThisNumber)
	if (data.status == "deleted") return interaction.createMessage(langfile.suggestionAlreadyDeleted)
	
	if (!attachmentLink.includes('https://') && !attachmentLink.includes('http://')) return interaction.createMessage(langfile.invalidImage)
	await attachImage(client.guilds.get(interaction.guildID), sugid, attachmentLink, client)
	interaction.createMessage(langfile.imageSet)
}

module.exports.help = {
	name: "attach-image",
	description: "Allows to attach an image to any suggestion.",
	category: 'staff',
	options: [
		{
			name: "suggestion-id",
			description: "The suggestion ID you want to attach image.",
			type: Eris.Constants.ApplicationCommandOptionTypes.NUMBER,
			min_value: 1,
			required: true
		},
		{
			name: "image-link",
			description: "The image link you want to attach.",
			type: Eris.Constants.ApplicationCommandOptionTypes.STRING,
			required: true
		}
	],
	supportsSlash: true
}

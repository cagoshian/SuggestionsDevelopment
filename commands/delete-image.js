const Eris = require("eris");
const { deleteImage } = require('../functions')

module.exports.run = async (client, interaction, langfile) => {
	const db = client.db
	
	const sugid = interaction.data.options[0].value
	
	const data = db.fetch(`suggestions_${interaction.guildID}.${sugid}`)
	
	if (!data) return interaction.createMessage({content: langfile.noSuggestionWithThisNumber, flags: 64})
	if (data.status == "deleted") return interaction.createMessage({content: langfile.suggestionAlreadyDeleted, flags: 64})
	
	if (!data.attachment) return interaction.createMessage({content: langfile.noImageAlready, flags: 64})
	
	await deleteImage(client.guilds.get(interaction.guildID), sugid, client)
	interaction.createMessage(langfile.imageDeleted)
}

module.exports.help = {
	name: "delete-image",
	description: "Allows to delete the attached image from any suggestion.",
	category: 'staff',
	options: [
		{
			name: "suggestion-id",
			description: "The suggestion ID you want to delete image from.",
			type: Eris.Constants.ApplicationCommandOptionTypes.NUMBER,
			min_value: 1,
			required: true
		}
	],
	supportsSlash: true
}

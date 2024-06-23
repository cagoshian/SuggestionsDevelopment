const Eris = require("eris");
const { addComment, staffPermCheck}  = require('../functions')

module.exports.run = async (client, interaction) => {
	const db = client.db
	let dil = db.fetch(`dil_${interaction.guildID}`) || "english";
	let langfile = require(`../languages/english.json`)
	if (dil && dil != "english") langfile = require(`../languages/${dil}.json`)
	
	if (!db.has(`suggestionchannel_${interaction.guildID}`) || !client.guilds.get(interaction.guildID).channels.get(db.fetch(`suggestionchannel_${interaction.guildID}`))) return interaction.createMessage({content: langfile.noSuggestionChannel, flags: 64})
	if (db.has(`denyeveryonecomment_${interaction.guildID}`)) {
		const noPerm = staffPermCheck(interaction.member, client)
		if (noPerm === true) return interaction.createMessage({content: langfile.staffNotEnoughPerm, flags: 64})
	}
	
	const sugid = interaction.data.options[0].value
	const comment = interaction.data.options[1].value
	
	const data = db.fetch(`suggestions_${interaction.guildID}.${sugid}`)
	
	if (!data) return interaction.createMessage({content: langfile.noSuggestionWithThisNumber, flags: 64})
	if (data.status == "awaiting") return interaction.createMessage({content: langfile.reviewFirst, flags: 64})
	if (data.status == "deleted") return interaction.createMessage({content: langfile.suggestionAlreadyDeleted, flags: 64})
	
	if (data.comments.length >= 10) return interaction.createMessage({content: langfile.commentLimitExceeded, flags: 64})
	await addComment(client.guilds.get(interaction.guildID), sugid, comment, interaction.member.user.id, client, true)
	interaction.createMessage(langfile.commentAdded)
}

module.exports.help = {
	name: "comment",
	description: "Comment to a suggestion.",
	category: 'public',
	options: [
		{
			name: "suggestion-id",
			description: "The suggestion ID you want to comment.",
			type: Eris.Constants.ApplicationCommandOptionTypes.NUMBER,
			min_value: 1,
			required: true
		},
		{
			name: "comment",
			description: "The comment you want to add.",
			type: Eris.Constants.ApplicationCommandOptionTypes.STRING,
			required: true
		}
	],
	supportsSlash: true
}

const Eris = require("eris");
const { deleteComment }  = require('../functions')

module.exports.run = async (client, interaction, langfile) => {
	const db = client.db
	
	const sugid = interaction.data.options[0].value
	const commentid = interaction.data.options[1].value
	
	const data = db.fetch(`suggestions_${interaction.guildID}.${sugid}`)
	
	if (!data) return interaction.createMessage({content: langfile.noSuggestionWithThisNumber, flags: 64})
	if (data.status == "deleted") return interaction.createMessage({content: langfile.suggestionAlreadyDeleted, flags: 64})
	
	if (!data.comments.some(cmt => cmt.commentid == commentid)) return interaction.createMessage({content: langfile.noCommentWithThisId, flags: 64})
	await deleteComment(client.guilds.get(interaction.guildID), sugid, commentid, client)
	interaction.createMessage(langfile.commentDeleted)
}

module.exports.help = {
	name: "delete-comment",
	description: "Delete a comment from a suggestion.",
	category: 'staff',
	options: [
		{
			name: "suggestion-id",
			description: "The suggestion ID you want to delete comment from.",
			type: Eris.Constants.ApplicationCommandOptionTypes.NUMBER,
			min_value: 1,
			required: true
		},
		{
			name: "comment-id",
			description: "The comment ID you want to delete.",
			type: Eris.Constants.ApplicationCommandOptionTypes.NUMBER,
			min_value: 1,
			required: true
		}
	],
	supportsSlash: true
}

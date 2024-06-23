const Eris = require("eris");
const { deleteComment }  = require('../functions')

module.exports.run = async (client, interaction) => {
	const db = client.db
	let dil = db.fetch(`dil_${interaction.guildID}`) || "english";
	let langfile = require(`../languages/english.json`)
	if (dil && dil != "english") langfile = require(`../languages/${dil}.json`)
	
	if (!db.has(`suggestionchannel_${interaction.guildID}`) || !client.guilds.get(interaction.guildID).channels.get(db.fetch(`suggestionchannel_${interaction.guildID}`))) return interaction.createMessage(langfile.noSuggestionChannel)
	if (!db.has(`staffrole_${interaction.guildID}`) && !interaction.member.permissions.has('manageMessages')) return interaction.createMessage(langfile.noStaffRoleAndNoPerm)
	if (db.has(`staffrole_${interaction.guildID}`) && !interaction.member.roles.some(r => db.fetch(`staffrole_${interaction.guildID}`).includes(r)) && !interaction.member.permissions.has('administrator')) return interaction.createMessage(langfile.staffRoleButNoPerm)
	
	const sugid = interaction.data.options[0].value
	const commentid = interaction.data.options[1].value
	
	const data = db.fetch(`suggestions_${interaction.guildID}.${sugid}`)
	
	if (!data) return interaction.createMessage(langfile.noSuggestionWithThisNumber)
	if (data.status == "awaiting") return interaction.createMessage(langfile.reviewFirst)
	if (data.status == "deleted") return interaction.createMessage(langfile.suggestionAlreadyDeleted)
	
	if (!data.comments.some(cmt => cmt.id == commentid)) return interaction.createMessage(langfile.noCommentWithThisId)
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

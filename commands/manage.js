const Eris = require("eris");
const {manageSuggestion, deleteSuggestion} = require('../functions')

module.exports.run = async (client, interaction) => {
	const db = client.db
	let dil = db.fetch(`dil_${interaction.guildID}`) || "english";
	let langfile = require(`../languages/english.json`)
	if (dil && dil != "english") langfile = require(`../languages/${dil}.json`)
	
	if (!db.has(`staffrole_${interaction.guildID}`) && !interaction.member.permissions.has('manageMessages')) return interaction.createMessage(langfile.noStaffRoleAndNoPerm)
	if (db.has(`staffrole_${interaction.guildID}`) && !interaction.member.roles.some(r => db.fetch(`staffrole_${interaction.guildID}`).includes(r)) && !interaction.member.permissions.has('administrator')) return interaction.createMessage(langfile.staffRoleButNoPerm)
	if (!db.has(`suggestionchannel_${interaction.guildID}`) || !client.guilds.get(interaction.guildID).channels.get(db.fetch(`suggestionchannel_${interaction.guildID}`))) return interaction.createMessage(langfile.noSuggestionChannel)
	
	const sugid = interaction.data.options[0].value
	const managingType = interaction.data.options[1].value
	const comment = interaction.data.options[2] ? interaction.data.options[2].value : "-"
	
	const data = db.fetch(`suggestions_${interaction.guildID}.${sugid}`)
	
	if (!data) return interaction.createMessage(langfile.noSuggestionWithThisNumber)
	if (data.status == "awaiting") return interaction.createMessage(langfile.reviewFirst)
	if (data.status == "deleted") return interaction.createMessage(langfile.suggestionAlreadyDeleted)
	if (managingType != "deleted") await manageSuggestion(interaction.member.user, client.guilds.get(interaction.guildID), sugid, managingType, client, comment)
	else await deleteSuggestion(client.guilds.get(interaction.guildID), sugid, client, comment)
	interaction.createMessage(langfile.suggestionMarkedAs.replace('%type%', langfile[managingType]))
}

module.exports.help = {
	name: "manage",
	description: "Allows to manage a suggestion.",
	category: 'staff',
	options: [
		{
			name: "suggestion-id",
			description: "The suggestion ID you want to manage.",
			type: Eris.Constants.ApplicationCommandOptionTypes.NUMBER,
			min_value: 1,
			required: true
		},
		{
			name: "suggestion-status",
			description: "The suggestion status you want to mark as.",
			type: Eris.Constants.ApplicationCommandOptionTypes.STRING,
			required: true,
			choices: [
                        {
                            "name": "Approved",
                            "value": "approved"
                        },
                        {
                            "name": "Denied",
                            "value": "denied"
                        },
                        {
                            "name": "Invalid",
                            "value": "invalid"
                        },
						{
                            "name": "Implemented",
                            "value": "implemented"
                        },
						{
                            "name": "Deleted",
                            "value": "deleted"
                        }
                    ]
		},
		{
			name: "comment",
			description: "The comment you want to add.",
			max_length: 512,
			type: Eris.Constants.ApplicationCommandOptionTypes.STRING,
			required: false
		}
	],
	supportsSlash: true
}

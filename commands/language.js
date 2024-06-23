const Eris = require("eris");

module.exports.run = async (client, interaction) => {
	const db = client.db
	let dil = db.fetch(`dil_${interaction.guildID}`) || "english";
	let langfile = require(`../languages/english.json`)
	if (dil && dil != "english") langfile = require(`../languages/${dil}.json`)
	
	const selectedLanguage = interaction.data.options[0].value
	if (!client.languages.includes(selectedLanguage)) return interaction.createMessage({content: `${langfile.invalidThing.replace("%thing%", langfile.language)} ${langfile.allPossibleLanguages}: \`${client.languages.join('` `')}\``, flags: 64})
	if (selectedLanguage == dil) return interaction.createMessage({content: langfile.alreadyThisSelected.replace("%thing%", langfile.language), flags: 64})
	langfile = require(`../languages/${selectedLanguage}.json`)
	db.set(`dil_${interaction.guildID}`, selectedLanguage)
	interaction.createMessage(langfile.thingSet.replace("%thing%", langfile.language).replace("%selected%", selectedLanguage))
}

module.exports.help = {
	name: "language",
	description: "Sets the bot language in this guild.",
	category: 'admin',
	options: [
		{
			name: "language",
			description: "The language you want to set.",
			type: Eris.Constants.ApplicationCommandOptionTypes.STRING,
			required: true
		}
	],
	supportsSlash: true
}

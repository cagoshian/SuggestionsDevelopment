module.exports.run = async (client, interaction) => {
	const db = client.db
	let dil = db.fetch(`dil_${interaction.guildID}`) || "english";
	let langfile = require(`../languages/english.json`)
	if (dil && dil != "english") langfile = require(`../languages/${dil}.json`)
	
	const helpcommands = client.commands.filter(prop => prop.help.supportsSlash === true && prop.help.category == "admin");
	if (helpcommands.length === 0) return interaction.createMessage(langfile.noCommandsInCategory)
	const helpcommandsmap = helpcommands.map(p => '**/' + p.help.name + '** ' + (p.help.description.length > 50 ? p.help.description.slice(0, 50) + `...` : p.help.description) + `\n`).join('');
	interaction.createMessage({
		embed: {
			title: `__**${langfile.adminCommands}**__`,
			description: helpcommandsmap.slice(0, 2048),
			color: 3092790,
			footer: {
				text: client.user.username,
				icon_url: client.user.avatarURL || client.user.defaultAvatarURL
			}
		}
	})
}

module.exports.help = {
	name: "admin",
	description: "Shows commands that only server admins can use.",
	options: [],
	category: 'help',
	supportsSlash: true
}

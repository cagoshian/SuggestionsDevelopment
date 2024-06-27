module.exports.run = async (client, interaction) => {
	const db = client.db
	let dil = db.fetch(`dil_${interaction.guildID}`) || "english";
	let langfile = require(`../languages/english.json`)
	if (dil && dil != "english") langfile = require(`../languages/${dil}.json`)
	
	function colorToSignedBit(s) {
		return (parseInt(s.slice(1), 16) << 8) / 256;
	}
	
	const helpcommands = client.commands.filter(prop => prop.help.supportsSlash === true && prop.help.category == "help");
	if (helpcommands.length === 0) return interaction.createMessage(langfile.noCommandsInCategory)
	const helpcommandsmap = helpcommands.map(p => '**/' + p.help.name + '** ' + (p.help.description.length > 50 ? p.help.description.slice(0, 50) + `...` : p.help.description) + `\n`).join('');
	interaction.createMessage({
		embed: {
			title: `__**${langfile.helpCommands}**__`,
			description: helpcommandsmap.slice(0, 2048),
			color: colorToSignedBit("#2F3136"),
			footer: {
				text: client.user.username,
				icon_url: client.user.avatarURL || client.user.defaultAvatarURL
			}
		}
	})
}

module.exports.help = {
	name: "help",
	description: "Shows general help commands.",
	options: [],
	category: 'help',
	supportsSlash: true
}

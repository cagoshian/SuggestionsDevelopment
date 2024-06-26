module.exports.run = async (client, interaction, langfile) => {
	const helpcommands = client.commands.filter(prop => prop.help.supportsSlash === true && prop.help.category == "help");
	if (helpcommands.length === 0) return interaction.createMessage(langfile.noCommandsInCategory)
	const helpcommandsmap = helpcommands.map(p => '**/' + p.help.name + '** ' + (p.help.description.length > 50 ? p.help.description.slice(0, 50) + `...` : p.help.description) + `\n`).join('');
	interaction.createMessage({
		embed: {
			title: `__**${langfile.helpCommands}**__`,
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
	name: "help",
	description: "Shows general help commands.",
	options: [],
	category: 'help',
	supportsSlash: true
}

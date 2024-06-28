const Eris = require("eris");

function loadComments(guild, sugid, client) {
	const db = client.db
	let language = db.fetch(`dil_${guild.id}`) || "english";
	let langfile = require(`./languages/english.json`)
	if (language && language != "english") langfile = require(`./languages/${language}.json`)
	
	const fields = []
	const data = db.fetch(`suggestions_${guild.id}.${sugid}`)
	let commentData = data.comments
	commentData.sort((a, b) => a.commentid - b.commentid)
	for (const i of commentData) {
		fields.push({
			name: `${langfile.commentWithId.replace('%id%', i.commentid)} - ${i.authorUsername} <t:${i.timestamp.toString().substring(0, i.timestamp.toString().length - 3)}:R>`,
			value: i.comment
		})
	}
	return fields
}

async function addComment(guild, sugid, comment, commenter, client, reloadMessage) {
	const db = client.db
	let language = db.fetch(`dil_${guild.id}`) || "english";
	let langfile = require(`./languages/english.json`)
	if (language && language != "english") langfile = require(`./languages/${language}.json`)
	
	const data = db.fetch(`suggestions_${guild.id}.${sugid}`)
	if (data.comments.length >= 10) return;
	
	if (!client.users.has(commenter)) client.guilds.get(guild.id).fetchMembers({userIDs: [commenter]})
	const author = client.users.get(commenter)
	
	let commentid = 1
	for (const i of data.comments) {
		if (i.commentid + 1 > commentid) commentid = i.commentid + 1
	}
	
	data.comments.push({
		author: author.id,
		authorUsername: author.username,
		timestamp: Date.now(),
		commentid,
		comment
	})
	db.set(`suggestions_${guild.id}.${sugid}`, data)
	
	if (reloadMessage !== false) {
		if (!guild.channels.has(data.channel)) return;
		guild.channels.get(data.channel).getMessage(data.msgid).then(async msg => {
			msg.edit({
				embed: {
					title: msg.embeds[0].title,
					description: msg.embeds[0].description,
					color: msg.embeds[0].color,
					author: msg.embeds[0].author,
					footer: msg.embeds[0].footer,
					fields: loadComments(guild, sugid, client),
					image: msg.embeds[0].image
				}
			})
		})
		guild.fetchMembers({userIDs: data.followers})
		for (const id of data.followers) {
			if (!client.users.has(id) || !guild.members.has(id)) return;
			if (!db.has(`denydm_${id}`)) client.users.get(id).getDMChannel().then(async ch => ch.createMessage({
				embed: {
					title: langfile.commentMadeNotificationTitle,
					description: `${langfile.commentMadeNotificationContent.replace('%guild%', guild.name)} ${langfile.commentMadeNotificationExtraContent.replace('%suggestion%', data.suggestion).replace('%sugid%', sugid).replace('%author%', data.authorUsername).replace('%commentid%', commentid).replace('%commentauthor%', author.username).replace('%comment%', comment)}`,
					color: 6579300,
					footer: {
						text: langfile.disableDMsFooter,
						icon_url: client.user.avatarURL || client.user.defaultAvatarURL
					}
				}
			})).catch(async e => console.log(`Someone's dm is closed (${e})`))
		}
	}
}

module.exports = {
	staffPermCheck: (member, client) => {
		const db = client.db
		let noperm = false
		
		if (!db.has(`staffrole_${member.guild.id}`) && !member.permissions.has('manageMessages')) noperm = true
		if (db.has(`staffrole_${member.guild.id}`) && !member.roles.some(r => db.fetch(`staffrole_${member.guild.id}`).includes(r)) && !member.permissions.has('administrator')) noperm = true
		return noperm
	},
	
	addComment: addComment,
	
	deleteComment: async (guild, sugid, commentid, client) => {
		const db = client.db
		let language = db.fetch(`dil_${guild.id}`) || "english";
		let langfile = require(`./languages/english.json`)
		if (language && language != "english") langfile = require(`./languages/${language}.json`)
		
		const data = db.fetch(`suggestions_${guild.id}.${sugid}`)
		let commentdata = data.comments
		let deletedComment
		for (let comment of commentdata) {
			if (comment.commentid == commentid) {
				deletedComment = comment
				commentdata.splice(commentdata.indexOf(comment), 1)
				break
			}
		}
		if (!deletedComment) return;
		data.comments = commentdata
		db.set(`suggestions_${guild.id}.${sugid}`, data)
		
		if (!guild.channels.has(data.channel)) return;
		guild.channels.get(data.channel).getMessage(data.msgid).then(async msg => {
			msg.edit({
				embed: {
					title: msg.embeds[0].title,
					description: msg.embeds[0].description,
					color: msg.embeds[0].color,
					author: msg.embeds[0].author,
					footer: msg.embeds[0].footer,
					fields: loadComments(guild, sugid, client),
					image: msg.embeds[0].image
				}
			})
			
			guild.fetchMembers({userIDs: data.followers})
			for (const id of data.followers) {
				if (!client.users.has(id) || !guild.members.has(id)) return;
				if (!db.has(`denydm_${id}`)) client.users.get(id).getDMChannel().then(async ch => ch.createMessage({
					embed: {
						title: langfile.deletedCommentNotificationTitle,
						description: `${langfile.deletedCommentNotificationContent.replace('%guild%', guild.name)} ${langfile.commentMadeNotificationExtraContent.replace('%suggestion%', data.suggestion).replace('%sugid%', sugid).replace('%author%', data.authorUsername).replace('%commentid%', commentid).replace('%commentauthor%', deletedComment.authorUsername).replace('%comment%', deletedComment.comment)}`,
						color: 6579300,
						footer: {
							text: langfile.disableDMsFooter,
							icon_url: client.user.avatarURL || client.user.defaultAvatarURL
						}
					}
				})).catch(async e => console.log(`Someone's dm is closed (${e})`))
			}
		})
	},
	
	manageSuggestion: async (interactor, guild, sugid, type, client, comment) => {
		const db = client.db
		let language = db.fetch(`dil_${guild.id}`) || "english";
		let langfile = require(`./languages/english.json`)
		if (language && language != "english") langfile = require(`./languages/${language}.json`)
		
		const data = db.fetch(`suggestions_${guild.id}.${sugid}`)
		if (!data) return;
		
		let possibleTypes = ["approved", "denied", "invalid", "implemented", "new"]
		if (!possibleTypes.includes(type)) return;
		
		let color = 0;
		if (type == "approved") color = 65280
		if (type == "denied") color = 16711680
		if (type == "invalid") color = 0
		if (type == "implemented") color = 13631487
		if (type == "new") color = 65535
		
		if (!guild.channels.has(data.channel)) return;
		guild.channels.get(data.channel).getMessage(data.msgid).then(msg => {
			if (comment != "-") addComment(guild, sugid, comment, interactor.id, client, false)
			
			const embedObject = {
				title: `${langfile.suggestion.charAt(0).toUpperCase() + langfile.suggestion.slice(1)} #${sugid}`,
				description: data.suggestion,
				color,
				author: {
					name: `${langfile[type]} - ${data.authorUsername}`,
					icon_url: msg.embeds[0].author.icon_url
				},
				fields: loadComments(guild, sugid, client),
				image: {url: data.attachment}
			}
			
			if (!db.has(`${type.toLowerCase()}channel_${guild.id}`) || db.fetch(`${type.toLowerCase()}channel_${guild.id}`) == msg.channel.id || !msg.channel.guild.channels.has(db.fetch(`${type.toLowerCase()}channel_${guild.id}`))) {
				msg.edit({
					embed: embedObject
				})
				if (type != "new") msg.removeReactions()
				else if (!db.has(`denyvoting_${guild.id}`)) {
					msg.addReaction(`👍`)
					msg.addReaction(`👎`)
				}
			}
			if (db.has(`${type.toLowerCase()}channel_${guild.id}`) && db.fetch(`${type.toLowerCase()}channel_${guild.id}`) != msg.channel.id && msg.channel.guild.channels.has(db.fetch(`${type.toLowerCase()}channel_${guild.id}`))) {
				msg.channel.guild.channels.get(db.fetch(`${type.toLowerCase()}channel_${guild.id}`)).createMessage({
					embed: embedObject
				}).then(async msg2 => {
					data.channel = msg2.channel.id
					data.msgid = msg2.id
					msg.delete()
					if (type == "new" && !db.has(`denyvoting_${guild.id}`)) {
						msg.addReaction(`👍`)
						msg.addReaction(`👎`)
					}
				})
			}
			data.status = type
			db.set(`suggestions_${guild.id}.${sugid}`, data)
			
			guild.fetchMembers({userIDs: data.followers})
			for (const id of data.followers) {
				if (!client.users.has(id) || !guild.members.has(id)) return;
				if (!db.has(`denydm_${id}`)) client.users.get(id).getDMChannel().then(async ch => ch.createMessage({
					embed: {
						title: langfile.notificationTitle.replace('%type%', langfile[type]),
						description: `${langfile.notificationContent.replace('%guild%', guild.name).replace('%type%', langfile[type])} ${langfile.notificationClassicContent.replace('%suggestion%', data.suggestion).replace('%sugid%', sugid).replace('%author%', data.authorUsername).replace('%staffcomment%', comment)}`,
						color,
						footer: {
							text: langfile.disableDMsFooter,
							icon_url: client.user.avatarURL || client.user.defaultAvatarURL
						}
					}
				})).catch(async e => console.log(`Someone's dm is closed (${e})`))
			}
		})
	},
	
	deleteSuggestion: async (guild, sugid, client, comment, onMsgDelete) => {
		const db = client.db
		let language = db.fetch(`dil_${guild.id}`) || "english";
		let langfile = require(`./languages/english.json`)
		if (language && language != "english") langfile = require(`./languages/${language}.json`)
		
		const data = db.fetch(`suggestions_${guild.id}.${sugid}`)
		if (!data) return;
		
		if (onMsgDelete !== true) {
			if (!guild.channels.has(data.channel)) return;
			guild.channels.get(data.channel).getMessage(data.msgid).then(msg => {
				if (msg) msg.delete()
			})
		}
		
		data.status = "deleted"
		data.msgid = 1
		data.channel = 1
		db.set(`suggestions_${guild.id}.${sugid}`, data)
		
		guild.fetchMembers({userIDs: data.followers})
		for (const id of data.followers) {
			if (!client.users.has(id) || !guild.members.has(id)) return;
			if (!db.has(`denydm_${id}`)) client.users.get(id).getDMChannel().then(async ch => ch.createMessage({
				embed: {
					title: langfile.deletedNotificationTitle,
					description: `${langfile.deletedNotificationContent.replace('%guild%', guild.name)} ${langfile.notificationClassicContent.replace('%suggestion%', data.suggestion).replace('%sugid%', sugid).replace('%author%', data.authorUsername).replace('%staffcomment%', comment)}`,
					color: 0,
					footer: {
						text: langfile.disableDMsFooter,
						icon_url: client.user.avatarURL || client.user.defaultAvatarURL
					}
				}
			})).catch(async e => console.log(`Someone's dm is closed (${e})`))
		}
	},
	
	sendSuggestion: async (sender, suggestion, guild, client) => {
		const db = client.db
		let language = db.fetch(`dil_${guild.id}`) || "english";
		let langfile = require(`./languages/english.json`)
		if (language && language != "english") langfile = require(`./languages/${language}.json`)
		
		if (!client.users.has(sender.id)) client.guilds.get(guild.id).fetchMembers({userIDs: [sender.id]})
		if (!db.has(`suggestions_${guild.id}`)) db.set(`suggestions_${guild.id}`, {})
		let newSugId = Object.keys(db.fetch(`suggestions_${guild.id}`)).length + 1
		
		const sugData = {
			status: "processing",
			msgid: "1",
			author: sender.id,
			authorUsername: sender.username,
			suggestion,
			sugid: newSugId,
			timestamp: Date.now(),
			channel: "1",
			guild: guild.id,
			followers: [sender.id],
			attachment: null,
			comments: []
		}
		
		db.set(`suggestions_${guild.id}.${newSugId}`, sugData)
		
		let approvalOrNew
		
		let reviewchannel = db.fetch(`reviewchannel_${guild.id}`)
		if (reviewchannel && guild.channels.has(reviewchannel)) {
			approvalOrNew = "approval"
			guild.channels.get(reviewchannel).createMessage({
				embed: {
					title: `${langfile.suggestion.charAt(0).toUpperCase() + langfile.suggestion.slice(1)} #${newSugId}`,
					description: suggestion,
					color: 4934475,
					author: {
						name: `${langfile.awaiting} - ${sender.username}`,
						icon_url: sender.avatarURL || sender.defaultAvatarURL
					}
				},
				components: [
					{
						type: Eris.Constants.ComponentTypes.ACTION_ROW,
						components: [
							{
								type: Eris.Constants.ComponentTypes.BUTTON,
								style: Eris.Constants.ButtonStyles.SUCCESS,
								custom_id: "verify_suggestion",
								label: "Verify"
							},
							{
								type: Eris.Constants.ComponentTypes.BUTTON,
								style: Eris.Constants.ButtonStyles.DANGER,
								custom_id: "delete_suggestion",
								label: "Delete"
							}
						]
					}
				]
			}).then(async msg => {
				sugData.status = "awaiting"
				sugData.msgid = msg.id
				sugData.channel = reviewchannel
				db.set(`suggestions_${guild.id}.${newSugId}`, sugData)
			})
		} else {
			approvalOrNew = "new"
			let suggestionchannel = db.fetch(`suggestionchannel_${guild.id}`)
			if (!guild.channels.has(suggestionchannel)) return;
			guild.channels.get(suggestionchannel).createMessage({
				embed: {
					title: `${langfile.suggestion.charAt(0).toUpperCase() + langfile.suggestion.slice(1)} #${newSugId}`,
					description: suggestion,
					color: 65535,
					author: {
						name: `${langfile.new} - ${sender.username}`,
						icon_url: sender.avatarURL || sender.defaultAvatarURL
					}
				}
			}).then(async msg => {
				sugData.status = "new"
				sugData.msgid = msg.id
				sugData.channel = suggestionchannel
				db.set(`suggestions_${guild.id}.${newSugId}`, sugData)
				if (!db.has(`denyvoting_${guild.id}`)) {
					msg.addReaction(`👍`)
					msg.addReaction(`👎`)
				}
			})
		}
		return approvalOrNew
	},
	
	verifySuggestion: async (message, guild, client) => {
		const db = client.db
		let language = db.fetch(`dil_${guild.id}`) || "english";
		let langfile = require(`./languages/english.json`)
		if (language && language != "english") langfile = require(`./languages/${language}.json`)
		
		const oldSuggestions = db.fetch(`suggestions_${guild.id}`) || {}
		let data = Object.values(oldSuggestions).find(s => s.msgid == message.id)
		let approveemoji = `👍`
		let denyemoji = `👎`
		let suggestionchannel = db.fetch(`suggestionchannel_${guild.id}`)
		if (!guild.channels.has(suggestionchannel)) return;
		guild.channels.get(suggestionchannel).createMessage({
			embed: {
				title: `${langfile.suggestion.charAt(0).toUpperCase() + langfile.suggestion.slice(1)} #${data.sugid}`,
				description: data.suggestion,
				color: 65535,
				author: {
					name: `${langfile.new} - ${data.authorUsername}`,
					icon_url: message.embeds[0].author.icon_url
				},
				fields: loadComments(guild, data.sugid, client),
				image: {url: data.attachment}
			}
		}).then(async msg => {
			if (!db.has(`denyvoting_${guild.id}`)) {
				msg.addReaction(approveemoji)
				msg.addReaction(denyemoji)
			}
			message.delete()
			data.msgid = msg.id
			data.channel = msg.channel.id
			data.status = "new"
			db.set(`suggestions_${guild.id}.${data.sugid}`, data)
			guild.fetchMembers({userIDs: data.followers})
			for (const id of data.followers) {
				if (!client.users.has(id) || !guild.members.has(id)) return;
				if (!db.has(`denydm_${id}`)) client.users.get(id).getDMChannel().then(async ch => ch.createMessage({
					embed: {
						title: langfile.notificationTitle.replace('%type%', langfile.verified),
						description: `${langfile.notificationContent.replace('%guild%', guild.name).replace('%type%', langfile.verified)} ${langfile.notificationClassicContent.replace('%suggestion%', data.suggestion).replace('%sugid%', data.sugid).replace('%author%', data.authorUsername).replace('%staffcomment%', '-')}`,
						color: 6579300,
						footer: {
							text: langfile.disableDMsFooter,
							icon_url: client.user.avatarURL || client.user.defaultAvatarURL
						}
					}
				})).catch(async e => console.log(`Someone's dm is closed (${e})`))
			}
		})
	},
	
	attachImage: async (guild, sugid, image, client) => {
		const db = client.db
		let language = db.fetch(`dil_${guild.id}`) || "english";
		let langfile = require(`./languages/english.json`)
		if (language && language != "english") langfile = require(`./languages/${language}.json`)
		
		const data = db.fetch(`suggestions_${guild.id}.${sugid}`)
		
		data.attachment = image
		db.set(`suggestions_${guild.id}.${sugid}`, data)
		
		if (!guild.channels.has(data.channel)) return;
		guild.channels.get(data.channel).getMessage(data.msgid).then(async msg => {
			msg.edit({
				embed: {
					title: msg.embeds[0].title,
					description: msg.embeds[0].description,
					color: msg.embeds[0].color,
					author: msg.embeds[0].author,
					footer: msg.embeds[0].footer,
					fields: msg.embeds[0].fields,
					image: {url: image}
				}
			})
			
			guild.fetchMembers({userIDs: data.followers})
			for (const id of data.followers) {
				if (!client.users.has(id) || !guild.members.has(id)) return;
				if (!db.has(`denydm_${id}`)) client.users.get(id).getDMChannel().then(async ch => ch.createMessage({
					embed: {
						title: langfile.imageAttachedNotificationTitle,
						description: `${langfile.imageAttachedNotificationContent.replace('%guild%', guild.name)} ${langfile.imageAttachedNotificationExtraContent.replace('%sugid%', sugid).replace('%author%', data.authorUsername).replace('%suggestion%', data.suggestion)}`,
						color: 6579300,
						footer: {
							text: langfile.disableDMsFooter,
							icon_url: client.user.avatarURL || client.user.defaultAvatarURL
						},
						image: {url: image}
					}
				})).catch(async e => console.log(`Someone's dm is closed (${e})`))
			}
		})
	},
	
	deleteImage: async (guild, sugid, client) => {
		const db = client.db
		let language = db.fetch(`dil_${guild.id}`) || "english";
		let langfile = require(`./languages/english.json`)
		if (language && language != "english") langfile = require(`./languages/${language}.json`)
		
		const data = db.fetch(`suggestions_${guild.id}.${sugid}`)
		
		data.attachment = null
		db.set(`suggestions_${guild.id}.${sugid}`, data)
		
		if (!guild.channels.has(data.channel)) return;
		guild.channels.get(data.channel).getMessage(data.msgid).then(async msg => {
			msg.edit({
				embed: {
					title: msg.embeds[0].title,
					description: msg.embeds[0].description,
					color: msg.embeds[0].color,
					author: msg.embeds[0].author,
					footer: msg.embeds[0].footer,
					fields: msg.embeds[0].fields,
					image: null
				}
			})
			
			guild.fetchMembers({userIDs: data.followers})
			for (const id of data.followers) {
				if (!client.users.has(id) || !guild.members.has(id)) return;
				if (!db.has(`denydm_${id}`)) client.users.get(id).getDMChannel().then(async ch => ch.createMessage({
					embed: {
						title: langfile.imageDeletedNotificationTitle,
						description: `${langfile.imageDeletedNotificationContent.replace('%guild%', guild.name)} ${langfile.imageAttachedNotificationExtraContent.replace('%sugid%', sugid).replace('%author%', data.authorUsername).replace('%suggestion%', data.suggestion)}`,
						color: 6579300,
						footer: {
							text: langfile.disableDMsFooter,
							icon_url: client.user.avatarURL || client.user.defaultAvatarURL
						}
					}
				})).catch(async e => console.log(`Someone's dm is closed (${e})`))
			}
		})
	}
}

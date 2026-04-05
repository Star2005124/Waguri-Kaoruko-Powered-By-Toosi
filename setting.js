//═════════════════════════════════//

/*
🔗 TOOSII-XD ULTRA Bot System
by Toosii Tech • 2024 - 2026

>> Contact Links:
・WhatsApp : wa.me/601165811519
・Telegram : t.me/JustNamedStar

⚠️ PROPRIETARY SOFTWARE - DO NOT MODIFY
Any unauthorized modification, redistribution,
or removal of credits is strictly prohibited.
*/

//═════════════════════════════════//
//━━━━━━━━━━━━━━━━━━━━━━━━//
// Owner Setting - DO NOT MODIFY
global.owner = ["601165811519",]
global.ownername = "Star"
global._protectedOwner = "Star"
global._protectedBrand = "Waguri Kaoruko"
global._protectedAuthor = "Star"
//━━━━━━━━━━━━━━━━━━━━━━━━//
// Bot Setting
global.botname = "Waguri Kaoruko"
global.botver = "7.1.0"
global.idch = "120363423633701707@newsletter"
global.newsletterName = "Waguri Kaoruko Updates"
global.typebot = "Advanced Multi-Device Bot"
global.session = "session"
global.thumb = "https://i.postimg.cc/MTv2QdTF/Waguri-alive.jpg"
global.wagc = "https://wa.me/601165811519"
global.groupLink = "https://chat.whatsapp.com/ITqQAe76gcZF8aTIdBNyNh?mode=gi_t"
global.channelLink = "https://whatsapp.com/channel/0029VbCGMJeEquiVSIthcK03"
global.welcome = false
global.adminevent = true
global.fakePresence = 'true'
global.autoViewStatus = false
global.autoLikeStatus = false
global.statusMentionWarns = {}
global.statusMentionDeleteList = {}
global.autoLikeEmoji = ''
global.statusToGroup = ''
global.botPrefix = '.'   // Any string: '.' '!' '🔥' '⚡' 'bot' 'toosiikenya' 'XD~'
global.antiCall = true
global.autoRead = true
global.chatBot = false
global.autoBio = true
//━━━━━━━━━━━━━━━━━━━━━━━━//
// AI ChatBot Mode Settings (set via .setaimode command)
global.aiBotDM = false        // Auto-reply in private/DM chats
global.aiBotGroup = false     // Auto-reply in whitelisted groups
global.aiBotGlobal = false    // Auto-reply everywhere (overrides DM+Group)
global.aiBotGroupChats = {}   // { 'groupJid@g.us': true } whitelist
global.aiBotDMChats = {}      // { 'number@s.whatsapp.net': true } whitelist
global.autoReplyStatus = false
global.autoReplyStatusMsg = ''
global.antiStatusMention = false
global.antiStatusMentionAction = 'warn'
global.antiLink = false
global.antiDelete = false
global.autoReact = false
global.autoReactEmoji = '👍'
global.pmBlocker = false
global.antiBadword = true
global.antiTag = false
global.antiSticker = false
global.antiDemote = false
global.menuThumb = 'https://i.postimg.cc/MTv2QdTF/Waguri-alive.jpg'
global.botTimezone = 'Asia/Tokyo'
global.botPic = ''
global.botUrl = 'https://wa.me/601163926220'
//━━━━━━━━━━━━━━━━━━━━━━━━//
// GitHub Repo URL (used by .update command — set this tyour repo 
global.repoUrl = 'https://github.com/Star2005124/Waguri-Kaoruko-Powered-By-Toosi'
global.ownerFontMode = 'true' // Set via .setfont [name], disable via .fontoff
//━━━━━━━━━━━━━━━━━━━━━━━━//
// Sticker Marker
global.packname = "Made by Waguri!"
global.author = "© Star"
//━━━━━━━━━━━━━━━━━━━━━━━━//
// Social Links
global.telegram = "https://t.me/JustNamedStar"
global.sessionUrl = process.env.SESSION_URL || "Coming Soon... :3"
global.ownerNumber = "+601165811519"
//━━━━━━━━━━━━━━━━━━━━━━━━//
// Respon Message
global.mess = {
    success: '✅ *Success!* Operation completed.',
    admin: '🚫 *Admin Only* — This command requires group admin privileges.',
    botAdmin: '⚠️ *Bot Is Not AN Admin* — Can you Pwease promote me to group admin first, then try again.',
    OnlyOwner: '🔒 *Owner Only* — This command is restricted to Star.',
    OnlyGrup: '👥 *Group Only* — This command can only be used in group chats.',
    private: '📩 *Private Chat Only* — Please send this command in my DM.',
    wait: '⏳ _Processing..._',
    error: '❌ *Error* — I am dizzy right now... I process over 100 request a minute. Please try again later.',
}
//━━━━━━━━━━━━━━━━━━━━━━━━//
// File Update
let fs = require('fs')
let file = require.resolve(__filename)
fs.watchFile(file, () => {
fs.unwatchFile(file)
console.log(`Update File 📁 : ${__filename}`)
delete require.cache[file]
require(file)
})

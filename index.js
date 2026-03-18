//═════════════════════════════════//

/*
🔗 TOOSII-XD ULTRA Bot System
by Toosii Tech • 2024 - 2026

>> Contact Links:
・WhatsApp : wa.me/254748340864
・Telegram : t.me/toosiitech
*/

//═════════════════════════════════//
//━━━━━━━━━━━━━━━━━━━━━━━━//
// Module
require('dotenv').config()          // ← FIX 1: load .env FIRST so SESSION_ID is available
require("./setting")

// ── Suppress libsignal / gifted-baileys internal session state dumps ──────────
// libsignal/session_record.js calls console.warn("Session already closed", session)
// where `session` is a large Signal crypto object full of Buffer dumps.
// We silence those specific warnings — all other console output is unaffected.
;(function suppressSignalNoise() {
    // ── Core noise-detection patterns ─────────────────────────────────────────
    const _NOISY_STRINGS = [
        '_chains','currentratchet','ephemeralkeypair','registrationid','rootkey',
        'indexinfo','basekeytype','senderkey','signedprekey','identitykey','prekey',
        'chainkey','chaintype','messagekeys','privkey','pubkey','remoteidentikey',
        'remoteidentitykey','previouscounter','lastsessionsaved','lastsynctime',
        'bad mac','session already','v1 session storage','no sessions',
        'failed to decrypt','session error','session_cipher','libsignal',
        'queue_job','nosuchsession','invalid prekey','invalid message','no senderkey',
        'closing open session','closing session','sessionentry','prekey bundle',
        'incoming prekey','open session in favor','privsenderkey','__signal_obj__'
    ]
    const _isNoisy = (s) => {
        const lower = (typeof s === 'string' ? s : String(s)).toLowerCase()
        return _NOISY_STRINGS.some(p => lower.includes(p))
    }
    const _serialize = (a) => {
        if (typeof a === 'string') return a
        if (a && typeof a === 'object') {
            const keys = Object.keys(a).join(' ').toLowerCase()
            if (_isNoisy(keys)) return '__signal_obj__'
            try { return JSON.stringify(a).slice(0, 600) } catch { return a?.message || a?.stack || '[object]' }
        }
        return a?.message || a?.stack || String(a)
    }
    const _noisy = (args) => {
        const combined = args.map(_serialize).join(' ')
        return _isNoisy(combined)
    }
    // ── Override console methods ───────────────────────────────────────────────
    const _origWarn  = console.warn.bind(console)
    const _origError = console.error.bind(console)
    const _origLog   = console.log.bind(console)
    console.warn  = (...args) => { if (!_noisy(args)) _origWarn(...args)  }
    console.error = (...args) => { if (!_noisy(args)) _origError(...args) }
    console.log   = (...args) => { if (!_noisy(args)) _origLog(...args)   }
    // ── Override process.stdout.write to catch pino & direct writes ───────────
    const _origStdout = process.stdout.write.bind(process.stdout)
    const _origStderr = process.stderr.write.bind(process.stderr)
    process.stdout.write = function(chunk, ...rest) {
        if (typeof chunk === 'string' && _isNoisy(chunk)) return true
        if (Buffer.isBuffer(chunk) && _isNoisy(chunk.toString())) return true
        return _origStdout(chunk, ...rest)
    }
    process.stderr.write = function(chunk, ...rest) {
        if (typeof chunk === 'string' && _isNoisy(chunk)) return true
        if (Buffer.isBuffer(chunk) && _isNoisy(chunk.toString())) return true
        return _origStderr(chunk, ...rest)
    }
})()

// Auto-inject OWNER_NUMBER from .env into global.owner
// Deployers only need to set OWNER_NUMBER in .env — no editing of setting.js needed
;(function autoInjectOwner() {
    const raw = (process.env.OWNER_NUMBER || '').replace(/[^0-9]/g, '').trim()
    if (!raw || raw.length < 7) return
    if (!global.owner) global.owner = []
    if (!global.owner.includes(raw)) {
        global.owner = [...new Set([...global.owner, raw])]
        console.log('[ TOOSII-XD ULTRA ] ✅ OWNER_NUMBER loaded from .env:', raw)
    }
})()
const { default: makeWASocket, DisconnectReason, Browsers, jidDecode, proto, getContentType, useMultiFileAuthState, downloadContentFromMessage, areJidsSameUser } = require("gifted-baileys")
const { makeInMemoryStore } = require('./library/lib/store')
const pino = require('pino')
const { Boom } = require('@hapi/boom')
const fs = require('fs')
const readline = require("readline");
const _ = require('lodash')
const yargs = require('yargs/yargs')
const PhoneNumber = require('awesome-phonenumber')
const FileType = require('file-type')
const path = require('path')
const fetch = require("node-fetch")
const moment = require('moment-timezone')  // ← FIX 2: missing import (needed by autoBio)
const { getBuffer } = require('./library/lib/myfunc')
const { imageToWebp, imageToWebp3, videoToWebp, writeExifImg, writeExifImgAV, writeExifVid } = require('./library/lib/exif')

const c = {
    r: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    green: '\x1b[32m',
    cyan: '\x1b[36m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    magenta: '\x1b[35m',
    blue: '\x1b[34m',
    white: '\x1b[37m',
    bgGreen: '\x1b[42m',
    bgCyan: '\x1b[46m',
    bgYellow: '\x1b[43m',
    bgRed: '\x1b[41m',
    bgMagenta: '\x1b[45m',
    bgBlue: '\x1b[44m',
}

process.on('uncaughtException', (err) => {
    let em = (err?.message || String(err)).toLowerCase()
    let es = (err?.stack || '').toLowerCase()
    let isSignal = (
        em.includes('no sessions') || em.includes('sessionerror') ||
        em.includes('bad mac') || em.includes('failed to decrypt') ||
        em.includes('no senderkey') || em.includes('invalid prekey') ||
        em.includes('invalid message') || em.includes('nosuchsession') ||
        es.includes('session_cipher') || es.includes('libsignal') || es.includes('queue_job')
    )
    if (isSignal) {
        // Fully silent — normal WhatsApp Signal protocol noise
    } else {
        console.error('[UncaughtException]', err.message || err)
    }
})
process.on('unhandledRejection', (err) => {
    let em = (err?.message || String(err)).toLowerCase()
    let es = (err?.stack || '').toLowerCase()
    let isSignal = (
        em.includes('no sessions') || em.includes('sessionerror') ||
        em.includes('bad mac') || em.includes('failed to decrypt') ||
        em.includes('no senderkey') || em.includes('invalid prekey') ||
        em.includes('invalid message') || em.includes('nosuchsession') ||
        es.includes('session_cipher') || es.includes('libsignal') || es.includes('queue_job')
    )
    if (isSignal) {
        // Fully silent — normal WhatsApp Signal protocol noise
    } else {
        console.error('[UnhandledRejection]', err?.message || err)
    }
})

//━━━━━━━━━━━━━━━━━━━━━━━━//
// Startup owner sanity check — warn if no owner configured, never exit
const _bn = global.botname || 'TOOSII-XD ULTRA'
;(function _startupCheck() {
    if (!global.owner || global.owner.length === 0) {
        console.log('[ BOT ] ⚠️  No OWNER_NUMBER configured. Set OWNER_NUMBER in .env or setting.js')
    } else {
        console.log(`[ BOT ] ✅ Owner(s): ${global.owner.join(', ')}`)
    }
})()

// Initialize auto-status globals from setting.js / env vars (defaults: on)
global.autoViewStatus  = global.autoViewStatus  ?? (process.env.AUTO_VIEW_STATUS  !== 'no')
global.autoLikeStatus  = global.autoLikeStatus  ?? (process.env.AUTO_LIKE_STATUS  !== 'no')
global.autoReplyStatus = global.autoReplyStatus ?? (process.env.AUTO_REPLY_STATUS === 'yes')
global.autoLikeEmoji   = global.autoLikeEmoji   || (process.env.AUTO_LIKE_EMOJI   || '❤️')

//━━━━━━━━━━━━━━━━━━━━━━━━//
// Session & State
const SESSIONS_DIR = path.join(__dirname, 'sessions')
if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true })

// Ensure runtime directories exist
;[
    path.join(__dirname, 'tmp'),
    path.join(__dirname, 'database'),
    path.join(__dirname, 'media'),
    path.join(__dirname, 'plugin'),
].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }) })

// Auto-clean tmp directory — delete files older than 30 minutes every 15 minutes
const _tmpCleanDir = path.join(__dirname, 'tmp')
function _cleanTmpDir() {
    try {
        const _now = Date.now()
        const _files = fs.readdirSync(_tmpCleanDir)
        let _deleted = 0
        for (const _f of _files) {
            try {
                const _fp = path.join(_tmpCleanDir, _f)
                const _stat = fs.statSync(_fp)
                if (_now - _stat.mtimeMs > 30 * 60 * 1000) { // older than 30 min
                    fs.unlinkSync(_fp)
                    _deleted++
                }
            } catch {}
        }
        if (_deleted > 0) console.log(`[TMP CLEANUP] Deleted ${_deleted} stale file(s) from tmp/`)
    } catch {}
}
_cleanTmpDir()
setInterval(_cleanTmpDir, 15 * 60 * 1000) // every 15 minutes

const activeSessions = new Map()
const processedMsgs = new Set()
const msgRetryCache = new Map()

//━━━━━━━━━━━━━━━━━━━━━━━━//
// FIX 3: Auto-load SESSION_ID from .env on startup
// If SESSION_ID is set in .env, decode and save creds.json before connecting
function autoLoadSessionFromEnv() {
    const sessionId = process.env.SESSION_ID
    if (!sessionId || sessionId.trim() === '' || sessionId === 'PASTE_YOUR_TOOSII~_SESSION_HERE') return null

    const prefix = 'TOOSII~'
    let raw = sessionId.trim()

    try {
        let credsData
        // Handle TOOSII~ prefix
        if (raw.startsWith(prefix)) {
            raw = raw.slice(prefix.length)
        }
        // Try base64 decode first
        try {
            credsData = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8'))
        } catch {
            // Try raw JSON
            credsData = JSON.parse(raw)
        }

        const sessionPhone = credsData.me?.id?.split(':')[0]?.split('@')[0] || 'imported_' + Date.now()
        const sessionDir = path.join(SESSIONS_DIR, sessionPhone)
        const credsPath = path.join(sessionDir, 'creds.json')

        if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true })

        // Only write if creds.json doesn't already exist
        if (!fs.existsSync(credsPath)) {
            // Fresh SESSION_ID load - wipe stale signal sessions to prevent Bad MAC errors.
            // Old session files from a previous host cause Bad MAC decrypt failures on first messages.
            try {
                const _stale = fs.readdirSync(sessionDir).filter(f => f !== 'creds.json' && f.endsWith('.json'))
                _stale.forEach(f => { try { fs.unlinkSync(path.join(sessionDir, f)) } catch {} })
                if (_stale.length > 0) console.log('[ TOOSII-XD ULTRA ] Cleared ' + _stale.length + ' stale session file(s) - prevents Bad MAC errors')
            } catch {}
            fs.writeFileSync(credsPath, JSON.stringify(credsData, null, 2))
            console.log('[ TOOSII-XD ULTRA ] Session auto-loaded from .env for: ' + sessionPhone)
        } else {
            console.log(`${c.green}[ ${_bn} ]${c.r} ✅ Existing session found for: ${c.cyan}${sessionPhone}${c.r}`)
        }
        return sessionPhone
    } catch (err) {
        console.log(`${c.red}[ ${_bn} ] ❌ Failed to load SESSION_ID from .env: ${err.message}${c.r}`)
        return null
    }
}

//━━━━━━━━━━━━━━━━━━━━━━━━//
// Console Login Interface

async function handleSessionLogin(sessionId) {
    if (!sessionId || sessionId.length < 10) {
        console.log(`[ ${_bn} ] Invalid Session ID. Too short.`)
        return
    }
    try {
        console.log(`[ ${_bn} ] Processing Session ID...`)
        let credsData
        try {
            let raw = sessionId.trim()
            if (raw.startsWith('TOOSII~')) raw = raw.slice('TOOSII~'.length)
            credsData = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8'))
        } catch {
            try {
                credsData = JSON.parse(sessionId)
            } catch {
                console.log(`[ ${_bn} ] Invalid Session ID format. Must be base64 encoded or JSON.`)
                return
            }
        }
        const sessionPhone = credsData.me?.id?.split(':')[0]?.split('@')[0] || 'imported_' + Date.now()
        const sessionDir = path.join(SESSIONS_DIR, sessionPhone)
        if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true })
        fs.writeFileSync(path.join(sessionDir, 'creds.json'), JSON.stringify(credsData, null, 2))
        console.log(`[ ${_bn} ] Session ID saved for ${sessionPhone}`)
        console.log(`[ ${_bn} ] Connecting...`)
        await connectSession(sessionPhone)
    } catch (err) {
        console.log(`[ ${_bn} ] Error processing Session ID: ${err.message || err}`)
    }
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
})

function waitForConsoleInput() {
    rl.once('line', async (input) => {
        const cmd = input.trim()
        if (cmd === '1') {
            console.log('')
            console.log(`${c.green}[ ${_bn} ]${c.r} ${c.white}Enter your WhatsApp number with country code${c.r}`)
            console.log(`${c.green}[ ${_bn} ]${c.r} ${c.dim}Example: ${c.cyan}254748340864${c.r} ${c.dim}(Kenya), ${c.cyan}2348012345678${c.r} ${c.dim}(Nigeria), ${c.cyan}12025551234${c.r} ${c.dim}(US)${c.r}`)
            console.log(`${c.green}[ ${_bn} ]${c.r} ${c.red}Do NOT include + or leading 0${c.r}`)
            console.log('')
            rl.once('line', async (phoneInput) => {
                const phone = phoneInput.trim().replace(/[^0-9]/g, '')
                if (phone.length < 10 || phone.length > 15) {
                    console.log(`${c.red}[ ${_bn} ] ✗ Invalid number. Must be 10-15 digits with country code.${c.r}`)
                    waitForConsoleInput()
                    return
                }
                if (phone.startsWith('0')) {
                    console.log(`${c.red}[ ${_bn} ] ✗ Do not start with 0. Use country code instead.${c.r}`)
                    waitForConsoleInput()
                    return
                }
                console.log(`${c.green}[ ${_bn} ]${c.r} ${c.cyan}Connecting with number: ${c.bold}${phone}${c.r}${c.cyan}...${c.r}`)
                await connectSession(phone)
                waitForConsoleInput()
            })
        } else if (cmd === '2') {
            console.log('')
            console.log(`${c.yellow}[ ${_bn} ]${c.r} ${c.white}Paste your Session ID below:${c.r}`)
            console.log('')
            rl.once('line', async (sessionInput) => {
                await handleSessionLogin(sessionInput.trim())
                waitForConsoleInput()
            })
        } else if (cmd === '3') {
            console.log(`${c.green}[ ${_bn} ]${c.r} ${c.dim}Skipped. Bot is running with existing sessions.${c.r}`)
            waitForConsoleInput()
        } else if (cmd.length >= 10 && /^[0-9]+$/.test(cmd)) {
            console.log(`${c.green}[ ${_bn} ]${c.r} Detected phone number: ${c.cyan}${c.bold}${cmd}${c.r}`)
            console.log(`${c.green}[ ${_bn} ]${c.r} ${c.cyan}Connecting...${c.r}`)
            await connectSession(cmd)
            waitForConsoleInput()
        } else if (cmd) {
            console.log(`${c.red}[ ${_bn} ] ✗ Unknown command: "${cmd}"${c.r}`)
            console.log(`${c.yellow}[ ${_bn} ]${c.r} Type ${c.green}${c.bold}1${c.r} for Pairing Code, ${c.yellow}${c.bold}2${c.r} for Session ID`)
            waitForConsoleInput()
        } else {
            waitForConsoleInput()
        }
    })
}

async function startBot() {
    console.log('')
    console.log(`${c.cyan}${c.bold}╔══════════════════════════════════════════╗${c.r}`)
    console.log(`${c.cyan}${c.bold}║${c.r}  ${c.green}${c.bold}⚡ TOOSII-XD ULTRA${c.r} ${c.yellow}v2.0.0${c.r}             ${c.cyan}${c.bold}║${c.r}`)
    console.log(`${c.cyan}${c.bold}║${c.r}  ${c.white}${c.bold}   WhatsApp Multi-Device Bot${c.r}          ${c.cyan}${c.bold}║${c.r}`)
    console.log(`${c.cyan}${c.bold}║${c.r}  ${c.magenta}     by Toosii Tech © 2024-2026${c.r}     ${c.cyan}${c.bold}║${c.r}`)
    console.log(`${c.cyan}${c.bold}╚══════════════════════════════════════════╝${c.r}`)
    console.log('')

    // ── FIX 3: Auto-connect from .env SESSION_ID ──────────────────────────────
    const envPhone = autoLoadSessionFromEnv()
    if (envPhone) {
        console.log(`${c.green}[ ${_bn} ]${c.r} ${c.dim}Auto-connecting session from .env...${c.r}`)
        console.log('')
        connectSession(envPhone)
        // In headless/cloud deployments stdin may not be a TTY — skip the
        // interactive prompt so the process doesn't hang waiting for input.
        if (process.stdin.isTTY) {
            console.log(`${c.cyan}${c.bold}┌─────────────────────────────────────────┐${c.r}`)
            console.log(`${c.cyan}${c.bold}│${c.r}  ${c.white}${c.bold}Add another session or skip:${c.r}            ${c.cyan}${c.bold}│${c.r}`)
            console.log(`${c.cyan}${c.bold}│${c.r}                                         ${c.cyan}${c.bold}│${c.r}`)
            console.log(`${c.cyan}${c.bold}│${c.r}  ${c.green}${c.bold}1)${c.r} ${c.white}Enter WhatsApp Number${c.r} ${c.dim}(Pairing Code)${c.r} ${c.cyan}${c.bold}│${c.r}`)
            console.log(`${c.cyan}${c.bold}│${c.r}  ${c.yellow}${c.bold}2)${c.r} ${c.white}Paste Session ID${c.r}                     ${c.cyan}${c.bold}│${c.r}`)
            console.log(`${c.cyan}${c.bold}│${c.r}  ${c.magenta}${c.bold}3)${c.r} ${c.white}Skip${c.r} ${c.dim}(already connected)${c.r}            ${c.cyan}${c.bold}│${c.r}`)
            console.log(`${c.cyan}${c.bold}└─────────────────────────────────────────┘${c.r}`)
            console.log('')
            waitForConsoleInput()
        } else {
            console.log(`${c.green}[ ${_bn} ]${c.r} ${c.dim}Headless mode — skipping interactive menu.${c.r}`)
        }
        return
    }

    // No .env session — check for existing sessions on disk
    const existingSessions = []
    if (fs.existsSync(SESSIONS_DIR)) {
        const dirs = fs.readdirSync(SESSIONS_DIR).filter(d => {
            const p = path.join(SESSIONS_DIR, d)
            return fs.statSync(p).isDirectory() && fs.existsSync(path.join(p, 'creds.json'))
        })
        existingSessions.push(...dirs)
    }

    if (existingSessions.length > 0) {
        console.log(`${c.green}[ ${_bn} ]${c.r} Found ${c.yellow}${c.bold}${existingSessions.length}${c.r} existing session(s): ${c.cyan}${existingSessions.join(', ')}${c.r}`)
        console.log(`${c.green}[ ${_bn} ]${c.r} ${c.dim}Reconnecting existing sessions...${c.r}`)
        console.log('')
        for (const phone of existingSessions) {
            connectSession(phone)
        }
        console.log('')
        console.log(`${c.cyan}${c.bold}┌─────────────────────────────────────────┐${c.r}`)
        console.log(`${c.cyan}${c.bold}│${c.r}  ${c.white}${c.bold}Choose login method:${c.r}                    ${c.cyan}${c.bold}│${c.r}`)
        console.log(`${c.cyan}${c.bold}│${c.r}                                         ${c.cyan}${c.bold}│${c.r}`)
        console.log(`${c.cyan}${c.bold}│${c.r}  ${c.green}${c.bold}1)${c.r} ${c.white}Enter WhatsApp Number${c.r} ${c.dim}(Pairing Code)${c.r} ${c.cyan}${c.bold}│${c.r}`)
        console.log(`${c.cyan}${c.bold}│${c.r}  ${c.yellow}${c.bold}2)${c.r} ${c.white}Paste Session ID${c.r}                     ${c.cyan}${c.bold}│${c.r}`)
        console.log(`${c.cyan}${c.bold}│${c.r}  ${c.magenta}${c.bold}3)${c.r} ${c.white}Skip${c.r} ${c.dim}(already connected)${c.r}            ${c.cyan}${c.bold}│${c.r}`)
        console.log(`${c.cyan}${c.bold}└─────────────────────────────────────────┘${c.r}`)
        console.log('')
    } else {
        console.log(`${c.yellow}[ ${_bn} ]${c.r} ${c.dim}No existing sessions found.${c.r}`)
        console.log('')
        console.log(`${c.cyan}${c.bold}┌─────────────────────────────────────────┐${c.r}`)
        console.log(`${c.cyan}${c.bold}│${c.r}  ${c.white}${c.bold}Choose login method:${c.r}                    ${c.cyan}${c.bold}│${c.r}`)
        console.log(`${c.cyan}${c.bold}│${c.r}                                         ${c.cyan}${c.bold}│${c.r}`)
        console.log(`${c.cyan}${c.bold}│${c.r}  ${c.green}${c.bold}1)${c.r} ${c.white}Enter WhatsApp Number${c.r} ${c.dim}(Pairing Code)${c.r} ${c.cyan}${c.bold}│${c.r}`)
        console.log(`${c.cyan}${c.bold}│${c.r}  ${c.yellow}${c.bold}2)${c.r} ${c.white}Paste Session ID${c.r}                     ${c.cyan}${c.bold}│${c.r}`)
        console.log(`${c.cyan}${c.bold}└─────────────────────────────────────────┘${c.r}`)
        console.log('')
    }

    waitForConsoleInput()
}

//━━━━━━━━━━━━━━━━━━━━━━━━//
const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) })
//━━━━━━━━━━━━━━━━━━━━━━━━//
// Connection Bot - Multi-Session

// ── Signal session file wipe (NOT creds.json) ────────────────────────────────
// Deletes all Signal key material for a phone (pre-keys, sender-keys, sessions)
// while preserving creds.json (WhatsApp auth identity).
// Called before each 401 retry so reconnects start with a clean Signal state.
// Stale Signal sessions for a contact are the root cause of repeated 401s after
// commands in someone's DM or group chat.
function _wipeSignalFiles(phone) {
    const sessDir = path.join(SESSIONS_DIR, phone)
    if (!fs.existsSync(sessDir)) return
    let wiped = 0
    try {
        fs.readdirSync(sessDir).forEach(f => {
            if (f === 'creds.json') return  // KEEP — WhatsApp identity
            try { fs.unlinkSync(path.join(sessDir, f)); wiped++ } catch {}
        })
        if (wiped > 0) console.log(`[${phone}] Wiped ${wiped} stale Signal session file(s) — creds.json kept`)
    } catch(e) {}
}

async function connectSession(phone) {
try {
const sessionDir = path.join(SESSIONS_DIR, phone)
if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true })

// ── Tear down the old socket before creating a new one ──────────────────────
const _prevSession = activeSessions.get(phone)
if (_prevSession && _prevSession.socket) {
    try {
        _prevSession.socket.ev.removeAllListeners()
        _prevSession.socket.ws?.close?.()
    } catch {}
}

activeSessions.set(phone, { socket: null, status: 'connecting', connectedUser: phone })

// ── Stability timers (watchdog + presence keepalive) ────────────────────────
// Declared here in connectSession scope so each reconnect gets fresh timers.
let _watchdogTimer = null
let _presenceTimer = null
function _clearStabilityTimers() {
    if (_watchdogTimer) { clearInterval(_watchdogTimer); _watchdogTimer = null }
    if (_presenceTimer) { clearInterval(_presenceTimer); _presenceTimer = null }
}


    const { state, saveCreds } = await useMultiFileAuthState(sessionDir)
const X = makeWASocket({
logger: pino({ level: "silent" }),
printQRInTerminal: false,
auth: state,
connectTimeoutMs: 60000,
defaultQueryTimeoutMs: 0,
keepAliveIntervalMs: 10000,
emitOwnEvents: true,
fireInitQueries: true,
generateHighQualityLinkPreview: false,
syncFullHistory: false,
markOnlineOnConnect: true,
sendStatusReadReceipts: true,
shouldIgnoreJid: jid => false,
browser: Browsers.ubuntu('Chrome'),
msgRetryCounterCache: msgRetryCache,
getMessage: async (key) => {
    try {
        if (store) {
            const msg = await store.loadMessage(key.remoteJid, key.id)
            if (msg?.message) return msg.message
        }
    } catch {}
    return { conversation: '' }
},
patchMessageBeforeSending: (msg) => {
    const requiresPatch = !!(
        msg.buttonsMessage ||
        msg.templateMessage ||
        msg.listMessage
    )
    if (requiresPatch) {
        msg = {
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadataVersion: 2,
                        deviceListMetadata: {}
                    },
                    ...msg
                }
            }
        }
    }
    return msg
},
});

activeSessions.set(phone, { socket: X, status: 'connecting', connectedUser: phone })

if (state?.creds?.me?.lid && X.user && !X.user.lid) {
    X.user.lid = state.creds.me.lid
    console.log(`[${phone}] LID pre-loaded from creds: ${X.user.lid}`)
}

if (X.ws) {
    X.ws.on('error', (err) => {
        console.log(`[${phone}] WebSocket error (handled):`, err.message || err)
    })
}
X.ev.on('CB:error', () => {})

if (!X.authState.creds.registered) {
    console.log(`[${phone}] Waiting for WebSocket handshake...`)
    await new Promise(resolve => setTimeout(resolve, 5000))
    console.log(`${c.cyan}[${phone}]${c.r} ${c.dim}Requesting pairing code...${c.r}`)
    let retries = 0
    const maxRetries = 3
    let paired = false
    while (retries < maxRetries && !paired) {
        try {
            let code = await X.requestPairingCode(phone);
            code = code?.match(/.{1,4}/g)?.join("-") || code;
            console.log(`[PAIRING_CODE:${code}]`)
            console.log('')
            console.log(`${c.green}${c.bold}╔══════════════════════════════════════════╗${c.r}`)
            console.log(`${c.green}${c.bold}║${c.r}  ${c.bgGreen}${c.white}${c.bold} PAIRING CODE: ${code} ${c.r}                   ${c.green}${c.bold}║${c.r}`)
            console.log(`${c.green}${c.bold}╚══════════════════════════════════════════╝${c.r}`)
            console.log('')
            console.log(`${c.yellow}${c.bold}→${c.r} ${c.white}Open WhatsApp > Settings > Linked Devices > Link a Device${c.r}`)
            console.log(`${c.yellow}${c.bold}→${c.r} ${c.white}Choose "Link with phone number" and enter the code above${c.r}`)
            console.log('')
            paired = true
        } catch (err) {
            retries++
            console.error(`[${phone}] Pairing attempt ${retries}/${maxRetries} failed:`, err.message || err)
            if (retries < maxRetries) {
                console.log(`[${phone}] Retrying in 3 seconds...`)
                await new Promise(resolve => setTimeout(resolve, 3000))
            }
        }
    }
    if (!paired) {
        console.error(`[${phone}] All pairing attempts failed`)
        activeSessions.delete(phone)
        try { X.end(); } catch(e) {}
        try {
            const sessDir = path.join(SESSIONS_DIR, phone)
            if (fs.existsSync(sessDir)) fs.rmSync(sessDir, { recursive: true, force: true })
        } catch(e) {}
        return
    }
} else {
    console.log(`[${phone}] Reconnecting existing session...`)
}

store.bind(X.ev)

// ── Mirror the store's internal message Maps into _adCache ──────────────────
// The store RELIABLY stores every message via chatMsgs.set(id, msg) BEFORE our
// ev.on listeners run. We intercept those inner Map.set calls so _adCache gets
// every message the store sees, including ones that arrive with null content first.
const _mirrorMsgToCache = (msgId, msg, fallbackJid) => {
    if (!msgId || !msg || msg.key?.remoteJid === 'status@broadcast') return
    if (!msg.message) return  // skip null-content entries (can't show content anyway)
    const _ex = global._adCache?.get(msgId)
    if (_ex?.msg?.message) return  // already have good data
    global._adCache?.set(msgId, {
        msg,
        chatJid: msg.key?.remoteJid || fallbackJid,
        ts: _ex?.ts || Date.now()
    })
}

const _wrapChatMap = (jid, chatMap) => {
    if (!chatMap || chatMap.__adWrapped) return
    chatMap.__adWrapped = true
    const _origSet = chatMap.set.bind(chatMap)
    chatMap.set = function(msgId, msg) {
        _mirrorMsgToCache(msgId, msg, jid)
        return _origSet(msgId, msg)
    }
}

// Wrap all existing chat Maps that the store already created during history sync
for (const [jid, chatMap] of store.messages) _wrapChatMap(jid, chatMap)

// Intercept outer store.messages.set so NEW chat Maps also get wrapped
const _origStoreMessagesSet = store.messages.set.bind(store.messages)
store.messages.set = function(jid, chatMap) {
    const result = _origStoreMessagesSet(jid, chatMap)
    // After it's set, wrap the new Map
    const _actual = store.messages.get(jid)
    if (_actual instanceof Map) _wrapChatMap(jid, _actual)
    return result
}

//━━━━━━━━━━━━━━━━━━━━━━━━//
// Anti-Delete Message Cache — DISK PERSISTENT
// Survives bot restarts / 401 reconnections.
// Stored at session/adcache.json — loaded on startup, saved every 30s.
const _AD_CACHE_FILE = path.join(__dirname, 'sessions', 'adcache.json')
const _AD_CACHE_MAX  = 1000                // max entries in memory
const _AD_CACHE_TTL  = 6 * 60 * 60 * 1000 // 6 hours — survive short outages

if (!global._adCache) {
    global._adCache = new Map()
    // Load from disk on first boot
    try {
        if (fs.existsSync(_AD_CACHE_FILE)) {
            const _diskData = JSON.parse(fs.readFileSync(_AD_CACHE_FILE, 'utf8'))
            const _cutoff   = Date.now() - _AD_CACHE_TTL
            let _loaded = 0
            for (const [id, entry] of Object.entries(_diskData)) {
                if (entry.ts > _cutoff && entry.msg) {
                    global._adCache.set(id, entry)
                    _loaded++
                }
            }
            if (_loaded) console.log(`[Anti-Delete] Loaded ${_loaded} cached messages from disk`)
        }
    } catch (_) {}
}

// Debounced disk writer — writes at most once per 30 seconds
let _adCacheWriteTimer = null
const _adCacheFlush = () => {
    if (_adCacheWriteTimer) return
    _adCacheWriteTimer = setTimeout(() => {
        _adCacheWriteTimer = null
        try {
            const _out = {}
            for (const [id, entry] of global._adCache) _out[id] = entry
            fs.writeFileSync(_AD_CACHE_FILE, JSON.stringify(_out), 'utf8')
        } catch (_) {}
    }, 30000)
}

// Helper — feed a batch of messages into _adCache
// ════════════════════════════════════════════════════════════════
  // ANTI-DELETE  —  gifted-baileys port of reference storeMessage/handleMessageRevocation
  // ════════════════════════════════════════════════════════════════

  // ── tmp dir ─────────────────────────────────────────────────────
  const _AD_TMP = path.join(__dirname, 'tmp')
  if (!fs.existsSync(_AD_TMP)) fs.mkdirSync(_AD_TMP, { recursive: true })

  // ── Download media to disk → returns file path or null ─────────
  const _dlMedia = async (msgObj, type, fileName) => {
      try {
          const _stream = await downloadContentFromMessage(msgObj, type)
          const _chunks = []; for await (const _c of _stream) _chunks.push(_c)
          const _buf = Buffer.concat(_chunks)
          if (!_buf.length) return null
          const _fp = path.join(_AD_TMP, fileName)
          fs.writeFileSync(_fp, _buf)
          return _fp
      } catch { return null }
  }

  // ── Resolve LID → real phone JID ────────────────────────────────
  const _resolveLid = (rawJid, msgObj) => {
      const _pn = [msgObj?.key?.participantPn, msgObj?.key?.senderPn, msgObj?.participantPn, msgObj?.senderPn]
          .find(j => j && j.endsWith('@s.whatsapp.net'))
      if (_pn) return _pn
      const _s = (rawJid || '').replace(/:.*@/, '@')
      if (_s.endsWith('@s.whatsapp.net')) return _s
      if (_s.endsWith('@lid') && store?.contacts) {
          const _ents = typeof store.contacts.entries === 'function'
              ? [...store.contacts.entries()]
              : Object.entries(store.contacts)
          const _f = _ents.find(([j, ct]) =>
              j.endsWith('@s.whatsapp.net') &&
              (ct?.lid === _s || ct?.lid === rawJid || ct?.id === _s)
          )
          if (_f) return _f[0]
      }
      return _s
  }

  // ── Get notification destinations based on gc/pm config ─────────
  const _adGetTargets = (chatJid) => {
      const _ownerJid = X.user.id.split(':')[0] + '@s.whatsapp.net'
      const _isGrp = chatJid.endsWith('@g.us')
      const _cfg = global.adState
          ? (_isGrp ? global.adState.gc : global.adState.pm)
          : { enabled: global.antiDelete, mode: global.antiDeleteMode === 'public' ? 'chat' : 'private' }
      if (!_cfg?.enabled) return []
      const _mode = _cfg.mode || 'private'
      const _targets = []
      if (_mode === 'private' || _mode === 'both') _targets.push(_ownerJid)
      if ((_mode === 'chat' || _mode === 'both') && chatJid !== _ownerJid) _targets.push(chatJid)
      if (_targets.length === 0) _targets.push(_ownerJid)
      return _targets
  }

  // ── storeMessage — extracts & caches all content at arrival time ─
  const _adStore = async (message) => {
      try {
          if (!message?.key?.id) return
          const chatJid = message.key.remoteJid
          if (!chatJid || chatJid === 'status@broadcast') return
          const msgId = message.key.id
          const msg = message.message
          if (!msg) return
          if (msg.protocolMessage || msg.senderKeyDistributionMessage) return

          const senderJid = message.key.participant || message.key.remoteJid
          const pushName  = message.pushName || ''

          let content   = ''
          let mediaType = null
          let mediaPath = null

          // View-once
          const _voc = msg.viewOnceMessageV2?.message || msg.viewOnceMessage?.message
          if (_voc) {
              if (_voc.imageMessage) {
                  mediaType = 'image'; content = _voc.imageMessage.caption || ''
                  mediaPath = await _dlMedia(_voc.imageMessage, 'image', `${Date.now()}_vo_${msgId}.jpg`)
              } else if (_voc.videoMessage) {
                  mediaType = 'video'; content = _voc.videoMessage.caption || ''
                  mediaPath = await _dlMedia(_voc.videoMessage, 'video', `${Date.now()}_vo_${msgId}.mp4`)
              }
          } else if (msg.conversation) {
              content = msg.conversation
          } else if (msg.extendedTextMessage?.text) {
              content = msg.extendedTextMessage.text
          } else if (msg.imageMessage) {
              mediaType = 'image'; content = msg.imageMessage.caption || ''
              mediaPath = await _dlMedia(msg.imageMessage, 'image', `${Date.now()}_${msgId}.jpg`)
          } else if (msg.videoMessage) {
              mediaType = 'video'; content = msg.videoMessage.caption || ''
              mediaPath = await _dlMedia(msg.videoMessage, 'video', `${Date.now()}_${msgId}.mp4`)
          } else if (msg.audioMessage) {
              mediaType = 'audio'
              const _ext = msg.audioMessage.mimetype?.includes('ogg') ? 'ogg' : 'mp3'
              mediaPath = await _dlMedia(msg.audioMessage, 'audio', `${Date.now()}_${msgId}.${_ext}`)
          } else if (msg.stickerMessage) {
              mediaType = 'sticker'
              mediaPath = await _dlMedia(msg.stickerMessage, 'sticker', `${Date.now()}_${msgId}.webp`)
          } else if (msg.documentMessage) {
              mediaType = 'document'; content = msg.documentMessage.fileName || 'Document'
              mediaPath = await _dlMedia(msg.documentMessage, 'document', `${Date.now()}_${msgId}_${msg.documentMessage.fileName || 'file'}`)
          }

          if (!content && !mediaType) return  // nothing worth storing

          // Prune cache if full
          if (global._adCache.size >= _AD_CACHE_MAX) {
              const _now = Date.now()
              for (const [_id, _e] of global._adCache) {
                  if (_now - _e.ts > _AD_CACHE_TTL) global._adCache.delete(_id)
              }
              if (global._adCache.size >= _AD_CACHE_MAX)
                  global._adCache.delete(global._adCache.keys().next().value)
          }

          // Only update if no existing entry or existing has no content
          const _existing = global._adCache.get(msgId)
          if (_existing?.content || _existing?.mediaPath) return  // already rich — don't overwrite

          global._adCache.set(msgId, {
              msg, chatJid, senderJid, pushName,
              content, mediaType, mediaPath,
              ts: _existing?.ts || Date.now()
          })
          _adCacheFlush()
      } catch (_e) {
          console.log('[Anti-Delete] storeMessage error:', _e.message)
      }
  }

  // ── _adCachePut — lightweight sync store (raw msg, for forwarding) ─
  const _adCachePut = (msgs) => {
      try {
          let _added = 0
          for (const _adMsg of (msgs || [])) {
              if (!_adMsg?.key?.id) continue
              if (_adMsg.key.remoteJid === 'status@broadcast') continue
              if (!_adMsg.message) continue
              const _m = _adMsg.message
              if (_m.protocolMessage || _m.senderKeyDistributionMessage) continue
              const _existing = global._adCache.get(_adMsg.key.id)
              if (_existing?.content || _existing?.mediaPath) continue  // already rich
              if (_existing?.msg) continue  // already have raw msg
              if (global._adCache.size >= _AD_CACHE_MAX) {
                  const _now = Date.now()
                  for (const [_id, _e] of global._adCache) {
                      if (_now - _e.ts > _AD_CACHE_TTL) global._adCache.delete(_id)
                  }
                  if (global._adCache.size >= _AD_CACHE_MAX)
                      global._adCache.delete(global._adCache.keys().next().value)
              }
              global._adCache.set(_adMsg.key.id, {
                  msg: _adMsg,
                  chatJid: _adMsg.key.remoteJid,
                  ts: Date.now()
              })
              _added++
          }
          if (_added) _adCacheFlush()
      } catch (_) {}
  }

  // ── Capture live messages ────────────────────────────────────────
  X.ev.on('messages.upsert', ({ messages: _adMsgs }) => {
      for (const _m of (_adMsgs || [])) _adStore(_m).catch(() => {})
  })
  X.ev.on('messaging-history.set', ({ messages: _adMsgs }) => _adCachePut(_adMsgs || []))
  X.ev.on('messages.set',          ({ messages: _adMsgs }) => _adCachePut(_adMsgs || []))

  // ── Core revocation handler ──────────────────────────────────────
  const _handleRevoke = async (msgId, chatJid, deleterRaw, deleterMsgObj) => {
      try {
          const _adEnabled = global.adState
              ? (global.adState.gc?.enabled || global.adState.pm?.enabled)
              : global.antiDelete
          if (!_adEnabled) return

          const _botPhone = X.user.id.split('@')[0].split(':')[0].replace(/\D/g, '')
          const _deleterJid   = _resolveLid(deleterRaw, deleterMsgObj)
          const _deleterPhone = _deleterJid.split('@')[0].replace(/\D/g, '')
          if (_deleterPhone === _botPhone) return  // bot deleted it

          const _targets = _adGetTargets(chatJid)
          if (!_targets.length) return

          // Lookup stored message
          let _entry = global._adCache?.get(msgId)

          // ── Content ─────────────────────────────────────────────────
          const _content   = _entry?.content   || ''
          const _mediaType = _entry?.mediaType || null
          const _mediaPath = _entry?.mediaPath || null
          const _pushName  = _entry?.pushName  || ''
          const _origRaw   = _entry?.senderJid || deleterRaw
          const _origJid   = _resolveLid(_origRaw, _entry?.msg)
          const _origPhone = _origJid.split('@')[0].replace(/\D/g, '')
          const _sameDeleter = _deleterPhone === _origPhone

          const _ts = _entry?.ts
              ? new Date(_entry.ts).toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
              : new Date().toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })

          // ── Notification text ────────────────────────────────────────
          const _notif =
              `╔══════════════════════════╗\n` +
              `║  🗑️ *ANTI-DELETE*\n` +
              `╚══════════════════════════╝\n\n` +
              `  ├ 🗑️ *Deleted by* › +${_deleterPhone}\n` +
              (!_sameDeleter ? `  ├ 📤 *Sender*     › +${_origPhone}\n` : ``) +
              (_pushName     ? `  ├ 👤 *Name*       › ${_pushName}\n` : ``) +
              `  └ 🕐 *Time*       › ${_ts}\n\n` +
              `  *DELETED MESSAGE:*\n` +
              (_content   ? `  ${_content}`
             : _mediaType ? `  [${_mediaType}]`
             :              `  ⚠️ _Message not in cache_`)

          for (const _dest of _targets) {
              await X.sendMessage(_dest, {
                  text: _notif,
                  mentions: [...new Set([_deleterJid, _origJid].filter(Boolean))]
              }).catch(() => {})
          }

          // ── Forward media ────────────────────────────────────────────
          if (_mediaType) {
              let _sent = false

              // 1) Send from pre-downloaded disk file
              if (_mediaPath && fs.existsSync(_mediaPath)) {
                  try {
                      const _buf = fs.readFileSync(_mediaPath)
                      const _rawMsg = _entry?.msg
                      const _mObj  = _rawMsg?.[_mediaType + 'Message'] || {}
                      const _mime  = _mObj?.mimetype || ''
                      const _isPtt = !!_rawMsg?.audioMessage?.ptt
                      const _so =
                          _mediaType === 'image'    ? { image:    _buf, caption: _content || '', mimetype: _mime || 'image/jpeg' } :
                          _mediaType === 'video'    ? { video:    _buf, caption: _content || '', mimetype: _mime || 'video/mp4'  } :
                          _mediaType === 'audio'    ? { audio:    _buf, mimetype: _mime || 'audio/ogg; codecs=opus', ptt: _isPtt  } :
                          _mediaType === 'document' ? { document: _buf, mimetype: _mime || 'application/octet-stream', fileName: _mObj?.fileName || 'file' } :
                          _mediaType === 'sticker'  ? { sticker:  _buf } : null
                      if (_so) {
                          for (const _dest of _targets) await X.sendMessage(_dest, _so).catch(() => {})
                          _sent = true
                      }
                  } catch (_fe) { console.log('[Anti-Delete] disk send error:', _fe.message) }
                  try { fs.unlinkSync(_mediaPath) } catch {}
              }

              // 2) Forward raw cached message object
              if (!_sent && _entry?.msg) {
                  try {
                      const _fwdMsg = { message: _entry.msg }
                      for (const _dest of _targets) await X.sendMessage(_dest, { forward: _fwdMsg }).catch(() => {})
                      _sent = true
                  } catch {}
              }

              if (!_sent) {
                  for (const _dest of _targets) {
                      await X.sendMessage(_dest, { text: `  ⚠️ _${_mediaType} could not be retrieved (expired)_` }).catch(() => {})
                  }
              }
          }

          global._adCache?.delete(msgId)

      } catch (_err) {
          console.log('[Anti-Delete] revoke handler error:', _err.message || _err)
      }
  }

  // ── PRIMARY: detect via messages.upsert protocolMessage (like reference code) ─
  X.ev.on('messages.upsert', async ({ messages: _uMsgs }) => {
      for (const _um of (_uMsgs || [])) {
          try {
              const _proto = _um.message?.protocolMessage
              if (!_proto) continue
              // REVOKE type = 0 in proto enum (Message.ProtocolMessage.Type.REVOKE)
              if (_proto.type !== 0) continue
              const _deletedId = _proto.key?.id
              if (!_deletedId) continue
              const _chatJid   = _um.key.remoteJid
              const _deleterRaw = _um.key.participant || _um.key.remoteJid
              await _handleRevoke(_deletedId, _chatJid, _deleterRaw, _um)
          } catch {}
      }
  })

  // ── FALLBACK: detect via messages.update messageStubType=1 ───────
  X.ev.on('messages.update', async (updates) => {
      const _adEnabled = global.adState
          ? (global.adState.gc?.enabled || global.adState.pm?.enabled)
          : global.antiDelete
      if (!_adEnabled) return
      try {
          const _botPhone = X.user.id.split('@')[0].split(':')[0].replace(/\D/g, '')
          for (const update of updates) {
              if (!update.update) continue
              const _stubType = update.update.messageStubType
              const _isRevoke = _stubType === 1 ||
                  (proto?.WebMessageInfo?.StubType?.REVOKE && _stubType === proto.WebMessageInfo.StubType.REVOKE)
              if (!_isRevoke) continue
              const _chatJid = update.key.remoteJid
              if (!_chatJid || _chatJid === 'status@broadcast') continue
              const _msgId = update.key.id
              // Only handle if not already consumed by the upsert handler
              if (global._adCache?.get(_msgId)?._adConsumed) continue
              if (global._adCache?.get(_msgId)) {
                  global._adCache.get(_msgId)._adConsumed = true
              }
              const _deleterRaw = update.key.participant || update.key.remoteJid
              await _handleRevoke(_msgId, _chatJid, _deleterRaw, update)
          }
      } catch (_err) {
          console.log('[Anti-Delete] Top-level error:', _err.message || _err)
      }
  })

//━━━━━━━━━━━━━━━━━━━━━━━━//
// Auto Bio Handler
let autoBioInterval = null
function startAutoBio() {
    if (autoBioInterval) clearInterval(autoBioInterval)
    autoBioInterval = setInterval(async () => {
        if (!global.autoBio) return
        try {
            let tz = global.botTimezone || 'Africa/Nairobi'
            let timeStr = moment().tz(tz).format('HH:mm:ss')
            let dateStr = moment().tz(tz).format('DD/MM/YYYY')
            await X.updateProfileStatus(`${global.botname} | ${timeStr} | ${dateStr}`)
        } catch (err) {
            console.log('[Auto-Bio] Error:', err.message || err)
        }
    }, 60000)
}
startAutoBio()

//━━━━━━━━━━━━━━━━━━━━━━━━//
X.downloadAndSaveMediaMessage = async (message, filename, attachExtension = true) => {
let quoted = message.msg ? message.msg : message
let mime = (message.msg || message).mimetype || ''
let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0]
const stream = await downloadContentFromMessage(quoted, messageType)
let buffer = Buffer.from([])
for await(const chunk of stream) { buffer = Buffer.concat([buffer, chunk]) }
let type = await FileType.fromBuffer(buffer)
const _tmpDir = path.join(__dirname, 'tmp')
if (!fs.existsSync(_tmpDir)) fs.mkdirSync(_tmpDir, { recursive: true })
const _fname = filename || ('media_' + Date.now())
let trueFileName = path.join(_tmpDir, attachExtension ? (_fname + '.' + (type?.ext || 'bin')) : _fname)
fs.writeFileSync(trueFileName, buffer)
return trueFileName
}

X.sendImageAsStickerAV = async (jid, path, quoted, options = {}) => {
let buff = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') : /^https?:\/\//.test(path) ? await (await fetch(path)).buffer() : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0)
let buffer
if (options && (options.packname || options.author)) {
    buffer = await writeExifImgAV(buff, options)
} else {
    buffer = await imageToWebp(buff)
}
await X.sendMessage(jid, { sticker: { url: buffer }, ...options }, { quoted })
return buffer
}

X.sendVideoAsStickerAV = async (jid, path, quoted, options = {}) => {
let buff = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') : /^https?:\/\//.test(path) ? await (await fetch(path)).buffer() : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0)
let buffer
if (options && (options.packname || options.author)) {
    buffer = await writeExifVid(buff, options)
} else {
    buffer = await videoToWebp(buff)
}
await X.sendMessage(jid, { sticker: { url: buffer }, ...options }, { quoted })
return buffer
}

X.downloadMediaMessage = async (message) => {
let mime = (message.msg || message).mimetype || ''
let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0]
const stream = await downloadContentFromMessage(message.msg || message, messageType)
let buffer = Buffer.from([])
for await (const chunk of stream) { buffer = Buffer.concat([buffer, chunk]) }
return buffer
}

X.getFile = async (PATH, save) => {
    let res
    let data = Buffer.isBuffer(PATH) ? PATH : /^data:.*?\/.*?;base64,/i.test(PATH) ? Buffer.from(PATH.split`,`[1], 'base64') : /^https?:\/\//.test(PATH) ? await (res = await fetch(PATH)).buffer() : fs.existsSync(PATH) ? (data = fs.readFileSync(PATH)) : typeof PATH === 'string' ? PATH : Buffer.alloc(0)
    let type = await FileType.fromBuffer(data) || { mime: 'application/octet-stream', ext: '.bin' }
    let filename = path.join(__dirname, 'tmp', new Date * 1 + '.' + type.ext)
    if (data && save) fs.promises.writeFile(filename, data)
    return { res, filename, size: await (data).length, ...type, data }
}

} catch (err) {
    console.error(`[connectSession] Error:`, err)
}
}

//━━━━━━━━━━━━━━━━━━━━━━━━//
// Message Serializer
function smsg(X, m, store) {
if (!m) return m
let M = proto.WebMessageInfo
if (m.key) {
m.id = m.key.id
m.isBaileys = m.id.startsWith('BAE5') && m.id.length === 16
m.chat = m.key.remoteJid
m.fromMe = m.key.fromMe
m.isGroup = m.chat.endsWith('@g.us')
m.sender = X.decodeJid(m.fromMe && X.user.id || m.participant || m.key.participant || m.chat || '')
if (m.isGroup) m.participant = X.decodeJid(m.key.participant) || ''
}
if (m.message) {
m.mtype = getContentType(m.message)
m.msg = (m.mtype == 'viewOnceMessage' ? m.message[m.mtype]?.message?.[getContentType(m.message[m.mtype]?.message)] : m.message[m.mtype]) || {}
m.body = m.message.conversation || m.msg?.caption || m.msg?.text || (m.mtype == 'listResponseMessage') && m.msg?.singleSelectReply?.selectedRowId || (m.mtype == 'buttonsResponseMessage') && m.msg?.selectedButtonId || (m.mtype == 'viewOnceMessage') && m.msg?.caption || m.text || ''
let quoted = m.quoted = m.msg?.contextInfo ? m.msg.contextInfo.quotedMessage : null
m.mentionedJid = m.msg?.contextInfo ? m.msg.contextInfo.mentionedJid : []
if (m.quoted) {
let type = getContentType(quoted)
m.quoted = m.quoted[type]
if (['productMessage'].includes(type)) {
type = getContentType(m.quoted)
m.quoted = m.quoted[type]
}
if (typeof m.quoted === 'string') m.quoted = { text: m.quoted }
m.quoted.mtype = type
m.quoted.id = m.msg.contextInfo.stanzaId
m.quoted.chat = m.msg.contextInfo.remoteJid || m.chat
m.quoted.isBaileys = m.quoted.id ? m.quoted.id.startsWith('BAE5') && m.quoted.id.length === 16 : false
m.quoted.sender = X.decodeJid(m.msg.contextInfo.participant)
let quotedSenderJid = m.quoted.sender
let botJidForQuoted = X.user && X.user.id ? X.decodeJid(X.user.id) : ''
let botLidForQuoted = X.user && X.user.lid ? X.decodeJid(X.user.lid) : ''
m.quoted.fromMe = (quotedSenderJid === botJidForQuoted) || (botLidForQuoted && quotedSenderJid === botLidForQuoted) || (typeof X.areJidsSameUser === 'function' && (X.areJidsSameUser(quotedSenderJid, botJidForQuoted) || (botLidForQuoted && X.areJidsSameUser(quotedSenderJid, botLidForQuoted))))
m.quoted.text = m.quoted.text || m.quoted.caption || m.quoted.conversation || m.quoted.contentText || m.quoted.selectedDisplayText || m.quoted.title || ''
m.quoted.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : []
m.getQuotedObj = m.getQuotedMessage = async () => {
if (!m.quoted.id) return false
let q = await store.loadMessage(m.chat, m.quoted.id, X)
return exports.smsg(X, q, store)
}
let vM = m.quoted.fakeObj = M.fromObject({
key: {
remoteJid: m.quoted.chat,
fromMe: m.quoted.fromMe,
id: m.quoted.id,
...(m.isGroup ? { participant: m.quoted.sender } : {})
},
message: quoted,
...(m.isGroup ? { participant: m.quoted.sender } : {})
})
m.quoted.delete = () => X.sendMessage(m.quoted.chat, { delete: vM.key })
m.quoted.copyNForward = (jid, forceForward = false, options = {}) => X.copyNForward(jid, vM, forceForward, options)
m.quoted.download = () => X.downloadMediaMessage(m.quoted)
}
}
if (m.msg.url) m.download = () => X.downloadMediaMessage(m.msg)
m.text = m.msg.text || m.msg.caption || m.message.conversation || m.msg.contentText || m.msg.selectedDisplayText || m.msg.title || ''
m.reply = (text, chatId = m.chat, options = {}) => X.sendMessage(chatId, { text: text, ...options }, { quoted: m, ...options })
m.copy = () => exports.smsg(X, M.fromObject(M.toObject(m)))
return m
}

//━━━━━━━━━━━━━━━━━━━━━━━━//
// Keep-alive HTTP server
// Required for cloud platforms (Render, Railway, Heroku web dyno, etc.)
// that kill processes which don't bind to a port.
// Bot-hosting panels ignore this server — it has zero effect on them.
const http = require('http')
const PORT = process.env.PORT || 3001
http.createServer((req, res) => {
    const connected = [...activeSessions.values()].filter(s => s.status === 'connected').length
    const payload = JSON.stringify({
        status: 'running',
        bot: global.botname || 'TOOSII-XD ULTRA',
        sessions: activeSessions.size,
        connected,
        uptime: Math.floor(process.uptime()) + 's'
    })
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(payload)
}).listen(PORT, () => {
    console.log(`${c.green}[ ${_bn} ]${c.r} ${c.dim}Health server listening on port ${PORT}${c.r}`)
})

//━━━━━━━━━━━━━━━━━━━━━━━━//
// Start the bot
startBot()

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require('@whiskeysockets/baileys')

const axios = require('axios')

// ⚠️ SOLO PARA PRUEBAS LOCALES – NO SUBIR A GITHUB
const OPENROUTER_API_KEY = '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'
const PHONE_NUMBER = '513008506213' // ej: 57300xxxxxxx

function getMessageText(msg) {
  if (!msg.message) return null
  return (
    msg.message.conversation ||
    msg.message.extendedTextMessage?.text ||
    msg.message.imageMessage?.caption ||
    msg.message.videoMessage?.caption ||
    null
  )
}

async function askAI(prompt) {
  try {
    const response = await axios.post(
      'https://api.openrouter.ai/v1/chat/completions',
      {
        model: 'openai/gpt-4.1-mini',
        messages: [
          { role: 'system', content: 'Respondes en español.' },
          { role: 'user', content: prompt }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )

    return response.data.choices[0].message.content
  } catch (e) {
    console.error('❌ Error IA:', e.message)
    return 'Error con la IA'
  }
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('session')

  const sock = makeWASocket({
    auth: state,
    browser: ['Bot IA', 'Chrome', '1.0'],
    printQRInTerminal: false
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async (update) => {
    const { connection } = update

    if (connection === 'open') {
      console.log('✅ Conectado a WhatsApp')
    }
  })

  if (!sock.authState.creds.registered) {
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(PHONE_NUMBER)
        console.log('📲 Código de vinculación:', code)
      } catch (err) {
        console.error('❌ Error generando código:', err.message)
      }
    }, 5000)
  }

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message || msg.key.fromMe) return

    const from = msg.key.remoteJid
    const text = getMessageText(msg)
    if (!text) return

    const reply = await askAI(text)
    await sock.sendMessage(from, { text: reply })
  })
}

startBot()
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require('@whiskeysockets/baileys')

const axios = require('axios')

// ⚠️ SOLO PARA PRUEBAS LOCALES – NO SUBIR A GITHUB
const OPENROUTER_API_KEY = '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'
const PHONE_NUMBER = '573008506213' // ej: 57300xxxxxxx

function getMessageText(msg) {
  if (!msg.message) return null
  return (
    msg.message.conversation ||
    msg.message.extendedTextMessage?.text ||
    msg.message.imageMessage?.caption ||
    msg.message.videoMessage?.caption ||
    null
  )
}

async function askAI(prompt) {
  try {
    const response = await axios.post(
      'https://api.openrouter.ai/v1/chat/completions',
      {
        model: 'openai/gpt-4.1-mini',
        messages: [
          { role: 'system', content: 'Respondes en español.' },
          { role: 'user', content: prompt }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )

    return response.data.choices[0].message.content
  } catch (e) {
    console.error('❌ Error IA:', e.message)
    return 'Error con la IA'
  }
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('session')

  const sock = makeWASocket({
    auth: state,
    browser: ['Bot IA', 'Chrome', '1.0'],
    printQRInTerminal: false
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async (update) => {
    const { connection } = update

    if (connection === 'open') {
      console.log('✅ Conectado a WhatsApp')
    }
  })

  if (!sock.authState.creds.registered) {
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(PHONE_NUMBER)
        console.log('📲 Código de vinculación:', code)
      } catch (err) {
        console.error('❌ Error generando código:', err.message)
      }
    }, 5000)
  }

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message || msg.key.fromMe) return

    const from = msg.key.remoteJid
    const text = getMessageText(msg)
    if (!text) return

    const reply = await askAI(text)
    await sock.sendMessage(from, { text: reply })
  })
}

startBot()

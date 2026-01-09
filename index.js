const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require('@whiskeysockets/baileys')

const axios = require('axios')

// 🔑 OpenRouter
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

// 📞 TU NÚMERO (CON CÓDIGO PAÍS, SIN + NI ESPACIOS)
const PHONE_NUMBER = process.env.PHONE_NUMBER // ej: 5491123456789

// 🔹 Extraer texto
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

// 🤖 IA
async function askAI(prompt) {
  try {
    const response = await axios.post(
      'https://api.openrouter.ai/v1/chat/completions',
      {
        model: 'openai/gpt-4.1-mini',
        messages: [
          { role: 'system', content: 'Eres un asistente útil y respondes en español.' },
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
  } catch (err) {
    console.error('❌ Error IA:', err.message)
    return 'Error con la IA.'
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

  // 🔌 CONEXIÓN
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update

    if (connection === 'open') {
      console.log('✅ Conectado a WhatsApp')
    }

    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode
      console.log('❌ Conexión cerrada:', reason)

      if (reason !== DisconnectReason.loggedOut) {
        startBot()
      }
    }
  })

  // 🔑 GENERAR CÓDIGO DE EMPAREJAMIENTO
  if (!sock.authState.creds.registered) {
    try {
      const code = await sock.requestPairingCode(PHONE_NUMBER)
      console.log('📲 Código de vinculación:', code)
      console.log('👉 WhatsApp → Dispositivos vinculados → Vincular con número')
    } catch (err) {
      console.error('❌ Error generando código:', err.message)
    }
  }

  // 📩 MENSAJES
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message || msg.key.fromMe) return

    const from = msg.key.remoteJid
    const text = getMessageText(msg)
    if (!text) return

    console.log(`📩 ${from}: ${text}`)

    await sock.sendPresenceUpdate('composing', from)
    const reply = await askAI(text)
    await sock.sendMessage(from, { text: reply })
  })
}

startBot()

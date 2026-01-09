const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require('@whiskeysockets/baileys')

const qrcode = require('qrcode-terminal')
const axios = require('axios')

// 🔑 TU API KEY DE OPENROUTER
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

// 🔹 FUNCIÓN PARA EXTRAER TEXTO DEL MENSAJE
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

// 🤖 FUNCIÓN IA (OpenRouter)
async function askAI(prompt) {
  try {
    const response = await axios.post(
      'https://api.openrouter.ai/v1/chat/completions',
      {
        model: 'openai/gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: 'Eres un asistente útil, claro y respondes en español.'
          },
          {
            role: 'user',
            content: prompt
          }
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
  } catch (error) {
    console.error('❌ Error IA:', error.response?.data || error.message)
    return 'Lo siento, ocurrió un error con la IA.'
  }
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('session')

  const sock = makeWASocket({
    auth: state,
    browser: ['Bot IA', 'Chrome', '1.0']
  })

  // 💾 Guardar credenciales
  sock.ev.on('creds.update', saveCreds)

  // 🔌 CONEXIÓN Y QR
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      console.log('📱 Escanea este QR con WhatsApp:')
      qrcode.generate(qr, { small: true })
    }

    if (connection === 'open') {
      console.log('✅ Conectado a WhatsApp')
    }

    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode
      console.log('❌ Conexión cerrada. Razón:', reason)

      if (reason !== DisconnectReason.loggedOut) {
        startBot()
      }
    }
  })

  // 📩 MENSAJES + IA
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message) return
    if (msg.key.fromMe) return

    const from = msg.key.remoteJid
    const text = getMessageText(msg)
    if (!text) return

    console.log(`📩 ${from}: ${text}`)

    // ⌨️ Indicador "escribiendo"
    await sock.sendPresenceUpdate('composing', from)

    const reply = await askAI(text)

    await sock.sendMessage(from, { text: reply })
  })
}

startBot()

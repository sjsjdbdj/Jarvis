const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require('@whiskeysockets/baileys')

const axios = require('axios')
const express = require('express')

// 🔑 API KEY (desde Render)
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

// 🌐 Servidor web para mostrar QR
const app = express()
const PORT = process.env.PORT || 3000
let lastQR = null

app.get('/', (req, res) => {
  res.send('🤖 Bot activo. Ve a /qr para escanear el QR')
})

app.get('/qr', (req, res) => {
  if (!lastQR) {
    return res.send('❌ QR no generado aún. Espera unos segundos.')
  }

  res.send(`
    <html>
      <body style="display:flex;justify-content:center;align-items:center;height:100vh;">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${lastQR}" />
      </body>
    </html>
  `)
})

app.listen(PORT, () => {
  console.log('🌐 Servidor web activo en puerto', PORT)
})

// 🔹 FUNCIÓN PARA EXTRAER TEXTO
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
  } catch (error) {
    console.error('❌ Error IA:', error.response?.data || error.message)
    return 'Ocurrió un error con la IA.'
  }
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('session')

  const sock = makeWASocket({
    auth: state,
    browser: ['Bot IA', 'Chrome', '1.0']
  })

  // 💾 Guardar sesión
  sock.ev.on('creds.update', saveCreds)

  // 🔌 Conexión y QR
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      lastQR = qr
      console.log('🔗 QR generado → abre /qr en el navegador')
    }

    if (connection === 'open') {
      lastQR = null
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

  // 📩 Mensajes
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

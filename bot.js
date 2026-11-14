const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  const sock = makeWASocket({ logger: pino({ level: 'silent' }), printQRInTerminal: true, auth: state });
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (u) => {
    const { connection, lastDisconnect } = u;
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) start();
    } else if (connection === 'open') {
      console.log('Bot connected!');
      if (process.env.PHONE_NUMBER && !sock.authState.creds.registered) {
        const code = await sock.requestPairingCode(process.env.PHONE_NUMBER);
        console.log('PAIRING CODE:', code);
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0];
    if (!m.message || m.key.fromMe) return;
    const text = m.message.conversation || m.message.extendedTextMessage?.text || '';
    const jid = m.key.remoteJid;
    if (text.toLowerCase() === 'hi' || text.toLowerCase() === 'هاي') {
      await sock.sendMessage(jid, { text: 'اهلا! انا البوت 🤖' });
    }
  });
}
start();

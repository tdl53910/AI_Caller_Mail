import Fastify from 'fastify';
import dotenv from 'dotenv';
import fastifyFormBody from '@fastify/formbody';
import twilio from 'twilio';

dotenv.config();

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER,
  DOMAIN: rawDomain,
  PORT = 6060
} = process.env;

const DOMAIN = rawDomain ? rawDomain.replace(/(^\w+:|^)\/\//, '').replace(/\/+$/, '') : '';
const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
const fastify = Fastify({ logger: true });
fastify.register(fastifyFormBody);

// Simple TwiML response that just says hello
fastify.post('/voice', async (request, reply) => {
  console.log('📞 Test webhook received!');
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Hello from your fish friend Mail! This is a test call. If you can hear this, your audio is working!</Say>
</Response>`;
  
  reply.type('text/xml').send(twiml);
});

// Make a call
fastify.post('/make-test-call', async (request, reply) => {
  const { phoneNumber } = request.body;
  
  try {
    console.log(`Making test call to ${phoneNumber}`);
    const call = await twilioClient.calls.create({
      to: phoneNumber,
      from: TWILIO_PHONE_NUMBER,
      url: `https://${DOMAIN}/voice`
    });
    
    reply.send({ success: true, callSid: call.sid });
  } catch (error) {
    console.error('Test call error:', error);
    reply.status(500).send({ error: error.message });
  }
});

fastify.listen({ port: PORT, host: '0.0.0.0' }, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║     🐠 TEST SERVER - Check if audio works 🐠             ║
╠══════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                            ║
║  Domain: ${DOMAIN}                                        ║
║  Test webhook: https://${DOMAIN}/voice                    ║
║                                                          ║
║  To test: curl -X POST http://localhost:${PORT}/make-test-call \\ ║
║    -H "Content-Type: application/json" \\                 ║
║    -d '{"phoneNumber": "+16615900970"}'                  ║
╚══════════════════════════════════════════════════════════╝
  `);
});
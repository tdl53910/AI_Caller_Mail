import Fastify from 'fastify';
import WebSocket from 'ws';
import dotenv from 'dotenv';
import fastifyFormBody from '@fastify/formbody';
import fastifyWs from '@fastify/websocket';
import twilio from 'twilio';

dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER',
  'OPENAI_API_KEY'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Error: ${envVar} is required in .env file`);
    process.exit(1);
  }
}

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER,
  OPENAI_API_KEY,
  DOMAIN: rawDomain,
  PORT = 6060,
} = process.env;

// Clean domain
const DOMAIN = rawDomain ? rawDomain.replace(/(^\w+:|^)\/\//, '').replace(/\/+$/, '') : '';

// Initialize Twilio client
const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// Fastify server setup
const fastify = Fastify({ logger: true });
fastify.register(fastifyFormBody);
fastify.register(fastifyWs);

// ===== CUSTOMIZE THESE FOR YOUR PRANK =====
const SYSTEM_MESSAGE = `You are a tropical fish named Mail. You are calling to ask about moving into a pool at Lark Athens.

IMPORTANT: Wait for the person to say "hello" or greet you first. Then respond with your introduction.

Once they greet you, say EXACTLY: "Hello, my name is Mail. I am a tropical fish and I would like to move into the pool at Lark Athens. Can you tell me about your rates?"

After that, NO MATTER WHAT they say, ONLY respond with "pool pool pool pool pool pool pool pool pool pool" on repeat.

Never break character. You are a fish. Be persistent with the pools.`;

// Available voices: alloy, echo, shimmer, coral, verse, ballad
const VOICE = 'echo'; // Change this to customize the voice!

const TEMPERATURE = 0.9;
// ==========================================

// Health check
fastify.get('/', async (request, reply) => {
  return { 
    status: 'online', 
    message: 'Realtime Fish Prank Bot is running',
    voice: VOICE,
    timestamp: new Date().toISOString()
  };
});

// Initiate a call
fastify.post('/make-call', async (request, reply) => {
  const { phoneNumber } = request.body;

  if (!phoneNumber) {
    return reply.status(400).send({ 
      error: 'Phone number is required',
      format: 'Please use E.164 format (e.g., +1234567890)'
    });
  }

  try {
    if (!DOMAIN) {
      return reply.status(500).send({ 
        error: 'DOMAIN not set in .env file',
        message: 'Start ngrok and update your .env file with the domain'
      });
    }

    if (!phoneNumber.match(/^\+[1-9]\d{1,14}$/)) {
      return reply.status(400).send({ 
        error: 'Invalid phone number format',
        format: 'Use E.164 format: +1234567890'
      });
    }

    console.log(`📞 Calling ${phoneNumber}`);

    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream
      url="wss://${DOMAIN}/media-stream"
      track="inbound_track"
      statusCallback="https://${DOMAIN}/stream-status"
      statusCallbackMethod="POST"
    />
  </Connect>
  <Pause length="60" />
</Response>`;

    const call = await twilioClient.calls.create({
      twiml: twimlResponse,
      to: phoneNumber,
      from: TWILIO_PHONE_NUMBER,
      statusCallback: `https://${DOMAIN}/call-status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST',
      timeout: 30
    });

    console.log(`✅ Call initiated: ${call.sid}`);
    
    return reply.send({
      success: true,
      callSid: call.sid,
      message: 'Fish is calling! 🐠'
    });

  } catch (error) {
    console.error('Error making call:', error);
    return reply.status(500).send({ error: error.message });
  }
});

// Call status webhook
fastify.post('/call-status', async (request, reply) => {
  const { CallSid, CallStatus, To, CallDuration } = request.body;
  console.log(`📊 Call ${CallSid} to ${To}: ${CallStatus} (${CallDuration || 0}s)`);
  reply.send({ received: true });
});

// Stream status webhook
fastify.post('/stream-status', async (request, reply) => {
  const { StreamSid, StreamEvent, CallSid, ErrorCode, ErrorDescription } = request.body;
  console.log('🎧 Stream status payload:', request.body);
  console.log(
    `🎧 Stream ${StreamSid} for call ${CallSid}: ${StreamEvent}` +
      (ErrorCode ? ` (Error ${ErrorCode}: ${ErrorDescription || 'unknown'})` : '')
  );
  reply.send({ received: true });
});

// Handle Twilio webhook
fastify.post('/media-stream', async (request, reply) => {
  reply.status(200).send();
});

// WebSocket endpoint
fastify.register(async (fastify) => {
  fastify.get('/media-stream', { websocket: true }, async (connection, req) => {
    const ua = req?.headers?.['user-agent'] || 'unknown';
    const twilioSig = req?.headers?.['x-twilio-signature'] ? 'present' : 'absent';
    console.log(`🔌 WebSocket connected (ua="${ua}", twilio-signature=${twilioSig})`);

    let streamSid = null;
    let streamActive = false;
    const ws = connection.socket ?? connection;
    
    // Connect to OpenAI Realtime API
    const openAiWs = new WebSocket(
      'wss://api.openai.com/v1/realtime?model=gpt-4o-mini-realtime-preview',
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'OpenAI-Beta': 'realtime=v1',
        },
      }
    );

    openAiWs.on('open', () => {
      console.log('🤖 OpenAI connected');
      
      const sessionUpdate = {
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: SYSTEM_MESSAGE,
          voice: VOICE,
          input_audio_format: 'g711_ulaw',
          output_audio_format: 'g711_ulaw',
          input_audio_transcription: {
            model: 'whisper-1'
          },
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500
          },
          temperature: TEMPERATURE
        }
      };
      
      openAiWs.send(JSON.stringify(sessionUpdate));
    });

    openAiWs.on('message', (data) => {
      try {
        const response = JSON.parse(data);
        
        // Log important events
        if (response.type === 'response.audio.delta' && response.delta) {
          if (streamSid && streamActive && ws.readyState === WebSocket.OPEN) {
            const payload = String(response.delta);
            if (/^[A-Za-z0-9+/=]+$/.test(payload)) {
              console.log(`🔊 Outbound audio delta: ${payload.length} chars, sample="${payload.slice(0, 12)}"`);
              ws.send(JSON.stringify({
                event: 'media',
                streamSid: streamSid,
                media: { payload }
              }));
            } else {
              console.warn('⚠️ Invalid base64 payload, skipping');
            }
          }
        }
        
        if (response.type === 'conversation.item.input_audio_transcription.completed') {
          if (response.transcript) {
            console.log(`👤 Caller: "${response.transcript}"`);
          }
        }
        
        if (response.type === 'response.audio_transcript.done') {
          if (response.transcript) {
            console.log(`🐟 Fish: "${response.transcript}"`);
          }
        }

        if (response.type === 'error') {
          console.error('OpenAI error:', response.error);
        }
      } catch (error) {
        console.error('Error:', error);
      }
    });

    openAiWs.on('close', (code, reason) => {
      console.warn(`🤖 OpenAI WebSocket closed: ${code} ${reason?.toString?.() || ''}`);
    });

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        switch (data.event) {
          case 'connected':
            console.log('✅ Stream connected');
            break;

          case 'start':
            streamSid = data.start.streamSid;
            streamActive = true;
            console.log('▶️ Stream started');
            break;

          case 'media':
            if (openAiWs.readyState === WebSocket.OPEN) {
              openAiWs.send(JSON.stringify({
                type: 'input_audio_buffer.append',
                audio: data.media.payload
              }));
            }
            break;

          case 'stop':
            console.log('⏹️ Stream stopped');
            streamActive = false;
            openAiWs.close();
            ws.close();
            break;

          case 'mark':
            console.log(`🏷️ Stream mark: ${data.mark?.name || 'unknown'}`);
            break;
        }
      } catch (error) {
        console.error('Error:', error);
      }
    });

    ws.on('close', (code, reason) => {
      console.log(`🔌 WebSocket disconnected: ${code} ${reason?.toString?.() || ''}`);
      streamActive = false;
      openAiWs.close();
    });

    ws.on('error', (err) => {
      console.error('WebSocket error:', err);
    });

    openAiWs.on('error', console.error);
  });
});

// Start server
const startServer = async () => {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`
╔══════════════════════════════════════════════════════════╗
║           🐠 FISH PRANK BOT - REALTIME API 🐠            ║
╠══════════════════════════════════════════════════════════╣
║  Voice: ${VOICE.padEnd(40)} ║
║  Domain: ${DOMAIN.padEnd(39)} ║
║                                                          ║
║  The fish will:                                          ║
║  1. Wait for caller to say "hello"                      ║
║  2. Introduce itself as Mail the tropical fish          ║
║  3. Endlessly repeat "pool pool pool..."                ║
║                                                          ║
║  Call command:                                           ║
║  curl -X POST http://localhost:${PORT}/make-call \\        ║
║    -H "Content-Type: application/json" \\                 ║
║    -d '{"phoneNumber": "+18503580265"}'                  ║
╚══════════════════════════════════════════════════════════╝
    `);
  } catch (err) {
    console.error('Error:', err);
  }
};

startServer();
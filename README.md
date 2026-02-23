# 🐠 AI Caller Mail - Fish Calling Agent

An AI-powered phone calling bot that uses Twilio and OpenAI to make automated calls with customizable personalities. This project features Mail, a tropical fish calling about moving into a pool!

## Features

- 🎤 **Real-time voice calls** via Twilio
- 🤖 **AI-powered responses** using OpenAI GPT
- 🎨 **Multiple voice options** (alloy, echo, shimmer, coral, verse, ballad)
- ⚡ **WebSocket support** for real-time communication
- 🔒 **Secure environment variable handling**
- 🐟 **Customizable personas** - modify the system message for different characters

## Prerequisites

- Node.js 16+ 
- npm or yarn
- Twilio account with phone number
- OpenAI API key
- ngrok or similar tunneling service (for local development)

## Setup

### 1. Clone the repository
```bash
git clone https://github.com/tdl53910/AI_Caller_Mail.git
cd AI_Caller_Mail
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
```bash
cp .env.example .env
```

Edit `.env` and add your credentials:
```
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
OPENAI_API_KEY=sk-proj-your_api_key
PORT=6060
DOMAIN=your_ngrok_domain.ngrok-free.dev
```

### 4. Set up ngrok (for local development)
```bash
ngrok http 6060
```
Copy the ngrok URL to your `.env` file as `DOMAIN`

### 5. Start the server
```bash
node index.js
```

## Usage

### Make a call
```bash
curl -X POST http://localhost:6060/make-call \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+1234567890"}'
```

### Health check
```bash
curl http://localhost:6060/
```

### Test OpenAI connection
```bash
node openai-test.js
```

## Customization

### Change the AI personality
Edit the `SYSTEM_MESSAGE` in `index.js`:
```javascript
const SYSTEM_MESSAGE = `You are a tropical fish named Mail. You are calling to ask about...`;
```

### Change the voice
Edit the `VOICE` variable in `index.js`:
```javascript
const VOICE = 'echo'; // Options: alloy, echo, shimmer, coral, verse, ballad
```

### Adjust temperature
Modify `TEMPERATURE` for more/less creative responses:
```javascript
const TEMPERATURE = 0.9; // 0-1 scale
```

## Files

- `index.js` - Main server with Twilio and OpenAI integration
- `test.js` - Test server for simple TwiML responses
- `openai-test.js` - Utility to test OpenAI connection
- `.env.example` - Environment variables template
- `.gitignore` - Prevents sensitive files from being committed

## Security

⚠️ **Never commit your `.env` file!** It contains sensitive API keys and credentials.

The `.gitignore` file is configured to prevent:
- `.env` files
- `node_modules/`
- System and IDE files

## API Endpoints

### POST `/make-call`
Initiates a phone call to a specified number.

**Request:**
```json
{
  "phoneNumber": "+1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "callSid": "CAxxxxxxxxxx"
}
```

### GET `/`
Health check endpoint.

**Response:**
```json
{
  "status": "online",
  "message": "Realtime Fish Prank Bot is running",
  "voice": "echo",
  "timestamp": "2026-02-23T12:00:00.000Z"
}
```

## Dependencies

- `fastify` - Fast and low overhead web framework
- `@fastify/websocket` - WebSocket support for Fastify
- `@fastify/formbody` - Form body parser
- `twilio` - Twilio SDK for making calls
- `openai` - OpenAI API client
- `ws` - WebSocket library
- `dotenv` - Environment variable loader
- `axios` - HTTP client

## Troubleshooting

### "DOMAIN not set in .env file"
Make sure ngrok is running and the domain is set in your `.env`

### "Invalid phone number format"
Phone numbers must be in E.164 format: `+1234567890`

### OpenAI API errors
- **401 Unauthorized**: Check your API key
- **429 Rate Limited**: Check your OpenAI billing
- **404 Not Found**: Model might not be available

### Twilio connection errors
Verify your Account SID, Auth Token, and Phone Number are correct

## License

ISC

## Contributing

Feel free to fork and customize this project for your own use!

---

**Made with 🐠 and AI**

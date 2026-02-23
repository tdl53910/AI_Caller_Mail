import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function testOpenAI() {
  try {
    console.log('Testing OpenAI connection...');
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Say the word 'testing'" }]
    });
    console.log('✅ OpenAI works! Response:', completion.choices[0].message.content);
  } catch (error) {
    console.error('❌ OpenAI error:', error.message);
    if (error.status === 401) {
      console.log('Your API key is invalid or expired');
    } else if (error.status === 429) {
      console.log('Rate limit exceeded or billing issue');
    } else if (error.status === 404) {
      console.log('Model not available');
    }
  }
}

testOpenAI();
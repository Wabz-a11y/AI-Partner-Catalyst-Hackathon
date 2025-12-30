// server/api.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-production-domain.com'] 
    : true,  // Allow all in dev
}));
app.use(express.json({ limit: '15mb' })); 

// Validate API key on startup
if (!process.env.GEMINI_API_KEY) {
  console.error('⚠️  GEMINI_API_KEY is missing in .env file!');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/analyze', async (req, res) => {
  try {
    const { base64, mimeType, prompt } = req.body;

    if (!base64 || !mimeType || !prompt) {
      return res.status(400).json({ error: 'Missing required fields: base64, mimeType, or prompt' });
    }

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
    });

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64,
          mimeType,
        },
      },
    ]);

    const analysis = result.response.text();

    if (!analysis) {
      return res.status(500).json({ error: 'Empty response from Gemini' });
    }

    res.json({ analysis });
  } catch (error: any) {
    console.error('Gemini API Error:', error);

    // Handle known Gemini errors more gracefully
    if (error.message?.includes('API key')) {
      res.status(500).json({ error: 'Invalid or blocked API key' });
    } else if (error.message?.includes('quota')) {
      res.status(429).json({ error: 'Rate limit exceeded' });
    } else {
      res.status(500).json({ 
        error: error.message || 'Analysis failed' 
      });
    }
  }
});

export default app;
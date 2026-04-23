import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  console.log('Testing with GOOGLE_API_KEY...');
  try {
    const chatModel = new ChatGoogleGenerativeAI({
        model: "gemini-flash-latest",
        maxOutputTokens: 1024,
        temperature: 0.9,
        apiKey: process.env.GOOGLE_API_KEY,
        maxRetries: 1,
    });

    const messages: any[] = [
        ["system", "Eres un asistente de viajes."],
        ["human", "¿Cual es el estado de mi vuelo?"]
    ];

    const response = await chatModel.invoke(messages);
    console.log('RESPONSE:', response.content);
  } catch (error: any) {
    console.error('ERROR:', error.message || error);
  }
}

test();

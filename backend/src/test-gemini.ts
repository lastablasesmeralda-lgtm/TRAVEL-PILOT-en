import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  console.log('Testing Gemini API with key:', process.env.GOOGLE_API_KEY?.substring(0, 10) + '...');
  try {
    const model = new ChatGoogleGenerativeAI({
      model: "gemini-flash-latest",
      maxOutputTokens: 100,
    });
    const res = await model.invoke("Hola, responde 'Conectado exitosamente' si puedes leer esto.");
    console.log('Gemini Response:', res.content);
  } catch (error: any) {
    console.error('Gemini Error:', error.message || error);
  }
}

test();

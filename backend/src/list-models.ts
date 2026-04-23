import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

async function listModels() {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");
  try {
    // We'll use a simple fetch to see what's what if listModels isn't easy
    console.log("Listing models...");
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${process.env.GOOGLE_API_KEY}`);
    const data : any = await response.json();
    console.log("Available models (v1):", data.models?.map((m:any) => m.name));
    
    const responseV1Beta = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GOOGLE_API_KEY}`);
    const dataV1Beta : any = await responseV1Beta.json();
    console.log("Available models (v1beta):", dataV1Beta.models?.map((m:any) => m.name));
  } catch (e:any) {
    console.error("Error:", e.message);
  }
}

listModels();

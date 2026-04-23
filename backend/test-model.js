const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
require('dotenv').config();

const test = async () => {
    try {
        const model = new ChatGoogleGenerativeAI({
            model: "gemini-1.5-flash",
            // modelName: "gemini-1.5-flash",
            apiKey: process.env.GOOGLE_API_KEY
        });
        const res = await model.invoke("Hola, responde con 'OK' si me escuchas.");
        console.log("Respuesta:", res.content);
    } catch (e) {
        console.error("Error Fallido:", e.message);
    }
}
test();

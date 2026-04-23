const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
require('dotenv').config();

const test = async () => {
    try {
        const model = new ChatGoogleGenerativeAI({
            modelName: "gemini-1.5-flash",
            // model: "gemini-1.5-flash",
            apiKey: process.env.GOOGLE_API_KEY
        });
        const res = await model.invoke("Hola.");
        console.log("Respuesta:", res.content);
    } catch (e) {
        console.error("Error LC:", e.message);
    }
}
test();

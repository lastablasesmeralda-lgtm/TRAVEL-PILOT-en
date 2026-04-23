const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const test = async () => {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        const models = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Test direct
        console.log("Model initialized.");
    } catch (e) {
        console.error("Error direct:", e.message);
    }
}
test();

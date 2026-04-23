const https = require('https');
const dotenv = require('dotenv');
dotenv.config();

const apiKey = process.env.GOOGLE_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

https.get(url, (res) => {
    let body = '';
    res.on('data', (d) => body += d);
    res.on('end', () => {
        try {
            const data = JSON.parse(body);
            if (data.models) {
                console.log('Available Models:');
                data.models.forEach(m => console.log(`- ${m.name}`));
            } else {
                console.log('No models returned:', body);
            }
        } catch (e) {
            console.log('Error parsing response:', body);
        }
    });
}).on('error', (e) => {
    console.error('Network Error:', e);
});

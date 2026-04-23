const https = require('https');
const dotenv = require('dotenv');
dotenv.config();

const apiKey = process.env.GOOGLE_API_KEY;
const data = JSON.stringify({
    contents: [{
        parts: [{
            text: "Hola"
        }]
    }]
});

const options = {
    hostname: 'generativelanguage.googleapis.com',
    port: 443,
    path: `/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    }
};

console.log('Testing direct generateContent POST (Clean)...');
const req = https.request(options, (res) => {
    let body = '';
    res.on('data', (d) => body += d);
    res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        if (res.statusCode === 200) {
            console.log('Success! Connection verified.');
        } else {
            console.log('Response:', body);
        }
    });
});

req.on('error', (e) => {
    console.error('REST Error:', e);
});

req.write(data);
req.end();

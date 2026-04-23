
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const expo = spawn('npx', ['expo', 'start', '--tunnel'], { 
    cwd: path.resolve(__dirname, '../travel-pilot'),
    shell: true
});

let found = false;
const logStream = fs.createWriteStream(path.resolve(__dirname, 'expo_capture.log'));

expo.stdout.on('data', (data) => {
    const output = data.toString();
    logStream.write(output);
    console.log(output);
    
    // Look for exp:// URL
    const match = output.match(/exp:\/\/[\w./-]+\d+/);
    if (match && !found) {
        found = true;
        fs.writeFileSync(path.resolve(__dirname, 'expo_url.txt'), match[0]);
        console.log('___URL_FOUND___:' + match[0]);
    }
});

expo.stderr.on('data', (data) => {
    logStream.write('ERROR: ' + data.toString());
});

setTimeout(() => {
    if (!found) {
        console.log('Timeout searching for URL');
    }
    expo.kill();
    process.exit(0);
}, 60000);

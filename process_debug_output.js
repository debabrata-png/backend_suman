const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'debug_output.txt');
const excludedColIds = [3090, 3091, 3092, 3094, 3096, 4010, 4012];

const fileContent = fs.readFileSync(filePath, 'utf-8');
const lines = fileContent.split('\n');

const validEmails = [];

lines.forEach(line => {
    // Regex to match: ❌ Failed (Already Exists): <email> (ID: <id>, ColID: <colid>)
    const match = line.match(/Failed \(Already Exists\): (.+?) \(ID: .*?, ColID: (\d+)\)/);
    if (match) {
        const email = match[1].trim();
        const colId = parseInt(match[2], 10);

        if (!excludedColIds.includes(colId)) {
            validEmails.push({ email, colId });
        }
    }
});

const outputContent = "Found emails:\n" + validEmails.map(item => `${item.email} (ColID: ${item.colId})`).join('\n');
fs.writeFileSync(path.join(__dirname, 'emails_found.txt'), outputContent, 'utf-8');
console.log("Done writing structure to emails_found.txt");

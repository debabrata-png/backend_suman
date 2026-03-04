const fs = require('fs');
const path = require('path');

const replaceInDir = (dir) => {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            replaceInDir(fullPath);
        } else if ((file.endsWith('.js') || file.endsWith('.jsx')) && file.includes('ds2')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('user2')) {
                content = content.replace(/user2/g, 'user');
                fs.writeFileSync(fullPath, content);
                console.log('Updated:', fullPath);
            }
        }
    }
};

try {
    replaceInDir('d:\\Campus_technology\\backend-main\\Models');
    replaceInDir('d:\\Campus_technology\\backend-main\\controllers');
    replaceInDir('d:\\Campus_technology\\ep3-main\\src\\pages');
    console.log('Done replacing user2 with user in ds2 files.');
} catch (e) {
    console.error(e);
}

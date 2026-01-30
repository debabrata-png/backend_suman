
const http = require('http');
const https = require('https');

function startLoop() {
    console.log('Login loop initialized...');

    // Credentials
    const email = 'demo@campus.technology';
    const password = 'Campus@345';

    // Construct URL with query parameters for GET request
    // req.query.email and req.query.password will be populated from here
    const url = `https://backend-suman.onrender.com/api/v1/loginapi?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;

    function login() {
        const client = url.startsWith('https') ? https : http;

        client.get(url, (res) => {
            if (res.statusCode === 200) {
                // console.log(`[${new Date().toISOString()}] Login Success: 200 OK`);
            } else {
                console.log(`[${new Date().toISOString()}] Login Failed: ${res.statusCode}`);
                // Read error message from body
                res.setEncoding('utf8');
                res.on('data', chunk => {
                    // Only log if it's not a success HTML page or something huge
                    if (chunk.length < 500) {
                        console.log('Response:', chunk);
                    }
                });
            }
        }).on('error', (err) => {
            // Suppress connection refused errors during startup
            if (err.code !== 'ECONNREFUSED') {
                console.log(`[${new Date().toISOString()}] Request failed: ${err.message}`);
            }
        });
    }

    // Delay start to allow server to boot (though for external URL it doesn't matter much), then loop every 3 seconds
    setTimeout(() => {
        login();
        setInterval(login, 3000);
    }, 5000);
}

module.exports = startLoop;

// Allow running standalone
if (require.main === module) {
    startLoop();
}

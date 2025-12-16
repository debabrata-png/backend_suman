const myEmitter = require('./eventEmitter');

myEmitter.on('user_created', (userData) => {
    console.log(`[LISTENER]: New user created: ${userData.name} (${userData.email})`);
    // Add logic here, e.g., sending a welcome email
});

console.log('[LISTENER]: Listening for "user_created" events...');

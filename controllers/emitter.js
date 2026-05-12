const myEmitter = require('./eventEmitter');

function createUser(name, email) {
    console.log(`[EMITTER]: Creating user: ${name}`);
    const userData = { name, email };
    
    // Emit the custom event with data
    myEmitter.emit('user_created', userData); 
}

// Example usage
createUser('John Doe', 'john@example.com');

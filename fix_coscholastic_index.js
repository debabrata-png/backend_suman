const mongoose = require('mongoose');
const CoScholasticActivity9ds = require('./Models/CoScholasticActivity9ds');

const run = async () => {
    try {
        await mongoose.connect('mongodb+srv://user3:Hello123456@cluster0.bhzac.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to DB');

        const collection = CoScholasticActivity9ds.collection;

        console.log('--- Current Indexes ---');
        const indexes = await collection.indexes();
        console.log(indexes);

        const indexName = 'colid_1_activityname_1';
        const oldIndexExists = indexes.some(idx => idx.name === indexName);

        if (oldIndexExists) {
            console.log(`Dropping index: ${indexName}...`);
            await collection.dropIndex(indexName);
            console.log('Index dropped successfully.');
        } else {
            console.log(`Index ${indexName} not found.`);
        }

        console.log('--- Updated Indexes ---');
        const updatedIndexes = await collection.indexes();
        console.log(updatedIndexes);

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        mongoose.connection.close();
    }
};

run();

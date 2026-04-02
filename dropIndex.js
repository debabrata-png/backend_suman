const mongoose = require("mongoose");
require("dotenv").config();

// MONGO_URL should be in your .env or replace it with your actual connection string
// For now, I'll use the same connection logic as seedlastlogin.js if possible.
const mongoURI = "mongodb+srv://user3:Hello123456@cluster0.bhzac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

async function dropDuplicateIndex() {
  try {
    await mongoose.connect(mongoURI);
    console.log("✅ Connected to MongoDB");

    const collection = mongoose.connection.collection("bookmodels");
    
    // Check existing indexes
    const indexes = await collection.indexes();
    console.log("Current indexes:", JSON.stringify(indexes, null, 2));

    const indexName = "bookId_1";
    if (indexes.some(idx => idx.name === indexName)) {
      await collection.dropIndex(indexName);
      console.log(`✅ Successfully dropped index: ${indexName}`);
    } else {
      console.log(`ℹ️ Index ${indexName} not found or already dropped.`);
    }

    // List indexes again
    const updatedIndexes = await collection.indexes();
    console.log("Updated indexes:", JSON.stringify(updatedIndexes, null, 2));

    await mongoose.disconnect();
    console.log("👋 Disconnected from MongoDB");
  } catch (error) {
    console.error("❌ Error dropping index:", error);
    process.exit(1);
  }
}

dropDuplicateIndex();

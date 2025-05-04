import mongoose from "mongoose";

// Environment variable for MongoDB connection string.
const MONGODB_URL = process.env.MONGODB_URL!;

// Cached connection to avoid multiple connections during hot-reloads in development.
interface MongooseGlobal {
    mongoose: {
        conn: typeof mongoose | null;
        Promise: Promise<typeof mongoose> | null;
    };
}

const globalWithMongoose = global as unknown as MongooseGlobal;
const cached = globalWithMongoose.mongoose || { conn: null, Promise: null };

/**
 * Connects to the MongoDB database using Mongoose.
 * This function checks if a connection already exists in the cache and reuses it to avoid multiple connections.
 * If no connection exists, it creates a new connection using the MONGODB_URL environment variable.
 *
 * @returns A promise that resolves to the MongoDB connection.
 * @throws {Error} If the MONGODB_URL is not provided.
 */
export const connectToDB = async () => {
    // Return the cached connection if it exists.
    if (cached.conn) return cached.conn;

    // Throw an error if the MongoDB URL is missing.
    if (!MONGODB_URL) throw new Error("MONGODB_URL IS MISSING");

    // Initialize a new connection if not already cached.
    cached.Promise = cached.Promise || mongoose.connect(MONGODB_URL, {
        dbName: "SidGrace", // Specify the database name.
        bufferCommands: false, // Disable Mongoose buffering commands.
        serverSelectionTimeoutMS: 100000, // 30 seconds timeout for server selection.
    });

    // Await the connection promise and cache it.
    cached.conn = await cached.Promise;

    // Return the connection.
    return cached.conn;
}
import mongoose from "mongoose";
import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env.local"
  );
}

// Extend global type for mongoose caching
declare global {
  var mongoose:
    | {
        conn: typeof mongoose | null;
        promise: Promise<typeof mongoose> | null;
      }
    | undefined;
}

// Mongoose connection
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached!.conn) {
    return cached!.conn;
  }

  if (!cached!.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 30000, // 30 seconds
      socketTimeoutMS: 45000, // 45 seconds
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      connectTimeoutMS: 30000,
    };

    cached!.promise = mongoose.connect(MONGODB_URI, opts) as any;
  }

  try {
    cached!.conn = await cached!.promise;
  } catch (e) {
    cached!.promise = null;
    throw e;
  }

  return cached!.conn;
}

// MongoDB native driver connection for API routes
let mongoClient: MongoClient | null = null;
let mongoClientPromise: Promise<MongoClient> | null = null;

async function getMongoClient() {
  if (mongoClient) {
    return mongoClient;
  }

  if (!mongoClientPromise) {
    mongoClientPromise = MongoClient.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
    });
  }

  try {
    mongoClient = await mongoClientPromise;
  } catch (e) {
    mongoClientPromise = null;
    throw e;
  }

  return mongoClient;
}

// Export for API routes that need native MongoDB driver
export const connectToDatabase = async () => {
  const client = await getMongoClient();
  const db = client.db(); // Uses default database from URI
  return { db, client };
};

export default dbConnect;

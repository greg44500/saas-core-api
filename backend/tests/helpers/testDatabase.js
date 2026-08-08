import mongoose from 'mongoose';

import { env } from '../../config/env.js';

const assertTestDatabase = () => {
    if (!env.MONGODB_URI.includes('_test')) {
        throw new Error(
            'Sécurité tests : MONGODB_URI doit pointer vers une base explicitement dédiée aux tests.',
        );
    }
};

const connectTestDatabase = async () => {
    assertTestDatabase();

    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
        });
    }
};

const clearTestDatabase = async () => {
    const collections = mongoose.connection.collections;

    for (const collection of Object.values(collections)) {
        await collection.deleteMany({});
    }
};

const disconnectTestDatabase = async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
    }
};

export {
    clearTestDatabase,
    connectTestDatabase,
    disconnectTestDatabase,
};
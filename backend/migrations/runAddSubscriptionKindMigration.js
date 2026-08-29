import mongoose from 'mongoose';

import { env } from '../config/env.js';
import { connectDB } from '../config/db.js';

import {
    migrateSubscriptionKind,
} from './addSubscriptionKind.migration.js';


const run = async () => {
    try {
        await connectDB(env.MONGODB_URI);

        const result = await migrateSubscriptionKind();

        console.log(
            'Migration addSubscriptionKind terminée :',
            result,
        );
    } catch (error) {
        console.error(
            'Échec de la migration addSubscriptionKind :',
            error,
        );

        process.exitCode = 1;
    } finally {
        await mongoose.connection.close();
    }
};


run();
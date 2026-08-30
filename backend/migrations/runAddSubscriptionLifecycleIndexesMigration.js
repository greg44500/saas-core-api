import mongoose from 'mongoose';

import { env } from '../config/env.js';
import { connectDB } from '../config/db.js';
import {
    migrateSubscriptionLifecycleIndexes,
} from './addSubscriptionLifecycleIndexes.migration.js';


const run = async () => {
    try {
        await connectDB(env.MONGODB_URI);

        const result = await migrateSubscriptionLifecycleIndexes();

        console.log(
            'Migration addSubscriptionLifecycleIndexes terminée :',
            result,
        );
    } catch (error) {
        console.error(
            'Échec de la migration addSubscriptionLifecycleIndexes :',
            { message: error.message },
        );
        process.exitCode = 1;
    } finally {
        await mongoose.connection.close();
    }
};


run();

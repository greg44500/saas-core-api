import mongoose from 'mongoose';
import { pathToFileURL } from 'node:url';

import { env } from '../config/env.js';
import { connectDB } from '../config/db.js';
import {
    migrateSubscriptionTermType,
} from './addSubscriptionTermType.migration.js';


const runAddSubscriptionTermTypeMigration = async () => {
    try {
        await connectDB(env.MONGODB_URI);

        const result = await migrateSubscriptionTermType();

        console.log(
            'Migration addSubscriptionTermType terminée :',
            result,
        );
    } catch (error) {
        console.error(
            'Échec de la migration addSubscriptionTermType :',
            { message: error.message },
        );

        process.exitCode = 1;
    } finally {
        await mongoose.connection.close();
    }
};


const isExecutedDirectly = (
    process.argv[1]
    && import.meta.url === pathToFileURL(process.argv[1]).href
);

if (isExecutedDirectly) {
    runAddSubscriptionTermTypeMigration();
}


export {
    runAddSubscriptionTermTypeMigration,
};

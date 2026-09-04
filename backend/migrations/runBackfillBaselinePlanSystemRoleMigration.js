import mongoose from 'mongoose';
import { pathToFileURL } from 'node:url';

import { connectDB } from '../config/db.js';
import { env } from '../config/env.js';
import {
    backfillBaselinePlanSystemRole,
} from './backfillBaselinePlanSystemRole.migration.js';

const runBackfillBaselinePlanSystemRoleMigration = async () => {
    try {
        await connectDB(env.MONGODB_URI);

        const result = await backfillBaselinePlanSystemRole();

        console.log(
            'Migration baseline Plan terminée :',
            result,
        );
    } catch (error) {
        console.error(
            'Échec de la migration baseline Plan :',
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
    runBackfillBaselinePlanSystemRoleMigration();
}

export { runBackfillBaselinePlanSystemRoleMigration };

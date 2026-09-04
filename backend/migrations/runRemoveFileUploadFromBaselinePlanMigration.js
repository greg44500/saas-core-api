import mongoose from 'mongoose';
import { pathToFileURL } from 'node:url';

import { connectDB } from '../config/db.js';
import { env } from '../config/env.js';
import {
    removeFileUploadFromBaselinePlan,
} from './removeFileUploadFromBaselinePlan.migration.js';


const runRemoveFileUploadFromBaselinePlanMigration = async () => {
    try {
        await connectDB(env.MONGODB_URI);

        const result = await removeFileUploadFromBaselinePlan();

        console.log(
            'Réconciliation file_upload du Plan baseline terminée :',
            result,
        );
    } catch (error) {
        console.error(
            'Échec de la réconciliation file_upload du Plan baseline :',
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
    runRemoveFileUploadFromBaselinePlanMigration();
}


export { runRemoveFileUploadFromBaselinePlanMigration };

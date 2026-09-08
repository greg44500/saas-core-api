import mongoose from 'mongoose';

import { env } from '../config/env.js';
import { connectDB } from '../config/db.js';
import {
    reconcileDeletedFileStorageUsage,
} from './reconcileDeletedFileStorageUsage.migration.js';

const run = async () => {
    try {
        await connectDB(env.MONGODB_URI);

        const result = await reconcileDeletedFileStorageUsage();

        console.log(
            'Migration reconcileDeletedFileStorageUsage terminée :',
            result,
        );
    } catch (error) {
        console.error(
            'Échec de la migration reconcileDeletedFileStorageUsage :',
            { message: error.message },
        );
        process.exitCode = 1;
    } finally {
        await mongoose.connection.close();
    }
};

run();

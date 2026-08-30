import mongoose from 'mongoose';

import { env } from '../config/env.js';
import { connectDB } from '../config/db.js';
import {
    migrateFileDeletePermissionToSystemRoles,
} from './addFileDeletePermissionToSystemRoles.migration.js';

const run = async () => {
    try {
        await connectDB(env.MONGODB_URI);

        const result =
            await migrateFileDeletePermissionToSystemRoles();

        console.log(
            'Migration addFileDeletePermissionToSystemRoles terminée :',
            result,
        );
    } catch (error) {
        console.error(
            'Échec de la migration addFileDeletePermissionToSystemRoles :',
            error,
        );
        process.exitCode = 1;
    } finally {
        await mongoose.connection.close();
    }
};

run();

import mongoose from 'mongoose';

import { env } from '../config/env.js';
import { connectDB } from '../config/db.js';
import {
    migrateFileTrashPermissionsToSystemRoles,
} from './addFileTrashPermissionsToSystemRoles.migration.js';

const run = async () => {
    try {
        await connectDB(env.MONGODB_URI);

        const result =
            await migrateFileTrashPermissionsToSystemRoles();

        console.log(
            'Migration addFileTrashPermissionsToSystemRoles terminée :',
            result,
        );
    } catch (error) {
        console.error(
            'Échec de la migration addFileTrashPermissionsToSystemRoles :',
            { message: error.message },
        );
        process.exitCode = 1;
    } finally {
        await mongoose.connection.close();
    }
};

run();

import mongoose from 'mongoose';

import { env } from '../config/env.js';
import { connectDB } from '../config/db.js';
import {
    migrateAuditReadPermissionToSystemRoles,
} from './addAuditReadPermissionToSystemRoles.migration.js';

const run = async () => {
    try {
        await connectDB(env.MONGODB_URI);

        const result =
            await migrateAuditReadPermissionToSystemRoles();

        console.log(
            'Migration addAuditReadPermissionToSystemRoles terminée :',
            result,
        );
    } catch (error) {
        console.error(
            'Échec de la migration addAuditReadPermissionToSystemRoles :',
            error,
        );
        process.exitCode = 1;
    } finally {
        await mongoose.connection.close();
    }
};

run();

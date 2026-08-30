import mongoose from 'mongoose';

import { env } from '../config/env.js';
import { connectDB } from '../config/db.js';
import {
    migrateSubscriptionReadPermissionToSystemRoles,
} from './addSubscriptionReadPermissionToSystemRoles.migration.js';

const run = async () => {
    try {
        await connectDB(env.MONGODB_URI);

        const result =
            await migrateSubscriptionReadPermissionToSystemRoles();

        console.log(
            'Migration addSubscriptionReadPermissionToSystemRoles terminée :',
            result,
        );
    } catch (error) {
        console.error(
            'Échec de la migration addSubscriptionReadPermissionToSystemRoles :',
            { message: error.message },
        );
        process.exitCode = 1;
    } finally {
        await mongoose.connection.close();
    }
};

run();
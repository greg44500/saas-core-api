import mongoose from 'mongoose';

import { env } from '../config/env.js';
import { connectDB } from '../config/db.js';
import {
    migrateWorkspaceOwnershipTransferPermissionToOwnerRoles,
} from './addWorkspaceOwnershipTransferPermissionToOwnerRoles.migration.js';


const run = async () => {
    try {
        await connectDB(env.MONGODB_URI);

        const result =
            await migrateWorkspaceOwnershipTransferPermissionToOwnerRoles();

        console.log(
            'Migration addWorkspaceOwnershipTransferPermissionToOwnerRoles terminée :',
            result,
        );
    } catch (error) {
        console.error(
            'Échec de la migration addWorkspaceOwnershipTransferPermissionToOwnerRoles :',
            error,
        );

        process.exitCode = 1;
    } finally {
        await mongoose.connection.close();
    }
};


run();

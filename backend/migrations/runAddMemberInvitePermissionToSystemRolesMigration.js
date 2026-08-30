import mongoose from 'mongoose';

import { env } from '../config/env.js';
import { connectDB } from '../config/db.js';
import {
    migrateMemberInvitePermissionToSystemRoles,
} from './addMemberInvitePermissionToSystemRoles.migration.js';

const run = async () => {
    try {
        await connectDB(env.MONGODB_URI);

        const result =
            await migrateMemberInvitePermissionToSystemRoles();

        console.log(
            'Migration addMemberInvitePermissionToSystemRoles terminée :',
            result,
        );
    } catch (error) {
        console.error(
            'Échec de la migration addMemberInvitePermissionToSystemRoles :',
            error,
        );
        process.exitCode = 1;
    } finally {
        await mongoose.connection.close();
    }
};

run();

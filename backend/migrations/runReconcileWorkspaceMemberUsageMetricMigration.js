import mongoose from 'mongoose';

import { env } from '../config/env.js';
import { connectDB } from '../config/db.js';
import {
    reconcileWorkspaceMemberUsageMetric,
} from './reconcileWorkspaceMemberUsageMetric.migration.js';

const run = async () => {
    try {
        await connectDB(env.MONGODB_URI);

        const result = await reconcileWorkspaceMemberUsageMetric();

        console.log(
            'Migration reconcileWorkspaceMemberUsageMetric terminée :',
            result,
        );
    } catch (error) {
        console.error(
            'Échec de la migration reconcileWorkspaceMemberUsageMetric :',
            { message: error.message },
        );
        process.exitCode = 1;
    } finally {
        await mongoose.connection.close();
    }
};

run();

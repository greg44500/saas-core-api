import mongoose from 'mongoose';

import { env } from '../config/env.js';
import { connectDB } from '../config/db.js';
import {
    backfillWorkspaceMemberUsageMetric,
} from './backfillWorkspaceMemberUsageMetric.migration.js';

const run = async () => {
    try {
        await connectDB(env.MONGODB_URI);

        const result = await backfillWorkspaceMemberUsageMetric();

        console.log(
            'Migration backfillWorkspaceMemberUsageMetric terminée :',
            result,
        );
    } catch (error) {
        console.error(
            'Échec de la migration backfillWorkspaceMemberUsageMetric :',
            { message: error.message },
        );
        process.exitCode = 1;
    } finally {
        await mongoose.connection.close();
    }
};

run();

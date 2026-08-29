import mongoose from 'mongoose';

import { connectDB } from '../../config/db.js';
import { env } from '../../config/env.js';
import {
    runFinalizeScheduledCancellationsJob,
} from './finalizeScheduledCancellations.job.js';


const run = async () => {
    await connectDB(env.MONGODB_URI);
    await runFinalizeScheduledCancellationsJob();
};


run()
    .catch((error) => {
        console.error(
            'Le job de finalisation des annulations a échoué.',
            error,
        );
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.connection.close();
    });

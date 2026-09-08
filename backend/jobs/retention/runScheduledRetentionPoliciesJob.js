import mongoose from 'mongoose';

import { connectDB } from '../../config/db.js';
import { env } from '../../config/env.js';
import {
    runScheduledRetentionJob,
} from './scheduledRetention.job.js';

/**
 * Point d'entrée autonome : cron Linux, CronJob Kubernetes ou scheduler cloud
 * peuvent l'invoquer régulièrement. La fréquence métier réelle reste calculée
 * depuis chaque policy persistée, sous lock distribué MongoDB.
 */
const run = async () => {
    try {
        await connectDB(env.MONGODB_URI);
        await runScheduledRetentionJob();
    } catch (error) {
        console.error(
            'Échec du job de rétention planifiée.',
            { message: error.message },
        );
        process.exitCode = 1;
    } finally {
        await mongoose.connection.close();
    }
};

run();

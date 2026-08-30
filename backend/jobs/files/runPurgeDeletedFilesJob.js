import mongoose from 'mongoose';

import {
    connectDB,
} from '../../config/db.js';
import {
    env,
} from '../../config/env.js';
import {
    runPurgeDeletedFilesJob,
} from './purgeDeletedFiles.job.js';

/**
 * Point d'entrée autonome du job de purge des fichiers supprimés.
 *
 * Le processus possède sa propre connexion MongoDB afin de pouvoir être lancé
 * par un cron Linux, un CronJob Kubernetes ou un ordonnanceur cloud sans faire
 * dépendre la maintenance du cycle de vie de l'API Express.
 */
const run = async () => {
    try {
        await connectDB(env.MONGODB_URI);
        await runPurgeDeletedFilesJob();
    } catch (error) {
        console.error(
            'Échec du job de purge des fichiers.',
            {
                message: error.message,
            },
        );
        process.exitCode = 1;
    } finally {
        await mongoose.connection.close();
    }
};

run();

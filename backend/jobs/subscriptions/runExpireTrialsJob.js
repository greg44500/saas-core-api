import mongoose from 'mongoose';

import {
    connectDB,
} from '../../config/db.js';

import {
    env,
} from '../../config/env.js';

import {
    runExpireTrialsJob,
} from './expireTrials.job.js';


/**
 * Point d'entrée autonome du job d'expiration des trials.
 *
 * Le processus possède sa propre connexion MongoDB afin de pouvoir être lancé
 * par un cron Linux, un CronJob Kubernetes ou un ordonnanceur cloud sans faire
 * dépendre la maintenance du nombre d'instances de l'API Express.
 */
const run = async () => {
    try {
        await connectDB(env.MONGODB_URI);
        await runExpireTrialsJob();
    } catch (error) {
        console.error(
            'Échec du job d’expiration des trials.',
            {
                message: error.message,
            },
        );

        process.exitCode = 1;
    } finally {
        /*
         * Le runner est un processus court : fermer explicitement MongoDB
         * garantit qu'il se termine proprement après chaque déclenchement.
         */
        await mongoose.connection.close();
    }
};


run();

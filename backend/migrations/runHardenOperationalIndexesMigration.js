import mongoose from 'mongoose';

import { connectDB } from '../config/db.js';
import { env } from '../config/env.js';
import {
    hardenOperationalIndexes,
} from './hardenOperationalIndexes.migration.js';

const run = async () => {
    try {
        await connectDB(env.MONGODB_URI);

        const result = await hardenOperationalIndexes();

        console.log(
            'Migration hardenOperationalIndexes terminée :',
            result,
        );
    } catch (error) {
        console.error(
            'Échec de la migration hardenOperationalIndexes :',
            { message: error.message },
        );
        process.exitCode = 1;
    } finally {
        await mongoose.connection.close();
    }
};

run();

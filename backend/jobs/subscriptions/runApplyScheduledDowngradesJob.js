import mongoose from 'mongoose';

import { connectDB } from '../../config/db.js';
import { env } from '../../config/env.js';
import { runApplyScheduledDowngradesJob } from './applyScheduledDowngrades.job.js';

try {
    await connectDB(env.MONGODB_URI);
    await runApplyScheduledDowngradesJob();
} catch (error) {
    console.error('Scheduled downgrade runner failed', error);
    process.exitCode = 1;
} finally {
    await mongoose.connection.close();
}

import request from 'supertest';
import {
    describe,
    expect,
    it,
} from 'vitest';

import { app } from '../../app.js';

describe('subscription app mounting', () => {
    it('monte réellement le router Subscription sous le workspace', async () => {
        const response = await request(app)
            .get(
                '/api/workspaces/507f1f77bcf86cd799439011/subscription',
            );

        /*
         * Sans montage du router, Express retournerait 404. Une route montée
         * atteint authenticate et refuse donc ici la requête anonyme en 401.
         */
        expect(response.status).toBe(401);
    });
});

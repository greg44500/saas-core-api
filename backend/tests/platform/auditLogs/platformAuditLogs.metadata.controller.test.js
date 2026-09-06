import { describe, expect, it, vi } from 'vitest';

import {
    getAuditLogMetadata,
} from '../../../modules/platform/auditLogs/platformAuditLogs.controller.js';


const createResponse = () => ({
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
});


describe('platform audit metadata controller', () => {
    it('retourne le catalogue canonique dans le contrat HTTP', async () => {
        const res = createResponse();

        await getAuditLogMetadata({}, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            status: 'success',
            data: {
                metadata: expect.objectContaining({
                    actions: expect.any(Array),
                    entityTypes: expect.arrayContaining([
                        {
                            value: 'EntitlementOverride',
                            label: 'Dérogation',
                        },
                    ]),
                    statuses: expect.any(Array),
                }),
            },
        }));
    });
});

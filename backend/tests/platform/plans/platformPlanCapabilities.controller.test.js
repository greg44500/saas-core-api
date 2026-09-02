import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    listPlanCapabilities,
} from '../../../modules/platform/plans/platformPlanCapabilities.controller.js';


describe('listPlanCapabilities', () => {
    it('expose les features et métriques du registre actif', async () => {
        const json = vi.fn();
        const status = vi.fn(() => ({ json }));

        await listPlanCapabilities(
            {},
            { status },
        );

        expect(status).toHaveBeenCalledWith(200);
        expect(json).toHaveBeenCalledOnce();

        const payload = json.mock.calls[0][0];

        expect(payload.status).toBe('success');
        expect(payload.data.features).toEqual(
            expect.arrayContaining([
                'audit_logs',
                'file_upload',
                'team_management',
            ]),
        );
        expect(payload.data.metrics).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ key: 'members' }),
                expect.objectContaining({ key: 'storage_bytes' }),
                expect.objectContaining({ key: 'file_uploads_monthly' }),
            ]),
        );
    });
});

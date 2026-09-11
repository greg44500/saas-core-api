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
    it('expose les features, leurs métriques associées et les garde-fous de dérogation', async () => {
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
        expect(payload.data.featureDefinitions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    key: 'file_upload',
                    metricKeys: expect.arrayContaining([
                        'storage_bytes',
                        'file_uploads_monthly',
                    ]),
                }),
                expect.objectContaining({
                    key: 'team_management',
                    metricKeys: ['members'],
                    overridePolicy: {
                        requiredLimits: {
                            members: {
                                minimumEffectiveValue: 2,
                            },
                        },
                    },
                }),
            ]),
        );
        expect(payload.data.metrics).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    key: 'members',
                    overridePolicy: expect.objectContaining({
                        control: 'linear_slider',
                        max: 50,
                    }),
                }),
                expect.objectContaining({
                    key: 'storage_bytes',
                    overridePolicy: expect.objectContaining({
                        control: 'preset_slider',
                    }),
                }),
                expect.objectContaining({
                    key: 'file_uploads_monthly',
                    overridePolicy: expect.objectContaining({
                        control: 'preset_slider',
                    }),
                }),
            ]),
        );
    });
});

import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

const getPlatformOverviewMock = vi.hoisted(() => vi.fn());

vi.mock(
    '../../../modules/platform/overview/platformOverview.service.js',
    () => ({
        getPlatformOverview: getPlatformOverviewMock,
    }),
);

import {
    getOverview,
} from '../../../modules/platform/overview/platformOverview.controller.js';

describe('platformOverview.controller', () => {
    beforeEach(() => {
        getPlatformOverviewMock.mockReset();
    });

    it('transmet uniquement la query validée au service', async () => {
        const from = new Date('2026-08-01T00:00:00.000Z');
        const to = new Date('2026-09-01T00:00:00.000Z');
        const overview = {
            generatedAt: new Date('2026-09-01T00:00:00.000Z'),
            kpis: {},
        };
        const req = {
            query: {
                from: 'non-fiable',
                extra: 'ignored',
            },
            validated: {
                query: { from, to },
            },
        };
        const json = vi.fn();
        const status = vi.fn(() => ({ json }));
        const res = { status };

        getPlatformOverviewMock.mockResolvedValue(overview);

        await getOverview(req, res);

        expect(getPlatformOverviewMock).toHaveBeenCalledWith({ from, to });
        expect(status).toHaveBeenCalledWith(200);
        expect(json).toHaveBeenCalledWith({
            status: 'success',
            data: { overview },
        });
    });
});

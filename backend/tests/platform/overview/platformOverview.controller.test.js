import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

const getPlatformOverviewDashboardMock = vi.hoisted(() => vi.fn());

vi.mock(
    '../../../modules/platform/overview/platformOverviewDashboard.service.js',
    () => ({
        getPlatformOverviewDashboard: getPlatformOverviewDashboardMock,
    }),
);

import {
    getOverview,
} from '../../../modules/platform/overview/platformOverview.controller.js';

describe('platformOverview.controller', () => {
    beforeEach(() => {
        getPlatformOverviewDashboardMock.mockReset();
    });

    it('transmet uniquement la query validée au service de cockpit', async () => {
        const from = new Date('2026-08-01T00:00:00.000Z');
        const to = new Date('2026-09-01T00:00:00.000Z');
        const overview = {
            generatedAt: new Date('2026-09-01T00:00:00.000Z'),
            kpis: {},
            attention: { items: [] },
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

        getPlatformOverviewDashboardMock.mockResolvedValue(overview);

        await getOverview(req, res);

        expect(getPlatformOverviewDashboardMock).toHaveBeenCalledWith({ from, to });
        expect(status).toHaveBeenCalledWith(200);
        expect(json).toHaveBeenCalledWith({
            status: 'success',
            data: { overview },
        });
    });
});

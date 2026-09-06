import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    PLATFORM_PERMISSION,
} from '../../../constants/platformPermissions.constants.js';

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

    it('transmet la query validée et les permissions runtime au service de cockpit', async () => {
        const from = new Date('2026-08-01T00:00:00.000Z');
        const to = new Date('2026-09-01T00:00:00.000Z');
        const permissions = [
            PLATFORM_PERMISSION.OVERVIEW_READ,
            PLATFORM_PERMISSION.USERS_READ,
        ];
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
            platformAuthorization: {
                permissions,
            },
        };
        const json = vi.fn();
        const status = vi.fn(() => ({ json }));
        const res = { status };

        getPlatformOverviewDashboardMock.mockResolvedValue(overview);

        await getOverview(req, res);

        expect(getPlatformOverviewDashboardMock).toHaveBeenCalledWith({
            from,
            to,
            permissions,
        });
        expect(status).toHaveBeenCalledWith(200);
        expect(json).toHaveBeenCalledWith({
            status: 'success',
            data: { overview },
        });
    });

    it('reste fail-closed si le contexte Platform ne contient aucune permission', async () => {
        const req = {
            validated: { query: {} },
        };
        const json = vi.fn();
        const status = vi.fn(() => ({ json }));
        const res = { status };

        getPlatformOverviewDashboardMock.mockResolvedValue({});

        await getOverview(req, res);

        expect(getPlatformOverviewDashboardMock).toHaveBeenCalledWith({
            permissions: [],
        });
    });
});

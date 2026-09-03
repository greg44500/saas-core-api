import { describe, expect, it, vi } from 'vitest';

const captured = vi.hoisted(() => ({
  queryConfig: null,
}));

vi.mock('@/services/api/base-api', () => ({
  baseApi: {
    injectEndpoints: ({ endpoints }) => {
      const builder = {
        query: vi.fn((config) => {
          captured.queryConfig = config;
          return config;
        }),
      };

      endpoints(builder);

      return {
        useGetPlatformOverviewQuery: vi.fn(),
      };
    },
  },
}));

import '@/features/platform/api/platform-overview-api';

describe('platformOverviewApi', () => {
  it('conserve le contrat HTTP et la projection Overview', () => {
    expect(captured.queryConfig.query()).toEqual({
      url: '/platform/overview',
      params: {},
    });

    expect(captured.queryConfig.query({
      from: '2026-08-01T00:00:00.000Z',
      to: '2026-09-01T00:00:00.000Z',
    })).toEqual({
      url: '/platform/overview',
      params: {
        from: '2026-08-01T00:00:00.000Z',
        to: '2026-09-01T00:00:00.000Z',
      },
    });

    expect(captured.queryConfig.transformResponse({
      data: {
        overview: { generatedAt: '2026-09-03T12:00:00.000Z' },
      },
    })).toEqual({
      generatedAt: '2026-09-03T12:00:00.000Z',
    });
    expect(captured.queryConfig.transformResponse({})).toBeNull();
    expect(captured.queryConfig.providesTags).toEqual(['PlatformOverview']);
  });
});

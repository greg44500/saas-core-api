import { describe, expect, it } from 'vitest';

import { FILE_STATUS } from '../../../constants/file.constants.js';
import {
    buildFileUsagePipeline,
} from '../../../modules/platform/overview/platformOverview.service.js';

describe('platformOverview file usage', () => {
    it('agrège uniquement les fichiers actifs et sépare nombre et stockage par type MIME', () => {
        const pipeline = buildFileUsagePipeline();

        expect(pipeline[0]).toEqual({
            $match: {
                status: FILE_STATUS.ACTIVE,
            },
        });
        expect(pipeline[1].$facet).toHaveProperty('totals');
        expect(pipeline[1].$facet).toHaveProperty('byType');

        const typeGroup = pipeline[1].$facet.byType.find(
            (stage) => stage.$group,
        ).$group;

        expect(typeGroup._id).toBe('$mimeType');
        expect(typeGroup.count).toEqual({ $sum: 1 });
        expect(typeGroup.sizeBytes).toEqual({ $sum: '$sizeBytes' });
    });
});

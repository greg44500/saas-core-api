import { Plan } from '../../../plan/plan.model.js';


/**
 * Retourne les plans administrables avec pagination.
 *
 * Contrairement au catalogue public, cette liste expose également les plans
 * non publics, inactifs ou archivés afin que la plateforme puisse les gérer.
 *
 * @param {object} params
 * @param {number} [params.page=1]
 * @param {number} [params.limit=20]
 * @returns {Promise<{plans: object[], pagination: object}>}
 */
const listPlatformPlans = async ({
    page = 1,
    limit = 20,
}) => {
    if (!Number.isInteger(page) || page < 1) {
        throw new TypeError(
            'page must be an integer greater than or equal to 1',
        );
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
        throw new TypeError(
            'limit must be an integer between 1 and 100',
        );
    }

    const skip = (page - 1) * limit;

    const [plans, total] = await Promise.all([
        Plan.find({})
            .select([
                '_id',
                'key',
                'name',
                'description',
                'status',
                'isPublic',
                'displayOrder',
                'currency',
                'priceMonthlyExclTaxMinor',
                'priceYearlyExclTaxMinor',
                'features',
                'limits',
                'createdBy',
                'updatedBy',
                'createdAt',
                'updatedAt',
            ].join(' '))
            .sort({
                displayOrder: 1,
                createdAt: 1,
                _id: 1,
            })
            .skip(skip)
            .limit(limit)
            .lean(),
        Plan.countDocuments({}),
    ]);

    return {
        plans,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};


export { listPlatformPlans };

import express from 'express';
import request from 'supertest';
import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { authenticate } from '../../middlewares/authenticate.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import { create } from '../../modules/workspace/workspace.controller.js';
import { workspaceRouter } from '../../modules/workspace/workspace.routes.js';
import {
    createWorkspaceSchema,
} from '../../modules/workspace/workspace.validation.js';


const {
    validationMiddleware,
} = vi.hoisted(() => ({
    validationMiddleware: vi.fn((req, res, next) => {
        next();
    }),
}));


vi.mock('../../middlewares/authenticate.js', () => ({
    authenticate: vi.fn((req, res, next) => {
        req.user = {
            id: 'user-id',
        };

        next();
    }),
}));

vi.mock('../../middlewares/validateRequest.js', () => ({
    validateRequest: vi.fn(() => validationMiddleware),
}));

vi.mock(
    '../../modules/workspace/workspace.controller.js',
    () => ({
        create: vi.fn((req, res) => {
            res.status(201).json({
                status: 'success',
            });
        }),
    }),
);


describe('workspace.routes', () => {
    it('protège et valide la création avant d’appeler le controller', async () => {
        const app = express();

        app.use(express.json());
        app.use('/workspaces', workspaceRouter);

        const response = await request(app)
            .post('/workspaces')
            .send({
                name: 'Acme',
            });

        expect(response.status).toBe(201);

        expect(validateRequest).toHaveBeenCalledWith({
            body: createWorkspaceSchema,
        });

        expect(authenticate).toHaveBeenCalledOnce();
        expect(validationMiddleware).toHaveBeenCalledOnce();
        expect(create).toHaveBeenCalledOnce();

        expect(
            authenticate.mock.invocationCallOrder[0],
        ).toBeLessThan(
            validationMiddleware.mock.invocationCallOrder[0],
        );

        expect(
            validationMiddleware.mock.invocationCallOrder[0],
        ).toBeLessThan(
            create.mock.invocationCallOrder[0],
        );
    });
});
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import mongoose from 'mongoose';

import {
    buildMongoConnectionOptions,
    connectDB,
} from '../../config/db.js';


describe('buildMongoConnectionOptions', () => {
    it('désactive autoIndex en production', () => {
        expect(
            buildMongoConnectionOptions('production'),
        ).toEqual({
            autoIndex: false,
        });
    });

    it('conserve autoIndex en développement et en test', () => {
        expect(
            buildMongoConnectionOptions('development'),
        ).toEqual({
            autoIndex: true,
        });

        expect(
            buildMongoConnectionOptions('test'),
        ).toEqual({
            autoIndex: true,
        });
    });
});


describe('connectDB', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('propage une erreur de connexion sans la journaliser ni quitter le processus', async () => {
        const error = new Error('connection failed');
        const connectSpy = vi
            .spyOn(mongoose, 'connect')
            .mockRejectedValue(error);
        const consoleErrorSpy = vi
            .spyOn(console, 'error')
            .mockImplementation(() => {});
        const exitSpy = vi
            .spyOn(process, 'exit')
            .mockImplementation(() => undefined);

        await expect(
            connectDB('mongodb://example.test/database'),
        ).rejects.toBe(error);

        expect(connectSpy).toHaveBeenCalledWith(
            'mongodb://example.test/database',
            {
                autoIndex: true,
            },
        );
        expect(consoleErrorSpy).not.toHaveBeenCalled();
        expect(exitSpy).not.toHaveBeenCalled();
    });
});

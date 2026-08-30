import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import mongoose from 'mongoose';

import { connectDB } from '../../config/db.js';


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
        );
        expect(consoleErrorSpy).not.toHaveBeenCalled();
        expect(exitSpy).not.toHaveBeenCalled();
    });
});

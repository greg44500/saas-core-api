import { describe, expect, it, vi } from "vitest";

import { catchAsync } from "../../utils/catchAsync.js";

describe("catchAsync", () => {
    // Test pour vérifier que catchAsync transmet correctement une erreur 'synchrone' à next
    it("transmet une erreur synchrone à next", async () => {
        const error = new Error("Erreur synchrone");

        const handler = () => {
            throw error;
        };

        const wrappedHandler = catchAsync(handler); // On enveloppe le handler avec catchAsync pour gérer les erreurs asynchrones et synchrones
        const next = vi.fn();// On crée une fonction simulée pour next afin de vérifier si elle est appelée correctement

        await wrappedHandler({}, {}, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenCalledWith(error);
    });
    //  Test pour vérifier que catchAsync transmet correctement une erreur 'asynchrone' à next
    it("transmet une erreur asynchrone à next", async () => {
        const error = new Error("Erreur asynchrone");

        const handler = async () => {
            throw error;
        };

        const wrappedHandler = catchAsync(handler);
        const next = vi.fn();

        await wrappedHandler({}, {}, next); // On appelle le handler enveloppé avec des objets vides pour req et res, et la fonction simulée next

        expect(next).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenCalledWith(error);
    });
});
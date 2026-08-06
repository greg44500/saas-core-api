import { describe, expect, it, vi } from "vitest";

import { errorHandler } from "../../middlewares/errorHandler.js";
import { AppError } from "../../utils/AppError.js";
// Fonction utilitaire pour créer un objet de réponse simulé
const createResponseMock = () => {
    const res = {};

    res.status = vi.fn(() => res);
    res.json = vi.fn(() => res);

    return res;
};
describe("errorHandler", () => {
    // Test pour vérifier que errorHandler renvoie le code et le message d'une erreur opérationnelle
    it("renvoie le code et le message d’une erreur opérationnelle", () => {
        const error = new AppError("Données invalides", 400);
        const req = {};
        const res = createResponseMock();
        const next = vi.fn();

        errorHandler(error, req, res, next);

        expect(res.status).toHaveBeenCalledTimes(1);
        expect(res.status).toHaveBeenCalledWith(400);

        expect(res.json).toHaveBeenCalledTimes(1);
        expect(res.json).toHaveBeenCalledWith({
            status: "fail",
            message: "Données invalides",
        });

        expect(next).not.toHaveBeenCalled();
    });
    //  Test pour vérifier que errorHandler masque une erreur technique imprévue et renvoie un message d'erreur générique
    it("masque une erreur technique imprévue", () => {
        const error = new Error("Erreur technique");
        const req = {};
        const res = createResponseMock();
        const next = vi.fn();
        const consoleErrorSpy = vi
            .spyOn(console, "error")
            .mockImplementation(() => { });

        errorHandler(error, req, res, next);

        expect(res.status).toHaveBeenCalledTimes(1);
        expect(res.status).toHaveBeenCalledWith(500);

        expect(res.json).toHaveBeenCalledTimes(1);
        expect(res.json).toHaveBeenCalledWith({
            status: "error",
            message: "Une erreur interne est survenue",
        });

        expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
        expect(consoleErrorSpy).toHaveBeenCalledWith(error);
        expect(next).not.toHaveBeenCalled();

        consoleErrorSpy.mockRestore(); // Restaure la fonction console.error originale après le test
    });
});
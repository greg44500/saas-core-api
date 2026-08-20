import { AppError } from "../utils/appError.js";
// Middleware pour gérer les routes non trouvées (404)
const notFound = (req, res, next) => {
    const error = new AppError('Route introuvable', 404);
    next(error);
};

export { notFound };
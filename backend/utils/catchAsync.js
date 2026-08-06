// Cette fonction permet de gérer les erreurs asynchrones pour les routes Express
const catchAsync = (handler) => {
    return (req, res, next) => {
        //englobe le handler dans une promesse pour gérer les erreurs asynchrones
        return Promise.resolve()
            // On place le handler dans la promesse pour capturer les erreurs asynchrones et synchrones
            .then(() => handler(req, res, next))
            .catch(next); // Si une erreur se produit, elle est transmise au middleware de gestion des erreurs d'Express
    }
}

export { catchAsync };
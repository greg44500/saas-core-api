class AppError extends Error {
    constructor(message, statusCode) {
        // appelle le constructeur de la classe parente (Error) avec le message d'erreur
        super(message);
        // stocke le code d'état HTTP associé à l'erreur
        this.statusCode = statusCode;
        // détermine le type d'erreur en fonction du code d'état HTTP ('fail' pour les erreurs opérationnelles client et 'error pour les erreurs techniques serveur)
        this.status = statusCode >= 400 && statusCode < 500 ? 'fail' : 'error';
        // indique que l'erreur est opérationnelle (c'est-à-dire prévue et gérée) pour faciliter la gestion des erreurs dans l'application
        this.name = "AppError";
        this.isOperational = true;
        // capture la pile d'appels pour faciliter le débogage et l'identification de l'origine de l'erreur
        Error.captureStackTrace(this, this.constructor);
    }
}
export { AppError };
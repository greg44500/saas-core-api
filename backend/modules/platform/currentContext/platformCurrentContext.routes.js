import { Router } from 'express';

import {
    getCurrent,
} from './platformCurrentContext.controller.js';


const platformCurrentContextRouter = Router();

/**
 * Aucun authorizePlatformPermission() ici : l'endpoint décrit uniquement le
 * contexte Platform du User déjà authentifié par le routeur parent.
 *
 * Un membre suspendu doit pouvoir savoir qu'il est suspendu, et un User
 * ordinaire doit pouvoir recevoir platformAccess: null sans obtenir d'accès
 * administratif.
 */
platformCurrentContextRouter.get('/', getCurrent);


export { platformCurrentContextRouter };

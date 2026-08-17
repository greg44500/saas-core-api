import { Router } from 'express';

import {
    list,
} from './plan.controller.js';


const router = Router();


/**
 * Retourne le catalogue public des offres commerciales.
 *
 * Cette route reste volontairement accessible sans authentification afin
 * qu'une future page tarifaire puisse être consultée avant l'inscription.
 *
 * Le service filtre lui-même les plans actifs et publics : le contrôleur
 * n'accepte aucun filtre fourni par le client.
 */
router.get(
    '/',
    list,
);


export { router as planRouter };
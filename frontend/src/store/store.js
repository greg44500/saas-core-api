import {
  configureStore,
  createListenerMiddleware,
} from '@reduxjs/toolkit';

import { authSlice, sessionTerminated } from '@/features/auth/store/auth-slice';
import { baseApi } from '@/services/api/base-api';

const sessionListenerMiddleware = createListenerMiddleware();

sessionListenerMiddleware.startListening({
  actionCreator: sessionTerminated,
  effect: async (_action, listenerApi) => {
    // Le cache RTK Query peut contenir des données multi-tenant du compte qui
    // vient de se déconnecter. Le vider au niveau du store évite qu'un compte
    // authentifié ensuite dans le même onglet voie brièvement ces données.
    listenerApi.dispatch(baseApi.util.resetApiState());
  },
});

function createAppStore(preloadedState) {
  return configureStore({
    reducer: {
      auth: authSlice.reducer,
      [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware()
        .prepend(sessionListenerMiddleware.middleware)
        .concat(baseApi.middleware),
    preloadedState,
  });
}

const appStore = createAppStore();

export { appStore, createAppStore };

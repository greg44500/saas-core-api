import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  accessToken: null,
  authStatus: 'checking',
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    sessionAuthenticated(state, action) {
      state.accessToken = action.payload.accessToken;
      state.authStatus = 'authenticated';
    },
    sessionUnauthenticated(state) {
      state.accessToken = null;
      state.authStatus = 'unauthenticated';
    },
    sessionChecking(state) {
      state.accessToken = null;
      state.authStatus = 'checking';
    },
    sessionTerminated(state) {
      state.accessToken = null;
      state.authStatus = 'unauthenticated';
    },
  },
});

const {
  sessionAuthenticated,
  sessionChecking,
  sessionTerminated,
  sessionUnauthenticated,
} = authSlice.actions;

const selectAccessToken = (state) => state.auth.accessToken;
const selectAuthStatus = (state) => state.auth.authStatus;

export {
  authSlice,
  selectAccessToken,
  selectAuthStatus,
  sessionAuthenticated,
  sessionChecking,
  sessionTerminated,
  sessionUnauthenticated,
};

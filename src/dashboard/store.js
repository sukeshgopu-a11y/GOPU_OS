const initialDashboardState = Object.freeze({
  metrics: [],
  approvals: [],
  orders: [],
  activity: [],
  loading: false,
  error: null,
  updatedAt: null
});

let dashboardState = { ...initialDashboardState };
const listeners = new Set();

function emitDashboardChange() {
  for (const listener of listeners) {
    listener(dashboardState);
  }
}

export function getDashboardState() {
  return dashboardState;
}

export function setDashboardState(nextState = {}) {
  dashboardState = {
    ...dashboardState,
    ...nextState,
    updatedAt: nextState.updatedAt || new Date().toISOString()
  };
  emitDashboardChange();
  return dashboardState;
}

export function resetDashboardState() {
  dashboardState = { ...initialDashboardState };
  emitDashboardChange();
  return dashboardState;
}

export function subscribeDashboardStore(listener) {
  if (typeof listener !== "function") return () => {};
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function createDashboardStore(seedState = {}) {
  let localState = { ...initialDashboardState, ...seedState };
  const localListeners = new Set();

  return {
    getState() {
      return localState;
    },
    setState(nextState = {}) {
      localState = {
        ...localState,
        ...nextState,
        updatedAt: nextState.updatedAt || new Date().toISOString()
      };
      for (const listener of localListeners) listener(localState);
      return localState;
    },
    reset() {
      localState = { ...initialDashboardState };
      for (const listener of localListeners) listener(localState);
      return localState;
    },
    subscribe(listener) {
      if (typeof listener !== "function") return () => {};
      localListeners.add(listener);
      return () => localListeners.delete(listener);
    }
  };
}

export const dashboardStore = {
  getState: getDashboardState,
  setState: setDashboardState,
  reset: resetDashboardState,
  subscribe: subscribeDashboardStore
};

export default dashboardStore;

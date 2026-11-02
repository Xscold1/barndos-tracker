export function initialAuthState(configured) {
  return { status: configured ? 'loading' : 'unconfigured', session: null, profile: null, roles: [], error: null, requestVersion: 0 }
}

export function authReducer(state, action) {
  switch (action.type) {
    case 'session': {
      if (!action.session?.user?.id) return { ...initialAuthState(true), status: 'signedOut', requestVersion: state.requestVersion + 1 }
      if (action.session.user.id === state.session?.user.id) return { ...state, session: action.session }
      return { ...initialAuthState(true), session: action.session, requestVersion: state.requestVersion + 1 }
    }
    case 'profile':
      if (action.userId !== state.session?.user.id) return state
      return { ...state, status: 'ready', profile: action.profile, roles: action.roles, error: null }
    case 'failure':
      if (action.userId && action.userId !== state.session?.user.id) return state
      return { ...state, status: action.denied ? 'denied' : 'error', profile: null, roles: [], error: action.message }
    case 'retry':
      return { ...state, status: 'loading', error: null, requestVersion: state.requestVersion + 1 }
    default:
      return state
  }
}

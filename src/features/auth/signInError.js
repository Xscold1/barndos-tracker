export function signInError(error) {
  if (error?.name === 'AuthRetryableFetchError' || error instanceof TypeError) {
    return 'Cannot reach the sign-in server. Check your connection. The workspace owner should verify the Supabase Project URL in the environment settings and restart the app.'
  }
  if (error?.code === 'invalid_credentials') return 'Email or password is incorrect for this workspace.'
  if (error?.code === 'email_not_confirmed') return 'Confirm your email address before signing in.'
  if (error?.status === 429) return 'Too many sign-in attempts. Please wait a few minutes and try again.'
  if (error?.status === 401 || error?.status === 403) return 'Sign-in was rejected. Ask the workspace owner to verify the Supabase Project URL and public key belong to the same project.'
  return 'Unable to sign in. Check your email and password, or try again shortly.'
}

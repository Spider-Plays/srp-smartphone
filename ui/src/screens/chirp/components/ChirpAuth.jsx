import ChirpLogo from '../ChirpLogo'

import { SOCIAL_APP_NAME } from '../../../config/socialAppBranding'

export default function ChirpAuth({
  mode,
  loginUsername,
  loginPassword,
  signupName,
  signupUsername,
  signupPassword,
  signupConfirm,
  onLoginUsername,
  onLoginPassword,
  onSignupName,
  onSignupUsername,
  onSignupPassword,
  onSignupConfirm,
  onLogin,
  onSignup,
  onSwitchMode,
}) {
  const isLogin = mode === 'login'

  return (
    <div className="chirp-auth">
      <div className="chirp-auth-hero">
        <div className="chirp-auth-logo-wrap">
          <ChirpLogo size={48} />
        </div>
      </div>
      <div className="chirp-auth-panel">
        <h1 className="chirp-auth-heading">{isLogin ? 'See what\'s happening' : `Join ${SOCIAL_APP_NAME} today`}</h1>
        <div className="chirp-auth-form">
          {isLogin ? (
            <>
              <div className="chirp-auth-field">
                <input
                  type="text"
                  placeholder="Username"
                  value={loginUsername}
                  onChange={(e) => onLoginUsername(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onLogin()}
                />
              </div>
              <div className="chirp-auth-field">
                <input
                  type="password"
                  placeholder="Password"
                  value={loginPassword}
                  onChange={(e) => onLoginPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onLogin()}
                />
              </div>
              <button type="button" className="chirp-auth-primary" onClick={onLogin}>
                Sign in
              </button>
            </>
          ) : (
            <>
              <div className="chirp-auth-field">
                <input
                  type="text"
                  placeholder="Name"
                  value={signupName}
                  onChange={(e) => onSignupName(e.target.value)}
                />
              </div>
              <div className="chirp-auth-field">
                <input
                  type="text"
                  placeholder="Username"
                  value={signupUsername}
                  onChange={(e) => onSignupUsername(e.target.value)}
                />
              </div>
              <div className="chirp-auth-field">
                <input
                  type="password"
                  placeholder="Password"
                  value={signupPassword}
                  onChange={(e) => onSignupPassword(e.target.value)}
                />
              </div>
              <div className="chirp-auth-field">
                <input
                  type="password"
                  placeholder="Confirm password"
                  value={signupConfirm}
                  onChange={(e) => onSignupConfirm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onSignup()}
                />
              </div>
              <button type="button" className="chirp-auth-primary" onClick={onSignup}>
                Create account
              </button>
            </>
          )}
          <button type="button" className="chirp-auth-secondary" onClick={() => onSwitchMode(isLogin ? 'signup' : 'login')}>
            {isLogin ? 'Create account' : 'Sign in instead'}
          </button>
        </div>
        {isLogin ? (
          <p className="chirp-auth-switch">
            Don&apos;t have an account?{' '}
            <button type="button" onClick={() => onSwitchMode('signup')}>
              Sign up
            </button>
          </p>
        ) : (
          <p className="chirp-auth-switch">
            Already have an account?{' '}
            <button type="button" onClick={() => onSwitchMode('login')}>
              Sign in
            </button>
          </p>
        )}
      </div>
    </div>
  )
}

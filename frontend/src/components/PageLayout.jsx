import { NavLink } from 'react-router-dom'
import useAuth from '../auth/useAuth.js'

function PageLayout({ children }) {
  const { user, logout } = useAuth()

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="site-header">
        <div className="site-header-inner">
          <NavLink className="brand-link" to="/" end aria-label="Travel Diary home">
            <span className="brand-mark" aria-hidden="true">TD</span>
            <span>Travel Diary</span>
          </NavLink>
          <nav aria-label="Main navigation">
            <div className="nav-pages">
              <NavLink to="/" end>Home</NavLink>
              {user && <NavLink to="/trips">My trips</NavLink>}
            </div>
            <div className="nav-account">
              {user ? (
                <>
                  <NavLink to="/account">Account</NavLink>
                  <span className="nav-user" title={`Signed in as ${user.name}`}>Signed in as {user.name}</span>
                  <button type="button" className="nav-button" onClick={logout}>Sign out</button>
                </>
              ) : (
                <>
                  <NavLink to="/login">Sign in</NavLink>
                  <NavLink className="nav-cta" to="/register">Create account</NavLink>
                </>
              )}
            </div>
          </nav>
        </div>
      </header>
      <main id="main-content" tabIndex={-1}>{children}</main>
    </>
  )
}

export default PageLayout

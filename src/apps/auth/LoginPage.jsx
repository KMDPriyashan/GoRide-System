import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { FiArrowUpRight, FiEye, FiEyeOff, FiLock, FiMail } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext.jsx'
import './auth.css'

const DESTINATIONS = {
  rider: '/rider/home',
  driver: '/driver/home',
  admin: '/admin/dashboard',
}

function CarIllustration() {
  return (
    <svg className="auth-car-illustration" viewBox="0 0 620 360" role="img" aria-label="Illustration of a GoRide car on a city road">
      <path d="M35 286h550" className="auth-art-road" />
      <path d="M72 286h98m77 0h98m77 0h98" className="auth-art-road-mark" />
      <path d="M106 282c5-39 23-61 59-73l46-69c10-15 25-23 43-23h112c22 0 38 10 50 30l39 62c29 12 46 36 50 73H106Z" className="auth-art-car-body" />
      <path d="m230 143-43 63h122v-89h-32c-20 0-36 9-47 26Zm97-26v89h151l-35-57c-10-21-24-32-45-32h-71Z" className="auth-art-window" />
      <path d="M110 235h39m340 0h48" className="auth-art-light" />
      <circle cx="203" cy="278" r="34" className="auth-art-wheel" />
      <circle cx="203" cy="278" r="14" className="auth-art-wheel-center" />
      <circle cx="454" cy="278" r="34" className="auth-art-wheel" />
      <circle cx="454" cy="278" r="14" className="auth-art-wheel-center" />
      <path d="M142 92c38-28 73-39 106-34M386 64c24 6 44 17 61 32" className="auth-art-route" />
      <circle cx="143" cy="92" r="7" className="auth-art-route-dot" />
      <circle cx="447" cy="96" r="7" className="auth-art-route-dot" />
      <path d="M282 225h52" className="auth-art-grille" />
    </svg>
  )
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [usernameOrEmail, setUsernameOrEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleSubmit(event) {
    event.preventDefault()
    setIsSubmitting(true)
    const result = login(usernameOrEmail, password)
    setIsSubmitting(false)

    if (result.redirectToSignup) {
      toast.info(result.message)
      navigate('/signup')
      return
    }
    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success('Welcome back.')
    navigate(DESTINATIONS[result.user.userType] ?? '/login', { replace: true })
  }

  return (
    <main className="auth-page auth-login grid min-h-screen lg:grid-cols-[minmax(0,1.02fr)_minmax(420px,0.98fr)]">
      <section className="auth-brand-panel">
        <Link className="auth-brand" to="/login" aria-label="GoRide login">
          <span className="auth-brand-mark">G</span>
          <span>GoRide</span>
        </Link>
        <div className="auth-brand-copy">
          <span className="auth-overline">MOVE WITH YOUR CITY</span>
          <h1>Every trip starts somewhere.</h1>
          <p>One account for the people who ride, drive, and keep the city moving.</p>
        </div>
        <CarIllustration />
        <div className="auth-brand-foot"><span className="auth-live-dot" /> Colombo · Sri Lanka <span>01</span></div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <div className="auth-form-heading">
            <span className="auth-overline">WELCOME TO GORIDE</span>
            <h2>Sign in</h2>
            <p>Enter your account details to continue.</p>
          </div>
          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-field">
              <span>Username or email</span>
              <span className="auth-input-wrap"><FiMail aria-hidden="true" /><input autoComplete="username" name="usernameOrEmail" required value={usernameOrEmail} onChange={(event) => setUsernameOrEmail(event.target.value)} placeholder="you@example.com" /></span>
            </label>
            <label className="auth-field">
              <span>Password</span>
              <span className="auth-input-wrap"><FiLock aria-hidden="true" /><input autoComplete="current-password" name="password" required type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" /><button className="auth-password-toggle" type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <FiEyeOff /> : <FiEye />}</button></span>
            </label>
            <button className="auth-submit" type="submit" disabled={isSubmitting}>Sign in <FiArrowUpRight aria-hidden="true" /></button>
          </form>
          <div className="auth-login-footer">
            <p>New to GoRide? <Link to="/signup">Create an account</Link></p>
            <div className="auth-demo-hint"><strong>Demo access</strong><span>Admin: <code>admin</code> / <code>admin123</code></span></div>
          </div>
        </div>
        <span className="auth-copyright">© {new Date().getFullYear()} GoRide · Colombo</span>
      </section>
    </main>
  )
}
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { FiArrowLeft, FiArrowRight, FiCheck, FiFileText, FiUser, FiTruck } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext.jsx'
import { getItem } from '../../shared/utils/storage.js'
import { validateLicensePlate, validatePhone, validatePassword } from '../../shared/utils/validators.js'
import './auth.css'

const INITIAL_DETAILS = { fullName: '', username: '', email: '', phone: '+94', password: '', confirmPassword: '' }
const INITIAL_DRIVER_DETAILS = { vehicleType: 'mini', make: '', model: '', year: '', plateNumber: '', licenseNumber: '', licenseExpiry: '' }

export default function SignupPage() {
  const navigate = useNavigate()
  const { signup } = useAuth()
  const [step, setStep] = useState(1)
  const [accountType, setAccountType] = useState('')
  const [details, setDetails] = useState(INITIAL_DETAILS)
  const [driverDetails, setDriverDetails] = useState(INITIAL_DRIVER_DETAILS)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const users = getItem('gr_users', [])
  const isFirstUser = !Array.isArray(users) || users.length === 0
  const progress = useMemo(() => step / (accountType === 'driver' ? 3 : 2), [accountType, step])

  function updateDetails(event) {
    setDetails((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  function updateDriverDetails(event) {
    setDriverDetails((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  function submitAccount(driverProfile) {
    setIsSubmitting(true)
    const result = signup({ ...details, userType: accountType, driverProfile })
    setIsSubmitting(false)
    if (!result.success) {
      toast.error(result.message)
      return
    }
    toast.success(accountType === 'driver'
      ? 'Application submitted! Awaiting admin approval.'
      : 'Account created! Please login.')
    navigate('/login', { replace: true })
  }

  function handleAccountDetails(event) {
    event.preventDefault()
    if (!validatePhone(details.phone)) {
      toast.error('Enter a valid Sri Lankan phone number in +94 format.')
      return
    }
    if (!validatePassword(details.password)) {
      toast.error('Password must contain at least 6 characters.')
      return
    }
    if (details.password !== details.confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }
    if (accountType === 'driver') setStep(3)
    else submitAccount()
  }

  function handleDriverDetails(event) {
    event.preventDefault()
    if (!validateLicensePlate(driverDetails.plateNumber)) {
      toast.error('Enter a valid Sri Lankan vehicle registration plate.')
      return
    }
    const expiry = new Date(`${driverDetails.licenseExpiry}T23:59:59`)
    if (!driverDetails.licenseExpiry || !Number.isFinite(expiry.getTime()) || expiry < new Date()) {
      toast.error('Enter a valid future licence expiry date.')
      return
    }
    submitAccount({
      vehicleType: driverDetails.vehicleType,
      vehicle: {
        make: driverDetails.make.trim(),
        model: driverDetails.model.trim(),
        name: `${driverDetails.make.trim()} ${driverDetails.model.trim()}`,
        year: Number(driverDetails.year),
        plateNumber: driverDetails.plateNumber.trim().toUpperCase(),
      },
      license: {
        number: driverDetails.licenseNumber.trim(),
        expiresAt: driverDetails.licenseExpiry,
        verificationStatus: 'pending',
      },
      documents: { verificationStatus: 'pending' },
    })
  }

  return (
    <main className="auth-page auth-signup min-h-screen">
      <header className="signup-topbar">
        <Link className="auth-brand auth-brand--compact" to="/login"><span className="auth-brand-mark">G</span><span>GoRide</span></Link>
        <span>Already have an account? <Link to="/login">Sign in</Link></span>
      </header>
      <section className="signup-layout">
        <div className="signup-intro">
          <span className="auth-overline">GET STARTED</span>
          <h1>{step === 1 ? 'Choose how you’ll use GoRide.' : accountType === 'driver' && step === 3 ? 'Tell us about your vehicle.' : 'Create your account.'}</h1>
          <p>{accountType === 'driver' ? 'Share a few details to get your driver application underway.' : 'A simpler way to get around Colombo.'}</p>
          <div className="signup-progress" aria-label={`Step ${step}`}><span style={{ width: `${progress * 100}%` }} /></div>
          <div className="signup-step-label">STEP {step} OF {accountType === 'driver' ? 3 : 2}</div>
        </div>

        {isFirstUser && <p className="auth-first-user-note">The first account becomes the GoRide administrator.</p>}

        {step === 1 && (
          <section className="signup-card signup-type-step" aria-labelledby="account-type-heading">
            <div><span className="auth-overline">ACCOUNT TYPE</span><h2 id="account-type-heading">I want to...</h2></div>
            <div className="signup-type-options">
              <button type="button" className={`signup-type-card${accountType === 'rider' ? ' is-selected' : ''}`} aria-pressed={accountType === 'rider'} onClick={() => setAccountType('rider')}>
                <span className="signup-type-icon"><FiUser /></span><span><strong>Ride with GoRide</strong><small>Book trips around the city</small></span><span className="signup-type-check"><FiCheck /></span>
              </button>
              <button type="button" className={`signup-type-card${accountType === 'driver' ? ' is-selected' : ''}`} aria-pressed={accountType === 'driver'} onClick={() => setAccountType('driver')}>
                <span className="signup-type-icon"><FiTruck /></span><span><strong>Drive with GoRide</strong><small>Earn by driving your vehicle</small></span><span className="signup-type-check"><FiCheck /></span>
              </button>
            </div>
            <button className="auth-submit" type="button" disabled={!accountType} onClick={() => setStep(2)}>Continue <FiArrowRight /></button>
          </section>
        )}

        {step === 2 && (
          <form className="signup-card signup-form" onSubmit={handleAccountDetails}>
            <div className="signup-form-heading"><button className="signup-back" type="button" aria-label="Choose account type" onClick={() => setStep(1)}><FiArrowLeft /></button><div><span className="auth-overline">{accountType === 'driver' ? 'DRIVER APPLICATION' : 'RIDER ACCOUNT'}</span><h2>Your details</h2></div></div>
            <div className="signup-fields-grid">
              <label className="auth-field signup-field--wide"><span>Full name</span><input autoComplete="name" name="fullName" required value={details.fullName} onChange={updateDetails} placeholder="Your full name" /></label>
              <label className="auth-field"><span>Username</span><input autoComplete="username" name="username" required value={details.username} onChange={updateDetails} placeholder="Choose a username" /></label>
              <label className="auth-field"><span>Email</span><input autoComplete="email" name="email" required type="email" value={details.email} onChange={updateDetails} placeholder="you@example.com" /></label>
              <label className="auth-field signup-field--wide"><span>Phone number</span><input autoComplete="tel" name="phone" required type="tel" inputMode="tel" pattern="\+947[0-9]{8}" value={details.phone} onChange={updateDetails} placeholder="+94771234567" /></label>
              <label className="auth-field"><span>Password</span><input autoComplete="new-password" name="password" required minLength="6" type="password" value={details.password} onChange={updateDetails} placeholder="At least 6 characters" /></label>
              <label className="auth-field"><span>Confirm password</span><input autoComplete="new-password" name="confirmPassword" required minLength="6" type="password" value={details.confirmPassword} onChange={updateDetails} placeholder="Enter it again" /></label>
            </div>
            <button className="auth-submit" type="submit">{accountType === 'driver' ? 'Continue to vehicle' : 'Create rider account'} <FiArrowRight /></button>
          </form>
        )}

        {step === 3 && accountType === 'driver' && (
          <form className="signup-card signup-form" onSubmit={handleDriverDetails}>
            <div className="signup-form-heading"><button className="signup-back" type="button" aria-label="Back to personal details" onClick={() => setStep(2)}><FiArrowLeft /></button><div><span className="auth-overline">DRIVER APPLICATION</span><h2>Vehicle and licence</h2></div></div>
            <div className="signup-fields-grid">
              <label className="auth-field"><span>Vehicle type</span><select name="vehicleType" required value={driverDetails.vehicleType} onChange={updateDriverDetails}><option value="mini">Mini</option><option value="comfort">Comfort</option><option value="xl">XL</option><option value="bike">Bike</option></select></label>
              <label className="auth-field"><span>Vehicle make</span><input name="make" required value={driverDetails.make} onChange={updateDriverDetails} placeholder="Toyota" /></label>
              <label className="auth-field"><span>Model</span><input name="model" required value={driverDetails.model} onChange={updateDriverDetails} placeholder="Aqua" /></label>
              <label className="auth-field"><span>Year</span><input name="year" required type="number" min="1990" max={new Date().getFullYear() + 1} value={driverDetails.year} onChange={updateDriverDetails} placeholder={String(new Date().getFullYear())} /></label>
              <label className="auth-field"><span>Plate number</span><input name="plateNumber" required value={driverDetails.plateNumber} onChange={updateDriverDetails} placeholder="WP CAB-1234" /></label>
              <label className="auth-field"><span>Licence number</span><input name="licenseNumber" required value={driverDetails.licenseNumber} onChange={updateDriverDetails} placeholder="Driving licence number" /></label>
              <label className="auth-field signup-field--wide"><span>Licence expiry</span><input name="licenseExpiry" required type="date" min={new Date().toISOString().slice(0, 10)} value={driverDetails.licenseExpiry} onChange={updateDriverDetails} /></label>
            </div>
            <div className="signup-document-placeholders" aria-label="Document upload placeholders">
              <div><FiFileText /><span><strong>Driving licence</strong><small>Document review after submission</small></span></div>
              <div><FiFileText /><span><strong>Vehicle registration</strong><small>Document review after submission</small></span></div>
            </div>
            <p className="signup-doc-note">Vehicle and licence documents can be verified with the GoRide team after submission.</p>
            <button className="auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Submitting...' : 'Submit driver application'} <FiArrowRight /></button>
          </form>
        )}
        <p className="signup-login-link">Have an account? <Link to="/login">Back to login</Link></p>
      </section>
      <footer className="auth-copyright signup-copyright">© {new Date().getFullYear()} GoRide · Colombo</footer>
    </main>
  )
}
import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import { useAuth } from './context/AuthContext.jsx'
import Loader from './shared/components/common/Loader.jsx'
import Skeleton from './shared/components/common/Skeleton.jsx'
import ErrorBoundary from './shared/components/common/ErrorBoundary.jsx'
import RiderLayout from './apps/rider/RiderLayout.jsx'
import BookingPage from './apps/rider/pages/BookingPage.jsx'
import HomePage from './apps/rider/pages/HomePage.jsx'
import ProfilePage from './apps/rider/pages/ProfilePage.jsx'
import RidesPage from './apps/rider/pages/RidesPage.jsx'
import TrackingPage from './apps/rider/pages/TrackingPage.jsx'
import 'react-toastify/dist/ReactToastify.css'

function PageLoading({ label = 'Loading GoRide' }) {
  return <main className="ui-page-loading"><Loader label={label} /><Skeleton variant="card" count={2} /></main>
}

const DriverLayout = lazy(() => import('./apps/driver/DriverLayout.jsx'))
const DriverHomePage = lazy(() => import('./apps/driver/pages/HomePage.jsx'))
const DriverEarningsPage = lazy(() => import('./apps/driver/pages/EarningsPage.jsx'))
const DriverProfilePage = lazy(() => import('./apps/driver/pages/ProfilePage.jsx'))
const DriverTripPage = lazy(() => import('./apps/driver/pages/TripPage.jsx'))
const AdminLayout = lazy(() => import('./apps/admin/AdminLayout.jsx'))
const LoginPage = lazy(() => import('./apps/auth/LoginPage.jsx'))
const SignupPage = lazy(() => import('./apps/auth/SignupPage.jsx'))
const AdminDashboardPage = lazy(() => import('./apps/admin/pages/DashboardPage.jsx'))
const AdminDriversPage = lazy(() => import('./apps/admin/pages/DriversPage.jsx'))
const AdminRidesPage = lazy(() => import('./apps/admin/pages/RidesPage.jsx'))
const AdminAnalyticsPage = lazy(() => import('./apps/admin/pages/AnalyticsPage.jsx'))
const AdminPricingPage = lazy(() => import('./apps/admin/pages/PricingPage.jsx'))
const AdminAuditLogsPage = lazy(() => import('./apps/admin/pages/AuditLogsPage.jsx'))

function App() {
  const { isLoading } = useAuth()
  if (isLoading) return <PageLoading label="Restoring your session" />

  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/rider" element={<RiderLayout />}>
              <Route index element={<HomePage />} />
              <Route path="home" element={<HomePage />} />
              <Route path="booking" element={<BookingPage />} />
              <Route path="rides" element={<RidesPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="tracking/:rideId" element={<TrackingPage />} />
            </Route>
            <Route path="/driver" element={<DriverLayout />}>
              <Route index element={<DriverHomePage />} />
              <Route path="home" element={<DriverHomePage />} />
              <Route path="earnings" element={<DriverEarningsPage />} />
              <Route path="profile" element={<DriverProfilePage />} />
              <Route path="trip/:rideId" element={<DriverTripPage />} />
            </Route>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="drivers" element={<AdminDriversPage />} />
              <Route path="rides" element={<AdminRidesPage />} />
              <Route path="analytics" element={<AdminAnalyticsPage />} />
              <Route path="pricing" element={<AdminPricingPage />} />
              <Route path="audit-logs" element={<AdminAuditLogsPage />} />
            </Route>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
      <ToastContainer position="top-center" autoClose={2600} theme="light" />
    </BrowserRouter>
  )
}

export default App
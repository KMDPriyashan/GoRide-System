import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import RiderLayout from './apps/rider/RiderLayout.jsx'
import BookingPage from './apps/rider/pages/BookingPage.jsx'
import HomePage from './apps/rider/pages/HomePage.jsx'
import ProfilePage from './apps/rider/pages/ProfilePage.jsx'
import RidesPage from './apps/rider/pages/RidesPage.jsx'
import TrackingPage from './apps/rider/pages/TrackingPage.jsx'
import 'react-toastify/dist/ReactToastify.css'

const DriverLayout = lazy(() => import('./apps/driver/DriverLayout.jsx'))
const DriverHomePage = lazy(() => import('./apps/driver/pages/HomePage.jsx'))
const DriverEarningsPage = lazy(() => import('./apps/driver/pages/EarningsPage.jsx'))
const DriverProfilePage = lazy(() => import('./apps/driver/pages/ProfilePage.jsx'))
const DriverTripPage = lazy(() => import('./apps/driver/pages/TripPage.jsx'))
const AdminLayout = lazy(() => import('./apps/admin/AdminLayout.jsx'))
const AdminDashboardPage = lazy(() => import('./apps/admin/pages/DashboardPage.jsx'))
const AdminDriversPage = lazy(() => import('./apps/admin/pages/DriversPage.jsx'))
const AdminRidesPage = lazy(() => import('./apps/admin/pages/RidesPage.jsx'))
const AdminAnalyticsPage = lazy(() => import('./apps/admin/pages/AnalyticsPage.jsx'))
const AdminPricingPage = lazy(() => import('./apps/admin/pages/PricingPage.jsx'))
const AdminAuditLogsPage = lazy(() => import('./apps/admin/pages/AuditLogsPage.jsx'))

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/rider" element={<RiderLayout />}>
          <Route index element={<HomePage />} />
          <Route path="booking" element={<BookingPage />} />
          <Route path="rides" element={<RidesPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="tracking/:rideId" element={<TrackingPage />} />
        </Route>
        <Route path="/driver" element={
          <Suspense fallback={<main className="driver-content-page">Loading driver workspace...</main>}>
            <DriverLayout />
          </Suspense>
        }>
          <Route index element={<Suspense fallback={<main className="driver-content-page">Loading dashboard...</main>}><DriverHomePage /></Suspense>} />
          <Route path="earnings" element={<Suspense fallback={<main className="driver-content-page">Loading earnings...</main>}><DriverEarningsPage /></Suspense>} />
          <Route path="profile" element={<Suspense fallback={<main className="driver-content-page">Loading profile...</main>}><DriverProfilePage /></Suspense>} />
          <Route path="trip/:rideId" element={<Suspense fallback={<main className="driver-content-page">Loading trip...</main>}><DriverTripPage /></Suspense>} />
        </Route>
        <Route path="/admin" element={
          <Suspense fallback={<main className="admin-loading">Loading operations workspace...</main>}>
            <AdminLayout />
          </Suspense>
        }>
          <Route index element={<AdminDashboardPage />} />
          <Route path="drivers" element={<AdminDriversPage />} />
          <Route path="rides" element={<AdminRidesPage />} />
          <Route path="analytics" element={<AdminAnalyticsPage />} />
          <Route path="pricing" element={<AdminPricingPage />} />
          <Route path="audit-logs" element={<AdminAuditLogsPage />} />
        </Route>
        <Route path="/" element={<Navigate to="/rider" replace />} />
        <Route path="*" element={<Navigate to="/rider" replace />} />
      </Routes>
      <ToastContainer position="top-center" autoClose={2600} theme="light" />
    </BrowserRouter>
  )
}

export default App
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import RiderLayout from './apps/rider/RiderLayout.jsx'
import BookingPage from './apps/rider/pages/BookingPage.jsx'
import HomePage from './apps/rider/pages/HomePage.jsx'
import ProfilePage from './apps/rider/pages/ProfilePage.jsx'
import RidesPage from './apps/rider/pages/RidesPage.jsx'
import TrackingPage from './apps/rider/pages/TrackingPage.jsx'
import 'react-toastify/dist/ReactToastify.css'

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
        <Route path="/" element={<Navigate to="/rider" replace />} />
        <Route path="*" element={<Navigate to="/rider" replace />} />
      </Routes>
      <ToastContainer position="top-center" autoClose={2600} theme="light" />
    </BrowserRouter>
  )
}

export default App
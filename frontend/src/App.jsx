import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import Account from './pages/Account.jsx'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import NotFound from './pages/NotFound.jsx'
import Register from './pages/Register.jsx'
import Trips from './pages/Trips.jsx'
import PageLayout from './components/PageLayout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'

// These pages pull in the map library, so load them only when a trip is opened.
const TripDetails = lazy(() => import('./pages/TripDetails.jsx'))
const PublicTrip = lazy(() => import('./pages/PublicTrip.jsx'))

function PageLoading() {
  return (
    <PageLayout>
      <p className="status-panel" role="status">Loading page…</p>
    </PageLayout>
  )
}

function App() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/shared/trips/:tripId" element={<PublicTrip />} />
        <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
        <Route path="/trips" element={<ProtectedRoute><Trips /></ProtectedRoute>} />
        <Route path="/trips/:tripId" element={<ProtectedRoute><TripDetails /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}

export default App

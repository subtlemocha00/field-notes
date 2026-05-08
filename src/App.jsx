import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './utils/AuthContext.jsx'
import ProtectedRoute from './routes/ProtectedRoute.jsx'
import AppLayout from './layouts/AppLayout.jsx'
import LoginPage from './pages/LoginPage.jsx'
import JobsPage from './pages/JobsPage.jsx'
import CreateJobPage from './pages/CreateJobPage.jsx'
import JobDetailPage from './pages/JobDetailPage.jsx'
import EditJobPage from './pages/EditJobPage.jsx'
import CreateDailyEntryPage from './pages/CreateDailyEntryPage.jsx'
import DailyEntryPage from './pages/DailyEntryPage.jsx'
import EditDailyEntryPage from './pages/EditDailyEntryPage.jsx'

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<JobsPage />} />
            <Route path="jobs/new" element={<CreateJobPage />} />
            <Route path="jobs/:jobId" element={<JobDetailPage />} />
            <Route path="jobs/:jobId/edit" element={<EditJobPage />} />
            <Route path="jobs/:jobId/daily/new" element={<CreateDailyEntryPage />} />
            <Route path="jobs/:jobId/daily/:dailyEntryId" element={<DailyEntryPage />} />
            <Route path="jobs/:jobId/daily/:dailyEntryId/edit" element={<EditDailyEntryPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}

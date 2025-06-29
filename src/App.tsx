import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import { Layout } from './components/Layout'
import { Auth } from './components/Auth'
import { IdeaFeed } from './components/IdeaFeed'
import { IdeaUpload } from './components/IdeaUpload'
import { Profile } from './components/Profile'
import { CreatorDashboard } from './components/CreatorDashboard'
import { InvestorDashboard } from './components/InvestorDashboard'
import { useAuth } from './contexts/AuthContext'

// Protected route component for creators only
function CreatorOnlyRoute({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth()
  
  if (profile?.role !== 'creator') {
    return <IdeaFeed />
  }
  
  return <>{children}</>
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="*" element={
              <Layout>
                <Routes>
                  <Route path="/" element={<IdeaFeed />} />
                  <Route path="/upload" element={
                    <CreatorOnlyRoute>
                      <IdeaUpload />
                    </CreatorOnlyRoute>
                  } />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/dashboard/creator" element={<CreatorDashboard />} />
                  <Route path="/dashboard/investor" element={<InvestorDashboard />} />
                </Routes>
              </Layout>
            } />
          </Routes>
        </Router>
      </AuthProvider>
    </ToastProvider>
  )
}

export default App
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
                  <Route path="/upload" element={<IdeaUpload />} />
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
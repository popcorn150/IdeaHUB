import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { Layout } from './components/Layout'
import { Auth } from './components/Auth'
import { IdeaFeed } from './components/IdeaFeed'
import { IdeaUpload } from './components/IdeaUpload'
import { Profile } from './components/Profile'

function App() {
  return (
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
              </Routes>
            </Layout>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
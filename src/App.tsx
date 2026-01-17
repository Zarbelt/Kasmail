// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'   // Inbox
import Compose from './pages/Compose'
import Email from './pages/Email'
import Settings from './pages/Settings'
import Sent from './pages/Sent'
import Trash from './pages/Trash'
import Junk from './pages/Junk'
import ProtectedRoute from './components/ProtectedRoute'

import AppLayout from './layouts/AppLayout'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
  {/* Public */}
  <Route path="/" element={<Login />} />

  {/* Protected - wallet + min KAS required */}
  <Route element={<ProtectedRoute />}>
    <Route element={<AppLayout />}>
      <Route path="/inbox" element={<Dashboard />} />
      <Route path="/sent" element={<Sent />} />
      <Route path="/trash" element={<Trash />} />
      <Route path="/junk" element={<Junk />} />
      <Route path="/compose" element={<Compose />} />
      <Route path="/compose/reply/:id" element={<Compose />} />
      <Route path="/email/:id" element={<Email />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/dashboard" element={<Navigate to="/inbox" replace />} />
      <Route path="*" element={<Navigate to="/inbox" replace />} />
    </Route>
  </Route>
</Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
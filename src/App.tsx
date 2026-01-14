import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Compose from './pages/Compose'
import Email from './pages/Email'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/compose" element={<Compose />} />
          <Route path="/email/:id" element={<Email />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App;
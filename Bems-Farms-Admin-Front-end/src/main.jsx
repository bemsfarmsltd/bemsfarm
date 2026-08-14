import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider } from './context/ThemeContext'
// Purchase/Suppliers pages are built with Bootstrap markup (card, btn,
// form-control, badge…) — load before index.css so Tailwind's reset and
// this app's own styles still win where they overlap with Bootstrap's.
import 'bootstrap/dist/css/bootstrap.min.css'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <App />
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)

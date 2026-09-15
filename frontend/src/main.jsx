import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Rota from './routes.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Rota />
  </StrictMode>,
)

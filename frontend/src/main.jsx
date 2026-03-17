import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { GoogleOAuthProvider } from '@react-oauth/google';

// 2. เอา Client ID ของคุณมาใส่ตรงนี้
const GOOGLE_CLIENT_ID = "282211595214-77ja03g4t3vrpuj2pfuagi4005i84dgs.apps.googleusercontent.com";

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* 3. ครอบ App ด้วย Provider */}
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>,
)
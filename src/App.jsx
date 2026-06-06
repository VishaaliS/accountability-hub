import { useEffect, useState } from 'react'
import { supabase } from './config/supabaseClient'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import './App.css'

function App() {
  const [session, setSession] = useState(null)
  const [loadingSession, setLoadingSession] = useState(true)

  useEffect(() => {
    async function getSession() {
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        console.error('Session error:', error.message)
      }

      setSession(data.session)
      setLoadingSession(false)
    }

    getSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    setSession(null)
  }

  if (loadingSession) {
    return (
      <div className="app-loading-screen">
        <h1>Loading Accountability Hub...</h1>
      </div>
    )
  }

  return (
    <div className="app">
      {!session ? (
        <Login />
      ) : (
        <Dashboard session={session} onLogout={handleLogout} />
      )}
    </div>
  )
}

export default App
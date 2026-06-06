import { useState } from 'react'
import { supabase } from '../config/supabaseClient'
import './Login.css'

export default function Login() {
  const [mode, setMode] = useState('login') // 'login' or 'signup'
  const [step, setStep] = useState(1) // 1: email/password, 2: username (for signup only)
  
  // Step 1 inputs
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  // Step 2 inputs (signup only)
  const [username, setUsername] = useState('')
  const [usernameError, setUsernameError] = useState('')
  
  // General
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const isSignup = mode === 'signup'

  // STEP 1: Email/Password validation
  async function handleStep1(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!email.trim()) {
      setError('Email is required')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (isSignup) {
      // For signup, move to step 2 (username)
      setStep(2)
    } else {
      // For login, authenticate immediately
      setLoading(true)
      try {
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (loginError) {
          setError(loginError.message)
        }
        // App.jsx handles redirect via onAuthStateChange
      } catch (err) {
        setError('Login failed. Try again.')
      } finally {
        setLoading(false)
      }
    }
  }

  // STEP 2: Username validation and account creation
  async function handleStep2(e) {
    e.preventDefault()
    setUsernameError('')
    setError('')
    setSuccess('')
    setLoading(true)

    // Validate username
    if (!username.trim()) {
      setUsernameError('Username is required')
      setLoading(false)
      return
    }

    if (username.length < 3) {
      setUsernameError('Username must be at least 3 characters')
      setLoading(false)
      return
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setUsernameError('Username can only contain letters, numbers, and underscores')
      setLoading(false)
      return
    }

    try {
      // 1. Create auth user with email and password
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
      })

      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }

      if (!authData.user) {
        setError('Signup failed. Please try again.')
        setLoading(false)
        return
      }

      // 2. Check if username already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('username', username.toLowerCase().trim())
        .maybeSingle()

      if (existingUser) {
        setUsernameError('This username is already taken')
        // Delete the auth user we just created
        await supabase.auth.admin.deleteUser(authData.user.id)
        setLoading(false)
        return
      }

      // 3. Create user profile with CHOSEN username
      const { error: userError } = await supabase.from('users').insert([
        {
          id: authData.user.id,
          email: email.trim(),
          username: username.toLowerCase().trim(),
        },
      ])

      if (userError) {
        setError('Failed to save profile. Please try again.')
        setLoading(false)
        return
      }

      // Success!
      setSuccess('Account created! Check your email to verify, then log in.')
      setMode('login')
      setStep(1)
      setEmail('')
      setPassword('')
      setUsername('')
    } catch (err) {
      console.error('Signup error:', err)
      setError('Signup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setMode('login')
    setStep(1)
    setEmail('')
    setPassword('')
    setUsername('')
    setError('')
    setSuccess('')
    setUsernameError('')
  }

  // RENDER: Login form (Step 1) or Username form (Step 2)
  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-icon">⚒️</div>
          <h1>Accountability Hub</h1>
          <p>Mine your tasks. Break the boss together.</p>
        </div>

        {step === 1 ? (
          <>
            {/* STEP 1: Email & Password */}
            <div className="login-tabs">
              <button
                className={`tab ${mode === 'login' ? 'active' : ''}`}
                onClick={() => {
                  setMode('login')
                  setError('')
                  setSuccess('')
                }}
              >
                Login
              </button>
              <button
                className={`tab ${mode === 'signup' ? 'active' : ''}`}
                onClick={() => {
                  setMode('signup')
                  setError('')
                  setSuccess('')
                }}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleStep1} className="login-form">
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  required
                />
              </div>

              {error && <div className="message error">{error}</div>}
              {success && <div className="message success">{success}</div>}

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Please wait...' : isSignup ? 'Continue to Username' : 'Enter Mine'}
              </button>
            </form>
          </>
        ) : (
          <>
            {/* STEP 2: Username (Signup Only) */}
            <div className="signup-step-2">
              <h3>Choose Your Username</h3>
              <p>This is how your partner will find you</p>

              <form onSubmit={handleStep2} className="login-form">
                <div className="form-group">
                  <label>Username</label>
                  <div className="username-input">
                    <span className="prefix">@</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => {
                        const clean = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
                        setUsername(clean)
                        setUsernameError('')
                      }}
                      placeholder="yourname"
                      maxLength="20"
                      required
                      autoFocus
                    />
                  </div>
                  <small className="hint">
                    3-20 characters. Letters, numbers, underscores only.
                  </small>
                </div>

                {usernameError && <div className="message error">{usernameError}</div>}
                {error && <div className="message error">{error}</div>}
                {success && <div className="message success">{success}</div>}

                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>

                <button
                  type="button"
                  className="back-btn"
                  onClick={() => {
                    setStep(1)
                    setUsernameError('')
                    setError('')
                  }}
                >
                  ← Back
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
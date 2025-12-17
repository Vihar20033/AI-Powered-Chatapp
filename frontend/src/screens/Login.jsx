import React, { useState, useContext} from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from '../config/axios'
import { UserContext } from '../context/UserContext'

const Login = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')

  const { setUser } = useContext(UserContext)

  const handleSubmit = (ev) => {
    ev.preventDefault()
    setApiError('') // ✅ Clear previous error
    setLoading(true)

    axios.post('/login', { email, password })
      .then(res => {
        console.log(res.data)

        localStorage.setItem('token', res.data.token)
        setUser(res.data.user)

        setLoading(false)
        navigate('/')  // ✅ Only on success
      })
      .catch(err => {
        setLoading(false)
        setApiError(err.response?.data?.message || 'Invalid email or password')
      })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-slate-900 to-black p-6">
      <div className="w-full max-w-md bg-gray-800/70 backdrop-blur-md rounded-xl shadow-xl p-8">

        <h1 className="text-2xl font-semibold text-white mb-1">Welcome Back</h1>
        <p className="text-sm text-gray-300 mb-6">Sign in to your account</p>

        {apiError && <p className="text-red-400 text-center mb-4">{apiError}</p>} {/* ✅ ERROR DISPLAY */}

        <form onSubmit={handleSubmit} noValidate>
          <label className="block mb-2 text-sm font-medium text-gray-200">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full mb-4 px-4 py-2 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="you@example.com"
          />

          <label className="block mb-2 text-sm font-medium text-gray-200">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mb-4 px-4 py-2 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Enter your password"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2 mt-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-medium"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="text-sm text-gray-300 mt-6 text-center">
          Don’t have an account?{' '}
          <Link to="/register" className="text-indigo-400 hover:underline font-medium">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Login

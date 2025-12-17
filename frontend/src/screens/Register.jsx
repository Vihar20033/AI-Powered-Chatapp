import React, { useState,useContext } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from '../config/axios'
import { UserContext } from '../context/UserContext'


const Register = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')  // ✅ API ERROR STATE

  const { setUser } = useContext(UserContext)

  const validate = () => {
    const e = {}
    if (!email) e.email = 'Email is required'
    else if (!/^\S+@\S+\.\S+$/.test(email)) e.email = 'Enter a valid email'
    if (!password) e.password = 'Password is required'
    else if (password.length < 6) e.password = 'Password must be at least 6 characters'
    if (!confirmPassword) e.confirmPassword = 'Please confirm your password'
    else if (password !== confirmPassword) e.confirmPassword = 'Passwords do not match'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (ev) => {
    ev.preventDefault()
    setApiError('') // Clear old errors ✅

    if (!validate()) return
    setLoading(true)

    axios.post('/register', { email, password })
      .then(res => {
        console.log(res.data)

        localStorage.setItem('token', res.data.token)
        setUser(res.data.user)

        setLoading(false)
        navigate('/')  // ✅ Only on success
      })
      .catch(err => {
        setLoading(false)
        setApiError(err.response?.data?.message || 'Something went wrong')  // ✅ Show backend error
      })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-slate-900 to-black p-6">
      <div className="w-full max-w-md bg-gray-800/70 backdrop-blur-md rounded-xl shadow-xl p-8">
        
        <h1 className="text-2xl font-semibold text-white mb-1">Create account</h1>
        <p className="text-sm text-gray-300 mb-6">Start your journey — create a new account</p>

        {apiError && <p className="text-red-400 text-center mb-4">{apiError}</p>} {/* ✅ ERROR DISPLAY */}

        <form onSubmit={handleSubmit} noValidate>
          {/* Email */}
          <label className="block mb-2 text-sm font-medium text-gray-200">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`w-full mb-2 px-4 py-2 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              errors.email ? 'border border-red-500' : 'border border-transparent'
            }`}
            placeholder="you@example.com"
          />
          {errors.email && <p className="text-xs text-red-400 mb-2">{errors.email}</p>}

          {/* Password */}
          <label className="block mt-3 mb-2 text-sm font-medium text-gray-200">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full mb-2 px-4 py-2 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.password ? 'border border-red-500' : 'border border-transparent'
              }`}
              placeholder="Create a password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-2 top-2 text-sm text-gray-300 hover:text-white"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          {errors.password && <p className="text-xs text-red-400 mb-2">{errors.password}</p>}

          {/* Confirm Password */}
          <label className="block mt-3 mb-2 text-sm font-medium text-gray-200">Confirm Password</label>
          <input
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={`w-full mb-2 px-4 py-2 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              errors.confirmPassword ? 'border border-red-500' : 'border border-transparent'
            }`}
            placeholder="Repeat your password"
          />
          {errors.confirmPassword && <p className="text-xs text-red-400 mb-2">{errors.confirmPassword}</p>}

          {/* Checkbox + Forgot */}
          <div className="flex items-center justify-between mt-4 mb-6">
            <label className="inline-flex items-center text-sm text-gray-300">
              <input type="checkbox" className="form-checkbox h-4 w-4 text-indigo-500 bg-gray-700 rounded" />
              <span className="ml-2">Subscribe to updates</span>
            </label>
            <Link to="/forgot-password" className="text-sm text-indigo-400 hover:underline">Forgot?</Link>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-medium"
          >
            {loading && (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
            )}
            <span>{loading ? 'Creating...' : 'Create account'}</span>
          </button>
        </form>

        <p className="text-sm text-gray-300 mt-6 text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-400 hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Register

import { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import "./Signup.css"

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001"

function Signup() {
  const location = useLocation()
  const navigate = useNavigate()
  const mediaTitle = location.state?.mediaTitle
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage("")
    setLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name, email, password })
      })
      const data = await response.json()

      if (!response.ok) {
        setMessage(data.message || "Signup failed")
        return
      }

      navigate("/login", {
        replace: true,
        state: { email, signupSuccess: true },
      })
    } catch (error) {
      console.error(error)
      setMessage("Could not connect to the server")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="signup-page">
      <section className="signup-panel">
        <p className="signup-eyebrow">WELCOME TO CROSSMEDIA</p>
        <h1>Create your account</h1>
        <p className="signup-description">
          {mediaTitle
            ? `Join to save ${mediaTitle} and build a collection of everything you love.`
            : "Save your favorites and discover more of what you love."}
        </p>
        <form onSubmit={handleSubmit}>
          <div className="signup-field">
            <label htmlFor="signup-name">Name</label>
            <input
              id="signup-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={loading}
              required
            />
          </div>
          <div className="signup-field">
            <label htmlFor="signup-email">Email</label>
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={loading}
              required
            />
          </div>
          <div className="signup-field">
            <label htmlFor="signup-password">Password</label>
            <input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={loading}
              required
            />
          </div>
          <button disabled={loading} type="submit">
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>
        {message && <p className="signup-message" role="status">{message}</p>}
        <p className="signup-login-prompt">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
        <Link className="signup-back-link" to="/discover">← Back to Discover</Link>
      </section>
    </main>
  )
}

export default Signup
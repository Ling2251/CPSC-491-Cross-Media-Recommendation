import { useState } from "react"
import { useLocation } from "react-router-dom"
import { persistAuthToken } from "../services/authSession"

function Login({ onLogin }) {
  const location = useLocation()
  const [email, setEmail] = useState(location.state?.email || "")
  const [password, setPassword] = useState("")
  const [stayLoggedIn, setStayLoggedIn] = useState(false)
  const [message, setMessage] = useState(
    location.state?.signupSuccess
      ? "Your account is ready. Log in to continue."
      : ""
  )

  async function handleSubmit(event) {
    event.preventDefault()

    try {
      const response = await fetch(
        "http://localhost:3001/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email,
            password
          })
        }
      )

      const data = await response.json()

      if (!response.ok) {
        setMessage(data.message || "Login failed")
        return
      }

      if (!data.token || !data.user) {
        setMessage("Login response is missing user information")
        return
      }

      if (typeof onLogin !== "function") {
        setMessage("Login configuration error: onLogin is missing")
        return
      }

      persistAuthToken(data.token, stayLoggedIn)

      setMessage("Login successful!")

      onLogin(data.user)
    } catch (error) {
      console.error(error)
      setMessage("Could not connect to the server")
    }
  }

  return (
    <div>
      <h1>Login</h1>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="login-email">Email</label>
          <br />
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <br />

        <div>
          <label htmlFor="login-password">Password</label>
          <br />
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        <label className="login-stay-logged-in" htmlFor="stay-logged-in">
          <input
            id="stay-logged-in"
            type="checkbox"
            checked={stayLoggedIn}
            onChange={(event) => setStayLoggedIn(event.target.checked)}
          />
          Stay logged in
        </label>

        <button type="submit">
          Log In
        </button>
      </form>

      <p>{message}</p>
    </div>
  )
}

export default Login
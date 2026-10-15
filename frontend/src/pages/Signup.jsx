import { useState } from "react"

function Signup() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState("")

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage("Creating account...")

    try {
      const response = await fetch("http://localhost:3001/api/auth/signup", {
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

      setMessage("Account created successfully!")
      setName("")
      setEmail("")
      setPassword("")
    } catch (error) {
      console.error(error)
      setMessage("Could not connect to the server")
    }
  }

  return (
    <div>
      <h1>Create Account</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="signup-name">Name</label>
          <br />
          <input
            id="signup-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </div>

        <br />

        <div>
          <label htmlFor="signup-email">Email</label>
          <br />
          <input
            id="signup-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <br />

        <div>
          <label htmlFor="signup-password">Password</label>
          <br />
          <input
            id="signup-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>

        <br />

        <button type="submit">Sign Up</button>
      </form>
      <p>{message}</p>
    </div>
  )
}

export default Signup
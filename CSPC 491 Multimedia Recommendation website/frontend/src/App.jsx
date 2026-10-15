import { useState } from "react"

import Login from "./pages/Login"
import Onboarding from "./pages/Onboarding"
import Dashboard from "./pages/Dashboard"

function App() {
  const [user, setUser] = useState(null)

  function handleLogin(loggedInUser) {
    setUser(loggedInUser)
  }

  function handleLogout() {
    localStorage.removeItem("token")
    setUser(null)
  }

  if (!user) {
    return <Login onLogin={handleLogin} />
  }

  if (
    user.account_state === "ONBOARDING_REQUIRED" ||
    user.account_state === "CREATED"
  ) {
    return <Onboarding onLogout={handleLogout} />
  }

  if (user.account_state === "ACTIVE") {
    return <Dashboard onLogout={handleLogout} />
  }

  return <p>Unknown account state.</p>
}

export default App
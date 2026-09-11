import { useEffect, useState } from "react"

function App() {
  const [message, setMessage] = useState("Loading...")

  useEffect(() => {
    fetch("http://localhost:3001/api/test")
      .then((response) => response.json())
      .then((data) => {
        setMessage(data.message)
      })
      .catch((error) => {
        console.error("Error:", error)
        setMessage("Could not connect to backend")
      })
  }, [])

  return (
    <div>
      <h1>Media Recommendation App</h1>
      <p>{message}</p>
    </div>
  )
}

export default App

import { useEffect, useState } from "react"

function Onboarding({ onLogout }) {
  const [genres, setGenres] = useState([])
  const [selectedGenres, setSelectedGenres] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function fetchGenres() {
      try {
        const response = await fetch(
          "http://localhost:3001/api/interests"
        )

        if (!response.ok) {
          throw new Error("Failed to retrieve genres")
        }

        const data = await response.json()
        setGenres(data.interests)
      } catch (err) {
        console.error(err)
        setError("Could not load genres from the server")
      } finally {
        setLoading(false)
      }
    }

    fetchGenres()
  }, [])

  function handleGenreChange(genreId) {
    setSelectedGenres((previous) => {
      if (previous.includes(genreId)) {
        return previous.filter((id) => id !== genreId)
      }

      return [...previous, genreId]
    })
  }

  return (
    <div>
      <h1>Welcome to Onboarding!</h1>

      <p>Select your favorite genres below:</p>

      {loading && <p>Loading genres...</p>}

      {error && <p>{error}</p>}

      {!loading && !error && (
        <div>
          {genres.map((genre) => (
            <div key={genre.id}>
              <label>
                <input
                  type="checkbox"
                  checked={selectedGenres.includes(genre.id)}
                  onChange={() => handleGenreChange(genre.id)}
                />
                {genre.name}
              </label>
            </div>
          ))}
        </div>
      )}

      <p>
        Selected genres: {selectedGenres.length}
      </p>

      <button
        type="button"
        onClick={onLogout}
      >
        Log Out
      </button>
    </div>
  )
}

export default Onboarding

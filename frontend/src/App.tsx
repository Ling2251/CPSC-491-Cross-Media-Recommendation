import { MediaCard } from './components/MediaCard.tsx'

const sampleMedia = [
  {
    title: 'Everything Everywhere All at Once',
    mediaType: 'movie',
    description: 'A multiverse adventure about a woman who must connect with parallel lives.',
    tags: ['Sci-Fi', 'Comedy', 'Family'],
  },
  {
    title: 'Project Hail Mary',
    mediaType: 'book',
    description: 'A lone astronaut must save humanity from an extinction-level threat.',
    tags: ['Sci-Fi', 'Survival'],
  },
]

function App() {
  return (
    <main>
      <h1>Cross-Media Recommendations</h1>
      <p>Sprint 1 preview: rendering media items with their associated tags.</p>
      {sampleMedia.map((media) => (
        <MediaCard key={media.title} {...media} />
      ))}
    </main>
  )
}

export default App

// src/pages/MediaTagging/MediaTagging.jsx
import MediaCard from "../../components/MediaCard";

const sampleMedia = [
  {
    title: "Everything Everywhere All at Once",
    mediaType: "movie",
    description: "A multiverse adventure about a woman who must connect with parallel lives.",
    tags: ["Sci-Fi", "Comedy", "Coming of Age"],
  },
  {
    title: "Project Hail Mary",
    mediaType: "book",
    description: "A lone astronaut must save humanity from an extinction-level threat.",
    tags: ["Sci-Fi", "Intense", "Survival"],
  },
  {
    title: "Blonde",
    mediaType: "music",
    description: "A genre-blending R&B album exploring memory and identity.",
    tags: ["Nostalgic", "2010s", "Electronic"],
  },
];

const MediaTagging = () => {
  return (
    <div style={{ padding: 32, maxWidth: 720, margin: "0 auto" }}>
      <h1>Media Tagging</h1>
      <p>Sprint 1 preview: media items rendered with their tags from the shared taxonomy.</p>
      {sampleMedia.map((media) => (
        <MediaCard key={media.title} {...media} />
      ))}
    </div>
  );
};

export default MediaTagging;

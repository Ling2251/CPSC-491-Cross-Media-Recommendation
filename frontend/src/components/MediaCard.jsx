// src/components/MediaCard.jsx
import TagList from "./TagList";
import "./MediaCard.css";

const MediaCard = ({ title, mediaType, description, coverImageUrl, tags = [] }) => {
  return (
    <article className="media-card">
      <img
        className="media-card-cover"
        src={coverImageUrl}
        alt={coverImageUrl ? `Cover art for ${title}` : ""}
      />
      <div className="media-card-body">
        <span className="media-card-type">{mediaType}</span>
        <h3 className="media-card-title">{title}</h3>
        {description && <p className="media-card-description">{description}</p>}
        <TagList tags={tags} />
      </div>
    </article>
  );
};

export default MediaCard;

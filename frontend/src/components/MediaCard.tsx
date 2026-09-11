import { TagList } from './TagList.tsx'

export interface MediaCardProps {
  title: string
  mediaType: string
  description?: string
  coverImageUrl?: string
  tags?: string[]
}

export function MediaCard({
  title,
  mediaType,
  description,
  coverImageUrl,
  tags = [],
}: MediaCardProps) {
  return (
    <article className="media-card">
      <img
        className="media-card__cover"
        src={coverImageUrl}
        alt={coverImageUrl ? `Cover art for ${title}` : ''}
      />
      <div className="media-card__body">
        <p className="media-card__type">{mediaType}</p>
        <h3 className="media-card__title">{title}</h3>
        {description && <p className="media-card__description">{description}</p>}
        <TagList tags={tags} />
      </div>
    </article>
  )
}

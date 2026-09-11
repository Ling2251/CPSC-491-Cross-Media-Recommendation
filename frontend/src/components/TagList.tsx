import { TagBadge } from './TagBadge.tsx'

export interface TagListProps {
  tags: string[]
}

export function TagList({ tags }: TagListProps) {
  if (tags.length === 0) return null

  return (
    <ul className="tag-list">
      {tags.map((tag) => (
        <li key={tag}>
          <TagBadge label={tag} />
        </li>
      ))}
    </ul>
  )
}

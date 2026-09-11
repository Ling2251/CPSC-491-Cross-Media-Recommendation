export interface TagBadgeProps {
  label: string
}

export function TagBadge({ label }: TagBadgeProps) {
  return <span className="tag-badge">{label}</span>
}

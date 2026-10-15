// src/components/TagList.jsx
import TagBadge from "./TagBadge";

const TagList = ({ tags = [] }) => {
  if (tags.length === 0) return null;

  return (
    <ul className="tag-list">
      {tags.map((tag) => (
        <li key={tag}>
          <TagBadge label={tag} />
        </li>
      ))}
    </ul>
  );
};

export default TagList;

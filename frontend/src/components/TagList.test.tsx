import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TagList } from './TagList.tsx'

describe('TagList', () => {
  it('renders a badge for each tag', () => {
    render(<TagList tags={['Drama', 'Mystery']} />)
    expect(screen.getByText('Drama')).toBeInTheDocument()
    expect(screen.getByText('Mystery')).toBeInTheDocument()
  })

  it('renders nothing when there are no tags', () => {
    const { container } = render(<TagList tags={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})

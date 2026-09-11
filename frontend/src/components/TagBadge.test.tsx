import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TagBadge } from './TagBadge.tsx'

describe('TagBadge', () => {
  it('renders the given label', () => {
    render(<TagBadge label="Sci-Fi" />)
    expect(screen.getByText('Sci-Fi')).toBeInTheDocument()
  })
})

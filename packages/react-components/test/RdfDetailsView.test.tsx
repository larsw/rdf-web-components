import './setup'
import { describe, expect, test } from 'bun:test'
import { act } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'
import { createRoot } from 'react-dom/client'
import { RdfDetailsView } from '../src'

const sampleData = `
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix ex: <http://example.org/> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .

ex:alice a foaf:Person ;
    foaf:name "Alice"@en ;
    foaf:mbox <mailto:alice@example.org> .

foaf:name rdfs:label "name"@en ;
  skos:altLabel "display name"@en .
`

const navigationData = `
@prefix ex: <http://example.org/> .

ex:alice ex:knows ex:bob .
ex:bob ex:name "Bob"@en .
`

const orderedData = `
@prefix ex: <http://example.org/> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .

ex:alice foaf:name "Alice" ;
  ex:score 42 ;
  ex:role "Owner" .
`

const trigData = `
@prefix ex: <http://example.org/> .

ex:g1 {
  ex:alice ex:name "Alice"@en .
}

{
  ex:bob ex:name "Bob"@en .
}
`

const imageData = `
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix ex: <http://example.org/> .

ex:alice foaf:depiction <https://picsum.photos/200/200?random=1> ;
  foaf:depiction <https://picsum.photos/200/200?random=2> .
`

// 7 subjects: exceeds the default collapse threshold of 6.
const largeData = `@prefix ex: <http://example.org/> .
ex:alpha ex:p "1" .
ex:bravo ex:p "2" .
ex:charlie ex:p "3" .
ex:delta ex:p "4" .
ex:echo ex:p "5" .
ex:foxtrot ex:p "6" .
ex:golf ex:p "7" .
`

describe('RdfDetailsView', () => {
  test('renders plain jsx', () => {
    render(<div>ok</div>)
    expect(screen.getByText('ok')).toBeInTheDocument()
  })

  test('manual ReactDOM render works', () => {
    const div = document.createElement('div')
    const root = createRoot(div)
    act(() => {
      root.render(<span>hello</span>)
    })
    expect(div.textContent).toContain('hello')
    act(() => {
      root.unmount()
    })
  })

  test('renders namespace cards when enabled', () => {
    render(<RdfDetailsView data={sampleData} showNamespaces />)
    expect(screen.getByText('foaf')).toBeInTheDocument()
    expect(screen.getByText('exa')).toBeInTheDocument()
  })

  test('renders table rows with predicate labels', () => {
    render(<RdfDetailsView data={sampleData} />)
    expect(screen.getAllByText('name').length).toBeGreaterThan(0)
    expect(screen.getByText(/Alice/)).toBeInTheDocument()
  })

  test('uses vocabulary labels when provided', async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = async () =>
      new Response(
        `
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
foaf:mbox rdfs:label "email"@en .
        `.trim(),
      )

    render(
      <RdfDetailsView
        data={sampleData}
        vocabularies={['http://example.org/foaf.ttl']}
      />,
    )
    expect(await screen.findByText('email')).toBeInTheDocument()

    globalThis.fetch = originalFetch
  })

  test('navigates to a referenced subject', () => {
    render(<RdfDetailsView data={navigationData} enableNavigation />)
    const navigateButton = screen.getByRole('button', {
      name: /Navigate to exa:bob/i,
    })
    fireEvent.click(navigateButton)
    expect(screen.getByText(/Viewing:/)).toBeInTheDocument()
    expect(screen.getAllByText(/exa:bob/i).length).toBeGreaterThan(0)
  })

  test('renders an image carousel for multiple image objects', () => {
    render(<RdfDetailsView data={imageData} />)
    expect(
      screen.getByRole('button', { name: 'Previous image' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Next image' }),
    ).toBeInTheDocument()
    expect(screen.getByText('1 / 2')).toBeInTheDocument()
  })

  test('orders predicates based on predicateOrder', () => {
    render(
      <RdfDetailsView
        data={orderedData}
        predicateOrder={['http://example.org/role', 'http://example.org/score']}
      />,
    )
    const headers = screen
      .getAllByRole('columnheader')
      .map((node) => node.textContent)
    expect(headers[0]).toBe('exa:role')
    expect(headers[1]).toBe('exa:score')
  })

  test('shows graph labels for quad-based formats', async () => {
    render(<RdfDetailsView data={trigData} format="trig" />)

    expect(await screen.findByLabelText(/Graph:\s*exa:g1/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Graph:\s*Default graph/i)).toBeInTheDocument()
  })

  test('shows error state for invalid data', () => {
    render(<RdfDetailsView data="<bad" />)
    expect(screen.getByText(/Failed to parse RDF data/i)).toBeInTheDocument()
  })

  test('shows empty state when there is no data', () => {
    render(<RdfDetailsView data="" />)
    expect(screen.getByText(/No RDF data to display/i)).toBeInTheDocument()
  })

  test('uses custom literal and predicate renderers', () => {
    const data = `@prefix ex: <http://example.org/> .
ex:alice ex:score "99"^^<http://example.org/custom> .`

    const literalRenderers = {
      'http://example.org/custom': ({ literal }: any) => (
        <span data-testid="custom-literal">custom-{literal.value}</span>
      ),
    }

    const predicateRenderers = {
      'http://example.org/score': ({ defaultRender }: any) => (
        <div data-testid="custom-predicate">{defaultRender()}</div>
      ),
    }

    render(
      <RdfDetailsView
        data={data}
        literalRenderers={literalRenderers}
        predicateRenderers={predicateRenderers}
      />,
    )

    expect(screen.getByTestId('custom-literal').textContent).toBe('custom-99')
    expect(screen.getByTestId('custom-predicate')).toBeInTheDocument()
  })

  test('shows content negotiation hints when enabled', async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = async (_input: RequestInfo, init?: RequestInit) => {
      if (init?.method === 'HEAD') {
        return new Response(null, {
          status: 200,
          headers: { 'content-type': 'application/ld+json' },
        })
      }
      return new Response('', { status: 404 })
    }

    const data = `@prefix ex: <http://example.org/> .
ex:alice ex:pic <http://example.org/pic.jpg> .`

    render(
      <RdfDetailsView
        data={data}
        enableContentNegotiation
        showNamespaces
        showImagesInline={false}
      />,
    )

    expect(
      await screen.findByText(/application\/ld\+json/i),
    ).toBeInTheDocument()

    globalThis.fetch = originalFetch
  })

  test('emits RDFa attributes when emitRdfa is enabled', () => {
    const { container } = render(<RdfDetailsView data={sampleData} emitRdfa />)

    const subject = container.querySelector(
      '[about="http://example.org/alice"]',
    )
    expect(subject).not.toBeNull()

    const nameProperty = container.querySelector(
      '[property="http://xmlns.com/foaf/0.1/name"]',
    )
    expect(nameProperty?.getAttribute('content')).toBe('Alice')
    expect(nameProperty?.getAttribute('lang')).toBe('en')

    const typeRelation = container.querySelector(
      '[rel="http://www.w3.org/1999/02/22-rdf-syntax-ns#type"]',
    )
    expect(typeRelation?.getAttribute('resource')).toBe(
      'http://xmlns.com/foaf/0.1/Person',
    )

    const mboxRelation = container.querySelector(
      '[rel="http://xmlns.com/foaf/0.1/mbox"]',
    )
    expect(mboxRelation?.getAttribute('resource')).toBe(
      'mailto:alice@example.org',
    )
  })

  test('does not emit RDFa attributes by default', () => {
    const { container } = render(<RdfDetailsView data={sampleData} />)
    expect(container.querySelector('[about]')).toBeNull()
    expect(container.querySelector('[property]')).toBeNull()
    expect(container.querySelector('[resource]')).toBeNull()
  })

  test('preserves RDFa triples for carouselled images', () => {
    const { container } = render(<RdfDetailsView data={imageData} emitRdfa />)
    const imageRelations = container.querySelectorAll(
      '[rel="http://xmlns.com/foaf/0.1/depiction"]',
    )
    expect(imageRelations.length).toBe(2)
    const resources = Array.from(imageRelations).map((node) =>
      node.getAttribute('resource'),
    )
    expect(resources).toContain('https://picsum.photos/200/200?random=1')
    expect(resources).toContain('https://picsum.photos/200/200?random=2')
  })

  test('collapses subjects and shows a filter for a large graph', () => {
    render(<RdfDetailsView data={largeData} />)

    // Filter toolbar appears past the threshold.
    expect(screen.getByLabelText('Filter subjects')).toBeInTheDocument()
    expect(screen.getByText('7 subjects')).toBeInTheDocument()

    // Subjects start collapsed: no property tables rendered.
    expect(screen.queryAllByRole('columnheader')).toHaveLength(0)

    // Expanding one subject reveals its table.
    fireEvent.click(screen.getByRole('button', { name: /alpha/i }))
    expect(screen.getAllByRole('columnheader').length).toBeGreaterThan(0)
  })

  test('filters subjects by label in a large graph', () => {
    render(<RdfDetailsView data={largeData} />)

    fireEvent.change(screen.getByLabelText('Filter subjects'), {
      target: { value: 'bravo' },
    })

    expect(screen.getByText('1 of 7')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /bravo/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /golf/i })).toBeNull()

    fireEvent.change(screen.getByLabelText('Filter subjects'), {
      target: { value: 'nomatch' },
    })
    expect(screen.getByText(/No subjects match/i)).toBeInTheDocument()
  })

  test('shows a resolving indicator while a vocabulary loads, then clears', async () => {
    const originalFetch = globalThis.fetch
    let resolveFetch: ((res: Response) => void) | null = null
    globalThis.fetch = (() =>
      new Promise<Response>((resolve) => {
        resolveFetch = resolve
      })) as typeof fetch

    render(
      <RdfDetailsView
        data={sampleData}
        vocabularies={['http://example.org/v.ttl']}
      />,
    )

    // Indicator is visible while the fetch is in flight.
    expect(await screen.findByText(/Resolving labels/i)).toBeInTheDocument()

    await act(async () => {
      resolveFetch?.(
        new Response(
          `@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
foaf:name rdfs:label "Name"@en .`,
        ),
      )
      await Promise.resolve()
    })

    // Once resolution settles, the indicator clears.
    await waitFor(() =>
      expect(screen.queryByText(/Resolving labels/i)).toBeNull(),
    )

    globalThis.fetch = originalFetch
  })

  test('does not show the filter toolbar for a small graph', () => {
    render(<RdfDetailsView data={navigationData} />)
    expect(screen.queryByLabelText('Filter subjects')).toBeNull()
    // Small graphs stay expanded: tables are visible.
    expect(screen.getAllByRole('columnheader').length).toBeGreaterThan(0)
  })

  test('renders image carousel links when showImageUrls is enabled', () => {
    render(
      <RdfDetailsView
        data={imageData}
        showImageUrls
        showImagesInline
        enableNavigation={false}
      />,
    )

    expect(screen.getByRole('button', { name: 'Previous image' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Next image' })).toBeEnabled()
    expect(
      screen.getByRole('link', { name: /pic:200\?random=1/i }),
    ).toBeInTheDocument()
  })
})

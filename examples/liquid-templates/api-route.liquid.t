---
to: src/api/{{ name | kebabCase }}.ts
---
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    // Handle GET request for {{ name | humanize }}
    try {
      const result = await get{{ name | pascalCase }}()
      res.status(200).json(result)
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch {{ name | humanize }}' })
    }
  } else if (req.method === 'POST') {
    // Handle POST request for {{ name | humanize }}
    try {
      const result = await create{{ name | pascalCase }}(req.body)
      res.status(201).json(result)
    } catch (error) {
      res.status(500).json({ error: 'Failed to create {{ name | humanize }}' })
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}

async function get{{ name | pascalCase }}() {
  // TODO: Implement {{ name | humanize }} fetching logic
  return { message: 'Get {{ name | humanize }} not implemented' }
}

async function create{{ name | pascalCase }}(data: any) {
  // TODO: Implement {{ name | humanize }} creation logic
  return { message: 'Create {{ name | humanize }} not implemented', data }
}
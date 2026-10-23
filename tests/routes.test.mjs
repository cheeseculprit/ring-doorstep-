import assert from 'node:assert/strict'
import { test } from 'node:test'
import nextConfig from '../next.config.js'

test('the product page is the homepage while the Ring camera remains accessible', async () => {
  const redirects = await nextConfig.redirects()
  const rewrites = nextConfig.rewrites ? await nextConfig.rewrites() : []
  assert.ok(redirects.some(route => route.source === '/' && route.destination === '/care'))
  assert.equal(rewrites.some(route => route.source === '/camera'), false)
})

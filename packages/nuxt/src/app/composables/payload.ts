import { parseURL, joinURL } from 'ufo'
import { appendHeader } from 'h3'
import { useNuxtApp } from '../nuxt'
import { useHead, useRequestEvent } from '#app'

export function loadPayload (url: string, forceRefetch: boolean = false) {
  if (process.server) { return null }
  const payloadURL = _getPayloadURL(url)
  const nuxtApp = useNuxtApp()
  const cache = nuxtApp._payloadCache = nuxtApp._payloadCache || {}
  if (!forceRefetch && cache[payloadURL]) {
    return cache[payloadURL]
  }
  cache[url] = _importPayload(payloadURL + (forceRefetch ? '?_=' + Date.now() : ''))
  return cache[url]
}

export function prefetchPayload (url: string) {
  const payloadURL = _getPayloadURL(url)
  useHead({
    link: [
      // TODO: Vite adds ?import in _importPayload ?!
      { rel: 'modulepreload', href: payloadURL + '?import' }
    ]
  })
  if (process.server && !process.dev && isPrerendered()) {
    const event = useRequestEvent()
    appendHeader(event, 'x-nitro-prerender', payloadURL)
  }
}

// --- Internal ---

function _getPayloadURL (url: string) {
  const parsed = parseURL(url)
  if (parsed.search) {
    throw new Error('Payload URL cannot contain search params: ' + url)
  }
  return joinURL(parsed.pathname, '_payload.js')
}

async function _importPayload (payloadURL: string) {
  if (process.server) { return null }
  const { default: payload } = await import(/* @vite-ignore */ payloadURL) as { default: any }
  return payload
}

export function isPrerendered () {
  // Note: Alternative for server is checking x-nitro-prerender header
  const nuxtApp = useNuxtApp()
  return !!nuxtApp.payload.prerenderedAt
}

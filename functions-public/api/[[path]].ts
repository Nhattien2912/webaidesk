/** Fail closed for every public API path that has no explicitly implemented route. */
export const onRequest: PagesFunction = async () =>
  new Response(JSON.stringify({ ok: false, error: 'not_found' }), {
    status: 404,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  })

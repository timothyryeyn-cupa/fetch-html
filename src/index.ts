export default {
	async fetch(request, env) {
		const url = new URL(request.url)
		const host = (url.hostname || '').toLowerCase()

		const assetReq = new Request(new URL(`/${host}.html`, request.url))
		let resp = await env.ASSETS.fetch(assetReq)

		if (resp.status === 404) {
			resp = await env.ASSETS.fetch(
				new Request(new URL(`/cambridge.org.html`, request.url))
			)
		}

		return new Response(resp.body, {
			status: 503,
			headers: {
				'Content-Type': 'text/html; charset=UTF-8',
				'Cache-Control': 'no-store',
				'Retry-After': '3600'
			}
		})
	}
}

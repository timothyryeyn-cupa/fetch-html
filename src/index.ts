export default {
	async fetch(request, env) {
		const assetReq = new Request(
			new URL('/schoolsupporthub.cambridge.org.html', request.url)
		)
		const resp = await env.ASSETS.fetch(assetReq)

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

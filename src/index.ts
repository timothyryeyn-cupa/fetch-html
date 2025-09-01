export default {
	async fetch(request, env) {
		const requestUrl = new URL(request.url)
		const requestUrlHostname = (requestUrl.hostname || '').toLowerCase()

		// Parse site auth configuration
		let siteAuthConfig = {}
		try {
			siteAuthConfig = JSON.parse(env.SITE_AUTH_CONFIG || '{}')
		} catch (e) {
			console.error('Invalid SITE_AUTH_CONFIG JSON:', e)
		}

		// Get auth for specific site or use default
		const siteAuth = siteAuthConfig[requestUrlHostname]

		if (siteAuth) {
			const VALID_AUTH = siteAuth.key + '=' + siteAuth.value
			const cookies = request.headers.get('Cookie') || ''

			// Check for cookie or token in url to access site
			if (cookies.includes(VALID_AUTH) || request.url.includes(VALID_AUTH)) {
				// User has a valid token, so show the original page
				const originalResponse = await fetch(request)
				const response = new Response(originalResponse.body, originalResponse)

				// Store token in cookie if not included already
				if (!cookies.includes(VALID_AUTH)) {
					const tokenCookie = `${VALID_AUTH}; Path=/; Domain=${requestUrlHostname}`
					response.headers.set('Set-Cookie', tokenCookie)
				}

				return response
			}
		}

		//Return maintenance page if no valid auth
		const defaultMaintenancePage =
			env.DEFAULT_MAINTENANCE_PAGE ?? 'cambridge.org.html' //DO NOT DELETE THIS FILE

		let resp = await env.ASSETS.fetch(
			new Request(new URL(`/${requestUrlHostname}.html`, requestUrl))
		)

		if (resp.status === 404) {
			resp = await env.ASSETS.fetch(
				new Request(new URL(`/${defaultMaintenancePage}`, request.url))
			)
		}

		const headers = new Headers()
		headers.set('Content-Type', 'text/html')
		headers.append('Pragma', 'no-cache')

		return new Response(resp.body, {
			headers,
			status: 503,
			statusText: 'Service Unavailable'
		})
	}
}

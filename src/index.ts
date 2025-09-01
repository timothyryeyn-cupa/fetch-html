const DEFAULT_MAINTENANCE_FILE = 'cambridge.org.html'
const MAINTENANCE_STATUS = 503
const CACHE_CONTROL_HEADERS = {
	'Content-Type': 'text/html',
	Pragma: 'no-cache',
	'Cache-Control': 'no-cache, no-store, must-revalidate'
} as const

interface SiteAuth {
	key: string
	value: string
}

interface SiteAuthConfig {
	[hostname: string]: SiteAuth
}

export default {
	async fetch(request, env) {
		const requestUrl = new URL(request.url)
		const requestUrlHostname = (requestUrl.hostname || '').toLowerCase()

		// Parse site auth configuration
		let siteAuthConfig: SiteAuthConfig = {}
		try {
			siteAuthConfig = JSON.parse(env.SITE_AUTH_CONFIG || '{}')
		} catch (e) {
			console.error('Invalid SITE_AUTH_CONFIG JSON:', e)
		}

		// Get auth for specific site or use default
		const siteAuth: SiteAuth | undefined = siteAuthConfig[requestUrlHostname]

		if (siteAuth) {
			const VALID_AUTH = siteAuth.key + '=' + siteAuth.value
			const cookies = request.headers.get('Cookie') || ''

			// Check for cookie or token in url to access site
			if (cookies.includes(VALID_AUTH)) {
				// User has valid cookie
				const originalResponse = await fetch(request)
				return new Response(originalResponse.body, originalResponse)
			} else if (request.url.includes(VALID_AUTH)) {
				// User has URL token - set cookie and redirect to clean URL
				const cleanUrl = new URL(request.url)
				cleanUrl.search = '' // Remove query parameters

				return new Response(null, {
					status: 302,
					headers: {
						Location: cleanUrl.toString(),
						'Set-Cookie': `${VALID_AUTH}; Path=/; Domain=${requestUrlHostname}; HttpOnly; Secure; SameSite=Strict`
					}
				})
			}
		}

		//Return maintenance page if no valid auth
		const defaultMaintenancePage =
			env.DEFAULT_MAINTENANCE_FILE ?? DEFAULT_MAINTENANCE_FILE

		let pageFetchResp = await env.ASSETS.fetch(
			new Request(new URL(`/${requestUrlHostname}.html`, requestUrl))
		)

		if (pageFetchResp.status === 404) {
			pageFetchResp = await env.ASSETS.fetch(
				new Request(new URL(`/${defaultMaintenancePage}`, requestUrl))
			)
		}

		return new Response(pageFetchResp.body, {
			headers: new Headers(CACHE_CONTROL_HEADERS),
			status: MAINTENANCE_STATUS,
			statusText: 'Service Unavailable'
		})
	}
}

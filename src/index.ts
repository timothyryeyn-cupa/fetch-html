const DEFAULT_MAINTENANCE_FILE = 'cambridge.org.html'

function parseConfig(json) {
	try {
		return JSON.parse(json || '{}')
	} catch (e) {
		console.error('Invalid SITE_AUTH_CONFIG JSON:', e)
		return {}
	}
},

async function maintenancePage(env, url, hostname) {
	const page = await env.ASSETS.fetch(
		new Request(new URL(`/${hostname}.html`, url))
	)
	if (page.ok) {
		return new Response(page.body, {
			status: 503,
			headers: { 'Content-Type': 'text/html', 'Cache-Control': 'no-cache' }
		})
	}

	const defaultPage = await env.ASSETS.fetch(
		new Request(
			new URL(
				`/${env.DEFAULT_MAINTENANCE_FILE ?? DEFAULT_MAINTENANCE_FILE}`,
				url
			)
		)
	)
	if (defaultPage.ok) {
		return new Response(defaultPage.body, {
			status: 503,
			headers: { 'Content-Type': 'text/html', 'Cache-Control': 'no-cache' }
		})
	}

	return new Response('Service temporarily unavailable', { status: 503 })
}

export default {
	async fetch(request, env) {
		const url = new URL(request.url)
		const hostname = url.hostname.toLowerCase()

		// Get site auth
		const siteAuth = parseConfig(env.SITE_AUTH_CONFIG)?.[hostname]
		if (!siteAuth) {
			return maintenancePage(env, url, hostname)
		}

		const authToken = `${siteAuth.key}=${siteAuth.value}`
		const cookies = request.headers.get('Cookie') || ''

		// Has valid cookie? Pass through
		if (cookies.includes(authToken)) {
			return fetch(request)
		}

		// Has URL token? Set cookie and redirect
		if (request.url.includes(authToken)) {
			url.search = ''
			return new Response(null, {
				status: 302,
				headers: {
					Location: url.toString(),
					'Set-Cookie': `${authToken}; Path=/; HttpOnly; Secure; SameSite=Strict`
				}
			})
		}

		// Show maintenance page
		return maintenancePage(env, url, hostname)
	},
}

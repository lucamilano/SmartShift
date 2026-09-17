import assert from 'node:assert/strict'

const baseURL = 'https://smartshift-164.pages.dev'
const checks = [
  ['/login', 200],
  ['/dashboard', 307],
  ['/api/export-excel', 401],
  ['/api/auth/get-session', 200],
]

// Pages may need a short propagation interval after deployment.
for (let attempt = 1; attempt <= 6; attempt++) {
  try {
    for (const [path, status] of checks) {
      const response = await fetch(new URL(path, baseURL), {
        redirect: 'manual', signal: AbortSignal.timeout(15_000),
      })
      assert.equal(response.status, status, `${path}: HTTP inatteso`)
      if (path === '/dashboard') {
        assert.equal(new URL(response.headers.get('location'), baseURL).pathname, '/login')
      }
      if (path === '/api/auth/get-session') assert.equal(await response.json(), null)
      else await response.arrayBuffer()
    }
    console.log('Sito pubblico disponibile; dashboard ed export richiedono autenticazione.')
    break
  } catch (error) {
    if (attempt === 6) throw error
    console.log(`Verifica ${attempt}/6 non riuscita; nuovo tentativo tra 10 secondi.`)
    await new Promise(resolve => setTimeout(resolve, 10_000))
  }
}

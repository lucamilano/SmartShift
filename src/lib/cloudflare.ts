import 'server-only'
import { getCloudflareContext } from '@opennextjs/cloudflare'

export async function getEnvironment() {
  const { env } = await getCloudflareContext({ async: true })
  return env
}

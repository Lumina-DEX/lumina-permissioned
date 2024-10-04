import { Client, type ClientOptions, fetchExchange } from "@urql/vue"
import { getRetryExchange } from "./graphql/helpers"
import { createWalletMachine } from "./machines/wallet"

export const createClientOptions = (url: string) =>
	({
		url,
		requestPolicy: "network-only",
		exchanges: [getRetryExchange(), fetchExchange]
	}) as ClientOptions

const clientCache = new Map<string, Client>()

export const createMinaClient = (url: string) => {
	const cached = clientCache.get(url)
	if (cached) return cached
	const client = new Client(createClientOptions(url))
	clientCache.set(url, client)
	return client
}

const walletMachine = createWalletMachine({ createMinaClient })
export { walletMachine }

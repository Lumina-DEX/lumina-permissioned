import { Client, type ClientOptions, fetchExchange } from "@urql/vue"
import type { Ref } from "vue"
import type {
	Actor,
	ActorOptions,
	ConditionalRequired,
	EventFromLogic,
	IsNotNever,
	RequiredActorOptionsKeys,
	SnapshotFrom
} from "xstate"

import { getRetryExchange } from "./graphql/helpers"
import { useActor } from "./machines/vue/useXstate"
import { createWalletMachine } from "./machines/wallet"

export * from "./machines/vue/useXstate"

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

type WalletMachine = typeof walletMachine

export function useWallet(
	...[options]: ConditionalRequired<
		[
			options?: ActorOptions<WalletMachine> & {
				[K in RequiredActorOptionsKeys<WalletMachine>]: unknown
			}
		],
		IsNotNever<RequiredActorOptionsKeys<WalletMachine>>
	>
): {
	snapshot: Ref<SnapshotFrom<WalletMachine>>
	send: (event: EventFromLogic<WalletMachine>) => void
	actorRef: Actor<WalletMachine>
} {
	return useActor(walletMachine, options)
}

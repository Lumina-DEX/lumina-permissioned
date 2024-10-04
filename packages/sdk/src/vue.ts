import { Client, fetchExchange } from "@urql/vue"
import { getRetryExchange } from "./graphql/helpers"
import { createWalletMachine } from "./machines/wallet"

export const createMinaClient = (url: string) =>
	new Client({
		url,
		requestPolicy: "network-only",
		exchanges: [getRetryExchange(), fetchExchange]
	})

const walletMachine = createWalletMachine({ createMinaClient })
export { walletMachine }

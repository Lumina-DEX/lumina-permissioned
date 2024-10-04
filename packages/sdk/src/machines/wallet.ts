import type { ChainInfoArgs, ProviderError } from "@aurowallet/mina-provider"
import { Mina } from "o1js"
import type { Client } from "urql"
import { assign, emit, enqueueActions, fromCallback, fromPromise, setup } from "xstate"
import { FetchAccountBalanceQuery } from "../graphql/sequencer"

export const urls = {
	"mina:mainnet": "https://api.minascan.io/node/mainnet/v1/graphql",
	"mina:berkeley": "https://api.minascan.io/node/berkeley/v1/graphql",
	"mina:testnet": "https://api.minascan.io/node/devnet/v1/graphql",
	"zeko:testnet": "https://devnet.zeko.io/graphql"
} as const
export type Networks = keyof typeof urls
export type Urls = (typeof urls)[Networks]

//TODO: Additional token support
type Token = "MINA" | "ZEKO"
type TokenBalances = {
	mina: { MINA: number; ZEKO?: number }
	zeko: { MINA: number; ZEKO?: number }
}

export const supportedTokens = {
	mina: "wSHV2S4qX9jFsLjQo8r1BsMLH2ZRKsZx6EJd1sbozGPieEC4Jf"
} as const

export const createWalletMachine = ({
	createMinaClient
}: { createMinaClient: (url: string) => Client }) =>
	setup({
		types: {
			context: {} as {
				accounts: string[]
				currentNetwork: Networks
				zekoBalances: Record<Token, number>
				minaBalances: Record<Token, number>
			},
			emitted: {} as { type: "NetworkChanged"; network: Networks },
			events: {} as
				| { type: "RequestNetworkChange"; network: Networks }
				| { type: "WalletExtensionChangedNetwork"; network: Networks }
				| { type: "Connect" }
				| { type: "Disconnect" }
				| { type: "FetchBalance" }
		},
		actors: {
			/**
			 * Invoked on initialization to listen to Mina wallet changes.
			 */
			listenToWalletChange: fromCallback(({ sendBack }) => {
				window.mina.on("chainChanged", ({ networkID }: ChainInfoArgs) => {
					console.log("User manually changed network", networkID)
					sendBack({
						type: "WalletExtensionChangedNetwork",
						network: networkID as Networks
					})
				})
				window.mina.on("accountsChanged", (accounts: string[]) => {
					console.log("User manually changed account") //TODO: implement this
				})
				return () => {}
			}),
			/**
			 * Invoked from Connect events to attempt to connect a Mina wallet.
			 */
			connectWallet: fromPromise<{
				currentNetwork: Networks
				accounts: string[]
			}>(async () => {
				try {
					console.log("Connecting wallet ...")
					// Accounts is an array of string Mina addresses.
					const accounts = await window.mina.requestAccounts()
					if (accounts instanceof Error) throw accounts
					console.log("Connected wallet", accounts)
					const { networkID } = await window.mina.requestNetwork()
					const currentNetwork = networkID as Networks
					return { currentNetwork, accounts }
				} catch (e: unknown) {
					if (e instanceof Error) {
						console.log(e.message)
					}
					if ((e as ProviderError).code === 4001) {
						console.log("User rejected request")
					}
					console.log(e)
					throw e
				}
			}),
			/**
			 * Fetches the balance of the Mina wallet on Mina and Zeko.
			 */
			fetchBalance: fromPromise<TokenBalances, { address: string }>(async ({ input }) => {
				console.log({ input })
				const publicKey = input.address
				const token = "mina" //TODO: Hardcoded for now
				const settings = token ? { tokenId: supportedTokens[token], publicKey } : { publicKey }

				//TODO: Hardcoded testnet
				const minaClient = createMinaClient(urls["mina:testnet"])
				const zekoClient = createMinaClient(urls["zeko:testnet"])

				const [minaResult, zekoResult] = await Promise.all([
					minaClient.query(FetchAccountBalanceQuery, settings),
					zekoClient.query(FetchAccountBalanceQuery, settings)
				])
				const toReadable = (balance: unknown) => Number(balance) / 1e9
				const l1Mina = toReadable(minaResult.data?.account?.balance?.total) ?? 0
				const l2Mina = toReadable(zekoResult.data?.account?.balance?.total) ?? 0

				return { mina: { MINA: l1Mina }, zeko: { MINA: l2Mina } }
			}),
			/**
			 * Changes the network of the Mina wallet.
			 */
			changeNetwork: fromPromise<{ currentNetwork: Networks }, { switchTo: Networks }>(
				async ({ input: { switchTo } }) => {
					console.log("Change Network ...")
					// //TODO: Testnet is hardcoded for now
					if (switchTo.includes("mainnet")) console.error("Mainnet is not supported")
					if (!switchTo.startsWith("mina")) {
						//TODO: this might not be necessary
						await window.mina.addChain({ url: urls[switchTo], name: switchTo })
					}
					const result = await window.mina.switchChain({ networkID: switchTo })
					if (result instanceof Error) throw result
					return { currentNetwork: switchTo }
				}
			)
		},
		actions: {
			setWalletNetwork: enqueueActions(({ enqueue }, { network }: { network: Networks }) => {
				const url = urls[network]
				console.log("Setting network to", url)
				Mina.setActiveInstance(Mina.Network(url))
				enqueue.assign({ currentNetwork: network })
				enqueue.emit({ type: "NetworkChanged", network })
			})
		}
	}).createMachine({
		id: "wallet",
		context: {
			accounts: [""],
			currentNetwork: "mina:testnet",
			zekoBalances: { MINA: 0, ZEKO: 0 },
			minaBalances: { MINA: 0, ZEKO: 0 }
		},
		initial: "INIT",
		invoke: { src: "listenToWalletChange" },
		states: {
			INIT: {
				on: { Connect: { target: "CONNECTING" } }
			},
			CONNECTING: {
				invoke: {
					src: "connectWallet",
					onDone: {
						target: "FETCHING_BALANCE",
						actions: [
							{
								type: "setWalletNetwork",
								params: ({ event }) => ({ network: event.output.currentNetwork })
							},
							assign({ accounts: ({ event }) => event.output.accounts })
						]
					}
				}
			},
			FETCHING_BALANCE: {
				invoke: {
					src: "fetchBalance",
					input: ({ context }) => ({ address: context.accounts[0] }),
					onDone: {
						target: "READY",
						actions: assign({
							minaBalances: ({ context, event }) =>
								"mina" in event.output
									? { ...context.minaBalances, ...event.output.mina }
									: context.minaBalances,
							zekoBalances: ({ context, event }) =>
								"zeko" in event.output
									? { ...context.zekoBalances, ...event.output.zeko }
									: context.zekoBalances
						})
					}
				}
			},
			READY: {
				on: {
					RequestNetworkChange: [
						{
							target: "SWITCHING_NETWORK",
							guard: ({ context, event }) => context.currentNetwork !== event.network,
							actions: assign({ currentNetwork: ({ event }) => event.network })
						},
						{
							guard: ({ context, event }) => context.currentNetwork === event.network,
							description: "If the network is already the same, emit directly.",
							actions: emit(({ event }) => ({
								type: "NetworkChanged",
								network: event.network
							}))
						}
					],
					WalletExtensionChangedNetwork: {
						target: "FETCHING_BALANCE",
						guard: ({ context, event }) => context.currentNetwork !== event.network,
						actions: {
							type: "setWalletNetwork",
							params: ({ event }) => ({ network: event.network })
						}
					},
					Disconnect: { target: "INIT" },
					FetchBalance: { target: "FETCHING_BALANCE" }
				}
			},
			SWITCHING_NETWORK: {
				invoke: {
					src: "changeNetwork",
					input: ({ context }) => ({ switchTo: context.currentNetwork }),
					onDone: [
						{
							target: "FETCHING_BALANCE",
							actions: [
								{
									type: "setWalletNetwork",
									params: ({ event }) => ({
										network: event.output.currentNetwork
									})
								}
							]
						}
					]
				}
			}
		}
	})

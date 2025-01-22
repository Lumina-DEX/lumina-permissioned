type NetworkLayer = "mina" | "zeko"

export type ChainNetwork = "mainnet" | "berkeley" | "testnet"

export type NetworkUri = Exclude<`${NetworkLayer}:${ChainNetwork}`, "zeko:berkeley">

export const networks = [
	"mina:mainnet",
	"mina:berkeley",
	"mina:testnet",
	"zeko:testnet",
	"zeko:mainnet"
] as const

export const urls = {
	"mina:mainnet": "https://api.minascan.io/node/mainnet/v1/graphql",
	"mina:berkeley": "https://api.minascan.io/node/berkeley/v1/graphql",
	"mina:testnet": "https://api.minascan.io/node/devnet/v1/graphql",
	"zeko:testnet": "https://devnet.zeko.io/graphql",
	"zeko:mainnet": "https://devnet.zeko.io/graphql"
} as const

export const archiveUrls = {
	"mina:mainnet": "https://api.minascan.io/archive/mainnet/v1/graphql",
	"mina:berkeley": "https://api.minascan.io/archive/devnet/v1/graphql",
	"mina:testnet": "https://api.minascan.io/archive/devnet/v1/graphql",
	"zeko:testnet": "https://devnet.zeko.io/graphql",
	"zeko:mainnet": "https://devnet.zeko.io/graphql"
} as const

// TODO: Add missing factories
export const luminadexFactories = {
	"mina:testnet": "B62qnHMCGiqjFzC25yuKBjxC5yXFqfozsfgrjR22Gk2BdjJrmQqNVqi"
} as const

// TODO: Add missing faucets
export const chainFaucets = {
	"mina:testnet": {
		address: "B62qnigaSA2ZdhmGuKfQikjYKxb6V71mLq3H8RZzvkH4htHBEtMRUAG",
		tokenAddress: "B62qjDaZ2wDLkFpt7a7eJme6SAJDuc3R3A2j2DRw7VMmJAFahut7e8w",
		tokenId: "wTRtTRnW7hZCQSVgsuMVJRvnS1xEAbRRMWyaaJPkQsntSNh67n"
	},
	"mina:mainnet": { address: "NOT Implemented", tokenAddress: "", tokenId: "Not Implemented" },
	"mina:berkeley": { address: "testnet-address-2", tokenAddress: "", tokenId: "123" },
	"zeko:testnet": { address: "zeko-test", tokenAddress: "", tokenId: "123" },
	"zeko:mainnet": { address: "zeko-test", tokenAddress: "", tokenId: "123" }
} as const

export const MINA_ADDRESS = "MINA"

export const luminaCdnOrigin = "https://luminadex-contracts-cdn.hebilicious.workers.dev"

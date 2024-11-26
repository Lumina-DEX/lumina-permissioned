// Importing 'crypto' module
// import crypto from 'crypto';

type CachedFile = { file: string; data: Uint8Array }
type CacheList = Record<string, CachedFile>

export const fetchFiles = async () => {
	const currentLocation = self.location.origin
	const headers = new Headers()
	headers.append("Content-Encoding", "br, gzip, deflate")

	// we don't load pk key on the frontend
	const filter = (x: string) => {
		return x.indexOf("-pk-") === -1 && x.indexOf(".header") === -1
	}

	const filesResponse = await fetch(`${currentLocation}/compiled.json`, { headers })
	const json = (await filesResponse.json()) as string[]

	const cacheList = await Promise.all(
		json.filter(filter).map(async (file: string) => {
			const result = await fetch(`${currentLocation}/cache/${file}.txt`, {
				cache: "force-cache",
				headers
			})
			const data = await result.arrayBuffer()
			return { file, data: new Uint8Array(data) }
		})
	)
	return cacheList.reduce((acc: CacheList, { file, data }) => {
		acc[file] = { file, data }
		return acc
	}, {})
}

type CacheData = { persistentId: string; uniqueId: string; dataType: "string" | "bytes" }

export const readCache = (files: CacheList) => ({
	read({ persistentId, dataType }: CacheData) {
		// read current uniqueId, return data if it matches
		if (!files[persistentId]) {
			console.log("not found : ", persistentId)
			return undefined
		}

		console.log("load : ", persistentId)

		if (dataType === "string") {
			const data = files[persistentId].data
			// const hash = crypto.createHash('sha1').update(data).digest('hex');
			// console.log(persistentId + " hash", hash);
			return data
		}
		console.log("data type not string : ", persistentId)
		return undefined
	},
	write({ persistentId, uniqueId, dataType }: CacheData, data: unknown) {
		console.log("write")
		console.log({ persistentId, uniqueId, dataType })
	},
	canWrite: false
})

export const readCache2 = async () => ({
	async read({ persistentId, dataType }: CacheData) {
		const currentLocation = self.location.origin

		if (persistentId.indexOf("-pk-") > -1) {
			return undefined
		}

		// read current uniqueId, return data if it matches
		const currentId = await fetch(`${currentLocation}/cache/${persistentId}.txt`, {
			cache: "force-cache"
		})
		if (!currentId) {
			console.log("not found : ", persistentId)
			return undefined
		}

		console.log("load : ", persistentId)

		if (dataType === "string") {
			const data = currentId.arrayBuffer()
			// const hash = crypto.createHash('sha1').update(data).digest('hex');
			// console.log(persistentId + " hash", hash);
			return data
		}
		console.log("data type not string : ", persistentId)
		return undefined
	},
	write({ persistentId, uniqueId, dataType }: CacheData, data: unknown) {
		console.log("write")
		console.log({ persistentId, uniqueId, dataType })
	},
	canWrite: false
})

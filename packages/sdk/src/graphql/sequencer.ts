import { graphql } from "./helpers"

export const ProveTransferRequestMutation = graphql(`
  mutation ProveTransferRequest($transferRequestInput: TransferRequestInput!) {
    proveTransferRequest(input: $transferRequestInput) {
      accountUpdateKey
    }
  }
`)

export const ProveTransferClaimMutation = graphql(`
  mutation ProveTransferClaim($transferClaimInput: TransferClaimInput!) {
    proveTransferClaim(input: $transferClaimInput) {
      accountUpdateKey
    }
  }`)

export const GetTransferAccountUpdateQuery = graphql(`
  query GetTransferAccountUpdate($key: String!) {
    transferAccountUpdate(key: $key)
  }
`)

export const FetchAccountBalanceQuery = graphql(`
  query FetchAccountBalance($publicKey: PublicKey!, $tokenId: TokenId){
    account(publicKey: $publicKey, token: $tokenId ){
      balance {
        total
      }
    }
  }
  `)

import {
  AccountUpdate,
  AccountUpdateForest,
  assert,
  Bool,
  DynamicProof,
  FeatureFlags,
  Field,
  Int64,
  method,
  Permissions,
  Poseidon,
  PrivateKey,
  Provable,
  PublicKey,
  Signature,
  State,
  state,
  Struct,
  TokenContract,
  TokenId,
  Types,
  UInt64,
  VerificationKey,
  ZkProgram
} from "o1js"

// B62qoHtRmvtiZrsWFZDUxgiJ98DcWbvva5D31iDXKFGbCUqFEwtxBrw
export const authorizeSigner = PrivateKey.fromBase58("EKE2f1KypNKvwd19SpvBhtkackD44JrKBomdvPERQsbxDiUE8Big")
const aurthorizedPublicKey = authorizeSigner.toPublicKey()

export class KycInfo extends Struct({
  sender: PublicKey,
  checkCompany: Bool,
  companyId: Field
}) {
  constructor(value: {
    sender: PublicKey
    checkCompany: Bool
    companyId: Field
  }) {
    super(value)
  }

  hash(): Field {
    return Poseidon.hash(this.sender.toFields().concat(this.checkCompany.toFields().concat(this.companyId.toFields())))
  }
}

export const KYCProgram = ZkProgram({
  name: "kyc",
  publicInput: KycInfo,

  methods: {
    checkKyc: {
      privateInputs: [Signature],

      /**
       * simple proof program where we supposed a dedicate signer,
       * sign a message with an address and a boolean indicate if it's address is KYC
       * @param publicInput address who check if is kyc
       * @param signature signature created by a dedicated signer manage by our org
       */
      async method(publicInput: KycInfo, signature: Signature) {
        signature.verify(aurthorizedPublicKey, publicInput.hash().toFields()).assertTrue("Invalid Signer")
      }
    }
  }
})
export let MainProof_ = ZkProgram.Proof(KYCProgram)
export class MainProof extends MainProof_ {}

// given a zkProgram, we compute the feature flags that we need in order to verify proofs that were generated
const featureFlags = await FeatureFlags.fromZkProgram(KYCProgram)

export class SideloadedProgramProof extends DynamicProof<KycInfo, KycInfo> {
  static publicInputType = KycInfo
  static publicOutputType = KycInfo
  static maxProofsVerified = 0 as const

  // we use the feature flags that we computed from the `sideloadedProgram` ZkProgram
  static featureFlags = featureFlags
}

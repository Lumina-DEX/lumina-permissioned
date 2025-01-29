import {
    AccountUpdate,
    AccountUpdateForest,
    assert,
    Bool,
    Int64,
    method,
    Permissions,
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
export const authorizeSigner = PrivateKey.fromBase58("EKE2f1KypNKvwd19SpvBhtkackD44JrKBomdvPERQsbxDiUE8Big");
const aurthorizedPublicKey = authorizeSigner.toPublicKey();

export const KYCProgram = ZkProgram({
    name: "kyc",
    publicInput: PublicKey,

    methods: {
        checkKyc: {
            privateInputs: [Signature],

            /**
             * simple proof program where we supposed a dedicate signer, 
             * sign a message with an address and a boolean indicate if it's address is KYC
             * @param publicInput address who check if is kyc
             * @param signature signature created by a dedicated signer manage by our org
             */
            async method(publicInput: PublicKey, signature: Signature) {
                signature.verify(aurthorizedPublicKey, publicInput.toFields().concat(Bool(true).toField())).assertTrue('Invalid Signer');
            },
        }
    }
});
export let MainProof_ = ZkProgram.Proof(KYCProgram);
export class MainProof extends MainProof_ { }

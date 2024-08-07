import { Field, SmartContract, state, State, method, TokenContract, PublicKey, AccountUpdateForest, DeployArgs, UInt64, AccountUpdate, Provable, TokenContractV2 } from 'o1js';
import { TokenStandard, TokenHolder, mulDiv } from './index.js';

// minimum liquidity permanently locked in the pool
export const minimunLiquidity: UInt64 = new UInt64(10 ** 3);

/**
 * Pool contract for Lumina dex
 */
export class Pool extends TokenContractV2 {
    // we need the token address to instantiate it
    tokenA = PublicKey.fromBase58("B62qjZ1W2ybx2AYLYUyjPMoBT6Kn6CPPjAN2WWSRKH46uGgn2SgeNtK");
    tokenB = PublicKey.fromBase58("B62qkSPqDx2TazHm6PxdqXSb7DiVfvt7UM17ykK3xb3VSPjKLPbYWdb");
    @state(UInt64) liquiditySupply = State<UInt64>();

    init() {
        super.init();
    }

    @method async approveBase(forest: AccountUpdateForest) {
        this.checkZeroBalanceChange(forest);
    }

    @method async supplyFirstLiquidities(amountA: UInt64, amountB: UInt64) {
        const tokenContractA = new TokenStandard(this.tokenA);
        const tokenContractB = new TokenStandard(this.tokenB);

        // require signature on transfer, so don't need to request it now
        const sender = this.sender.getUnconstrained();

        const dexAUpdate = AccountUpdate.create(
            this.address,
            tokenContractA.deriveTokenId()
        );

        const dexBUpdate = AccountUpdate.create(
            this.address,
            tokenContractB.deriveTokenId()
        );

        await tokenContractA.transfer(sender, dexAUpdate, amountA);
        await tokenContractB.transfer(sender, dexBUpdate, amountB);

        // calculate liquidity token output simply as liquidityAmount = amountA + amountB - minimal liquidity, todo check overflow  
        // => maintains ratio a/l, b/l
        const liquidityAmount = amountA.add(amountB);
        const liquidityUser = liquidityAmount.sub(minimunLiquidity);
        // mint token
        this.internal.mint({ address: sender, amount: liquidityUser });

        // set default informations
        this.liquiditySupply.set(liquidityAmount);
    }

    @method async supplyLiquidity(tokenX: PublicKey, amountX: UInt64, maxAmountY: UInt64) {
        amountX.assertGreaterThan(UInt64.zero, "No amount A supplied");

        const addressA = this.tokenA;
        const addressB = this.tokenB;

        tokenX.equals(addressA).or(tokenX.equals(addressB)).assertTrue("Incorrect token x");

        let tokenContractA = new TokenStandard(addressA);
        let tokenContractB = new TokenStandard(addressB);

        const holderA = new TokenHolder(this.address, tokenContractA.deriveTokenId());
        const holderB = new TokenHolder(this.address, tokenContractB.deriveTokenId());

        const balanceA = holderA.account.balance.getAndRequireEquals();
        const balanceB = holderB.account.balance.getAndRequireEquals();

        const balanceX = Provable.if(tokenX.equals(addressA), balanceA, balanceB);
        const balanceY = Provable.if(tokenX.equals(addressA), balanceB, balanceA);
        const addressY = Provable.if(tokenX.equals(addressA), addressB, addressA);

        let tokenContractX = new TokenStandard(tokenX);
        let tokenContractY = new TokenStandard(addressY);

        // amount Y to supply
        const amountY = mulDiv(amountX, balanceY, balanceX);

        amountY.assertGreaterThan(UInt64.zero, "No amount Y to supply");
        amountY.assertLessThanOrEqual(maxAmountY, "Amount Y greater than desired amount");

        // require signature on transfer, so don't need to request it now
        let sender = this.sender.getUnconstrained();

        await tokenContractX.transfer(sender, this.address, amountX);
        await tokenContractY.transfer(sender, this.address, amountY);

        const actualSupply = this.liquiditySupply.getAndRequireEquals();

        // calculate liquidity token output simply as liquidityAmount = amountA + amountB 
        // => maintains ratio a/l, b/l
        let liquidityAmount = amountX.add(amountY);
        // mint token
        this.internal.mint({ address: sender, amount: liquidityAmount });

        // set new supply
        this.liquiditySupply.set(actualSupply.add(liquidityAmount));
    }

    @method async swapExactAmountIn(tokenIn: PublicKey, amountIn: UInt64, amountOutMin: UInt64) {
        amountIn.assertGreaterThan(UInt64.zero, "No amount in supplied");
        amountOutMin.assertGreaterThan(UInt64.zero, "No amount out supplied");

        const addressA = this.tokenA;
        const addressB = this.tokenB;

        tokenIn.equals(addressA).or(tokenIn.equals(addressB)).assertTrue("Incorrect token in");

        // we request token out because this is the token holder who update his balance to transfer out
        let tokenOut = Provable.if(tokenIn.equals(addressA), addressB, addressA);
        let tokenContractOut = new TokenStandard(tokenOut);
        let tokenHolderOut = new TokenHolder(this.address, tokenContractOut.deriveTokenId());

        // require signature on transfer, so don't need to request it now
        let sender = this.sender.getUnconstrained();

        // will transfer token in to this pool and calculate correct amount out to transfer the token out
        const amountOut = await tokenHolderOut.swap(this.address, sender, amountIn, amountOutMin);
        await tokenContractOut.transfer(tokenHolderOut.self, sender, amountOut);
    }

    @method async withdrawLiquidity(liquidityAmount: UInt64) {
        liquidityAmount.assertGreaterThan(UInt64.zero, "No amount supplied");

        // require signature to burn from the correct user
        let sender = this.sender.getAndRequireSignature();

        const liquidityUser = new TokenStandard(sender, this.deriveTokenId());
        const balanceUser = liquidityUser.account.balance.getAndRequireEquals();
        balanceUser.assertGreaterThanOrEqual(liquidityAmount, "Insufficient liquidity balance");

        let tokenContractA = new TokenStandard(this.tokenA);
        let tokenContractB = new TokenStandard(this.tokenB);

        const holderA = new TokenHolder(this.address, tokenContractA.deriveTokenId());
        const holderB = new TokenHolder(this.address, tokenContractB.deriveTokenId());

        const amountA = await holderA.withdrawLiquidity(this.address, liquidityAmount);
        const amountB = await holderB.withdrawLiquidity(this.address, liquidityAmount);

        await this.internal.burn({ address: sender, amount: liquidityAmount });

        await tokenContractA.transfer(holderA.self, sender, amountA);
        await tokenContractB.transfer(holderB.self, sender, amountB);

        const actualSupply = this.liquiditySupply.getAndRequireEquals();
        // set new supply
        this.liquiditySupply.set(actualSupply.sub(liquidityAmount));
    }

}

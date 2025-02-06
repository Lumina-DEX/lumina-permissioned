# Order book solution

I think there are 3 solutions open to us :

## Offchain

One solution would be for users to submit orders to a contract and an application developed in-house would find the orders that match and submit them to the contract. Of course, everything would have to be publicly verifiable to prove that Lumina is operating honestly.

### Advantage

We can implement complex solutions and allow different types of order to be created, and we can add functionalities without having to update contracts.
That's how CEX works, but with added transparency.

### Disadvantage

Requires trust in our offchain application, in the event of a failure or bug it can block the application from working properly.

![Offchain schema](https://github.com/Lumina-DEX/lumina-permissioned/blob/feat/permissioned/packages/contracts/order-offchain.png?raw=true)

## 

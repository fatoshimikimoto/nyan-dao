# NyanDao
NyanDao is a meme governance built for a meme token: [ArbiNYAN](https://arbinyan.com/). The community shares interest from NYAN staking directly into a governance, and to spend the funds requires a coordinated governance vote. The Nyan staking rewards will only last for about 3 months, so this is an experimental DAO that has a short lifespan... or does it? It's up to the community to decide!

# How does it work?
This governance allows the community to stake their ArbiNYAN (ticker: NYAN) in exchange for voteNYAN (ticker: vNYAN). While NYAN are in the governance staking contract they earn interest **straight back into the DAO.**

**Note**: by joining the DAO, contributors donate _the interest_ earned on their deposited NYAN to the DAO. However, their _principal_ is always redeemable, because 1 vNYAN == 1 NYAN. This is a DAO built on selfless contribution. It has no fees. Contributors may always leave the DAO, retrieving their original NYAN tokens in exchange for burning their vNYAN tokens. vNYAN tokens have no value. They are simply a wrapper on top of the NYAN token that allows for governance voting.

# Test
To test the contracts, download the repo, install with yarn, and then use hardhat.
```sh
git clone https://github.com/fatoshimikimoto/nyan-dao
cd nyan-dao
yarn
npx hardhat test
```

# Disclaimer
This contract is not fully tested. More work needs to be done before it is deployed!!!

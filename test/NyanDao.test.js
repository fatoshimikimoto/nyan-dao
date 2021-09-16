const { expect } = require('chai')
const { ethers } = require('hardhat')


describe("Absolute Unit Tests", function () {
    before(async () => {
        const [account] = await ethers.getSigners()
        this.account = account.address

        let factory = await ethers.getContractFactory('ArbiNYAN')
        this.nyan = await factory.deploy()

        factory = await ethers.getContractFactory('NyanRewards')
        this.nyanRewards = await factory.deploy(
            this.nyan.address, this.nyan.address
        )

        factory = await ethers.getContractFactory('NyanTimelock')
        this.nyanTimelock = await factory.deploy(
            60, [], ["0x0000000000000000000000000000000000000000"]
        )

        factory = await ethers.getContractFactory('NyanVotes')
        this.nyanVotes = await factory.deploy(
            this.nyan.address,
            this.nyanRewards.address,
            this.nyanTimelock.address
        )

        factory = await ethers.getContractFactory('NyanGovernor')
        this.nyanGovernor = await factory.deploy(
            this.nyanVotes.address, this.nyanTimelock.address
        )
    })

    describe("Setup", () => {
        it("should setup mock token rewards", async () => {
            await this.nyan.transfer(
                this.nyanRewards.address, ethers.utils.parseEther("10000000")
            )
            await this.nyanRewards.setRewardParams(
                ethers.utils.parseEther("10000000"), 3600
            )
        })
    })

    describe("NyanVotes", () => {
        it("should properly mint vNYAN for NYAN", async () => {
            const amount = ethers.utils.parseEther("10000")
            await this.nyan.approve(this.nyanVotes.address, amount)
            await this.nyanVotes.join(amount)

            expect(
                await this.nyanVotes.balanceOf(this.account)
            ).to.be.equal(amount)
        })

        it("should claim rewards to NyanTimelock", async () => {
            await this.nyanVotes.claimRewardsToTimelock()
            expect(
                await this.nyan.balanceOf(this.nyanTimelock.address)
            ).to.be.gt(0)
        })

        it("should properly burn vNYAN for NYAN", async () => {
            const amount = ethers.utils.parseEther("10000")
            await this.nyanVotes.leave(amount)

            expect(
                await this.nyanVotes.balanceOf(this.account)
            ).to.be.equal(0)
        })
    })

    describe("NyanGovernor", () => {
        it("should add governor as proposer role to timelock", async () => {
            const proposerRole = await this.nyanTimelock.PROPOSER_ROLE()
            await this.nyanTimelock.grantRole(
                proposerRole, this.nyanGovernor.address
            )

            expect(
                await this.nyanTimelock.hasRole(
                    proposerRole, this.nyanGovernor.address
                )
            ).to.be.true
        })

        it("should remove EOA deployer from timelock admin role", async () => {
            const timelockRole = await this.nyanTimelock.TIMELOCK_ADMIN_ROLE()
            await this.nyanTimelock.revokeRole(timelockRole, this.account)

            expect(
                await this.nyanTimelock.hasRole(timelockRole, this.account)
            ).to.be.false
        })

        it("should propose to transfer rewards", async () => {

            await this.nyan.approve(
                this.nyanVotes.address, ethers.utils.parseEther('100000')
            )
            await this.nyanVotes.join(ethers.utils.parseEther('100000'))
            await this.nyanVotes.delegate(this.account)

            const rewards = await this.nyan.balanceOf(this.nyanTimelock.address)
            const nyanInterface = this.nyan.interface
            const to = this.nyan.address
            const value = '0'
            const calldata = nyanInterface.encodeFunctionData(
                'transfer(address,uint)', [this.account, rewards]
            )
            const proposalId = await this.nyanGovernor.hashProposal(
                [to], [value], [calldata],
                ethers.utils.solidityKeccak256(
                    ['string'],
                    ["This test proposal sends me all the NYAN rewards :^)"]
                )
            )
            await this.nyanGovernor.propose(
                [to], [value], [calldata],
                "This test proposal sends me all the NYAN rewards :^)"
            )
            expect(await this.nyanGovernor.state(proposalId)).to.be.equal(0)
        })
    })

})

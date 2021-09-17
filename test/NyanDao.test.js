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

        this.defaultAmount = ethers.utils.parseEther("10000")
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
            await this.nyan.approve(this.nyanVotes.address, this.defaultAmount)
            await this.nyanVotes.join(this.defaultAmount)

            expect(
                await this.nyanVotes.balanceOf(this.account)
            ).to.be.equal(this.defaultAmount)
        })

        it("should claim rewards to NyanTimelock", async () => {
            await this.nyanVotes.claimRewardsToTimelock()
            expect(
                await this.nyan.balanceOf(this.nyanTimelock.address)
            ).to.be.gt(0)
        })

        it("should properly burn vNYAN for NYAN", async () => {
            await this.nyanVotes.leave(this.defaultAmount)

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

        describe("Setup vote", () => {
            it("should transfer nyan to several accounts", async () => {
                this.accounts = await ethers.getSigners()

                for (let i = 1; i < 6; i++ ) {
                    await this.nyan.transfer(
                        this.accounts[i].address, this.defaultAmount
                    )

                    expect(
                        await this.nyan.balanceOf(this.accounts[i].address)
                    ).to.be.equal(this.defaultAmount)
                }
            })

            it("should deposit nyan from several accounts into vNYAN", async () => {
                for (let i = 1; i < 6; i++ ) {
                    await this.nyan.connect(this.accounts[i]).approve(
                        this.nyanVotes.address, this.defaultAmount
                    )
                    await this.nyanVotes.connect(this.accounts[i]).join(
                        this.defaultAmount
                    )

                    expect(
                        await this.nyanVotes.balanceOf(this.accounts[i].address)
                    ).to.be.equal(this.defaultAmount)
                }
            })
        })

        describe("Run vote to transfer rewards to account1", () => {
            it("should propose to transfer rewards", async () => {
                await this.nyan.approve(
                    this.nyanVotes.address, ethers.utils.parseEther('100000')
                )
                await this.nyanVotes.join(ethers.utils.parseEther('100000'))
                await this.nyanVotes.delegate(this.account)

                const rewards = await this.nyan.balanceOf(this.nyanTimelock.address)
                const nyanInterface = this.nyan.interface
                this.to = this.nyan.address
                this.value = '0'
                this.calldata = nyanInterface.encodeFunctionData(
                    'transfer(address,uint)', [this.account, rewards]
                )
                this.descriptionHash = ethers.utils.solidityKeccak256(
                    ['string'],
                    ["This test proposal sends me all the NYAN rewards :^)"]
                )
                this.proposalId = await this.nyanGovernor.hashProposal(
                    [this.to], [this.value], [this.calldata],
                    this.descriptionHash
                )
                await this.nyanGovernor.propose(
                    [this.to], [this.value], [this.calldata],
                    "This test proposal sends me all the NYAN rewards :^)"
                )
                expect(
                    await this.nyanGovernor.state(this.proposalId)
                ).to.be.equal(0)
            })

            it("should vote yes from each account", async () => {
                await hre.network.provider.request({method: "evm_mine"})

                for (let i = 0; i < 6; i++) {
                    await this.nyanGovernor.connect(this.accounts[i]).castVote(
                        this.proposalId, 1
                    )
                }
            })

            it("should queue after the successful vote", async () => {
                while (
                    await this.nyanGovernor.proposalDeadline(this.proposalId)
                    >= await ethers.provider.getBlockNumber()
                ) { await hre.network.provider.request({method: "evm_mine"}) }

                const tx = await this.nyanGovernor.queue(
                    [this.to], [this.value], [this.calldata],
                    this.descriptionHash
                )
                const receipt = await tx.wait()
                // console.log(receipt)
                // console.log(this.nyanTimelock.address)
                const logs = this.nyanTimelock.interface.parseLog(
                    receipt.logs[0]
                )
                this.timelockId = logs.args.id
                expect( this.timelockId ).to.be.not.equal(0)
            })

            it("should execute the successful vote", async () => {
                const timestamp = await this.nyanTimelock.getTimestamp(
                    this.timelockId
                )
                await hre.network.provider.request({
                    method: "evm_increaseTime",
                    params: [Number(timestamp)]
                })
                this.preBalance = await this.nyan.balanceOf(
                    this.account
                )
                await this.nyanGovernor.execute(
                    [this.to], [this.value], [this.calldata],
                    this.descriptionHash
                )
                expect(
                    await this.nyanGovernor.state(this.proposalId)
                ).to.be.equal(7)
            })

            it("should have transfered the tokens successfully", async () => {
                const postBalance = await this.nyan.balanceOf(
                    this.account
                )
                expect( postBalance.gt(this.preBalance) ).to.be.true
            })
        })
    })

})

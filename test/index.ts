import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract } from "ethers";
import { ethers } from "hardhat";

import hre from "hardhat";

describe("VotingContract", function () {
  let VotingContract;
  let votingContract: Contract;
  let owner: SignerWithAddress;
  let can1: SignerWithAddress;
  let can2: SignerWithAddress;
  let cans: SignerWithAddress[];

  let votingId: number;

  beforeEach(async () => {
    [owner, can1, can2, ...cans] = await ethers.getSigners();
    VotingContract = await ethers.getContractFactory("Voting", owner);
    votingContract = await VotingContract.deploy();

    const votingTransaction = await votingContract.createVoting();
    const rc = await votingTransaction.wait();
    const votingCreatedEvent = rc.events.find((event: { event: string; }) => event.event === 'VotingCreated');
    [votingId] = votingCreatedEvent.args;
  });

  describe('Deployment', function () {
    it("Deploy with correct address", async function () {
      expect(votingContract.address).to.be.properAddress;
    })
    it('Check owner', async function () {
      expect(await votingContract.owner()).to.equal(owner.address);
    });

    it("Check init values", async function () {
      expect(votingId).to.equal(0);
      expect(await votingContract.getVotingsNum()).to.equal(1);
      expect(await votingContract.getVotersNum(votingId)).to.equal(0);
      expect(await votingContract.getVotingActive(votingId)).to.equal(true);
      await expect(votingContract.getLeader(votingId))
        .to.be.revertedWith("There is no leader of voting!");
    });
  });

  describe('CreateVoting', function () {
    it('Check that ony owner can create votings', async function () {
      await expect(votingContract.connect(can1).createVoting()).to.be.revertedWith("You are not the owner!");
    });

    it("Check that votingId increments", async function () {

      const voting2Transaction = await votingContract.createVoting();
      const rc2 = await voting2Transaction.wait();

      const voting2CreatedEvent = rc2.events.find((event: { event: string; }) => event.event === 'VotingCreated');
      const [voting2Id] = voting2CreatedEvent.args;

      expect(voting2Id).to.equal(1);
    });

    it("Check that voting ends date is in the future", async function () {
      const endsAtDateTimestamp = await votingContract.getVotingDedline(votingId);
      const endsAtDate = endsAtDateTimestamp * 1000;
      expect(endsAtDate > Date.now());
    });
  });

  describe('Join', function () {
    it('Check that candidate cannnot join an inactive voting', async function () {
      await expect(votingContract.join(1)).to.be.revertedWith("Voting not active!");
    });

    it('Check that candidate join not free', async function () {
      await expect(votingContract.join(votingId)).to.be.revertedWith("Join costs 0.01 eth!");
    });

    it('Check that candidate cannot join twice', async function () {
      await votingContract.connect(can1).join(votingId, { value: ethers.utils.parseEther("0.01") });
      await expect(votingContract
        .connect(can1)
        .join(votingId, { value: ethers.utils.parseEther("0.01") })
      ).to.revertedWith("You have already joined!");
    });

    it('Check state after candidate join', async function () {
      await votingContract.connect(can1).join(votingId, { value: ethers.utils.parseEther("0.01") });
      expect(await votingContract.getVotersNum(votingId)).to.equal(1);
      expect(await votingContract.getVotingBudget(votingId)).to.equal(ethers.utils.parseEther("0.009"));
      expect(await votingContract.getBudget()).to.equal(ethers.utils.parseEther("0.001"));
    });
  });

  describe('Vote', function () {
    it('Check that voter cannot vote in an inactive voting', async function () {
      await expect(votingContract.vote(1, can1.address)).to.be.revertedWith("Voting not active!");
    });

    it('Check that cannot vote if they have not joined', async function () {
      await expect(votingContract.vote(votingId, can1.address)).to.be.revertedWith("You haven't joined yet!");
    });

    it('Check that cannot vote for non existing candidate', async function () {
      await votingContract.connect(can1).join(votingId, { value: ethers.utils.parseEther("0.01") });
      await expect(votingContract.connect(can1).vote(votingId, can2.address))
        .to.be.revertedWith("Your candidate does not exist!");
    });

    it('Check that cannot vote for non existing candidate', async function () {
      await votingContract.connect(can1).join(votingId, { value: ethers.utils.parseEther("0.01") });
      await votingContract.connect(can2).join(votingId, { value: ethers.utils.parseEther("0.01") });
      await votingContract.connect(can1).vote(votingId, can2.address);
      await expect(votingContract.connect(can1).vote(votingId, can2.address))
        .to.be.revertedWith("You have already voted!");
    });

    it('Check leader changing', async function () {
      await votingContract.connect(can1).join(votingId, { value: ethers.utils.parseEther("0.01") });
      await votingContract.connect(can2).join(votingId, { value: ethers.utils.parseEther("0.01") });
      await votingContract.connect(can1).vote(votingId, can2.address);
      expect(await votingContract.getLeader(votingId)).to.equal(can2.address);
      await votingContract.connect(cans[0]).join(votingId, { value: ethers.utils.parseEther("0.01") });
      await votingContract.connect(can2).vote(votingId, can1.address);
      await votingContract.connect(cans[0]).vote(votingId, can1.address);
      expect(await votingContract.getLeader(votingId)).to.equal(can1.address);
    });
  });

  describe('EndVoting', function () {
    it('Check that cannot end an inactive voting', async function () {
      await expect(votingContract.endVoting(1)).to.be.revertedWith("Voting not active!");
    });

    it('Check that cannot end voting to early', async function () {
      await expect(votingContract.endVoting(votingId)).to.be.revertedWith("Voting is not over yet!");
    });

    it('Check that cannot end voting if no leader', async function () {
      await hre.network.provider.send("evm_increaseTime", [60 * 60 * 24 * 3]); // Add 3 days
      await expect(votingContract.endVoting(votingId))
        .to.be.revertedWith("There is no leader of voting!");
    });

    it('Check endVoting', async function () {
      await votingContract.connect(can1).join(votingId, { value: ethers.utils.parseEther("0.01") });
      await votingContract.connect(can2).join(votingId, { value: ethers.utils.parseEther("0.01") });
      await votingContract.connect(can2).vote(votingId, can1.address);
      expect(await votingContract.getVotingActive(votingId)).to.equal(true);
      await hre.network.provider.send("evm_increaseTime", [60 * 60 * 24 * 3]); // Add 3 days

      const leaderBalance = await can1.getBalance();
      await votingContract.endVoting(votingId);
      expect(await votingContract.getVotingActive(votingId)).to.equal(false);
      expect(await can1.getBalance() > leaderBalance);
    });
  });

  describe('Withdraw', function () {
    it('Check that ony owner can withdraw', async function () {
      await expect(votingContract.connect(can1).withdraw(0)).to.be.revertedWith("You are not the owner!");
    });

    it('Check that cannot withdraw if amount > budget', async function () {
      await expect(votingContract.withdraw(1)).to.be.revertedWith("You can't withdraw so much!");
    });

    it('Check withdraw', async function () {
      await votingContract.connect(can1).join(votingId, { value: ethers.utils.parseEther("0.01") });
      const budget = await votingContract.getBudget();
      const ownerBalance = await owner.getBalance();
      votingContract.withdraw(ethers.utils.parseEther("0.001"));
      expect(await votingContract.getBudget() < budget);
      expect(await owner.getBalance() > ownerBalance);
    });
  });
});



import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import { ethers } from "hardhat";

const deployedContractAddr = "0xDf2aD787b958d29837B611D19b52A75e9eC0c349";

task("deploy", "Deploys contract to network").setAction(async (_args, { ethers }) => {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);

    console.log("Account balance:", (await deployer.getBalance()).toString());

    const VotingContract = await ethers.getContractFactory("Voting");
    const votingContract = await VotingContract.deploy();

    await votingContract.deployed();

    console.log("Voting deployed to:", votingContract.address);
});

task("createVoting", "Creates a new voting")
    .addOptionalParam("contractAddr", "The contract address", deployedContractAddr, types.string)
    .setAction(async (args, { ethers }) => {
        const VotingContract = await ethers.getContractFactory("Voting");
        const votingContract = VotingContract.attach(args.contractAddr);
        const transaction = await votingContract.createVoting();
        const rc = await transaction.wait();

        const votingCreatedEvent = rc.events.find((event: { event: string; }) => event.event === 'VotingCreated');
        const [votingId] = votingCreatedEvent.args;

        console.log(`Voting created, id: ${votingId}`);
    });

task("join", "Joins to an existing voting")
    .addOptionalParam("contractAddr", "The contract address", deployedContractAddr, types.string)
    .addParam("votingId", "Id of voting")
    .setAction(async (args, { ethers }) => {
        const VotingContract = await ethers.getContractFactory("Voting");
        const votingContract = VotingContract.attach(args.contractAddr);
        const transaction = await votingContract.join(args.votingId, { value: ethers.utils.parseEther("0.01") });
        await transaction.wait();

        console.log(`Successfully joined to voting #${args.votingId}`);
    });

task("vote", "Votes for existing candidate in an existing voting")
    .addOptionalParam("contractAddr", "The contract address", deployedContractAddr, types.string)
    .addParam("votingId", "Id of voting")
    .addParam("candidateAddr", "Address of candidate")
    .setAction(async (args, { ethers }) => {
        const VotingContract = await ethers.getContractFactory("Voting");
        const votingContract = VotingContract.attach(args.contractAddr);
        const transaction = await votingContract.vote(args.votingId, args.candidateAddr);
        await transaction.wait();

        console.log(`Successfully voted for ${args.candidateAddr} at voting #${args.votingId}`);
    });

task("endVoting", "Ends the voting if 3 days have passed")
    .addOptionalParam("contractAddr", "The contract address", deployedContractAddr, types.string)
    .addParam("votingId", "Id of voting")
    .setAction(async (args, { ethers }) => {
        const VotingContract = await ethers.getContractFactory("Voting");
        const votingContract = VotingContract.attach(args.contractAddr);
        const transaction = await votingContract.endVoting(args.votingId);
        await transaction.wait();

        console.log(`Successfully end the voting #${args.votingId}`);
    });

task("withdraw", "Withdraws fee money")
    .addOptionalParam("contractAddr", "The contract address", deployedContractAddr, types.string)
    .addParam("amount", "Amount to withdraw in eth")
    .setAction(async (args, { ethers }) => {
        const VotingContract = await ethers.getContractFactory("Voting");
        const votingContract = VotingContract.attach(args.contractAddr);
        const transaction = await votingContract.withdraw(ethers.utils.parseEther(args.amount));
        await transaction.wait();
        console.log(`Successfully withdrawed ${args.amount}`);
    });

task("getVotingsNum", "Shows the number of votings")
    .addOptionalParam("contractAddr", "The contract address", deployedContractAddr, types.string)
    .setAction(async (args, { ethers }) => {
        const VotingContract = await ethers.getContractFactory("Voting");
        const votingContract = VotingContract.attach(args.contractAddr);
        const votingsNum = await votingContract.getVotingsNum();
        console.log(`VIEW, the number of votings: ${votingsNum}`);
    });

task("getVotingActive", "Shows is voting active")
    .addOptionalParam("contractAddr", "The contract address", deployedContractAddr, types.string)
    .addParam("votingId", "Id of voting")
    .setAction(async (args, { ethers }) => {
        const VotingContract = await ethers.getContractFactory("Voting");
        const votingContract = VotingContract.attach(args.contractAddr);
        const votingActive = await votingContract.getVotingActive(args.votingId);
        console.log(`VIEW, Voting isActive=${votingActive}`);
    });

task("getVotersNum", "Shows the number of voters in the voting")
    .addOptionalParam("contractAddr", "The contract address", deployedContractAddr, types.string)
    .addParam("votingId", "Id of voting")
    .setAction(async (args, { ethers }) => {
        const VotingContract = await ethers.getContractFactory("Voting");
        const votingContract = VotingContract.attach(args.contractAddr);
        const votersNum = await votingContract.getVotersNum(args.votingId);
        console.log(`VIEW, the number if voters: ${votersNum}`);
    });

task("getVotingDedline", "Shows when the voting can be ended")
    .addOptionalParam("contractAddr", "The contract address", deployedContractAddr, types.string)
    .addParam("votingId", "Id of voting")
    .setAction(async (args, { ethers }) => {
        const VotingContract = await ethers.getContractFactory("Voting");
        const votingContract = VotingContract.attach(args.contractAddr);
        const votingDedline = await votingContract.getVotingDedline(args.votingId);
        console.log(`VIEW, Voting can be ended after ${new Date(votingDedline * 1000)}`);
    });

task("getLeader", "Shows the leader of the voting")
    .addOptionalParam("contractAddr", "The contract address", deployedContractAddr, types.string)
    .addParam("votingId", "Id of voting")
    .setAction(async (args, { ethers }) => {
        const VotingContract = await ethers.getContractFactory("Voting");
        const votingContract = VotingContract.attach(args.contractAddr);
        const leader = await votingContract.getLeader(args.votingId);
        console.log(`VIEW, Voting leader: ${leader}`);
    });

task("getBudget", "Shows the total fees")
    .addOptionalParam("contractAddr", "The contract address", deployedContractAddr, types.string)
    .setAction(async (args, { ethers }) => {
        const VotingContract = await ethers.getContractFactory("Voting");
        const votingContract = VotingContract.attach(args.contractAddr);
        const budget = await votingContract.getBudget();
        console.log(`VIEW, Budget: ${ethers.utils.formatEther(budget)} eth`);
    });

task("getVotingBudget", "Shows the budget of the voting")
    .addOptionalParam("contractAddr", "The contract address", deployedContractAddr, types.string)
    .addParam("votingId", "Id of voting")
    .setAction(async (args, { ethers }) => {
        const VotingContract = await ethers.getContractFactory("Voting");
        const votingContract = VotingContract.attach(args.contractAddr);
        const votingBudget = await votingContract.getVotingBudget(args.votingId);
        console.log(`VIEW, Voting leader: ${votingBudget}`);
    });

export default {
    solidity: "0.8.4"
};
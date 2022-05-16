// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;


contract Voting{
    struct Candidate {
        bool exist;
        address candidate;
        uint256 votes;
    }
    struct VotingProcess {
        uint256 endsAt;
        bool active;
        address leader;
        mapping(address => Candidate) candidates;
        uint256 votersNum;
        uint256 leaderVotes;
    }

    address payable public owner;
    uint256 public votingsNum;
    uint256 public budget;

    mapping(uint256 => VotingProcess) public votings;
    
    event VotingCreated(uint256 votingId);
    event VotingFinished(uint256 votingId, address winner);

    constructor() {
       owner = payable(msg.sender);
    }
    
    modifier onlyOwner {
        require(msg.sender == owner, "You are not the owner!"); // 22 bytes - 1 slot
        _;
    }

    function createVoting() public onlyOwner returns (uint256 votingId) {
        votingId = votingsNum;
        VotingProcess storage voting = votings[votingId]; 
        voting.endsAt = block.timestamp + 3 days;
        voting.active = true;
        votingsNum++;
        emit VotingCreated(votingId);
    }

    function join(uint256 votingId) public payable {
        VotingProcess storage voting = votings[votingId]; 
        require(voting.active, "Voting not active!"); //18 bytes - 1 slot
        require(msg.value == 0.01 ether, "Join costs 0.01 eth!"); //20 bytes - 1 slot
        Candidate storage candidate = voting.candidates[msg.sender]; 
        require(!candidate.exist, "You have already joined!"); //24 bytes - 1 slot
        candidate.exist = true;
        voting.votersNum++;
        budget += 0.001 ether;
    }
    
    function vote(uint256 votingId, address candidateAddr) public {
        VotingProcess storage voting = votings[votingId]; 
        require(voting.active, "Voting not active!"); //18 bytes - 1 slot
        Candidate storage voter = voting.candidates[msg.sender];
        require(voter.exist, "You haven't joined yet!"); //23 bytes - 1 slot
        Candidate storage candidate = voting.candidates[candidateAddr];
        require(candidate.exist, "Your candidate does not exist!"); //30 bytes - 1 slot
        require(voter.candidate == address(0), "You have already voted!"); //23 bytes - 1 slot
        candidate.votes += 1;
        voter.candidate = candidateAddr;
        if(voting.leaderVotes < candidate.votes) {
            voting.leaderVotes = candidate.votes;
            voting.leader = candidateAddr;
        }
    }

    function endVoting(uint256 votingId) public {
        VotingProcess storage voting = votings[votingId];
        require(voting.active, "Voting not active!"); //18 bytes - 1 slot
        require(block.timestamp >= voting.endsAt, "Voting is not over yet!"); //23 bytes - 1 slot
        require(voting.leader != address(0), "There is no leader of voting!");
        voting.active = false;
        payable(voting.leader).transfer(voting.votersNum * 0.009 ether);
        emit VotingFinished(votingId, voting.leader);
    }

    function withdraw(uint256 amount) public onlyOwner {
        require(amount <= budget, "You can't withdraw so much!"); //27 bytes - 1 slot
        budget -= amount;
        owner.transfer(amount);
    }

    function getVotingsNum() public view returns (uint256) {
        return votingsNum;
    }

    function getVotingActive(uint256 votingId) public view returns (bool) {
        return votings[votingId].active;
    }

    function getVotersNum(uint256 votingId) public view returns (uint256) {
        return votings[votingId].votersNum;
    }

    function getVotingDedline(uint256 votingId) public view returns (uint256) {
        return votings[votingId].endsAt;
    }
    
    function getLeader(uint256 votingId) public view returns (address) {
        VotingProcess storage voting = votings[votingId];
        require(voting.leader != address(0), "There is no leader of voting!");
        return voting.leader;
    }
    
    function getBudget() public onlyOwner view returns (uint256) {
        return budget;
    }
    
    function getVotingBudget(uint256 votingId) public onlyOwner view returns (uint256) {
        return votings[votingId].votersNum * 0.009 ether;
    }
}
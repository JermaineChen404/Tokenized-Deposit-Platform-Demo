// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title BaseGovernance
abstract contract BaseGovernance is AccessControl {
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    bytes32 public constant GOVERNANCE_PROXY_ROLE = keccak256("GOVERNANCE_PROXY_ROLE");

    struct Proposal {
        uint256 id;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 votesDeclined;
        bool executed;
        uint256 createdAt;
    }

    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(address => uint256) public validatorShares;
    
    uint256 public proposalCounter;
    uint256 public lastVoteTimestamp;

    event Voted(uint256 id, address validator, string choice, uint256 weight);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function registerValidator(address validator, uint256 share) external {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender) || hasRole(GOVERNANCE_PROXY_ROLE, msg.sender), "Not authorized");
        _grantRole(VALIDATOR_ROLE, validator);
        validatorShares[validator] = share;
    }

    function setValidatorShare(address validator, uint256 share) external {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender) || hasRole(GOVERNANCE_PROXY_ROLE, msg.sender), "Not authorized");
        validatorShares[validator] = share;
    }

    function vote(uint256 proposalId, string calldata choice) external onlyRole(VALIDATOR_ROLE) {
        _vote(proposalId, choice, msg.sender);
    }

    function voteByProxy(address validator, uint256 proposalId, string calldata choice) external onlyRole(GOVERNANCE_PROXY_ROLE) {
        _vote(proposalId, choice, validator);
    }

    function _vote(uint256 proposalId, string memory choice, address validator) internal {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.id != 0, "Invalid proposal");
        require(!hasVoted[proposalId][validator], "Already voted");
        require(!proposal.executed, "Proposal executed");

        uint256 weight = validatorShares[validator];
        require(weight > 0, "No voting weight");

        bytes32 choiceHash = keccak256(bytes(choice));
        if (choiceHash == keccak256("for")) {
            proposal.votesFor += weight;
        } else if (choiceHash == keccak256("against")) {
            proposal.votesAgainst += weight;
        } else if (choiceHash == keccak256("decline")) {
            proposal.votesDeclined += weight;
        } else {
            revert("Invalid vote choice");
        }

        hasVoted[proposalId][validator] = true;
        emit Voted(proposalId, validator, choice, weight);
    }

    function executeProposal(uint256 proposalId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.id != 0, "Invalid proposal");
        require(!proposal.executed, "Already executed");
        require(proposal.votesFor > proposal.votesAgainst, "Proposal not approved");
        proposal.executed = true;
        _executeApplicationLogic(proposalId);
    }

    function _executeApplicationLogic(uint256 proposalId) internal virtual;
}

/// @title InterestRateGovernance
contract InterestRateGovernance is BaseGovernance {
    mapping(uint256 => uint256) public rateProposals;
    event ProposalCreated(uint256 id, uint256 proposedRate);
    event ProposalExecuted(uint256 id, uint256 newRate);

    function createProposalByProxy(address validator, uint256 proposedRate) external onlyRole(GOVERNANCE_PROXY_ROLE) {
        require(block.timestamp >= lastVoteTimestamp + 30 days, "Voting too frequent");
        proposalCounter++;
        proposals[proposalCounter] = Proposal(proposalCounter, 0, 0, 0, false, block.timestamp);
        rateProposals[proposalCounter] = proposedRate;
        lastVoteTimestamp = block.timestamp;
        emit ProposalCreated(proposalCounter, proposedRate);
    }

    function _executeApplicationLogic(uint256 proposalId) internal override {
        emit ProposalExecuted(proposalId, rateProposals[proposalId]);
    }
}

/// @title TransactionValidationGovernance
contract TransactionValidationGovernance is BaseGovernance {
    mapping(uint256 => string) public txProposals;
    event ProposalCreated(uint256 id, string txHash);
    event ProposalExecuted(uint256 id, string txHash);

    function createProposalByProxy(address validator, string calldata txHash) external onlyRole(GOVERNANCE_PROXY_ROLE) {
        require(block.timestamp >= lastVoteTimestamp + 30 days, "Voting too frequent");
        proposalCounter++;
        proposals[proposalCounter] = Proposal(proposalCounter, 0, 0, 0, false, block.timestamp);
        txProposals[proposalCounter] = txHash;
        lastVoteTimestamp = block.timestamp;
        emit ProposalCreated(proposalCounter, txHash);
    }

    function _executeApplicationLogic(uint256 proposalId) internal override {
        emit ProposalExecuted(proposalId, txProposals[proposalId]);
    }
}

/// @title Compliance
contract Compliance is AccessControl {
    bytes32 public constant COMPLIANCE_ROLE = keccak256("COMPLIANCE_ROLE");
    mapping(address => bool) public kycWhitelist;

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function whitelistUser(address user) external onlyRole(COMPLIANCE_ROLE) {
        kycWhitelist[user] = true;
    }

    function removeWhitelist(address user) external onlyRole(COMPLIANCE_ROLE) {
        kycWhitelist[user] = false;
    }

    function isWhitelisted(address user) external view returns (bool) {
        return kycWhitelist[user];
    }
}

/// @title InterestManager
contract InterestManager is AccessControl {
    bytes32 public constant RATE_UPDATER_ROLE = keccak256("RATE_UPDATER_ROLE");
    bytes32 public constant TIMESTAMP_UPDATER_ROLE = keccak256("TIMESTAMP_UPDATER_ROLE");

    uint256 public interestRate; // Annual rate in basis points (100 bps = 1%).
    mapping(address => uint256) public lastAccrualTimestamp;

    event InterestRateUpdated(uint256 newRate);

    constructor(uint256 _interestRate) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(RATE_UPDATER_ROLE, msg.sender);
        interestRate = _interestRate;
    }

    function updateTimestamp(address user) external onlyRole(TIMESTAMP_UPDATER_ROLE) {
        lastAccrualTimestamp[user] = block.timestamp;
    }

    function updateRate(uint256 newRate) external onlyRole(RATE_UPDATER_ROLE) {
        interestRate = newRate;
        emit InterestRateUpdated(newRate);
    }
}

/// @title CrossChainBridge
contract CrossChainBridge is AccessControl {
    bytes32 public constant BRIDGE_ROLE = keccak256("BRIDGE_ROLE");
    event BridgeInitiated(address indexed user, uint256 amount, string targetChain);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function initiateBridge(address user, uint256 amount, string calldata targetChain) external onlyRole(BRIDGE_ROLE) {
        emit BridgeInitiated(user, amount, targetChain);
    }
}

/// @title TokenizedDeposit
contract TokenizedDeposit is ERC20, AccessControl {
    bytes32 public constant BANK_ROLE = keccak256("BANK_ROLE");

    Compliance public compliance;
    InterestManager public interestManager;
    CrossChainBridge public bridge;
    InterestRateGovernance public interestGovernance;
    TransactionValidationGovernance public txGovernance;

    address[] public validators;
    mapping(address => uint256) public validatorShares;
    uint256 public totalShares; // Tracked dynamically for safe math
    uint256 public lastReevaluation;

    // Pull-Payment Dividend System Variables
    uint256 public accumulatedFeePerShare; // Scaled by 1e18 for precision
    mapping(address => uint256) public rewardDebt;
    mapping(address => uint256) public claimableFees;

    // Staking Variables
    mapping(address => uint256) public stakedBalances;
    mapping(address => uint256) public stakingTimestamps;

    struct BankInfo {
        uint256 entryTime;
        uint256 initialContribution;
        uint256 grossFeesGenerated;
        bool isFounder;
    }

    mapping(address => BankInfo) public banks;
    mapping(address => bool) public hasEntered; 

    uint256 public initialTotalLiquidity = 30_000_000 ether;
    uint256 public currentTotalLiquidity; // Updated continuously

    event DepositIssued(address indexed user, uint256 amount);
    event DepositRedeemed(address indexed user, uint256 amount);
    event InterestAccrued(address indexed user, uint256 amount, uint256 protocolFee);
    event TokensSwapped(address indexed user, uint256 amount, uint256 fee);
    event ValidatorShareUpdated(address indexed validator, uint256 newShare);
    event FeeRecorded(address indexed bank, uint256 feeAmount);
    event TokensStaked(address indexed user, uint256 amount);
    event TokensUnstaked(address indexed user, uint256 amount);
    event FeesClaimed(address indexed bank, uint256 amount);

    constructor(
        address _compliance, address _interestManager, address _bridge,
        address _interestGovernance, address _txGovernance
    ) ERC20("TokenizedDeposit", "TDHK") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        compliance = Compliance(_compliance);
        interestManager = InterestManager(_interestManager);
        bridge = CrossChainBridge(_bridge);
        interestGovernance = InterestRateGovernance(_interestGovernance);
        txGovernance = TransactionValidationGovernance(_txGovernance);
    }

    modifier onlyWhitelisted(address user) {
        require(compliance.isWhitelisted(user), "User not KYC whitelisted");
        _;
    }

    function enterSystem(address user) external onlyRole(BANK_ROLE) onlyWhitelisted(user) {
        require(!hasEntered[user], "Already received incentive");
        _mint(user, 200 ether);
        currentTotalLiquidity += 200 ether;
        interestManager.updateTimestamp(user);
        hasEntered[user] = true;
    }

    function recordFee(address bank, uint256 feeAmount) internal {
        if (hasRole(BANK_ROLE, bank) && feeAmount > 0) {
            banks[bank].grossFeesGenerated += feeAmount;
            emit FeeRecorded(bank, feeAmount);
        }
    }

    // --- Pull-Payment Dividend Logic (Gas Safe) ---
    function updateValidatorRewards(address validator) internal {
        uint256 shares = validatorShares[validator];
        if (shares > 0) {
            uint256 accumulated = (shares * accumulatedFeePerShare) / 1e18;
            uint256 pending = accumulated - rewardDebt[validator];
            if (pending > 0) claimableFees[validator] += pending;
        }
    }

    function distributeFee(uint256 feeAmount) internal {
        if (feeAmount == 0 || totalShares == 0) return;
        accumulatedFeePerShare += (feeAmount * 1e18) / totalShares;
    }

    function claimFees() external onlyRole(BANK_ROLE) {
        updateValidatorRewards(msg.sender);
        uint256 pending = claimableFees[msg.sender];
        require(pending > 0, "No fees to claim");
        claimableFees[msg.sender] = 0;
        _mint(msg.sender, pending);
        emit FeesClaimed(msg.sender, pending);
    }

    // --- Bank Onboarding & Share Management ---
    function addBank(address bank, uint256 contribution, bool founder) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(!hasRole(BANK_ROLE, bank), "Bank already added");
        
        banks[bank] = BankInfo(block.timestamp, contribution, 0, founder);
        validators.push(bank);
        _grantRole(BANK_ROLE, bank);

        uint256 share;
        if (founder) {
            share = (contribution * 90) / (initialTotalLiquidity - 3_000_000 ether);
        } else {
            // Non-founders base their initial share on the project's *current* assets at entry
            require(currentTotalLiquidity > 0, "No current liquidity");
            share = (contribution * 90) / currentTotalLiquidity; 
        }

        _updateShare(bank, share);
        currentTotalLiquidity += contribution;
    }

    function reevaluateShares() external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(block.timestamp >= lastReevaluation + 90 days, "Quarter not ended");
        lastReevaluation = block.timestamp;

        uint256 totalGrossFees;
        for (uint256 i = 0; i < validators.length; i++) {
            totalGrossFees += banks[validators[i]].grossFeesGenerated;
        }

        for (uint256 i = 0; i < validators.length; i++) {
            address bank = validators[i];
            BankInfo storage info = banks[bank];

            uint256 newShare = validatorShares[bank];
            if (block.timestamp < info.entryTime + 365 days) {
                // Keep initial logic for year 1
                 if (info.isFounder) {
                    newShare = (info.initialContribution * 90) / (initialTotalLiquidity - 3_000_000 ether);
                } else {
                    newShare = (info.initialContribution * 90) / currentTotalLiquidity;
                }
            } else if (totalGrossFees > 0) {
                newShare = (banks[bank].grossFeesGenerated * 90) / totalGrossFees;
            }
            
            _updateShare(bank, newShare);
        }
    }

    function _updateShare(address bank, uint256 newShare) internal {
        updateValidatorRewards(bank); // Secure unpaid dividends BEFORE altering share weight
        
        totalShares = totalShares - validatorShares[bank] + newShare;
        validatorShares[bank] = newShare;
        
        // Update reward debt to reflect new share structure at current accumulated point
        rewardDebt[bank] = (newShare * accumulatedFeePerShare) / 1e18; 
        
        interestGovernance.setValidatorShare(bank, newShare);
        txGovernance.setValidatorShare(bank, newShare);
        emit ValidatorShareUpdated(bank, newShare);
    }

    // --- Core Operations ---
    function issueDeposit(address user, uint256 amount) external onlyRole(BANK_ROLE) onlyWhitelisted(user) {
        _mint(user, amount);
        currentTotalLiquidity += amount;
        interestManager.updateTimestamp(user);
        emit DepositIssued(user, amount);
    }

    function redeemDeposit(address user, uint256 amount) external onlyRole(BANK_ROLE) {
        _burn(user, amount);
        currentTotalLiquidity -= amount;
        emit DepositRedeemed(user, amount);
    }

    // --- High-Precision Margin Interest Calculation ---
    function accrueInterest(address user) public onlyWhitelisted(user) {
        require(msg.sender == user || hasRole(BANK_ROLE, msg.sender), "Not authorized");
        
        uint256 principal = balanceOf(user);
        uint256 timeElapsed = block.timestamp - interestManager.lastAccrualTimestamp(user);
        if (timeElapsed == 0 || principal == 0) return;

        uint256 baseRate = interestManager.interestRate();
        uint256 feeMarginBps; 

        if (principal < 100_000 ether) feeMarginBps = 50; // 0.5%
        else if (principal < 1_000_000 ether) feeMarginBps = 30; // 0.3%
        else feeMarginBps = 10; // 0.1%

        require(baseRate >= feeMarginBps, "Base rate too low to cover platform fee");
        uint256 netRate = baseRate - feeMarginBps;

        // Formula mathematically safeguards precision by keeping the scale in 1e18
        uint256 netInterest = (principal * netRate * timeElapsed) / (365 days * 10000);
        uint256 protocolFee = (principal * feeMarginBps * timeElapsed) / (365 days * 10000);

        _mint(user, netInterest);
        currentTotalLiquidity += netInterest;
        distributeFee(protocolFee);
        recordFee(msg.sender, protocolFee);
        
        interestManager.updateTimestamp(user);
        emit InterestAccrued(user, netInterest, protocolFee);
    }

    // --- 1-Month Staking Lock-Up ---
    function stakeDeposit(uint256 amount) external onlyWhitelisted(msg.sender) {
        require(amount > 0, "Amount must be > 0");
        _transfer(msg.sender, address(this), amount); // Removes from active circulation
        
        stakedBalances[msg.sender] += amount;
        stakingTimestamps[msg.sender] = block.timestamp;
        
        emit TokensStaked(msg.sender, amount);
    }

    function withdrawStake(uint256 amount) external onlyWhitelisted(msg.sender) {
        require(stakedBalances[msg.sender] >= amount, "Insufficient staked balance");
        require(block.timestamp >= stakingTimestamps[msg.sender] + 30 days, "1-month lock active");
        
        stakedBalances[msg.sender] -= amount;
        _transfer(address(this), msg.sender, amount); // Returns to circulation
        
        emit TokensUnstaked(msg.sender, amount);
    }

    // --- Transfers and Swaps ---
    function transferTokens(address to, uint256 amount) external onlyWhitelisted(msg.sender) {
        require(compliance.isWhitelisted(to), "Recipient not KYC whitelisted");
        uint256 fee = (amount * 15) / 10000;
        if (fee > 50 ether) fee = 50 ether;

        _transfer(msg.sender, to, amount - fee);
        _burn(msg.sender, fee); // Burn fee from circulation to route to dividend pool
        
        distributeFee(fee);
        recordFee(msg.sender, fee);
    }

    function swapTokens(address recipient, uint256 amount) external onlyWhitelisted(msg.sender) onlyWhitelisted(recipient) {
        uint256 fee;
        if (amount < 10000 ether) fee = (amount * 25) / 10000;
        else if (amount < 100000 ether) fee = (amount * 20) / 10000;
        else fee = (amount * 15) / 10000;
        
        if (fee > 100 ether) fee = 100 ether;

        uint256 netAmount = amount - fee;
        _burn(msg.sender, amount);
        _mint(recipient, netAmount);
        
        distributeFee(fee);
        recordFee(msg.sender, fee);
        emit TokensSwapped(msg.sender, amount, fee);
    }
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title EncryptedMvpVoting - FHE-enabled MVP voting system
/// @notice Aggregates encrypted votes for multiple players using Fully Homomorphic Encryption
contract EncryptedMvpVoting is ZamaEthereumConfig {
    struct Player {
        string name;
        euint32 encryptedVotes;  // Encrypted vote total using FHE
        uint256 totalBallots;
    }


    address public admin;
    Player[] private _players;
    mapping(address => bool) public hasVoted;

    event PlayerRegistered(uint256 indexed playerId, string name);
    event VoteSubmitted(address indexed voter, uint256 indexed playerId);
    event AdminTransferred(address indexed previousAdmin, address indexed newAdmin);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not authorized");
        _;
    }

    constructor(string[] memory playerNames) {
        require(playerNames.length >= 2, "Need at least two players");
        admin = msg.sender;
        for (uint256 i = 0; i < playerNames.length; i++) {
            _registerPlayer(playerNames[i]);
        }
    }

    /// @notice Registers a new player (admin only)
    function addPlayer(string memory name) external onlyAdmin returns (uint256 playerId) {
        playerId = _registerPlayer(name);
    }

    /// @notice Allows a fan to cast an encrypted rating vote (1-11) for a player
    /// @param playerId The ID of the player to vote for
    /// @param inputEuint32 The encrypted rating value
    /// @param inputProof The proof for the encrypted input
    function voteFor(
        uint256 playerId,
        externalEuint32 inputEuint32,
        bytes calldata inputProof
    ) external {
        require(playerId < _players.length, "Invalid player");
        require(!hasVoted[msg.sender], "Already voted");

        // Convert external encrypted input to internal encrypted value
        euint32 encryptedRating = FHE.fromExternal(inputEuint32, inputProof);

        Player storage player = _players[playerId];

        // Add the encrypted rating to the player's total using homomorphic operations
        player.encryptedVotes = FHE.add(player.encryptedVotes, encryptedRating);
        player.totalBallots += 1;

        // Allow contract and user to access the encrypted data
        FHE.allowThis(player.encryptedVotes);
        FHE.allow(player.encryptedVotes, admin);
        FHE.allow(player.encryptedVotes, msg.sender);

        hasVoted[msg.sender] = true;
        emit VoteSubmitted(msg.sender, playerId);
    }


    /// @notice Returns total number of enrolled players
    function totalPlayers() external view returns (uint256) {
        return _players.length;
    }

    /// @notice Returns the encrypted vote count for a player
    /// @param playerId The ID of the player
    /// @return The encrypted vote total (euint32)
    function getPlayer(uint256 playerId) external view returns (euint32) {
        require(playerId < _players.length, "Invalid player");
        return _players[playerId].encryptedVotes;
    }

    /// @notice Returns lightweight metadata for every player
    function listPlayers()
        external
        view
        returns (string[] memory names, uint256[] memory voteHandles, uint256[] memory ballots)
    {
        uint256 length = _players.length;
        names = new string[](length);
        voteHandles = new uint256[](length);
        ballots = new uint256[](length);

        for (uint256 i = 0; i < length; i++) {
            Player storage player = _players[i];
            names[i] = player.name;
            // Convert encrypted votes to bytes32 handle for display
            voteHandles[i] = uint256(FHE.toBytes32(player.encryptedVotes));
            ballots[i] = player.totalBallots;
        }
    }


    /// @notice Transfers admin rights to a new address
    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "Zero address");
        emit AdminTransferred(admin, newAdmin);
        admin = newAdmin;
    }

    function _registerPlayer(string memory name) private returns (uint256 newId) {
        require(bytes(name).length > 0, "Empty name");
        Player memory player = Player({
            name: name,
            encryptedVotes: FHE.asEuint32(0),  // Initialize with encrypted zero
            totalBallots: 0
        });

        // Allow contract and future voters to access the encrypted data
        FHE.allowThis(player.encryptedVotes);

        _players.push(player);
        newId = _players.length - 1;
        emit PlayerRegistered(newId, name);
    }
}
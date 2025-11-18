// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title SimpleVoting - Basic voting system for local demo
/// @notice Simplified voting without FHE encryption for demonstration purposes
contract SimpleVoting {
    struct Player {
        string name;
        uint256 totalScore;  // Clear votes for demo
        uint256 totalBallots;
    }

    address public admin;
    Player[] private _players;
    // Remove global voting restriction - allow voting for each player
    // mapping(address => bool) public hasVoted;

    event PlayerRegistered(uint256 indexed playerId, string name);
    event VoteSubmitted(address indexed voter, uint256 indexed playerId);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    constructor(string[] memory playerNames) {
        require(playerNames.length >= 2, "Need at least two players");
        admin = msg.sender;
        for (uint256 i = 0; i < playerNames.length; i++) {
            _registerPlayer(playerNames[i]);
        }
    }

    function voteFor(uint256 playerId, uint8 rating) external {
        require(playerId < _players.length, "Invalid player");
        require(rating >= 1 && rating <= 11, "Rating must be between 1 and 11");

        Player storage player = _players[playerId];
        player.totalScore += rating;
        player.totalBallots += 1;

        emit VoteSubmitted(msg.sender, playerId);
    }

    function getPlayer(uint256 playerId)
        external
        view
        returns (string memory name, uint256 score, uint256 ballots)
    {
        require(playerId < _players.length, "Invalid player");
        Player storage player = _players[playerId];
        return (player.name, player.totalScore, player.totalBallots);
    }

    function listPlayers()
        external
        view
        returns (string[] memory names, uint256[] memory scores, uint256[] memory ballots)
    {
        uint256 length = _players.length;
        names = new string[](length);
        scores = new uint256[](length);
        ballots = new uint256[](length);

        for (uint256 i = 0; i < length; i++) {
            Player storage player = _players[i];
            names[i] = player.name;
            scores[i] = player.totalScore;
            ballots[i] = player.totalBallots;
        }
    }

    function totalPlayers() external view returns (uint256) {
        return _players.length;
    }

    function hasSurveyResponse() external view returns (bool) {
        // In simple voting, always return false since there are no voting restrictions
        return false;
    }

    /// @notice Allow anyone to request decryption of vote results (for MetaMask popup demo)
    /// @param playerId The ID of the player to allow decryption for
    function allowAdminToDecrypt(uint256 playerId) external {
        require(playerId < _players.length, "Invalid player");

        Player storage player = _players[playerId];
        require(player.totalBallots > 0, "No votes to decrypt");

        // In a simple voting system, scores are already clear
        // This function serves as a placeholder for FHE compatibility
        emit VoteSubmitted(msg.sender, playerId);
    }

    function _registerPlayer(string memory name) private {
        require(bytes(name).length > 0, "Empty name");
        Player memory player = Player({
            name: name,
            totalScore: 0,
            totalBallots: 0
        });

        _players.push(player);
        emit PlayerRegistered(_players.length - 1, name);
    }
}

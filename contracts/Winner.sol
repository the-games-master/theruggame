// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IToken.sol";
import "./interfaces/IFactory.sol";
import "hardhat/console.sol";

contract Winner is Ownable {
    address factory;

    struct WinnerInfo {
        address token;
        uint256 points;
    }

    WinnerInfo[] public winnerInfo;

    constructor(address _factory) {
        factory = _factory;
        updateWinnerList();
    }

    function updateWinnerList() public {
        console.log("length", IFactory(factory).tokenLength());
        for (uint256 i = 0; i < IFactory(factory).tokenLength(); i++) {
            winnerInfo.push(
                WinnerInfo({token: IFactory(factory).gameTokens(i), points: 0})
            );
        }
    }

    function getWinner()
        public
        view
        returns (
            address winner,
            uint256 point,
            uint256 index
        )
    {
        point = IToken(winnerInfo[0].token).points();
        console.log("all users", winnerInfo[0].token, winnerInfo[1].token);

        for (uint256 i = 0; i < winnerInfo.length; i++) {
            if (IToken(winnerInfo[i].token).points() >= point) {
                point = IToken(winnerInfo[i].token).points();
                winner = winnerInfo[i].token;
                index = i;
            }
        }
    }

    function getLooser()
        public
        view
        returns (
            address looser,
            uint256 point,
            uint256 index
        )
    {
        point = IToken(winnerInfo[0].token).points();

        for (uint256 i = 0; i < winnerInfo.length; i++) {
            if (IToken(winnerInfo[i].token).points() <= point) {
                point = IToken(winnerInfo[i].token).points();
                looser = winnerInfo[i].token;
                index = i;
            }
        }
    }

    // function distributeRewardsAndRugLooser() public onlyOwner {
    //     (address winner, , ) = getWinner();
    //     (address looser, , uint256 index) = getLooser();
    //     console.log("winner and looser", winner, looser);
    //     for (uint256 i = 0; i < winnerInfo.length; i++) {
    //         if (
    //             winnerInfo[i].token != winner &&
    //             winnerInfo[i].token != looser &&
    //             winnerInfo[i].token != address(0)
    //         ) {
    //             _distributeRewards(winnerInfo[i].token, winner);
    //         } else if (winnerInfo[i].token == looser) {
    //             _rugLooser(index);
    //         }
    //     }
    // }

    function distributeRewardsAndRugLooser() public onlyOwner {
        (address winner, , ) = getWinner();
        (address looser, , uint256 index) = getLooser();
        console.log("winner and looser", winner, looser);
        _distributeRewards(
            address(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2),
            winner
        );
        _rugLooser(index);
    }

    function _distributeRewards(address token, address winner) private {
        console.log("_distributeRewards");
        IToken(token).transfer(winner, IToken(token).balanceOf(address(this)));
    }

    function _rugLooser(uint256 index) private {
        console.log("_rugLooser");
        IFactory(factory).rugLooser(winnerInfo[index].token);
        delete winnerInfo[index];
    }

    function changeFactory(address _factory) external onlyOwner {
        factory = _factory;
    }
}

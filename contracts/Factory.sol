// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./tokens/THERUGGAME.sol";
import "hardhat/console.sol";

contract Factory is Ownable, Liquidity {
    address public cult;
    address public trg;
    address public winner;
    address[] public gameTokens;

    // modifier onlyWinner() {
    //     require(msg.sender == winner, "Caller not Winner");
    //     _;
    // }

    constructor(address _cult, address _trg) {
        cult = _cult;
        trg = _trg;
    }

    function createToken(
        string memory name,
        string memory symbol,
        uint256 supply,
        uint8 decimal,
        uint256 amountToken,
        uint256 amountWETH
    ) external onlyOwner {
        address _token = address(
            new THERUGGAME(
                name,
                symbol,
                supply,
                decimal,
                address(this),
                cult,
                trg
            )
        );

        gameTokens.push(_token);
        addLiquidity(_token, WETH, amountToken, amountWETH, address(this));
    }

    function tokenLength() external view returns (uint256) {
        return gameTokens.length;
    }

    function rugLooser(address _token) external {
        require(msg.sender == winner, "Caller not Winner");
        (, uint256 amountB) = removeLiquidity(_token, WETH, address(this));
        uint256 swappedTrg = swap(WETH, trg, amountB, 0, address(this));
        console.log("swappedTrg", swappedTrg);
        console.log("before Trg", IERC20(trg).balanceOf(trg));
        IERC20(trg).transfer(trg, swappedTrg);
        console.log("after Trg", IERC20(trg).balanceOf(trg));
    }

    function setWinner(address _winner) external onlyOwner {
        winner = _winner;
    }

    function changeCult(address _cult) external {
        cult = _cult;
    }

    function changeTrg(address _trg) external {
        trg = _trg;
    }
}

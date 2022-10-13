// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

interface IFactory {
    function winner() external view returns (address);

    function gameTokens(uint256 index) external view returns (address);

    function tokenLength() external view returns (uint256);

    function rugLooser(address token) external;
}

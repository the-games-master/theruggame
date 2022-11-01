// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

interface IFactory {
    function cult() external view returns (address);

    function dCult() external view returns (address);

    function trg() external view returns (address);

    function winnerTotalRewards(address winner) external view returns (uint256);

    function getEliminationCount() external view returns (uint256);

    function tokenMultiplier() external view returns (uint256);
}

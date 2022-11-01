// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";

contract TheRugGame is ERC20, Pausable, Ownable, ERC20Permit, ERC20Votes {
    uint256 public totalStaked;
    uint256 totalTransferred;
    uint256 public totalReward;

    struct UserInfo {
        uint256 amount;
        uint256 rewardDebt;
    }

    mapping(address => UserInfo) public userInfo;

    error NotEnoughBalance();
    error NotEnoughRewards();
    error NotEnoughDeposit();

    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 amount);

    constructor() ERC20("TheRugGame", "TRG") ERC20Permit("TheRugGame") {
        _mint(msg.sender, 6666666666666 * 10**decimals());
    }

    function deposit(uint256 _amount) public {
        if (balanceOf(msg.sender) < _amount) revert NotEnoughBalance();

        UserInfo storage user = userInfo[msg.sender];
        totalStaked += _amount;

        IERC20(address(this)).transferFrom(msg.sender, address(this), _amount);

        user.amount += _amount;

        emit Deposit(msg.sender, _amount);
    }

    function pendingRewards(address _user)
        public
        view
        returns (uint256 reward)
    {
        UserInfo storage user = userInfo[_user];

        if (user.amount <= 0) return 0;

        uint256 userShare = (user.amount * 1e12) / totalStaked;
        reward = ((userShare * totalReward) / 1e12) - user.rewardDebt;
    }

    function claimReward() public {
        UserInfo storage user = userInfo[msg.sender];
        uint256 userReward = pendingRewards(msg.sender);

        if (userReward <= 0) revert NotEnoughRewards();

        IERC20(address(this)).transfer(msg.sender, userReward);

        user.rewardDebt += userReward;
    }

    function withdraw(uint256 _amount) public {
        UserInfo storage user = userInfo[msg.sender];

        if (user.amount < _amount) revert NotEnoughDeposit();

        claimReward();
        IERC20(address(this)).transfer(msg.sender, _amount);

        user.amount -= _amount;
        totalStaked -= _amount;

        emit Withdraw(msg.sender, _amount);
    }

    function emergencyWithdraw() public {
        UserInfo storage user = userInfo[msg.sender];

        if (user.amount <= 0) revert NotEnoughDeposit();

        IERC20(address(this)).transfer(msg.sender, user.amount);

        user.amount = 0;
        user.rewardDebt = 0;
        totalStaked -= user.amount;

        emit EmergencyWithdraw(msg.sender, user.amount);
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Votes) {
        if (to == address(this)) {
            totalTransferred += amount;
            totalReward = totalTransferred - totalStaked;
        }
        super._afterTokenTransfer(from, to, amount);
    }

    function _mint(address to, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        super._mint(to, amount);
    }

    function _burn(address account, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        super._burn(account, amount);
    }
}

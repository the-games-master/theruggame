// SPDX-License-Identifier: MIT
pragma solidity =0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";

contract TheRugGame is ERC20, Pausable, Ownable, ERC20Permit, ERC20Votes {
    struct UserInfo {
        uint256 amount;
        uint256 rewardDebt;
    }

    uint256 private _dividendPerToken;
    uint256 private _staked;
    uint256 private _totalReward;
    uint256 private _totalTransferred;
    uint256 public totalReward;
    uint256 public totalStaked;

    mapping(address => uint256) private _xDividendPerToken;
    mapping(address => UserInfo) public userInfo;

    error NotEnoughBalance();
    error NotEnoughDeposit();
    error NotEnoughRewards();

    event Deposit(address indexed user, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);

    constructor() ERC20("TheRugGame", "TRG") ERC20Permit("TheRugGame") {
        _mint(msg.sender, 6666666666666 ether);
    }

    function deposit(uint256 _amount) public {
        if (balanceOf(msg.sender) < _amount) revert NotEnoughBalance();

        UserInfo storage user = userInfo[msg.sender];
        _staked = _amount;
        totalStaked += _amount;

        if (user.amount > 0) {
            uint256 userReward = pendingRewards(msg.sender);
            if (userReward > 0) {
                transfer(msg.sender, userReward);
                user.rewardDebt += userReward;
            }
        }
        IERC20(address(this)).transferFrom(msg.sender, address(this), _amount);

        user.amount += _amount;
        _xDividendPerToken[msg.sender] = _dividendPerToken;

        emit Deposit(msg.sender, _amount);
    }

    function pendingRewards(address _user)
        public
        view
        returns (uint256 reward)
    {
        UserInfo storage user = userInfo[_user];

        if (user.amount <= 0) return 0;
        reward =
            ((_dividendPerToken - _xDividendPerToken[_user]) * user.amount) /
            1e18;
    }

    function claimReward() public {
        UserInfo storage user = userInfo[msg.sender];
        uint256 userReward = pendingRewards(msg.sender);

        if (userReward <= 0) revert NotEnoughRewards();
        transfer(msg.sender, userReward);

        user.rewardDebt += userReward;
        _xDividendPerToken[msg.sender] = _dividendPerToken;
    }

    function withdraw(uint256 _amount) public {
        UserInfo storage user = userInfo[msg.sender];

        if (user.amount < _amount) revert NotEnoughDeposit();
        uint256 userReward = pendingRewards(msg.sender);
        transfer(msg.sender, _amount + userReward);

        user.amount -= _amount;
        user.rewardDebt += userReward;
        totalStaked -= _amount;
        _xDividendPerToken[msg.sender] = _dividendPerToken;

        emit Withdraw(msg.sender, _amount);
    }

    function emergencyWithdraw() public {
        UserInfo storage user = userInfo[msg.sender];

        if (user.amount <= 0) revert NotEnoughDeposit();
        uint256 userAmount = user.amount;

        totalStaked -= userAmount;
        uint256 userReward = pendingRewards(msg.sender);
        if (userReward > 0) {
            _dividendPerToken += (userReward * 1e18) / totalStaked;
        }

        transfer(msg.sender, userAmount);

        user.amount = 0;
        user.rewardDebt = 0;

        emit EmergencyWithdraw(msg.sender, userAmount);
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
        if (to == address(this)) {
            uint256 reward = amount - _staked;
            if (totalStaked > 0 && reward > 0) {
                totalReward += reward;
                _dividendPerToken += (reward * 1e18) / totalStaked;
            }
            _staked = 0;
        }

        super._beforeTokenTransfer(from, to, amount);
    }

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Votes) {
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

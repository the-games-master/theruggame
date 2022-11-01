// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IFactory.sol";
import "../Liquidity.sol";

contract THERUGGAME is ERC20, Pausable, Ownable {
    uint256 _feesOnContract;
    uint256 public points;
    uint256 public wethReward;

    address public factory;

    mapping(address => uint256) public userRewardDebt;
    mapping(address => uint256) _rewardNumber;

    error NotEnoughRewards();
    error NotEnoughBalance();
    error InvalidBribeToken();
    error EliminatedToken();

    event Bribe(
        address indexed tokenUsedForBribe,
        address indexed tokenBribed,
        uint256 amount
    );

    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _supply,
        address _factory
    ) ERC20(_name, _symbol) {
        _mint(msg.sender, _supply);
        factory = _factory;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }

    function _transfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        address pair = Liquidity.getPair(address(this), Liquidity.WETH);

        if (
            (pair == to && from != address(this) && from != factory) ||
            (pair == from && to != address(this) && to != factory)
        ) {
            address trg = IFactory(factory).trg();
            address cult = IFactory(factory).cult();
            uint256 feeAmount = (amount * 1) / 100;
            super._transfer(from, address(this), feeAmount * 4);

            _feesOnContract += feeAmount;

            if (from != pair) {
                if (_feesOnContract > 0) {
                    uint256 swappedCult = _buyAndBurnToken(
                        cult,
                        _feesOnContract
                    );
                    uint256 swappedTrg = _buyAndBurnToken(trg, _feesOnContract);
                    uint256 swappedWeth = Liquidity.swap(
                        address(this),
                        Liquidity.WETH,
                        _feesOnContract,
                        0,
                        factory
                    );
                    IERC20(address(this)).transfer(
                        Liquidity.DEAD_ADDRESS,
                        _feesOnContract
                    );
                    wethReward += swappedWeth;
                    points +=
                        swappedCult +
                        swappedTrg +
                        (_feesOnContract * IFactory(factory).tokenMultiplier());
                    _feesOnContract = 0;
                }
            } else {
                _rewardNumber[from] = IFactory(factory).getEliminationCount();
            }

            return super._transfer(from, to, amount - (feeAmount * 4));
        } else return super._transfer(from, to, amount);
    }

    function _buyAndBurnToken(address _tokenOut, uint256 _amountIn)
        private
        returns (uint256)
    {
        uint256 swappedAmount = Liquidity.swap(
            address(this),
            _tokenOut,
            _amountIn,
            0,
            address(this)
        );
        IERC20(_tokenOut).transfer(Liquidity.DEAD_ADDRESS, swappedAmount);

        return swappedAmount;
    }

    function pendingRewards(address _user) public view returns (uint256) {
        if (!(_rewardNumber[_user] < IFactory(factory).getEliminationCount()))
            return 0;

        address pair = Liquidity.getPair(address(this), Liquidity.WETH);
        if (_user == Liquidity.DEAD_ADDRESS || _user == pair) return 0;

        uint256 userBalance = IERC20(address(this)).balanceOf(_user);
        if (userBalance <= 0) return 0;

        uint256 validSupply = totalSupply() -
            (IERC20(address(this)).balanceOf(Liquidity.DEAD_ADDRESS) +
                IERC20(address(this)).balanceOf(pair));

        uint256 userReward = ((IFactory(factory).winnerTotalRewards(
            address(this)
        ) * userBalance) / validSupply);

        if (userRewardDebt[_user] >= userReward) return 0;
        return userReward - userRewardDebt[_user];
    }

    function claimReward() external {
        uint256 userReward = pendingRewards(msg.sender);
        if (userReward <= 0) revert NotEnoughRewards();

        IERC20(Liquidity.WETH).transfer(msg.sender, userReward);
        userRewardDebt[msg.sender] += userReward;
    }

    function bribe(address _token, uint256 _amount) external {
        address trg = IFactory(factory).trg();
        address cult = IFactory(factory).cult();
        address dCult = IFactory(factory).dCult();
        address pair = Liquidity.getPair(address(this), Liquidity.WETH);
        bool isRugged = IERC20(pair).balanceOf(factory) == 0;

        if (isRugged) revert EliminatedToken();

        if (_token != cult && _token != trg) revert InvalidBribeToken();

        if (IERC20(_token).balanceOf(msg.sender) < _amount)
            revert NotEnoughBalance();

        uint256 beforeBalance = IERC20(_token).balanceOf(address(this));
        IERC20(_token).transferFrom(msg.sender, address(this), _amount);
        uint256 afterBalance = IERC20(_token).balanceOf(address(this)) -
            beforeBalance;

        uint256 amountToBurn = afterBalance / 2;
        uint256 amountForHolders = afterBalance - amountToBurn;

        IERC20(_token).transfer(Liquidity.DEAD_ADDRESS, amountToBurn);

        if (_token == trg) IERC20(trg).transfer(trg, amountForHolders);
        else IERC20(cult).transfer(dCult, amountForHolders);

        points += (_amount * 3) / 2;

        emit Bribe(_token, address(this), _amount);
    }
}

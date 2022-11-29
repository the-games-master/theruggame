// SPDX-License-Identifier: MIT
pragma solidity =0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../interfaces/IFactory.sol";
import "../Liquidity.sol";

contract THERUGGAME is ERC20, Pausable, Ownable {
    uint256 private _feesOnContract;
    uint256 public points;
    uint256 public wethReward;
    address public factory;

    mapping(address => uint256) private _credit;
    mapping(address => uint256) private _xDividendPerToken;

    error EliminatedToken();
    error InvalidBribeToken();
    error NotEnoughBalance();
    error NotEnoughRewards();

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

        _withdrawToCredit(from);
        _withdrawToCredit(to);

        if (
            (pair == to && from != address(this) && from != factory) ||
            (pair == from && to != address(this) && to != factory)
        ) {
            uint256 totalTax = burnTax() + cultTax() + rewardTax() + trgTax();
            uint256 feeAmount = (amount * totalTax) / 10000;
            super._transfer(from, address(this), feeAmount);

            _feesOnContract += feeAmount;

            if (from != pair) {
                uint256 swappedCult = _buyAndBurnToken(
                    cult(),
                    (_feesOnContract * cultTax()) / 10000
                );
                uint256 swappedTrg = _buyAndBurnToken(
                    trg(),
                    (_feesOnContract * trgTax()) / 10000
                );
                uint256 swappedWeth = Liquidity.swap(
                    address(this),
                    Liquidity.WETH,
                    (_feesOnContract * rewardTax()) / 10000,
                    0,
                    factory
                );
                uint256 burnAmount = (_feesOnContract * burnTax()) / 10000;
                super._transfer(
                    address(this),
                    Liquidity.DEAD_ADDRESS,
                    burnAmount
                );

                wethReward += swappedWeth;
                points += swappedCult + swappedTrg + (burnAmount * 100000);
                _feesOnContract = 0;
            }

            return super._transfer(from, to, amount - feeAmount);
        } else return super._transfer(from, to, amount);
    }

    function _buyAndBurnToken(address _tokenOut, uint256 _amountIn)
        private
        returns (uint256)
    {
        if (_amountIn > 0) {
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
        return 0;
    }

    function _withdrawToCredit(address _user) private {
        address pair = Liquidity.getPair(address(this), Liquidity.WETH);
        if (
            _user == pair ||
            _user == Liquidity.DEAD_ADDRESS ||
            _user == address(this)
        ) return;

        uint256 recipientBalance = balanceOf(_user);
        if (recipientBalance != 0) {
            uint256 amount = ((dividendPerToken() - _xDividendPerToken[_user]) *
                recipientBalance) / 1e18;
            _credit[_user] += amount;
        }
        _xDividendPerToken[_user] = dividendPerToken();
    }

    function pendingRewards(address _user) public view returns (uint256) {
        address pair = Liquidity.getPair(address(this), Liquidity.WETH);
        if (_user == Liquidity.DEAD_ADDRESS || _user == pair) return 0;

        uint256 userBalance = balanceOf(_user);
        if (userBalance == 0) return 0;

        uint256 amount = ((dividendPerToken() - _xDividendPerToken[_user]) *
            userBalance) / 1e18;
        return amount += _credit[_user];
    }

    function claimReward() external {
        uint256 userReward = pendingRewards(msg.sender);
        if (userReward == 0) revert NotEnoughRewards();

        _credit[msg.sender] = 0;
        _xDividendPerToken[msg.sender] = dividendPerToken();
        IERC20(Liquidity.WETH).transfer(msg.sender, userReward);
    }

    function bribe(address _token, uint256 _amount) external {
        bool isRugged = IFactory(factory).isValidBribe(address(this));
        if (isRugged) revert EliminatedToken();

        if (_token != cult() && _token != trg()) revert InvalidBribeToken();

        if (IERC20(_token).balanceOf(msg.sender) < _amount)
            revert NotEnoughBalance();

        uint256 beforeBalance = IERC20(_token).balanceOf(address(this));
        IERC20(_token).transferFrom(msg.sender, address(this), _amount);
        uint256 balanceDifference = IERC20(_token).balanceOf(address(this)) -
            beforeBalance;

        uint256 amountToBurn = balanceDifference / 2;
        uint256 amountForHolders = balanceDifference - amountToBurn;

        IERC20(_token).transfer(Liquidity.DEAD_ADDRESS, amountToBurn);

        if (_token == trg()) IERC20(trg()).transfer(trg(), amountForHolders);
        else IERC20(cult()).transfer(dCult(), amountForHolders);

        points += (_amount * 3) / 2;

        emit Bribe(_token, address(this), _amount);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function dividendPerToken() public view returns (uint256) {
        return IFactory(factory).dividendPerToken(address(this));
    }

    function cult() public view returns (address) {
        return IFactory(factory).cult();
    }

    function dCult() public view returns (address) {
        return IFactory(factory).dCult();
    }

    function trg() public view returns (address) {
        return IFactory(factory).trg();
    }

    function burnTax() public view returns (uint256) {
        return IFactory(factory).burnTax();
    }

    function cultTax() public view returns (uint256) {
        return IFactory(factory).cultTax();
    }

    function rewardTax() public view returns (uint256) {
        return IFactory(factory).rewardTax();
    }

    function trgTax() public view returns (uint256) {
        return IFactory(factory).trgTax();
    }
}

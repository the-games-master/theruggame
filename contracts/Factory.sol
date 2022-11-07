// SPDX-License-Identifier: MIT
pragma solidity =0.8.9;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "../contracts/tokens/THERUGGAME.sol";

contract Factory is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    uint256 private _winnerTotalRewards;
    uint256 public constant MAX_TAX = 400;
    uint256 public burnTax;
    uint256 public cultTax;
    uint256 public eliminationTime;
    uint256 public gameStartTime;
    uint256 public rewardTax;
    uint256 public tokenMultiplier;
    uint256 public trgTax;
    address public cult;
    address public dCult;
    address public trg;

    mapping(address => uint256) public winnerTotalRewards;
    mapping(address => uint256) public dividendPerToken;

    address[] public gameTokens;
    address[] public activeTokens;
    address[] public eliminatedTokens;

    error InvalidAddress();
    error InvalidIndex();
    error InvalidTax();
    error InvalidTime();
    error NotEnoughRewards();
    error TooEarly(uint256 eliminationTime);

    event CultUpdated(address updatedCult);
    event DCultUpdated(address updatedDCult);
    event EliminationTimeUpdated(uint256 updatedTime);
    event TaxesUpdated(
        uint256 burnTax,
        uint256 cultTax,
        uint256 rewardTax,
        uint256 trgTax
    );
    event TokenCreated(address token);
    event TrgUpdated(address updatedTrg);

    function initialize(
        address _trg,
        address _cult,
        address _dCult,
        uint256 _burnTax,
        uint256 _cultTax,
        uint256 _rewardTax,
        uint256 _trgTax
    ) public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();

        if (_trg == address(0) || _cult == address(0) || _dCult == address(0))
            revert InvalidAddress();

        if (_burnTax + _cultTax + _rewardTax + _trgTax > MAX_TAX)
            revert InvalidTax();

        trg = _trg;
        cult = _cult;
        dCult = _dCult;
        burnTax = _burnTax;
        cultTax = _cultTax;
        rewardTax = _rewardTax;
        trgTax = _trgTax;
        eliminationTime = 30 days;
        tokenMultiplier = 100000;
    }

    function createToken(
        string memory name,
        string memory symbol,
        uint256 amountToken,
        uint256 amountWETH
    ) external onlyOwner {
        address _token = address(
            new THERUGGAME(name, symbol, amountToken, address(this))
        );

        gameTokens.push(_token);
        activeTokens.push(_token);
        Liquidity.addLiquidity(
            _token,
            Liquidity.WETH,
            amountToken,
            amountWETH,
            address(this)
        );

        gameStartTime = block.timestamp;

        emit TokenCreated(_token);
    }

    function _getPoints(address _token) private view returns (uint256 points) {
        return THERUGGAME(_token).points();
    }

    function _getWethReward(address _token)
        private
        view
        returns (uint256 points)
    {
        return THERUGGAME(_token).wethReward();
    }

    function getWinner()
        public
        view
        returns (
            address winnerToken,
            uint256 point,
            uint256 index
        )
    {
        for (uint256 i = 0; i < activeTokens.length; i++) {
            if (
                activeTokens[i] != address(0) &&
                _getPoints(activeTokens[i]) >= point
            ) {
                point = _getPoints(activeTokens[i]);
                winnerToken = activeTokens[i];
                index = i;
            }
        }
    }

    function getLoser()
        public
        view
        returns (
            address loserToken,
            uint256 point,
            uint256 index
        )
    {
        point = type(uint256).max;
        for (uint256 i = 0; i < activeTokens.length; i++) {
            if (
                activeTokens[i] != address(0) &&
                _getPoints(activeTokens[i]) <= point
            ) {
                point = _getPoints(activeTokens[i]);
                loserToken = activeTokens[i];
                index = i;
            }
        }
        point = point == type(uint256).max ? 0 : point;
    }

    function distributeRewardsAndRugLoser() external onlyOwner {
        uint256 validTime = gameStartTime +
            (eliminationTime * (eliminatedTokens.length + 1));
        if (block.timestamp < validTime) revert TooEarly(validTime);

        (address winnerToken, , ) = getWinner();
        (address loserToken, , ) = getLoser();
        if (winnerToken == address(0) || loserToken == address(0))
            revert InvalidAddress();

        _distributeRewards();
        _rugLoser();
    }

    function _distributeRewards() private {
        (address winnerToken, , ) = getWinner();

        uint256 totalReward;
        for (uint256 i = 0; i < gameTokens.length; i++) {
            totalReward += _getWethReward(gameTokens[i]);
        }

        uint256 totalActiveReward = totalReward - _winnerTotalRewards;

        if (totalActiveReward <= 0) revert NotEnoughRewards();

        IERC20Upgradeable(Liquidity.WETH).transfer(
            winnerToken,
            totalActiveReward
        );

        address pair = Liquidity.getPair(winnerToken, Liquidity.WETH);
        uint256 validSupply = IERC20(winnerToken).totalSupply() -
            (IERC20(winnerToken).balanceOf(pair) +
                IERC20(winnerToken).balanceOf(Liquidity.DEAD_ADDRESS) +
                IERC20(winnerToken).balanceOf(winnerToken));

        _winnerTotalRewards += totalActiveReward;
        winnerTotalRewards[winnerToken] += totalActiveReward;
        dividendPerToken[winnerToken] +=
            (totalActiveReward * 1e18) /
            validSupply;
    }

    function _rugLoser() private {
        (address loserToken, , uint256 index) = getLoser();
        (, uint256 amountB) = Liquidity.removeLiquidity(
            loserToken,
            Liquidity.WETH,
            address(this)
        );

        eliminatedTokens.push(loserToken);
        delete activeTokens[index];

        uint256 swappedTrg = Liquidity.swap(
            Liquidity.WETH,
            trg,
            amountB,
            0,
            address(this)
        );
        IERC20Upgradeable(trg).transfer(trg, swappedTrg);
    }

    function changeCult(address _cult) external onlyOwner {
        if (_cult == address(0) || _cult == cult) revert InvalidAddress();
        cult = _cult;

        emit CultUpdated(_cult);
    }

    function changeDCult(address _dCult) external onlyOwner {
        if (_dCult == address(0) || _dCult == dCult) revert InvalidAddress();
        dCult = _dCult;

        emit DCultUpdated(_dCult);
    }

    function changeTrg(address _trg) external onlyOwner {
        if (_trg == address(0) || _trg == trg) revert InvalidAddress();
        trg = _trg;

        emit TrgUpdated(_trg);
    }

    function changeTaxes(
        uint256 _burnTax,
        uint256 _cultTax,
        uint256 _rewardTax,
        uint256 _trgTax
    ) external onlyOwner {
        if (_burnTax + _cultTax + _rewardTax + _trgTax > MAX_TAX)
            revert InvalidTax();
        burnTax = _burnTax;
        cultTax = _cultTax;
        rewardTax = _rewardTax;
        trgTax = _trgTax;

        emit TaxesUpdated(_burnTax, _cultTax, _rewardTax, _trgTax);
    }

    function changeEliminationTime(uint256 _time) external onlyOwner {
        if (_time == eliminationTime) revert InvalidTime();
        eliminationTime = _time;

        emit EliminationTimeUpdated(_time);
    }

    function emergencyRemoveToken(uint256 _index) external onlyOwner {
        if (activeTokens[_index] == address(0)) revert InvalidIndex();
        delete activeTokens[_index];
    }

    function pauseToken(uint256 _gameTokenIndex) external onlyOwner {
        THERUGGAME(gameTokens[_gameTokenIndex]).pause();
    }

    function unpauseToken(uint256 _gameTokenIndex) external onlyOwner {
        THERUGGAME(gameTokens[_gameTokenIndex]).unpause();
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyOwner
    {}
}

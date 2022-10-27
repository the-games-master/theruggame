// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "../contracts/tokens/THERUGGAME.sol";

contract Factory is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    address public trg;
    address public cult;
    address public dCult;
    uint256 public gameStartTime;
    uint256 public eliminationTime;

    uint256 _winnerTotalRewards;
    mapping(address => uint256) public winnerTotalRewards;

    address[] public gameTokens;
    address[] public activeTokens;
    address[] public eliminatedTokens;

    error InvalidAddress();
    error InvalidTime();
    error InvalidIndex();
    error TooEarly(uint256 eliminationTime);
    error NotEnoughRewards();

    event TokenCreated(address token);
    event TrgUpdated(address updatedTrg);
    event CultUpdated(address updatedCult);
    event DCultUpdated(address updatedDCult);
    event EliminationTimeUpdated(uint256 updatedTime);

    function initialize(
        address _trg,
        address _cult,
        address _dCult
    ) public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();

        if (_trg == address(0) || _cult == address(0) || _dCult == address(0))
            revert InvalidAddress();

        trg = _trg;
        cult = _cult;
        dCult = _dCult;
        eliminationTime = 30 days;
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
            if (activeTokens[i] != address(0)) {
                uint256 tokenPoints = THERUGGAME(activeTokens[i]).points();
                if (tokenPoints >= point) {
                    point = tokenPoints;
                    winnerToken = activeTokens[i];
                    index = i;
                }
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
            if (activeTokens[i] != address(0)) {
                uint256 tokenPoints = THERUGGAME(activeTokens[i]).points();
                if (tokenPoints <= point) {
                    point = tokenPoints;
                    loserToken = activeTokens[i];
                    index = i;
                }
            }
        }
        point = point == type(uint256).max ? 0 : point;
    }

    function distributeRewardsAndRugLoser() external onlyOwner {
        if (
            block.timestamp <
            (gameStartTime + eliminationTime) * (eliminatedTokens.length + 1)
        )
            revert TooEarly(
                (gameStartTime + eliminationTime) *
                    (eliminatedTokens.length + 1)
            );

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
            totalReward += THERUGGAME(gameTokens[i]).wethReward();
        }

        uint256 totalActiveReward = totalReward - _winnerTotalRewards;

        if (totalActiveReward <= 0) revert NotEnoughRewards();

        IERC20Upgradeable(Liquidity.WETH).transfer(
            winnerToken,
            totalActiveReward
        );
        _winnerTotalRewards += totalActiveReward;
        winnerTotalRewards[winnerToken] += totalActiveReward;
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

    function changeTrg(address _trg) external onlyOwner {
        if (_trg == address(0) || _trg == trg) revert InvalidAddress();
        trg = _trg;

        emit TrgUpdated(_trg);
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

    function changeEliminationTime(uint256 _time) external onlyOwner {
        if (eliminationTime == _time) revert InvalidTime();
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

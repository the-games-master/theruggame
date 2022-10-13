// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../interfaces/IFactory.sol";
import "../Liquidity.sol";

contract THERUGGAME is ERC20, Liquidity {
    uint256 amountForFeesOnContract;
    uint256 public points;
    address public factory;
    address public cult;
    address public trg;
    address public dcult;
    address public constant deadAddress =
        0x000000000000000000000000000000000000dEaD;

    // modifier isValidBriber(address _briber) {
    //     require(_briber == msg.sender, "Invalid briber");
    //     uint256 cultBal = IERC20(cult).balanceOf(_briber);
    //     uint256 trgBal = IERC20(trg).balanceOf(_briber);
    //     uint256 minCultBal = (IERC20(cult).totalSupply() * 5) / 100;
    //     uint256 minTrgBal = (IERC20(trg).totalSupply() * 5) / 100;
    //     if (cultBal < minCultBal || trgBal < minTrgBal) {
    //         revert("Must hold over 0.05% of TRG or CULT");
    //     } else {
    //         _;
    //     }
    // }

    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _supply,
        uint8 _decimal,
        address _factory,
        address _cult,
        address _trg
    ) ERC20(_name, _symbol) {
        _mint(msg.sender, _supply * 10**_decimal);
        factory = _factory;
        cult = _cult;
        trg = _trg;
    }

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }

    function _transfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        address pair = getPair(address(this), WETH);
        address winner = IFactory(factory).winner();
        if (
            (pair == to && from != address(this) && from != factory) ||
            (pair == from && to != address(this) && to != factory)
        ) {
            console.log("fees charged", IFactory(factory).winner());
            console.log(msg.sender, from, to, amount);
            uint256 feeAmount = (amount * 1) / 100;
            super._transfer(from, address(this), feeAmount * 4);
            // super._transfer(from, winner, feeAmount);

            amountForFeesOnContract += feeAmount;
            console.log(
                "amountForFeesOnContract before",
                amountForFeesOnContract
            );

            if (from != pair && amountForFeesOnContract > 0) {
                uint256 swappedCult = _buyAndBurnToken(
                    cult,
                    amountForFeesOnContract
                );
                uint256 swappedTrg = _buyAndBurnToken(
                    trg,
                    amountForFeesOnContract * 2
                );
                _addToLP(swappedTrg / 2);
                uint256 swappedWeth = swap(
                    address(this),
                    WETH,
                    amountForFeesOnContract,
                    0,
                    winner
                );
                console.log("swappedWeth", swappedWeth);

                points += swappedCult + swappedTrg / 2;
                amountForFeesOnContract = 0;
            }

            return super._transfer(from, to, amount - (feeAmount * 4));
        } else {
            console.log("no fees charged");
            console.log(msg.sender, from, to, amount);

            return super._transfer(from, to, amount);
        }
    }

    function _buyAndBurnToken(address _tokenOut, uint256 _amountIn)
        internal
        returns (uint256)
    {
        console.log("in _buyToken", _amountIn);
        uint256 swappedAmount = swap(
            address(this),
            _tokenOut,
            _amountIn,
            0,
            address(this)
        );
        IERC20(_tokenOut).transfer(deadAddress, swappedAmount / 2);
        console.log(
            "buy and burned",
            ERC20(_tokenOut).name(),
            swappedAmount / 2
        );
        return swappedAmount;
    }

    function _addToLP(uint256 _amount) private {
        uint256 amountTRG = _amount / 2;
        uint256 liquidityForWETH = _amount - amountTRG;

        uint256 amountWETH = swap(
            trg,
            WETH,
            liquidityForWETH,
            0,
            address(this)
        );
        console.log("received amountWETH", amountWETH);

        addLiquidity(trg, WETH, amountTRG, amountWETH, factory);
    }

    // function bribe(
    //     address _briber,
    //     address _token,
    //     uint256 _amount
    // ) public isValidBriber(_briber) {
    //     if (_token != cult || _token != trg) {
    //         revert("Only bribe with CULT or TRG");
    //     }
    //     uint256 amountToBurn = (_amount * 50) / 100;
    //     uint256 amountForHolders = _amount - amountToBurn;
    //     IERC20(_token).transferFrom(_briber, deadAddress, amountToBurn);
    //     if (_token == trg) {
    //         IERC20(_token).transferFrom(_briber, trg, amountForHolders);
    //     } else {
    //         IERC20(_token).transferFrom(_briber, dcult, amountForHolders);
    //     }
    //     points += (_amount * 150) / 100;
    // }
}

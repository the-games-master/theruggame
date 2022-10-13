// const { constants } = require("@openzeppelin/test-helpers");
// const { expect } = require("chai");
const { ethers } = require("hardhat");
const helpers = require("@nomicfoundation/hardhat-network-helpers");

describe("Factory", () => {
  it("Should initialize with right parameters", async () => {
    const [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    console.log("owner", owner.address);

    const wethHolderAddress = "0x8EB8a3b98659Cce290402893d0123abb75E3ab28";
    const cultHolderAddress = "0x0d9B1e53CBb251572D982d9F96520E8D40d22bb0";
    const cultAddress = "0xf0f9D895aCa5c8678f706FB8216fa22957685A13";
    const wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
    const uniswapRouterAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    const uniswapFactoryAddress = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";

    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [cultHolderAddress],
    });
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [wethHolderAddress],
    });

    const cultHolder = await ethers.getSigner(cultHolderAddress);
    const wethHolder = await ethers.getSigner(wethHolderAddress);

    const TRG = await ethers.getContractFactory("TheRugGame");
    const trg = await TRG.deploy();
    await trg.deployed();
    console.log("trg", trg.address);

    const weth = await ethers.getContractAt("ERC20", wethAddress);
    console.log("weth", weth.address);
    const cult = await ethers.getContractAt("ERC20", cultAddress);
    console.log("cult", cult.address);

    await weth
      .connect(wethHolder)
      .transfer(owner.address, ethers.utils.parseEther("10"));
    await cult
      .connect(cultHolder)
      .transfer(owner.address, ethers.utils.parseEther("10"));

    const balTrg = await trg.balanceOf(owner.address);
    console.log("balTrg", balTrg);
    const balWeth = await weth.balanceOf(owner.address);
    console.log("balWeth", balWeth);
    const balCult = await cult.balanceOf(owner.address);
    console.log("balCult", balCult);

    const routerU = await ethers.getContractAt(
      "IUniswapV2Router",
      uniswapRouterAddress
    );
    const factoryU = await ethers.getContractAt(
      "IUniswapV2Factory",
      uniswapFactoryAddress
    );

    await trg.approve(routerU.address, 1e10);
    await weth.approve(routerU.address, 1e10);
    await routerU.addLiquidity(
      trg.address,
      weth.address,
      1e8,
      1e8,
      0,
      0,
      owner.address,
      1e12
    );

    const Factory = await ethers.getContractFactory("Factory");
    const factory = await Factory.deploy(cult.address, trg.address);
    await factory.deployed();
    console.log("factory address", factory.address);

    const Winner = await ethers.getContractFactory("Winner");
    const winner = await Winner.deploy(factory.address);
    await winner.deployed();
    console.log("winner address", winner.address);

    await factory.setWinner(winner.address);

    await weth.transfer(factory.address, 1e10);
    await factory.createToken("T", "T", 1, 18, 1e8, 1e8);
    await factory.createToken("H", "H", 1, 18, 1e8, 1e8);
    await factory.createToken("E", "E", 1, 18, 1e8, 1e8);
    await winner.updateWinnerList();
    console.log("factory balance", await weth.balanceOf(factory.address));

    const newTokenTAddress = await factory.gameTokens(0);
    const newTokenT = await ethers.getContractAt(
      "THERUGGAME",
      newTokenTAddress
    );
    console.log("newTokenT", newTokenT.address);

    const newTokenHAddress = await factory.gameTokens(1);
    const newTokenH = await ethers.getContractAt(
      "THERUGGAME",
      newTokenHAddress
    );
    console.log("newTokenH", newTokenH.address);

    const newTokenEAddress = await factory.gameTokens(2);
    const newTokenE = await ethers.getContractAt(
      "THERUGGAME",
      newTokenEAddress
    );
    console.log("newTokenE", newTokenE.address);

    console.log("\n\nT Token-------------------------------------");
    const pathWT = [weth.address, newTokenTAddress];
    await weth.approve(routerU.address, 1e10);
    console.log(
      "T token balance before",
      await newTokenT.balanceOf(owner.address)
    );
    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      1e4,
      0,
      pathWT,
      owner.address,
      1e12
    );
    console.log("T token balance", await newTokenT.balanceOf(owner.address));

    console.log("\n\nT Token-------------------------------------");
    const pathTW = [newTokenTAddress, weth.address];
    await newTokenT.approve(routerU.address, 1e10);
    console.log(
      "weth token balance before",
      await weth.balanceOf(owner.address)
    );
    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      5000,
      0,
      pathTW,
      owner.address,
      1e12
    );
    console.log(
      "weth token balance after",
      await weth.balanceOf(owner.address)
    );

    console.log(
      "T token left on T token and points",
      await newTokenT.balanceOf(newTokenT.address),
      await newTokenT.points()
    );

    console.log("\n\n\nH Token-------------------------------------");
    const pathWH = [weth.address, newTokenHAddress];
    await weth.approve(routerU.address, 1e10);
    console.log(
      "H token balance before",
      await newTokenH.balanceOf(owner.address)
    );
    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      1e4,
      0,
      pathWH,
      owner.address,
      1e12
    );
    console.log("H token balance", await newTokenH.balanceOf(owner.address));

    console.log("\n\nH Token-------------------------------------");
    const pathHW = [newTokenHAddress, weth.address];
    await newTokenH.approve(routerU.address, 1e10);
    console.log(
      "weth token balance before",
      await weth.balanceOf(owner.address)
    );
    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      4000,
      0,
      pathHW,
      owner.address,
      1e12
    );
    console.log(
      "weth token balance after",
      await weth.balanceOf(owner.address)
    );

    console.log(
      "H token left on H token and points",
      await newTokenH.balanceOf(newTokenH.address),
      await newTokenH.points()
    );

    console.log("\n\n\nE Token-------------------------------------");
    const pathWE = [weth.address, newTokenEAddress];
    await weth.approve(routerU.address, 1e10);
    console.log(
      "E token balance before",
      await newTokenE.balanceOf(owner.address)
    );
    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      1e4,
      0,
      pathWE,
      owner.address,
      1e12
    );
    console.log("E token balance", await newTokenE.balanceOf(owner.address));

    console.log("\n\nE Token-------------------------------------");
    const pathEW = [newTokenEAddress, weth.address];
    await newTokenE.approve(routerU.address, 1e10);
    console.log(
      "weth token balance before",
      await weth.balanceOf(owner.address)
    );
    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      2000,
      0,
      pathEW,
      owner.address,
      1e12
    );
    console.log(
      "weth token balance after",
      await weth.balanceOf(owner.address)
    );

    console.log(
      "E token left on E token and points",
      await newTokenE.balanceOf(newTokenE.address),
      await newTokenE.points()
    );

    console.log("\n\n\nWinner-------------------------------------");
    console.log(
      "before rug bal newTokenH",
      await newTokenH.balanceOf(factory.address)
    );
    console.log("before rug bal weth", await weth.balanceOf(factory.address));
    console.log("get winner", await winner.getWinner());
    console.log("get looser", await winner.getLooser());

    await winner.distributeRewardsAndRugLooser();
    console.log(
      "after rug bal newTokenH",
      await newTokenH.balanceOf(factory.address)
    );
    console.log("after rug bal weth", await weth.balanceOf(factory.address));

    // console.log(
    //   "balance final buy",
    //   await newTokenT.balanceOf(owner.address),
    //   await weth.balanceOf(owner.address)
    // );

    // console.log(
    //   "balance before sell",
    //   await newTokenT.balanceOf(owner.address),
    //   await weth.balanceOf(owner.address)
    // );
    // await newTokenT.approve(newTokenT.address, 1e12);
    // await newTokenT.sellToken(9000);

    // console.log(
    //   "balance after sell",
    //   await newTokenT.balanceOf(owner.address),
    //   await weth.balanceOf(owner.address)
    // );

    // await newTokenT._buyToken(owner.address, 99);

    // console.log("starting sell");
    // const path2 = [newTokenTAddress, weth.address];
    // await newTokenT.approve(routerU.address, 1e10);
    // await newTokenT.transfer(newTokenT.address, 1010);
    // console.log(
    //   "new weth bal",
    //   await newTokenT.balanceOf(owner.address),
    //   await newTokenT.balanceOf(pairAddress),
    //   await weth.balanceOf(pairAddress),
    //   await pair.getReserves()
    // );
    // const a = await routerU.getAmountsOut(1e3, path2);
    // console.log("a is a", a);
    // await routerU.swapExactTokensForTokens(1e3, 0, path2, owner.address, 1e12);

    // console.log("bal", await newTokenT.balanceOf(owner.address));
    // console.log("bal", await weth.balanceOf(owner.address));
  });
});

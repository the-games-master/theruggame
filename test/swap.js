const { ethers, upgrades } = require("hardhat");

describe("Factory", () => {
  it("Should initialize with right parameters", async () => {
    const [owner] = await ethers.getSigners();
    console.log("owner", owner.address);

    const wethHolderAddress = "0x8EB8a3b98659Cce290402893d0123abb75E3ab28";
    const cultHolderAddress = "0x0d9B1e53CBb251572D982d9F96520E8D40d22bb0";
    const cultAddress = "0xf0f9D895aCa5c8678f706FB8216fa22957685A13";
    const dCultAddress = "0x2d77B594B9BBaED03221F7c63Af8C4307432daF1";
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
    console.log("trg", trg.address, await trg.name());

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

    await trg.approve(routerU.address, ethers.utils.parseEther("1"));
    await weth.approve(routerU.address, ethers.utils.parseEther("1"));
    await routerU.addLiquidity(
      trg.address,
      weth.address,
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("1"),
      0,
      0,
      owner.address,
      1e12
    );

    const Factory = await ethers.getContractFactory("Factory");
    const factory = await upgrades.deployProxy(
      Factory,
      [trg.address, cult.address, dCultAddress, 100, 200, 100, 0],
      { initializer: "initialize", kind: "uups" }
    );
    await factory.deployed();
    console.log("factory address", factory.address);

    await weth.transfer(factory.address, ethers.utils.parseEther("0.03"));
    await factory.createToken(
      "T",
      "T",
      ethers.utils.parseEther("10000"),
      ethers.utils.parseEther("0.01")
    );
    await factory.createToken(
      "H",
      "H",
      ethers.utils.parseEther("10000"),
      ethers.utils.parseEther("0.01")
    );
    await factory.createToken(
      "E",
      "E",
      ethers.utils.parseEther("10000"),
      ethers.utils.parseEther("0.01")
    );
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

    console.log("\n\n\nT Token-------------------------------------");
    const pathWT = [weth.address, newTokenT.address];
    await weth.approve(routerU.address, ethers.utils.parseEther("0.001"));
    console.log(
      "T token balance before",
      await newTokenT.balanceOf(owner.address),
      await newTokenT.balanceOf(newTokenT.address)
    );
    console.log(
      "amount out pathWT",
      await routerU.getAmountsOut(ethers.utils.parseEther("0.001"), pathWT)
    );
    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      ethers.utils.parseEther("0.001"),
      0,
      pathWT,
      owner.address,
      1e12
    );
    console.log("T token balance", await newTokenT.balanceOf(owner.address));

    console.log("\n\nT Token-------------------------------------");
    const pathTW = [newTokenT.address, weth.address];
    await newTokenT.approve(routerU.address, ethers.utils.parseEther("500"));
    console.log(
      "weth token balance before",
      await weth.balanceOf(owner.address),
      await newTokenT.balanceOf(newTokenT.address)
    );
    console.log(
      "amount out pathTW",
      await routerU.getAmountsOut(ethers.utils.parseEther("500"), pathTW)
    );
    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      ethers.utils.parseEther("500"),
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
    const pathWH = [weth.address, newTokenH.address];
    await weth.approve(routerU.address, 1e10);
    console.log(
      "H token balance before",
      await newTokenH.balanceOf(owner.address),
      await newTokenH.balanceOf(newTokenH.address)
    );
    console.log("amount out pathWH", await routerU.getAmountsOut(4000, pathWH));
    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      4000,
      0,
      pathWH,
      owner.address,
      1e12
    );
    console.log("H token balance", await newTokenH.balanceOf(owner.address));

    console.log("\n\nH Token-------------------------------------");
    const pathHW = [newTokenH.address, weth.address];
    await newTokenH.approve(
      routerU.address,
      newTokenH.balanceOf(owner.address)
    );
    console.log(
      "weth token balance before",
      await weth.balanceOf(owner.address),
      await newTokenH.balanceOf(newTokenH.address)
    );
    console.log(
      "amount out pathHW",
      await routerU.getAmountsOut(newTokenH.balanceOf(owner.address), pathHW)
    );
    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      newTokenH.balanceOf(owner.address),
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
    const pathWE = [weth.address, newTokenE.address];
    await weth.approve(routerU.address, 1e10);
    console.log(
      "E token balance before",
      await newTokenE.balanceOf(owner.address),
      await newTokenE.balanceOf(newTokenE.address)
    );
    console.log("amount out pathWE", await routerU.getAmountsOut(3000, pathWE));
    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      3000,
      0,
      pathWE,
      owner.address,
      1e12
    );
    console.log("E token balance", await newTokenE.balanceOf(owner.address));

    console.log("\n\nE Token-------------------------------------");
    const pathEW = [newTokenE.address, weth.address];
    await newTokenE.approve(
      routerU.address,
      newTokenE.balanceOf(owner.address)
    );
    console.log(
      "weth token balance before",
      await weth.balanceOf(owner.address),
      await newTokenE.balanceOf(newTokenE.address)
    );
    console.log(
      "amount out pathEW",
      await routerU.getAmountsOut(newTokenE.balanceOf(owner.address), pathEW)
    );
    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      newTokenE.balanceOf(owner.address),
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

    console.log("\n\n\nBribe-------------------------------------");
    console.log("newTokenT");
    console.log(
      "points and balance before bribe",
      await newTokenT.points(),
      await cult.balanceOf(owner.address)
    );
    await cult.approve(newTokenT.address, ethers.utils.parseEther("1"));
    await newTokenT.bribe(cult.address, ethers.utils.parseEther("1"));
    console.log("points after bribe", await newTokenT.points());

    console.log("\n\nnewTokenH");
    console.log(
      "points and balance before bribe",
      await newTokenH.points(),
      await trg.balanceOf(owner.address)
    );
    await trg.approve(newTokenH.address, ethers.utils.parseEther("1"));
    await newTokenH.bribe(trg.address, ethers.utils.parseEther("1"));
    console.log("points after bribe", await newTokenH.points());

    console.log("\n\n\nWinner-------------------------------------");
    console.log("get winner", await factory.getWinner());
    console.log("get loser", await factory.getLoser());

    // await network.provider.send("evm_increaseTime", [30 * 86400]);
    // await network.provider.send("evm_mine");
    // await factory.performUpkeep(0x00);

    const userReward = await newTokenT.pendingRewards(owner.address);
    console.log(
      "user reward is",
      userReward,
      await newTokenT.balanceOf(owner.address)
    );

    const deadReward = await newTokenT.pendingRewards(
      "0x000000000000000000000000000000000000dEaD"
    );
    console.log("dead reward is", deadReward);

    const pairReward = await newTokenT.pendingRewards(
      await factoryU.getPair(newTokenT.address, weth.address)
    );
    console.log("pair reward is", pairReward);

    // await newTokenT.claimReward();

    const userRewardAfter = await newTokenT.pendingRewards(owner.address);
    console.log("user reward after claim is", userRewardAfter);

    console.log("\n\n\nWinner2-------------------------------------");
    console.log("owner bal before", await weth.balanceOf(owner.address));
    await newTokenT.approve(routerU.address, ethers.utils.parseEther("100"));
    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      ethers.utils.parseEther("100"),
      0,
      pathTW,
      owner.address,
      1e12
    );
    console.log("owner bal after", await weth.balanceOf(owner.address));
    console.log("get winner", await factory.getWinner());
    console.log("get loser", await factory.getLoser());

    // await network.provider.send("evm_increaseTime", [30 * 86400]);
    // await network.provider.send("evm_mine");
    // await factory.performUpkeep();

    const userReward2 = await newTokenT.pendingRewards(owner.address);
    console.log(
      "user reward is",
      userReward2,
      await newTokenT.balanceOf(owner.address)
    );

    // await newTokenT.claimReward();

    const userRewardAfter2 = await newTokenT.pendingRewards(owner.address);
    console.log("user reward after claim is", userRewardAfter2);

    console.log("\n\n\nWinner3-------------------------------------");
    await newTokenT.approve(routerU.address, ethers.utils.parseEther("100"));
    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      ethers.utils.parseEther("100"),
      0,
      pathTW,
      owner.address,
      1e12
    );

    console.log("get winner", await factory.getWinner());
    console.log("get loser", await factory.getLoser());

    // await network.provider.send("evm_increaseTime", [30 * 86400]);
    // await network.provider.send("evm_mine");
    // await factory.performUpkeep();

    const userReward3 = await newTokenT.pendingRewards(owner.address);
    console.log(
      "user reward is",
      userReward3,
      await newTokenT.balanceOf(owner.address)
    );

    // await newTokenT.claimReward();

    const userRewardAfter3 = await newTokenT.pendingRewards(owner.address);
    console.log("user reward after claim is", userRewardAfter3);
  });
});

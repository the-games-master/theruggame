const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { ethers, upgrades } = require("hardhat");

describe("Factory ", () => {
  let owner,
    addr1,
    addr2,
    wethHolderAddress,
    cultHolderAddress,
    cultAddress,
    dCultAddress,
    wethAddress,
    uniswapRouterAddress,
    uniswapFactoryAddress;
  let cultHolder, wethHolder, trg, strg, weth, cult;
  let routerU, reserveU, factoryU, factory;

  let newTokenT, newTokenH, newTokenE;

  beforeEach("contracts deployement : ", async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    wethHolderAddress = "0x8EB8a3b98659Cce290402893d0123abb75E3ab28";
    cultHolderAddress = "0x0d9B1e53CBb251572D982d9F96520E8D40d22bb0";
    cultAddress = "0xf0f9D895aCa5c8678f706FB8216fa22957685A13";
    dCultAddress = "0x2d77B594B9BBaED03221F7c63Af8C4307432daF1";
    wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
    uniswapRouterAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    uniswapFactoryAddress = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";

    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [cultHolderAddress],
    });

    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [wethHolderAddress],
    });

    cultHolder = await ethers.getSigner(cultHolderAddress);
    wethHolder = await ethers.getSigner(wethHolderAddress);

    const TRG = await ethers.getContractFactory("TheRugGame");
    trg = await TRG.deploy();
    await trg.deployed();

    const STRG = await ethers.getContractFactory("STRG");
    strg = await STRG.deploy(trg.address);
    await strg.deployed();

    await trg.setsTrg(strg.address);

    weth = await ethers.getContractAt("ERC20", wethAddress);
    cult = await ethers.getContractAt("ERC20", cultAddress);

    await weth
      .connect(wethHolder)
      .transfer(owner.address, ethers.utils.parseEther("10"));

    await cult
      .connect(cultHolder)
      .transfer(owner.address, ethers.utils.parseEther("10"));

    routerU = await ethers.getContractAt(
      "IUniswapV2Router",
      uniswapRouterAddress
    );

    factoryU = await ethers.getContractAt(
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
    factory = await upgrades.deployProxy(
      Factory,
      [
        trg.address,
        strg.address,
        cult.address,
        dCultAddress,
        100,
        100,
        100,
        100,
      ],
      { initializer: "initialize", kind: "uups" }
    );
    await factory.deployed();

    // Tokens deployment
    await weth.transfer(factory.address, ethers.utils.parseEther("0.03"));

    // Token T
    await factory.createToken(
      "T",
      "T",
      ethers.utils.parseEther("10000"),
      ethers.utils.parseEther("0.01")
    );

    const newTokenTAddress = await factory.gameTokens(0);
    newTokenT = await ethers.getContractAt("THERUGGAME", newTokenTAddress);

    // Token H
    await factory.createToken(
      "H",
      "H",
      ethers.utils.parseEther("10000"),
      ethers.utils.parseEther("0.01")
    );

    const newTokenHAddress = await factory.gameTokens(1);
    newTokenH = await ethers.getContractAt("THERUGGAME", newTokenHAddress);

    // Token E
    await factory.createToken(
      "E",
      "E",
      ethers.utils.parseEther("10000"),
      ethers.utils.parseEther("0.01")
    );

    const newTokenEAddress = await factory.gameTokens(2);
    newTokenE = await ethers.getContractAt("THERUGGAME", newTokenEAddress);

    // RawFulfill
    await factory.rawFulfillRandomWords(1, [31, 32, 33]);
  });

  it("Should have correct balance of trg : 6666666666665000000000000000000, weth : 8970000000000000000 and cult : 9960000000000000000 at owner account", async function () {
    const balTrg = await trg.balanceOf(owner.address);
    expect(balTrg).to.not.equal("0");
    expect(balTrg).to.equal("6666666666665000000000000000000");

    const balWeth = await weth.balanceOf(owner.address);
    expect(balWeth).to.not.equal("0");
    expect(balWeth).to.equal("8970000000000000000");

    const balCult = await cult.balanceOf(owner.address);
    expect(balCult).to.not.equal("0");
    expect(balCult).to.equal("9960000000000000000");
  });

  it("Should swap WETH with T token", async function () {
    expect(newTokenT.address).to.not.equal(
      "0x0000000000000000000000000000000000000000"
    );
    expect(await newTokenT.balanceOf(factory.address)).to.equal(0);
    expect(await newTokenT.balanceOf(owner.address)).to.equal(0);
    expect(await newTokenT.balanceOf(newTokenT.address)).to.equal(0);

    const pathWT = [weth.address, newTokenT.address];
    await weth.approve(routerU.address, ethers.utils.parseEther("0.001"));

    expect(
      (await routerU.getAmountsOut(ethers.utils.parseEther("0.001"), pathWT))[0]
    ).to.equal("1000000000000000");
    expect(
      (await routerU.getAmountsOut(ethers.utils.parseEther("0.001"), pathWT))[1]
    ).to.equal("906610893880149131581");

    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      ethers.utils.parseEther("0.001"),
      0,
      pathWT,
      owner.address,
      1e12
    );

    expect(await newTokenT.balanceOf(owner.address)).to.equal(
      "870346458124943166318"
    );
  });

  it("Should swap T token with WETH", async function () {
    const pathWT = [weth.address, newTokenT.address];

    await weth.approve(routerU.address, ethers.utils.parseEther("0.001"));

    expect(
      (await routerU.getAmountsOut(ethers.utils.parseEther("0.001"), pathWT))[0]
    ).to.equal("1000000000000000");

    expect(
      (await routerU.getAmountsOut(ethers.utils.parseEther("0.001"), pathWT))[1]
    ).to.equal("906610893880149131581");

    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      ethers.utils.parseEther("0.001"),
      0,
      pathWT,
      owner.address,
      1e12
    );

    const pathTW = [newTokenT.address, weth.address];
    await newTokenT.approve(
      routerU.address,
      await newTokenT.balanceOf(owner.address)
    );

    expect(await weth.balanceOf(owner.address)).to.not.equal(0);
    expect(await weth.balanceOf(owner.address)).to.equal(
      "26908000000000000000"
    );

    expect(await newTokenT.balanceOf(owner.address)).to.not.equal(0);
    expect(await newTokenT.balanceOf(owner.address)).to.equal(
      "870346458124943166318"
    );

    expect(await newTokenT.balanceOf(newTokenT.address)).to.not.equal(0);
    expect(await newTokenT.balanceOf(newTokenT.address)).to.equal(
      "36264435755205965263"
    );

    let amountOut =
      0.95 *
      (
        await routerU.getAmountsOut(
          await newTokenT.balanceOf(owner.address),
          pathTW
        )
      )[1];
    amountOut = Math.round(amountOut);
    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      await newTokenT.balanceOf(owner.address),
      amountOut,
      pathTW,
      owner.address,
      1e12
    );

    expect(await weth.balanceOf(owner.address)).to.not.equal(0);
    expect(await newTokenT.balanceOf(newTokenT.address)).to.not.equal(0);
    expect(await newTokenT.points()).to.not.equal(0);

    expect(await weth.balanceOf(owner.address)).to.equal(
      "26908912854942017620"
    );

    expect(await newTokenT.balanceOf(newTokenT.address)).to.equal("3");

    expect(await newTokenT.points()).to.equal("1781360205444617067052285");
  });

  it("Should swap WETH with H token", async function () {
    expect(newTokenH.address).to.not.equal(
      "0x0000000000000000000000000000000000000000"
    );

    expect(await newTokenH.balanceOf(factory.address)).to.equal(0);
    expect(await newTokenH.balanceOf(owner.address)).to.equal(0);
    expect(await newTokenH.balanceOf(newTokenH.address)).to.equal(0);

    const pathWH = [weth.address, newTokenH.address];

    await weth.approve(routerU.address, ethers.utils.parseEther("0.001"));

    expect(
      (await routerU.getAmountsOut(ethers.utils.parseEther("0.001"), pathWH))[0]
    ).to.equal("1000000000000000");

    expect(
      (await routerU.getAmountsOut(ethers.utils.parseEther("0.001"), pathWH))[1]
    ).to.equal("906610893880149131581");

    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      ethers.utils.parseEther("0.001"),
      0,
      pathWH,
      owner.address,
      1e12
    );

    expect(await newTokenH.balanceOf(owner.address)).to.equal(
      "870346458124943166318"
    );
  });

  it("Should swap H token with WETH", async function () {
    const pathWH = [weth.address, newTokenH.address];

    await weth.approve(routerU.address, ethers.utils.parseEther("0.001"));

    expect(
      (await routerU.getAmountsOut(ethers.utils.parseEther("0.001"), pathWH))[0]
    ).to.equal("1000000000000000");

    expect(
      (await routerU.getAmountsOut(ethers.utils.parseEther("0.001"), pathWH))[1]
    ).to.equal("906610893880149131581");

    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      ethers.utils.parseEther("0.001"),
      0,
      pathWH,
      owner.address,
      1e12
    );

    expect(await newTokenH.balanceOf(owner.address)).to.equal(
      "870346458124943166318"
    );

    const pathHW = [newTokenH.address, weth.address];

    await newTokenH.approve(
      routerU.address,
      await newTokenH.balanceOf(owner.address)
    );

    expect(await weth.balanceOf(owner.address)).to.not.equal(0);
    expect(await weth.balanceOf(owner.address)).to.equal(
      "44846912854942017620"
    );

    expect(await newTokenH.balanceOf(owner.address)).to.not.equal(0);
    expect(await newTokenH.balanceOf(owner.address)).to.equal(
      "870346458124943166318"
    );

    expect(await newTokenH.balanceOf(newTokenH.address)).to.not.equal(0);
    expect(await newTokenH.balanceOf(newTokenH.address)).to.equal(
      "36264435755205965263"
    );

    let amountOut =
      0.95 *
      (
        await routerU.getAmountsOut(
          await newTokenH.balanceOf(owner.address),
          pathHW
        )
      )[1];
    amountOut = Math.round(amountOut);

    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      await newTokenH.balanceOf(owner.address),
      amountOut,
      pathHW,
      owner.address,
      1e12
    );

    expect(await weth.balanceOf(owner.address)).to.not.equal(0);
    expect(await newTokenH.balanceOf(newTokenH.address)).to.not.equal(0);
    expect(await newTokenH.points()).to.not.equal(0);

    expect(await weth.balanceOf(owner.address)).to.equal(
      "44847825709884035240"
    );

    expect(await newTokenH.balanceOf(newTokenH.address)).to.equal("3");

    expect(await newTokenH.points()).to.equal("1781360205300348790827720");
  });

  it("Should swap WETH with E token", async function () {
    expect(newTokenE.address).to.not.equal(
      "0x0000000000000000000000000000000000000000"
    );

    expect(await newTokenE.balanceOf(factory.address)).to.equal(0);
    expect(await newTokenE.balanceOf(owner.address)).to.equal(0);
    expect(await newTokenE.balanceOf(newTokenE.address)).to.equal(0);

    const pathWE = [weth.address, newTokenE.address];
    await weth.approve(routerU.address, ethers.utils.parseEther("0.001"));

    expect(
      (await routerU.getAmountsOut(ethers.utils.parseEther("0.001"), pathWE))[0]
    ).to.equal("1000000000000000");

    expect(
      (await routerU.getAmountsOut(ethers.utils.parseEther("0.001"), pathWE))[1]
    ).to.equal("906610893880149131581");

    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      ethers.utils.parseEther("0.001"),
      0,
      pathWE,
      owner.address,
      1e12
    );

    expect(await newTokenE.balanceOf(owner.address)).to.equal(
      "870346458124943166318"
    );
  });

  it("Should swap E token with WETH", async function () {
    const pathWE = [weth.address, newTokenE.address];

    await weth.approve(routerU.address, ethers.utils.parseEther("0.001"));

    expect(
      (await routerU.getAmountsOut(ethers.utils.parseEther("0.001"), pathWE))[0]
    ).to.equal("1000000000000000");

    expect(
      (await routerU.getAmountsOut(ethers.utils.parseEther("0.001"), pathWE))[1]
    ).to.equal("906610893880149131581");

    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      ethers.utils.parseEther("0.001"),
      0,
      pathWE,
      owner.address,
      1e12
    );

    expect(await newTokenE.balanceOf(owner.address)).to.equal(
      "870346458124943166318"
    );

    const pathEW = [newTokenE.address, weth.address];

    await newTokenE.approve(
      routerU.address,
      await newTokenE.balanceOf(owner.address)
    );

    expect(await weth.balanceOf(owner.address)).to.not.equal(0);
    expect(await weth.balanceOf(owner.address)).to.equal(
      "62785825709884035240"
    );

    expect(await newTokenE.balanceOf(owner.address)).to.not.equal(0);
    expect(await newTokenE.balanceOf(owner.address)).to.equal(
      "870346458124943166318"
    );

    expect(await newTokenE.balanceOf(newTokenE.address)).to.not.equal(0);
    expect(await newTokenE.balanceOf(newTokenE.address)).to.equal(
      "36264435755205965263"
    );

    let amountOut =
      0.95 *
      (
        await routerU.getAmountsOut(
          await newTokenE.balanceOf(owner.address),
          pathEW
        )
      )[1];
    amountOut = Math.round(amountOut);

    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      await newTokenE.balanceOf(owner.address),
      amountOut,
      pathEW,
      owner.address,
      1e12
    );

    expect(await weth.balanceOf(owner.address)).to.not.equal(0);
    expect(await newTokenE.balanceOf(newTokenE.address)).to.not.equal(0);
    expect(await newTokenE.points()).to.not.equal(0);

    expect(await weth.balanceOf(owner.address)).to.equal(
      "62786738564826052860"
    );

    expect(await newTokenE.balanceOf(newTokenE.address)).to.equal("3");

    expect(await newTokenE.points()).to.equal("1781360205156080521697563");
  });

  it("Should bribe as expected", async function () {
    // T token
    const pathWT = [weth.address, newTokenT.address];

    await weth.approve(routerU.address, ethers.utils.parseEther("0.001"));

    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      ethers.utils.parseEther("0.001"),
      0,
      pathWT,
      owner.address,
      1e12
    );

    const pathTW = [newTokenT.address, weth.address];

    await newTokenT.approve(
      routerU.address,
      await newTokenT.balanceOf(owner.address)
    );

    let amountOutT =
      0.95 *
      (
        await routerU.getAmountsOut(
          await newTokenT.balanceOf(owner.address),
          pathTW
        )
      )[1];
    amountOutT = Math.round(amountOutT);

    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      await newTokenT.balanceOf(owner.address),
      amountOutT,
      pathTW,
      owner.address,
      1e12
    );

    await network.provider.send("evm_increaseTime", [32 * 86400]);
    await network.provider.send("evm_mine");
    await factory.performUpkeep(0x00);

    // H token
    const pathWH = [weth.address, newTokenH.address];
    await weth.approve(routerU.address, 1e10);
    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      4000,
      0,
      pathWH,
      owner.address,
      1e12
    );

    const pathHW = [newTokenH.address, weth.address];
    await newTokenH.approve(
      routerU.address,
      await newTokenH.balanceOf(owner.address)
    );

    let amountOutH =
      0.95 *
      (
        await routerU.getAmountsOut(
          await newTokenH.balanceOf(owner.address),
          pathHW
        )
      )[1];
      
    amountOutH = Math.round(amountOutH);
    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      await newTokenH.balanceOf(owner.address),
      amountOutH,
      pathHW,
      owner.address,
      1e12
    );

    await network.provider.send("evm_increaseTime", [33 * 86400]);
    await network.provider.send("evm_mine");
    await factory.performUpkeep(0x00);

    // Bribe cult
    expect(await newTokenT.points()).to.not.equal(0);
    expect(await newTokenT.points()).to.equal("1781360205011812259661813");

    expect(await cult.balanceOf(owner.address)).to.not.equal(0);
    expect(await cult.balanceOf(owner.address)).to.equal(
      "79680000000000000000"
    );

    await cult.approve(newTokenT.address, ethers.utils.parseEther("1"));
    await newTokenT.bribe(cult.address, ethers.utils.parseEther("1"));

    expect(await newTokenT.points()).to.not.equal(0);
    expect(await newTokenT.points()).to.equal("1781361705011812259661813");

    // Bribe trg
    expect(await trg.balanceOf(owner.address)).to.not.equal(0);
    expect(await trg.balanceOf(owner.address)).to.equal(
      "6666666666665000000000000000000"
    );

    await trg.approve(newTokenT.address, ethers.utils.parseEther("1"));
    await newTokenT.bribe(trg.address, ethers.utils.parseEther("1"));

    expect(await newTokenT.points()).to.not.equal(0);
    expect(await newTokenT.points()).to.equal("1781363205011812259661813");
  });

  it("Testing for first three winners", async function () {
    // T token
    const pathWT = [weth.address, newTokenT.address];

    await weth.approve(routerU.address, ethers.utils.parseEther("0.001"));

    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      ethers.utils.parseEther("0.001"),
      0,
      pathWT,
      owner.address,
      1e12
    );

    const pathTW = [newTokenT.address, weth.address];
    await newTokenT.approve(routerU.address, ethers.utils.parseEther("500"));

    let amountOutT =
      0.95 *
      (await routerU.getAmountsOut(ethers.utils.parseEther("500"), pathTW))[1];
    amountOutT = Math.round(amountOutT);

    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      ethers.utils.parseEther("500"),
      amountOutT,
      pathTW,
      owner.address,
      1e12
    );

    // H token
    const pathWH = [weth.address, newTokenH.address];
    await weth.approve(routerU.address, 1e10);

    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      4000,
      0,
      pathWH,
      owner.address,
      1e12
    );

    const pathHW = [newTokenH.address, weth.address];
    await newTokenH.approve(
      routerU.address,
      await newTokenH.balanceOf(owner.address)
    );

    let amountOutH =
      0.95 *
      (
        await routerU.getAmountsOut(
          await newTokenH.balanceOf(owner.address),
          pathHW
        )
      )[1];
    amountOutH = Math.round(amountOutH);

    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      await newTokenH.balanceOf(owner.address),
      amountOutH,
      pathHW,
      owner.address,
      1e12
    );

    // E token
    const pathWE = [weth.address, newTokenE.address];
    await weth.approve(routerU.address, 1e10);

    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      3000,
      0,
      pathWE,
      owner.address,
      1e12
    );

    const pathEW = [newTokenE.address, weth.address];
    await newTokenE.approve(
      routerU.address,
      await newTokenE.balanceOf(owner.address)
    );

    let amountOutE =
      0.95 *
      (
        await routerU.getAmountsOut(
          await newTokenE.balanceOf(owner.address),
          pathHW
        )
      )[1];
    amountOutE = Math.round(amountOutE);

    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      await newTokenE.balanceOf(owner.address),
      amountOutE,
      pathEW,
      owner.address,
      1e12
    );

    await network.provider.send("evm_increaseTime", [32 * 86400]);
    await network.provider.send("evm_mine");
    await factory.performUpkeep(0x00);

    let winner1 = await factory.previousWinner();
    let loser1 = await factory.previousLoser();

    // Bribe
    await cult.approve(newTokenT.address, ethers.utils.parseEther("1"));
    await newTokenT.bribe(cult.address, ethers.utils.parseEther("1"));

    await trg.approve(newTokenH.address, ethers.utils.parseEther("1"));
    await newTokenH.bribe(trg.address, ethers.utils.parseEther("1"));

    expect(winner1).to.not.equal("0x0000000000000000000000000000000000000000");
    expect(loser1).to.not.equal("0x0000000000000000000000000000000000000000");

    const userReward = await newTokenT.pendingRewards(owner.address);

    expect(userReward).to.not.equal(0);
    expect(userReward).to.equal(15645627141469);

    expect(await newTokenT.balanceOf(owner.address)).to.not.equal(0);
    expect(await newTokenT.balanceOf(owner.address)).to.equal(
      "370346458124943166318"
    );

    const deadReward = await newTokenT.pendingRewards(
      "0x000000000000000000000000000000000000dEaD"
    );
    expect(deadReward).to.equal(0);

    const pairReward = await newTokenT.pendingRewards(
      await factoryU.getPair(newTokenT.address, weth.address)
    );
    expect(pairReward).to.equal(0);

    expect(await weth.balanceOf(owner.address)).to.not.equal(0);
    expect(await weth.balanceOf(owner.address)).to.equal(
      "80726196441258580728"
    );

    await newTokenT.approve(routerU.address, ethers.utils.parseEther("100"));
    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      ethers.utils.parseEther("100"),
      0,
      pathTW,
      owner.address,
      1e12
    );

    expect(await weth.balanceOf(owner.address)).to.not.equal(0);
    expect(await weth.balanceOf(owner.address)).to.equal(
      "80726298919943995096"
    );

    await network.provider.send("evm_increaseTime", [33 * 86400]);
    await network.provider.send("evm_mine");
    await factory.performUpkeep(0x00);

    let winner2 = await factory.previousWinner();
    let loser2 = await factory.previousLoser();

    expect(winner2).to.not.equal("0x0000000000000000000000000000000000000000");
    expect(loser2).to.not.equal("0x0000000000000000000000000000000000000000");

    const userReward2 = await newTokenT.pendingRewards(owner.address);

    expect(userReward2).to.not.equal(0);
    expect(userReward2).to.equal(16615723071817);

    expect(await newTokenT.balanceOf(owner.address)).to.not.equal(0);
    expect(await newTokenT.balanceOf(owner.address)).to.equal(
      "270346458124943166318"
    );

    await newTokenT.approve(routerU.address, ethers.utils.parseEther("100"));
    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      ethers.utils.parseEther("100"),
      0,
      pathTW,
      owner.address,
      1e12
    );

    await network.provider.send("evm_increaseTime", [34 * 86400]);
    await network.provider.send("evm_mine");
    await factory.performUpkeep(0x00);

    let winner3 = await factory.previousWinner();
    let loser3 = await factory.previousLoser();

    expect(winner3).to.not.equal("0x0000000000000000000000000000000000000000");
    expect(loser3).to.not.equal("0x0000000000000000000000000000000000000000");

    expect(await newTokenT.balanceOf(owner.address)).to.not.equal(0);
    expect(await newTokenT.balanceOf(owner.address)).to.equal(
      "170346458124943166318"
    );

    const userReward3 = await newTokenT.pendingRewards(owner.address);

    expect(userReward3).to.not.equal(0);
    expect(userReward3).to.equal(17504473799438);

    expect(winner1).to.equal(newTokenT.address);
    expect(winner2).to.equal(newTokenT.address);
    expect(winner3).to.equal(newTokenT.address);

    expect(loser1).to.equal(newTokenE.address);
    expect(loser2).to.equal(newTokenH.address);
    expect(loser3).to.equal(newTokenT.address);
  });

  it("Should have pending reward after transfer of trg", async function () {
    let balTrg = await trg.balanceOf(owner.address);

    await trg.approve(strg.address, 200);
    await strg.deposit(100);

    expect(await strg.pendingRewards(owner.address)).to.equal(0);

    await trg.transfer(strg.address, 200);

    expect(await strg.pendingRewards(owner.address)).to.equal(200);
  });

  it("Should have pending rewards after bribe of trg", async function () {
    expect(await strg.pendingRewards(owner.address)).to.equal(0);

    await trg.approve(strg.address, 200);
    await strg.deposit(100);

    const pathWH = [weth.address, newTokenH.address];
    await weth.approve(routerU.address, ethers.utils.parseEther("0.001"));

    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      4000,
      0,
      pathWH,
      owner.address,
      1e12
    );

    await trg.approve(newTokenH.address, ethers.utils.parseEther("1"));
    await newTokenH.bribe(trg.address, ethers.utils.parseEther("1"));

    expect(await strg.pendingRewards(owner.address)).to.not.equal(0);
    expect(await strg.pendingRewards(owner.address)).to.equal(
      "500000000000000000"
    );
  });

  it("Should have pending rewards after rug of trg", async function () {
    expect(await strg.pendingRewards(owner.address)).to.equal(0);

    await trg.approve(strg.address, 200);
    await strg.deposit(100);

    const pathWT = [weth.address, newTokenT.address];

    await weth.approve(routerU.address, ethers.utils.parseEther("0.001"));

    expect(await newTokenT.balanceOf(owner.address)).to.equal(0);

    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      4000,
      0,
      pathWT,
      owner.address,
      1e12
    );

    expect(await newTokenT.balanceOf(owner.address)).to.equal("3828480000");

    const pathTW = [newTokenT.address, weth.address];
    await newTokenT.approve(
      routerU.address,
      ethers.utils.parseEther("0.00000000382848")
    );

    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      await newTokenT.balanceOf(owner.address),
      0,
      pathTW,
      owner.address,
      1e12
    );

    expect(await newTokenT.balanceOf(owner.address)).to.equal(0);

    await network.provider.send("evm_increaseTime", [32 * 86400]);
    await network.provider.send("evm_mine");
    await factory.performUpkeep(0x00);

    expect(await strg.pendingRewards(owner.address)).to.not.equal(
      ethers.BigNumber.from(0)
    );
  });

  it("Should execute factory functions properly", async function () {
    expect(await factory.sTrg()).to.equal(strg.address);
    expect(await factory.cult()).to.equal(cult.address);
    expect(await factory.dCult()).to.equal(dCultAddress);
    expect(await factory.trg()).to.equal(trg.address);

    expect(await factory.burnTax()).to.equal(100);
    expect(await factory.cultTax()).to.equal(100);
    expect(await factory.rewardTax()).to.equal(100);
    expect(await factory.trgTax()).to.equal(100);

    expect(await factory.callbackGasLimit()).to.equal(100000);
    expect(await factory.requestConfirmations()).to.equal(3);
    expect(await factory.numWords()).to.equal(3);
    expect(await factory.linkAddress()).to.equal(
      "0x514910771AF9Ca656af840dff83E8264EcF986CA"
    );

    expect(await factory.wrapperAddress()).to.equal(
      "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
    );

    await factory.updateVrfConfiguration(
      300000,
      4,
      4,
      addr1.address,
      addr2.address
    );

    expect(await factory.callbackGasLimit()).to.equal(300000);
    expect(await factory.requestConfirmations()).to.equal(4);
    expect(await factory.numWords()).to.equal(4);
    expect(await factory.linkAddress()).to.equal(addr1.address);
    expect(await factory.wrapperAddress()).to.equal(addr2.address);

    await expect(
      factory
        .connect(addr1)
        .updateVrfConfiguration(300001, 4, 4, addr1.address, addr2.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(factory.connect(addr1).requestRugDays()).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
  });

  it("Should call all the function of TheRugGame", async function () {
    expect(await newTokenT.cult()).to.equal(
      "0xf0f9D895aCa5c8678f706FB8216fa22957685A13"
    );

    expect(await newTokenT.dCult()).to.equal(
      "0x2d77B594B9BBaED03221F7c63Af8C4307432daF1"
    );

    expect(await newTokenT.sTrg()).to.not.equal(
      "0x0000000000000000000000000000000000000000"
    );

    expect(await newTokenT.trg()).to.not.equal(
      "0x0000000000000000000000000000000000000000"
    );

    expect(await newTokenT.burnTax()).to.equal("100");
    expect(await newTokenT.cultTax()).to.equal("100");
    expect(await newTokenT.rewardTax()).to.equal("100");
    expect(await newTokenT.trgTax()).to.equal("100");
    expect(await newTokenT.dividendPerToken()).to.equal("0");
  });

  it("Should have correct reward amount of a user ", async function () {
    expect(await strg.pendingRewards(addr1.address)).to.equal(0);

    await trg.transfer(addr1.address, 200);
    await trg.connect(addr1).approve(strg.address, 200);
    await strg.connect(addr1).deposit(100);
    await trg.transfer(strg.address, 200);
    expect(await strg.pendingRewards(addr1.address)).to.equal(200);

    expect(await trg.connect(addr1).balanceOf(addr1.address)).to.equal(100);
    await strg.connect(addr1).deposit(100);
    expect(await trg.connect(addr1).balanceOf(addr1.address)).to.equal(200);

    expect(await strg.pendingRewards(addr1.address)).to.equal(0);
  });

  it("Testing for check upkeep and perform upkeep", async function () {
    // T token
    const pathWT = [weth.address, newTokenT.address];

    await weth.approve(routerU.address, ethers.utils.parseEther("0.001"));

    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      ethers.utils.parseEther("0.001"),
      0,
      pathWT,
      owner.address,
      1e12
    );

    const pathTW = [newTokenT.address, weth.address];
    await newTokenT.approve(routerU.address, ethers.utils.parseEther("500"));

    let amountOutT =
      0.95 *
      (await routerU.getAmountsOut(ethers.utils.parseEther("500"), pathTW))[1];
    amountOutT = Math.round(amountOutT);

    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      ethers.utils.parseEther("500"),
      amountOutT,
      pathTW,
      owner.address,
      1e12
    );

    // H token
    const pathWH = [weth.address, newTokenH.address];
    await weth.approve(routerU.address, 1e10);

    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      4000,
      0,
      pathWH,
      owner.address,
      1e12
    );

    const pathHW = [newTokenH.address, weth.address];
    await newTokenH.approve(
      routerU.address,
      await newTokenH.balanceOf(owner.address)
    );

    let amountOutH =
      0.95 *
      (
        await routerU.getAmountsOut(
          await newTokenH.balanceOf(owner.address),
          pathHW
        )
      )[1];
    amountOutH = Math.round(amountOutH);

    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      await newTokenH.balanceOf(owner.address),
      amountOutH,
      pathHW,
      owner.address,
      1e12
    );

    // E token
    const pathWE = [weth.address, newTokenE.address];
    await weth.approve(routerU.address, 1e10);

    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      3000,
      0,
      pathWE,
      owner.address,
      1e12
    );

    const pathEW = [newTokenE.address, weth.address];
    await newTokenE.approve(
      routerU.address,
      await newTokenE.balanceOf(owner.address)
    );

    let amountOutE =
      0.95 *
      (
        await routerU.getAmountsOut(
          await newTokenE.balanceOf(owner.address),
          pathHW
        )
      )[1];
    amountOutE = Math.round(amountOutE);

    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      await newTokenE.balanceOf(owner.address),
      amountOutE,
      pathEW,
      owner.address,
      1e12
    );

    await network.provider.send("evm_increaseTime", [32 * 86400]);
    await network.provider.send("evm_mine");
    expect((await factory.checkUpkeep(0x00))[0]).to.equal(true);
    await factory.performUpkeep(0x00);

    let winner1 = await factory.previousWinner();
    let loser1 = await factory.previousLoser();

    await newTokenT.approve(routerU.address, ethers.utils.parseEther("100"));
    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      ethers.utils.parseEther("100"),
      0,
      pathTW,
      owner.address,
      1e12
    );

    await network.provider.send("evm_increaseTime", [33 * 86400]);
    await network.provider.send("evm_mine");
    expect((await factory.checkUpkeep(0x00))[0]).to.equal(true);
    await factory.performUpkeep(0x00);

    let winner2 = await factory.previousWinner();
    let loser2 = await factory.previousLoser();

    await newTokenT.approve(routerU.address, ethers.utils.parseEther("100"));
    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      ethers.utils.parseEther("100"),
      0,
      pathTW,
      owner.address,
      1e12
    );

    await network.provider.send("evm_increaseTime", [34 * 86400]);
    await network.provider.send("evm_mine");
    expect((await factory.checkUpkeep(0x00))[0]).to.equal(true);
    await factory.performUpkeep(0x00);

    let winner3 = await factory.previousWinner();
    let loser3 = await factory.previousLoser();

    expect(winner1).to.equal(newTokenT.address);
    expect(winner2).to.equal(newTokenT.address);
    expect(winner3).to.equal(newTokenT.address);

    expect(loser1).to.equal(newTokenE.address);
    expect(loser2).to.equal(newTokenH.address);
    expect(loser3).to.equal(newTokenT.address);
  });

  it("Testing for check upkeep ", async function () {
    // T token
    const pathWT = [weth.address, newTokenT.address];

    await weth.approve(routerU.address, ethers.utils.parseEther("0.001"));

    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      ethers.utils.parseEther("0.001"),
      0,
      pathWT,
      owner.address,
      1e12
    );

    const pathTW = [newTokenT.address, weth.address];
    await newTokenT.approve(routerU.address, ethers.utils.parseEther("500"));

    let amountOutT =
      0.95 *
      (await routerU.getAmountsOut(ethers.utils.parseEther("500"), pathTW))[1];
    amountOutT = Math.round(amountOutT);

    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      ethers.utils.parseEther("500"),
      amountOutT,
      pathTW,
      owner.address,
      1e12
    );

    // H token
    const pathWH = [weth.address, newTokenH.address];
    await weth.approve(routerU.address, 1e10);

    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      4000,
      0,
      pathWH,
      owner.address,
      1e12
    );

    const pathHW = [newTokenH.address, weth.address];
    await newTokenH.approve(
      routerU.address,
      await newTokenH.balanceOf(owner.address)
    );

    let amountOutH =
      0.95 *
      (
        await routerU.getAmountsOut(
          await newTokenH.balanceOf(owner.address),
          pathHW
        )
      )[1];
    amountOutH = Math.round(amountOutH);

    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      await newTokenH.balanceOf(owner.address),
      amountOutH,
      pathHW,
      owner.address,
      1e12
    );

    // E token
    const pathWE = [weth.address, newTokenE.address];
    await weth.approve(routerU.address, 1e10);

    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      3000,
      0,
      pathWE,
      owner.address,
      1e12
    );

    const pathEW = [newTokenE.address, weth.address];
    await newTokenE.approve(
      routerU.address,
      await newTokenE.balanceOf(owner.address)
    );

    let amountOutE =
      0.95 *
      (
        await routerU.getAmountsOut(
          await newTokenE.balanceOf(owner.address),
          pathHW
        )
      )[1];
    amountOutE = Math.round(amountOutE);

    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      await newTokenE.balanceOf(owner.address),
      amountOutE,
      pathEW,
      owner.address,
      1e12
    );

    await network.provider.send("evm_increaseTime", [31 * 86400]);
    await network.provider.send("evm_mine");
    expect((await factory.checkUpkeep('0x00'))[0]).to.equal(false);
    await network.provider.send("evm_increaseTime", [86400]);
    await network.provider.send("evm_mine");
    expect((await factory.checkUpkeep('0x00'))[0]).to.equal(true);
    await factory.performUpkeep(0x00);

    await network.provider.send("evm_increaseTime", [32 * 86400]);
    await network.provider.send("evm_mine");
    expect((await factory.checkUpkeep('0x00'))[0]).to.equal(false);
    await network.provider.send("evm_increaseTime", [86400]);
    await network.provider.send("evm_mine");
    expect((await factory.checkUpkeep('0x00'))[0]).to.equal(true);
    await factory.performUpkeep(0x00);

    await network.provider.send("evm_increaseTime", [33 * 86400]);
    await network.provider.send("evm_mine");
    expect((await factory.checkUpkeep('0x00'))[0]).to.equal(false);
    await network.provider.send("evm_increaseTime", [86400]);
    await network.provider.send("evm_mine");
    expect((await factory.checkUpkeep('0x00'))[0]).to.equal(true);
    await factory.performUpkeep(0x00);

    await network.provider.send("evm_increaseTime", [100 * 86400]);
    await network.provider.send("evm_mine");

    console.log('new token deployment');
    // Tokens deployment
    await weth.transfer(factory.address, ethers.utils.parseEther("0.03"));

    // R Token
    await factory.createToken(
      "R",
      "R",
      ethers.utils.parseEther("10000"),
      ethers.utils.parseEther("0.01")
    );

    const newTokenRAddress = await factory.gameTokens(3);
    let newTokenR = await ethers.getContractAt("THERUGGAME", newTokenRAddress);

    // U Token
    await factory.createToken(
      "U",
      "U",
      ethers.utils.parseEther("10000"),
      ethers.utils.parseEther("0.01")
    );

    const newTokenUAddress = await factory.gameTokens(4);
    let newTokenU = await ethers.getContractAt("THERUGGAME", newTokenUAddress);

    // G Token
    await factory.createToken(
      "G",
      "G",
      ethers.utils.parseEther("10000"),
      ethers.utils.parseEther("0.01")
    );

    const newTokenGAddress = await factory.gameTokens(5);
    let newTokenG = await ethers.getContractAt("THERUGGAME", newTokenGAddress);

    console.log('new token deployment completed')
    //buy sell
    // R token
    const pathWR = [weth.address, newTokenR.address];

    await weth.approve(routerU.address, ethers.utils.parseEther("0.001"));

    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      ethers.utils.parseEther("0.001"),
      0,
      pathWR,
      owner.address,
      1e12
    );

    const pathRW = [newTokenR.address, weth.address];
    await newTokenR.approve(routerU.address, ethers.utils.parseEther("500"));

    let amountOutR =
      0.95 *
      (await routerU.getAmountsOut(ethers.utils.parseEther("500"), pathRW))[1];
    amountOutR = Math.round(amountOutR);

    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      ethers.utils.parseEther("500"),
      amountOutR,
      pathRW,
      owner.address,
      1e12
    );
    // U token
    const pathWU = [weth.address, newTokenU.address];
    await weth.approve(routerU.address, 1e10);

    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      4000,
      0,
      pathWU,
      owner.address,
      1e12
    );

    const pathUW = [newTokenU.address, weth.address];
    await newTokenU.approve(
      routerU.address,
      await newTokenU.balanceOf(owner.address)
    );

    let amountOutU =
      0.95 *
      (
        await routerU.getAmountsOut(
          await newTokenU.balanceOf(owner.address),
          pathUW
        )
      )[1];
    amountOutU = Math.round(amountOutU);

    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      await newTokenU.balanceOf(owner.address),
      amountOutU,
      pathUW,
      owner.address,
      1e12
    );
    // G token
    const pathWG = [weth.address, newTokenG.address];
    await weth.approve(routerU.address, 1e10);

    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      3000,
      0,
      pathWG,
      owner.address,
      1e12
    );

    const pathGW = [newTokenG.address, weth.address];
    await newTokenG.approve(
      routerU.address,
      await newTokenG.balanceOf(owner.address)
    );

    let amountOutG =
      0.95 *
      (
        await routerU.getAmountsOut(
          await newTokenG.balanceOf(owner.address),
          pathGW
        )
      )[1];
    amountOutG = Math.round(amountOutG);

    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      await newTokenG.balanceOf(owner.address),
      amountOutG,
      pathGW,
      owner.address,
      1e12
    );

    console.log('buy sell completed')
    await factory.rawFulfillRandomWords(1, [37, 38,39]);

    await network.provider.send("evm_increaseTime", [38 * 86400]);
    await network.provider.send("evm_mine");
    console.log('checkupkeep ', await factory.checkUpkeep(0x00));
    await factory.performUpkeep(0x00);

    await network.provider.send("evm_increaseTime", [39 * 86400]);
    await network.provider.send("evm_mine");
    console.log('checkupkeep ', await factory.checkUpkeep(0x00));
    await factory.performUpkeep(0x00);

    await network.provider.send("evm_increaseTime", [40 * 86400]);
    await network.provider.send("evm_mine");
    console.log('checkupkeep ', await factory.checkUpkeep(0x00));
    await factory.performUpkeep(0x00);

  });

  it("Testing for create token while previous set of tokens are rugged", async function () {
    // T token
    const pathWT = [weth.address, newTokenT.address];

    await weth.approve(routerU.address, ethers.utils.parseEther("0.001"));

    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      ethers.utils.parseEther("0.001"),
      0,
      pathWT,
      owner.address,
      1e12
    );

    const pathTW = [newTokenT.address, weth.address];
    await newTokenT.approve(routerU.address, ethers.utils.parseEther("500"));

    let amountOutT =
      0.95 *
      (await routerU.getAmountsOut(ethers.utils.parseEther("500"), pathTW))[1];
    amountOutT = Math.round(amountOutT);

    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      ethers.utils.parseEther("500"),
      amountOutT,
      pathTW,
      owner.address,
      1e12
    );

    // H token
    const pathWH = [weth.address, newTokenH.address];
    await weth.approve(routerU.address, 1e10);

    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      4000,
      0,
      pathWH,
      owner.address,
      1e12
    );

    const pathHW = [newTokenH.address, weth.address];
    await newTokenH.approve(
      routerU.address,
      await newTokenH.balanceOf(owner.address)
    );

    let amountOutH =
      0.95 *
      (
        await routerU.getAmountsOut(
          await newTokenH.balanceOf(owner.address),
          pathHW
        )
      )[1];
    amountOutH = Math.round(amountOutH);

    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      await newTokenH.balanceOf(owner.address),
      amountOutH,
      pathHW,
      owner.address,
      1e12
    );

    // E token
    const pathWE = [weth.address, newTokenE.address];
    await weth.approve(routerU.address, 1e10);

    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      3000,
      0,
      pathWE,
      owner.address,
      1e12
    );

    const pathEW = [newTokenE.address, weth.address];
    await newTokenE.approve(
      routerU.address,
      await newTokenE.balanceOf(owner.address)
    );

    let amountOutE =
      0.95 *
      (
        await routerU.getAmountsOut(
          await newTokenE.balanceOf(owner.address),
          pathHW
        )
      )[1];
    amountOutE = Math.round(amountOutE);

    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      await newTokenE.balanceOf(owner.address),
      amountOutE,
      pathEW,
      owner.address,
      1e12
    );

    await expect(factory.createToken("S", "S", ethers.utils.parseEther("10000"),
    ethers.utils.parseEther("0.01"))).to.be.revertedWithCustomError(factory, 'InvalidTime');

    await network.provider.send("evm_increaseTime", [31 * 86400]);
    await network.provider.send("evm_mine");
    expect((await factory.checkUpkeep('0x00'))[0]).to.equal(false);
    await network.provider.send("evm_increaseTime", [86400]);
    await network.provider.send("evm_mine");
    expect((await factory.checkUpkeep('0x00'))[0]).to.equal(true);
    await factory.performUpkeep(0x00);

    await expect(factory.createToken("R", "R", ethers.utils.parseEther("10000"),
      ethers.utils.parseEther("0.01"))).to.be.revertedWithCustomError(factory, 'InvalidTime');

    await expect(factory.requestRugDays()).to.be.revertedWithCustomError(factory, 'InvalidTime');

    await network.provider.send("evm_increaseTime", [32 * 86400]);
    await network.provider.send("evm_mine");
    expect((await factory.checkUpkeep('0x00'))[0]).to.equal(false);
    await network.provider.send("evm_increaseTime", [86400]);
    await network.provider.send("evm_mine");
    expect((await factory.checkUpkeep('0x00'))[0]).to.equal(true);
    await factory.performUpkeep(0x00);

    await expect(factory.createToken("U", "U", ethers.utils.parseEther("10000"),
      ethers.utils.parseEther("0.01"))).to.be.revertedWithCustomError(factory, 'InvalidTime');
    await expect(factory.requestRugDays()).to.be.revertedWithCustomError(factory, 'InvalidTime');

    await network.provider.send("evm_increaseTime", [33 * 86400]);
    await network.provider.send("evm_mine");
    expect((await factory.checkUpkeep('0x00'))[0]).to.equal(false);
    await network.provider.send("evm_increaseTime", [86400]);
    await network.provider.send("evm_mine");
    expect((await factory.checkUpkeep('0x00'))[0]).to.equal(true);
    await factory.performUpkeep(0x00);

    await weth.transfer(factory.address, ethers.utils.parseEther("0.03"));

    // R token
    await factory.createToken("R", "R", ethers.utils.parseEther("10000"),
      ethers.utils.parseEther("0.01"));
    const newTokenRAddress = await factory.gameTokens(3);
    let newTokenR = await ethers.getContractAt("THERUGGAME", newTokenRAddress);

    // R token
    const pathWR = [weth.address, newTokenR.address];

    await weth.approve(routerU.address, ethers.utils.parseEther("0.001"));

    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      ethers.utils.parseEther("0.001"),
      0,
      pathWR,
      owner.address,
      1e12
    );

    const pathRW = [newTokenR.address, weth.address];
    await newTokenR.approve(routerU.address, ethers.utils.parseEther("500"));

    let amountOutR =
      0.95 *
      (await routerU.getAmountsOut(ethers.utils.parseEther("500"), pathRW))[1];
    amountOutR = Math.round(amountOutR);

    await routerU.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      ethers.utils.parseEther("500"),
      amountOutR,
      pathRW,
      owner.address,
      1e12
    );

    await factory.updateVrfConfiguration(
      100000,
      3,
      1,
      '0x514910771AF9Ca656af840dff83E8264EcF986CA',
      owner.address
    );
    await factory.rawFulfillRandomWords(1, [34]);

    await network.provider.send("evm_increaseTime", [35 * 86400]);
    await network.provider.send("evm_mine");
    expect((await factory.checkUpkeep('0x00'))[0]).to.equal(true);
    await factory.performUpkeep(0x00);
  });
});

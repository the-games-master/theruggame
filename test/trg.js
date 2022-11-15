const { ethers } = require("hardhat");

describe("TRG", () => {
  it("Should initialize with right parameters", async () => {
    const [owner, addr1] = await ethers.getSigners();
    console.log("owner", owner.address);

    const TRG = await ethers.getContractFactory("TheRugGame");
    const trg = await TRG.deploy();
    await trg.deployed();
    console.log("trg", trg.address);

    const STRG = await ethers.getContractFactory("STRG");
    const strg = await STRG.deploy(trg.address);
    await strg.deployed();
    console.log("sTrg", strg.address);

    await trg.setsTrg(strg.address);
    await trg.approve(strg.address, 200);
    await strg.deposit(100);

    await trg.transfer(strg.address, 200);
    console.log(
      "pending reward total 200",
      await strg.pendingRewards(owner.address)
    );

    await strg.claimReward();
    console.log("owner info after claim", await strg.userInfo(owner.address));

    await trg.transfer(addr1.address, 1000);
    await trg.connect(addr1).approve(strg.address, 100);
    await strg.connect(addr1).deposit(100);
    await trg.transfer(strg.address, 100);
    console.log(
      "pending reward total 100, owner and addr1",
      await strg.pendingRewards(owner.address),
      await strg.pendingRewards(addr1.address)
    );

    await strg.withdraw(10);
    console.log(
      "owner info after withdraw",
      await strg.userInfo(owner.address)
    );

    await strg.withdraw(10);
    console.log(
      "owner info after withdraw again",
      await strg.userInfo(owner.address)
    );

    await trg.transfer(strg.address, 180);
    console.log(
      "pending reward total 180, owner and addr1",
      await strg.pendingRewards(owner.address),
      await strg.pendingRewards(addr1.address)
    );

    await strg.emergencyWithdraw();
    console.log(
      "owner info after emergency withdraw",
      await strg.userInfo(owner.address)
    );
    console.log(
      "pending reward owner and addr1",
      await strg.pendingRewards(owner.address),
      await strg.pendingRewards(addr1.address)
    );

    await strg.deposit(100);
    await trg.transfer(strg.address, 100);
    console.log(
      "pending reward total 100, owner and addr1",
      await strg.pendingRewards(owner.address),
      await strg.pendingRewards(addr1.address)
    );

    await strg.connect(addr1).emergencyWithdraw();
    console.log(
      "addr1 info after emergency withdraw",
      await strg.userInfo(addr1.address)
    );
    console.log(
      "pending reward owner and addr1",
      await strg.pendingRewards(owner.address),
      await strg.pendingRewards(addr1.address)
    );
  });
});

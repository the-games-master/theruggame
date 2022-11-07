const { ethers } = require("hardhat");

describe("TRG", () => {
  it("Should initialize with right parameters", async () => {
    const [owner, addr1] = await ethers.getSigners();
    console.log("owner", owner.address);

    const TRG = await ethers.getContractFactory("TheRugGame");
    const trg = await TRG.deploy();
    await trg.deployed();
    console.log("trg", trg.address);

    await trg.approve(trg.address, 100);
    await trg.deposit(100);

    await trg.transfer(trg.address, 200);
    console.log(
      "pending reward total 200",
      await trg.pendingRewards(owner.address)
    );

    await trg.claimReward();
    console.log("userInfo after claim", await trg.userInfo(owner.address));

    await trg.transfer(addr1.address, 1000);
    await trg.connect(addr1).approve(trg.address, 100);
    await trg.connect(addr1).deposit(100);
    await trg.transfer(trg.address, 100);
    console.log(
      "pending reward total 100, owner and addr1",
      await trg.pendingRewards(owner.address),
      await trg.pendingRewards(addr1.address)
    );

    await trg.withdraw(10);
    console.log("userInfo after withdraw", await trg.userInfo(owner.address));

    await trg.withdraw(10);
    console.log(
      "userInfo after withdraw again",
      await trg.userInfo(owner.address)
    );

    await trg.transfer(trg.address, 180);
    console.log(
      "pending reward total 180, owner and addr1",
      await trg.pendingRewards(owner.address),
      await trg.pendingRewards(addr1.address)
    );

    await trg.emergencyWithdraw();
    console.log(
      "userInfo after emergency withdraw",
      await trg.userInfo(owner.address)
    );
    console.log(
      "pending reward owner and addr1",
      await trg.pendingRewards(owner.address),
      await trg.pendingRewards(addr1.address)
    );
  });
});

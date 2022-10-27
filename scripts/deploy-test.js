// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

async function main() {
  // const wethAddress = "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6";
  const dCultAddress = "0x2d77B594B9BBaED03221F7c63Af8C4307432daF1";
  const trgAddress = "0x2Fb80c10ba3492C889581eaE9dE197e5C99b73f2";
  const cultAddress = "0x421C761ad92ba65454F4EA6C1BD15BC5925035d7";

  // const Cult = await hre.ethers.getContractFactory("MockToken");
  // const cult = await Cult.deploy("Cult", "cult");
  // await cult.deployed();
  // console.log("cult", cult.address);

  // const TRG = await ethers.getContractFactory("TheRugGame");
  // const trg = await TRG.deploy();
  // await trg.deployed();
  // console.log("trg", trg.address);

  const Factory = await hre.ethers.getContractFactory("Factory");
  // const factory = await hre.upgrades.deployProxy(
  //   Factory,
  //   [trgAddress, cultAddress, dCultAddress],
  //   { initializer: "initialize", kind: "uups" }
  // );
  // await factory.deployed();
  // console.log("factory address", factory.address);

  const upgraded = await hre.upgrades.upgradeProxy(
    "0x6BB3536DF6BA1D9711e2CDd3aE8b058eC01f07F3",
    Factory
  );
  console.log("upgraded", upgraded.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

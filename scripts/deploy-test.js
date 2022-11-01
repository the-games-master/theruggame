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
  const trgAddress = "0x2aadfd053FbDB0b180D161eD2Ece36d34b6BC4aA";
  const cultAddress = "0x5710D2aa9f77956E31Fb8D9683A1498A14600887";
  const gas = await hre.ethers.provider.getGasPrice();

  // const Cult = await hre.ethers.getContractFactory("MockToken");
  // const cult = await Cult.deploy("Cult", "cult");
  // await cult.deployed();
  // console.log("cult", cult.address);

  // const TRG = await ethers.getContractFactory("TheRugGame");
  // const trg = await TRG.deploy();
  // await trg.deployed();
  // console.log("trg", trg.address);

  console.log("gas", gas);
  const Factory = await hre.ethers.getContractFactory("Factory");
  const factory = await Factory.deploy(trgAddress, cultAddress, dCultAddress);
  await factory.deployed();
  console.log("factory address", factory.address);

  // const upgraded = await hre.upgrades.upgradeProxy(
  //   "0x6BB3536DF6BA1D9711e2CDd3aE8b058eC01f07F3",
  //   Factory
  // );
  // console.log("upgraded", upgraded.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

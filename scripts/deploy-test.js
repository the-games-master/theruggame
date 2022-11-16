// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

async function main() {
  const dCultAddress = "0x2d77B594B9BBaED03221F7c63Af8C4307432daF1";

  const Cult = await hre.ethers.getContractFactory("MockToken");
  const cult = await Cult.deploy("Cult", "cult");
  await cult.deployed();
  console.log("cult", cult.address);

  const TRG = await ethers.getContractFactory("TheRugGame");
  const trg = await TRG.deploy();
  await trg.deployed();
  console.log("trg", trg.address);

  const sTRG = await ethers.getContractFactory("sTRG");
  const strg = await sTRG.deploy(trg.address);
  await strg.deployed();
  console.log("strg", strg.address);

  const Factory = await ethers.getContractFactory("Factory");
  const factory = await upgrades.deployProxy(
    Factory,
    [trg.address, cult.address, dCultAddress, 100, 100, 100, 100],
    { initializer: "initialize", kind: "uups" }
  );
  await factory.deployed();
  console.log("factory address", factory.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

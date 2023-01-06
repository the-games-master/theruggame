// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

async function main() {
  const trg = "0x000000000000000000000000000000000000dEaD"
  const strg = "0x000000000000000000000000000000000000dEaD"
  const dCultAddress = "0x2d77B594B9BBaED03221F7c63Af8C4307432daF1";
  const cultAddress = "0xf0f9D895aCa5c8678f706FB8216fa22957685A13";
  const taxBurn = 100;
  const taxCult = 200;
  const taxReward = 100;
  const taxTrg = 0;

  // const TRG = await ethers.getContractFactory("TheRugGame");
  // const trg = await TRG.deploy();
  // await trg.deployed();
  // console.log("trg", trg.address);

  // const sTRG = await ethers.getContractFactory("STRG");
  // const strg = await sTRG.deploy(trg.address);
  // await strg.deployed();
  // console.log("strg", strg.address);

  const Factory = await ethers.getContractFactory("Factory");
  const factory = await upgrades.deployProxy(
    Factory,
    [
      trg,
      strg,
      cultAddress,
      dCultAddress,
      taxBurn,
      taxCult,
      taxReward,
      taxTrg,
    ],
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

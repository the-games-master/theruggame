// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

async function main() {
  const Liquidity = await hre.ethers.getContractFactory("Liquidity");
  const liquidity = await Liquidity.deploy();

  const Cult = await hre.ethers.getContractFactory("Cult");
  const cult = await Cult.deploy();

  const Trg = await hre.ethers.getContractFactory("TRG");
  const trg = await Trg.deploy();

  const Factory = await hre.ethers.getContractFactory("Factory");
  const factory = await Factory.deploy(
    liquidity.address,
    cult.address,
    trg.address
  );

  console.log(`Liquidity ${liquidity.address}\n
  Factory ${factory.address}\n
  Cult ${cult.address}\n
  TRG ${trg.address}\n`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

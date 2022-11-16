require("@nomicfoundation/hardhat-toolbox");
require("@nomiclabs/hardhat-etherscan");
require("@openzeppelin/hardhat-upgrades");
require("hardhat-contract-sizer");
require("solidity-coverage");

/** @type import('hardhat/config').HardhatUserConfig */

module.exports = {
  defaultNetwork: "hardhat",
  solidity: {
    compilers: [
      {
        version: "0.8.9",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1,
          },
        },
      },
    ],
  },

  networks: {
    hardhat: {
      forking: {
        enabled: true,
        url: "https://mainnet.infura.io/v3/API_KEY",
        gas: "auto",
        blockNumber: 15702656,
      },
      allowUnlimitedContractSize: true,
    },
    goerli: {
      url: "https://goerli.infura.io/v3/API_KEY",
      accounts: ["PRIVATE_KEY"],
    },
    mainnet: {
      url: "https://goerli.infura.io/v3/API_KEY",
      accounts: ["PRIVATE_KEY"],
    },
  },
  etherscan: {
    apiKey: "API_KEY",
  },
  mocha: {
    timeout: 1e14,
  },
};

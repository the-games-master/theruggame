require("@nomicfoundation/hardhat-toolbox");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-contract-sizer");

/** @type import('hardhat/config').HardhatUserConfig */

module.exports = {
  defaultNetwork: "hardhat",
  solidity: {
    compilers: [
      {
        version: "0.8.9",
      },
      {
        version: "0.5.0",
      },
      {
        version: "0.4.0",
      },
      {
        version: "0.6.6",
      },
    ],
  },

  networks: {
    hardhat: {
      forking: {
        enabled: true,
        url: "https://mainnet.infura.io/v3/cedb60965aa445678c19340ea4652b90",
        gas: "auto",
        blockNumber: 15702656,
      },
      allowUnlimitedContractSize: true,
    },
    goerli: {
      url: "https://goerli.infura.io/v3/cedb60965aa445678c19340ea4652b90",
      accounts: [
        "96a98021efea06da2d53c837c0f8347d4d3748eae250d039cb4db8bc45a303ae",
      ],
      allowUnlimitedContractSize: true,
    },
  },
  etherscan: {
    apiKey: "PSP855PDPWQV76H2WAMWSRAV4KMDDRNT9W",
  },
  mocha: {
    timeout: 1000000000,
  },
};

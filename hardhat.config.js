require('dotenv').config()
require("@nomiclabs/hardhat-waffle")


module.exports = {
    defaultNetwork: "hardhat",
    networks: {
        hardhat: {
        }
    },
    paths: {
        sources: "./contracts",
        cache: "./build/cache",
        artifacts: "./build/artifacts",
        tests: "./test",
    },
    solidity: {
        compilers: [
            { version: "0.8.7" }
        ]
    }
};

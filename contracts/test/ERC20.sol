// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ArbiNYAN is ERC20 {
    constructor() ERC20("arbiNYAN", "NYAN") {
        _mint(msg.sender, 40000000 * 10 ** decimals());
    }
}

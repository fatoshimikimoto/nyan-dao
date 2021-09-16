// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;


interface INyanRewards {
    function stake(uint128 amount) external;
    function withdraw(uint128 amount) external;
    function getReward() external;
}

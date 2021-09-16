// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;


import "./interfaces/INyanRewards.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";

contract NyanVotes is ERC20, ERC20Burnable, Ownable, ERC20Permit, ERC20Votes {
    using SafeERC20 for IERC20;

    IERC20 public nyan;
    INyanRewards public nyanRewards;
    address public nyanTimelock;

    constructor(IERC20 _nyan, INyanRewards _nyanRewards, address _nyanTimelock)
        ERC20("voteNYAN", "vNYAN")
        ERC20Permit("voteNYAN")
    {
            nyan = _nyan;
            nyanRewards = _nyanRewards;
            nyanTimelock = _nyanTimelock;
    }

    // The following functions are overrides required by Solidity.

    function _afterTokenTransfer(address from, address to, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        super._afterTokenTransfer(from, to, amount);
    }

    function _mint(address to, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        super._mint(to, amount);
    }

    function _burn(address account, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        super._burn(account, amount);
    }

    function join(uint256 amount) public {
        _mint(_msgSender(), amount);
        nyan.safeTransferFrom(_msgSender(), address(this), amount);
        nyan.approve(address(nyanRewards), 0);
        nyan.approve(address(nyanRewards), amount);
        nyanRewards.stake(uint128(amount));
        _claimRewardsToTimelock();
    }

    function leave(uint256 amount) public {
        _burn(_msgSender(), amount);
        nyanRewards.withdraw(uint128(amount));
        nyan.safeTransfer(_msgSender(), amount);
        _claimRewardsToTimelock();
    }

    function _claimRewardsToTimelock() internal {
        nyanRewards.getReward();
        uint256 _balance = nyan.balanceOf(address(this));
        nyan.safeTransfer(nyanTimelock, _balance);
    }

    function claimRewardsToTimelock() public {
        _claimRewardsToTimelock();
    }

}

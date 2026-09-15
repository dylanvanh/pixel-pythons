// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {PixelPythons} from "../PixelPythons.sol";

interface BroadcastVm {
    function startBroadcast() external;
    function stopBroadcast() external;
}

contract DeployPixelPythons {
    error UnsupportedTestChain();

    uint256 private constant LOCAL_CHAIN_ID = 31337;
    uint256 private constant SEPOLIA_CHAIN_ID = 11155111;
    uint256 private constant ROBINHOOD_TESTNET_CHAIN_ID = 46630;

    BroadcastVm private constant vm =
        BroadcastVm(address(uint160(uint256(keccak256("hevm cheat code")))));

    function run(address owner, uint32 maxSupply, uint256 mintPriceWei, string memory baseUri)
        external
        returns (PixelPythons collection)
    {
        if (
            block.chainid != LOCAL_CHAIN_ID && block.chainid != SEPOLIA_CHAIN_ID
                && block.chainid != ROBINHOOD_TESTNET_CHAIN_ID
        ) {
            revert UnsupportedTestChain();
        }

        vm.startBroadcast();
        collection = new PixelPythons(owner, maxSupply, mintPriceWei, baseUri);
        vm.stopBroadcast();
    }
}

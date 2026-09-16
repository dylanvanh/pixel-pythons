// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {PixelPythons} from "../PixelPythons.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {DeployPixelPythons} from "../script/DeployPixelPythons.s.sol";

interface Vm {
    function deal(address account, uint256 balance) external;
    function prank(address sender) external;
    function expectRevert(bytes4 selector) external;
    function expectRevert() external;
    function chainId(uint256 chainId_) external;
}

contract PixelPythonsTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    address private constant collector = address(0xBEEF);
    uint256 private constant mintPriceWei = 0.001 ether;

    receive() external payable {}

    function testDeploymentScriptSupportsOnlyTestChains() public {
        // given
        DeployPixelPythons deployment = new DeployPixelPythons();
        uint256[3] memory testChains = [uint256(31337), uint256(11155111), uint256(46630)];

        // when
        for (uint256 index; index < testChains.length; ++index) {
            vm.chainId(testChains[index]);
            PixelPythons collection =
                deployment.run(collector, 100, mintPriceWei, "https://example.com/api/metadata/");

            // then
            require(collection.owner() == collector);
            require(collection.maxSupply() == 100);
            require(collection.mintPriceWei() == mintPriceWei);
            require(!collection.mintOpen());
        }
        vm.chainId(1);
        vm.expectRevert(DeployPixelPythons.UnsupportedTestChain.selector);
        deployment.run(collector, 100, mintPriceWei, "https://example.com/api/metadata/");
        vm.chainId(4663);
        vm.expectRevert(DeployPixelPythons.UnsupportedTestChain.selector);
        deployment.run(collector, 100, mintPriceWei, "https://example.com/api/metadata/");
    }

    function testMintRequiresOpenSaleAndExactPayment() public {
        // given
        PixelPythons pythons =
            new PixelPythons(address(this), 2, mintPriceWei, "https://example.com/api/metadata/");
        uint256 collectionBalanceBeforeWei = address(pythons).balance;
        vm.deal(collector, 1 ether);

        // when
        vm.prank(collector);
        vm.expectRevert(PixelPythons.MintClosed.selector);
        pythons.mint{value: mintPriceWei}();
        pythons.setMintOpen(true);
        vm.prank(collector);
        vm.expectRevert(PixelPythons.IncorrectPayment.selector);
        pythons.mint{value: mintPriceWei - 1}();
        vm.prank(collector);
        vm.expectRevert(PixelPythons.IncorrectPayment.selector);
        pythons.mint{value: mintPriceWei + 1}();
        vm.prank(collector);
        uint256 tokenId = pythons.mint{value: mintPriceWei}();

        // then
        require(tokenId == 1 && pythons.totalMinted() == 1);
        require(pythons.ownerOf(tokenId) == collector);
        require(address(pythons).balance == collectionBalanceBeforeWei + mintPriceWei);
        require(
            keccak256(bytes(pythons.tokenURI(1))) == keccak256("https://example.com/api/metadata/1")
        );
        require(pythons.supportsInterface(0x80ac58cd));
        vm.prank(collector);
        pythons.transferFrom(collector, address(0xCAFE), tokenId);
        require(pythons.ownerOf(tokenId) == address(0xCAFE));
    }

    function testSupplyCapAndClosedSaleCannotBeBypassed() public {
        // given
        PixelPythons pythons = new PixelPythons(address(this), 1, 0, "https://example.com/");
        pythons.setMintOpen(true);

        // when
        vm.prank(collector);
        pythons.mint();
        vm.prank(collector);
        vm.expectRevert(PixelPythons.SoldOut.selector);
        pythons.mint();
        pythons.setMintOpen(false);
        vm.prank(collector);
        vm.expectRevert(PixelPythons.MintClosed.selector);
        pythons.mint();

        // then
        require(pythons.totalMinted() == 1);
    }

    function testOnlyOwnerCanOpenSaleAndWithdraw() public {
        // given
        PixelPythons pythons =
            new PixelPythons(address(this), 2, mintPriceWei, "https://example.com/");
        vm.deal(collector, 1 ether);
        vm.prank(collector);
        vm.expectRevert();
        pythons.setMintOpen(true);
        pythons.setMintOpen(true);
        vm.prank(collector);
        pythons.mint{value: mintPriceWei}();

        // when
        vm.prank(collector);
        vm.expectRevert();
        pythons.withdraw();
        uint256 balanceBeforeWei = address(this).balance;
        uint256 proceedsWei = address(pythons).balance;
        pythons.withdraw();

        // then
        require(address(this).balance == balanceBeforeWei + proceedsWei);
        require(address(pythons).balance == 0);
    }

    function testReceiverCannotReenterMint() public {
        // given
        PixelPythons pythons = new PixelPythons(address(this), 3, 0, "https://example.com/");
        ReenteringReceiver receiver = new ReenteringReceiver(pythons);
        pythons.setMintOpen(true);

        // when
        receiver.mint();

        // then
        require(!receiver.reentered());
        require(pythons.totalMinted() == 1);
    }

    function testRejectedMintAndWithdrawalPreserveState() public {
        // given
        PixelPythons pythons =
            new PixelPythons(address(this), 1, mintPriceWei, "https://example.com/");
        uint256 collectionBalanceBeforeWei = address(pythons).balance;
        pythons.setMintOpen(true);
        vm.deal(address(this), 1 ether);

        // when
        vm.expectRevert();
        pythons.mint{value: mintPriceWei}();

        // then
        require(
            pythons.totalMinted() == 0 && address(pythons).balance == collectionBalanceBeforeWei
        );
        vm.deal(collector, 1 ether);
        vm.prank(collector);
        pythons.mint{value: mintPriceWei}();
        RejectingOwner owner = new RejectingOwner();
        pythons.transferOwnership(address(owner));
        vm.expectRevert(PixelPythons.WithdrawalFailed.selector);
        owner.withdraw(pythons);
        require(address(pythons).balance == collectionBalanceBeforeWei + mintPriceWei);
    }

    function testRejectsInvalidConstructorAndUnmintedMetadata() public {
        // given
        vm.expectRevert(PixelPythons.InvalidConfiguration.selector);
        new PixelPythons(address(this), 0, 0, "https://example.com/");
        vm.expectRevert(PixelPythons.InvalidConfiguration.selector);
        new PixelPythons(address(this), 1, 0, "https://example.com");
        vm.expectRevert(PixelPythons.InvalidConfiguration.selector);
        new PixelPythons(address(this), 1, 0, "");
        vm.expectRevert();
        new PixelPythons(address(0), 1, 0, "https://example.com/");

        // when
        PixelPythons pythons = new PixelPythons(address(this), 1, 0, "https://example.com/");

        // then
        vm.expectRevert();
        pythons.tokenURI(1);
    }
}

contract ReenteringReceiver is IERC721Receiver {
    PixelPythons private immutable pythons;
    bool public reentered;

    constructor(PixelPythons pythons_) {
        pythons = pythons_;
    }

    function mint() external {
        pythons.mint();
    }

    function onERC721Received(address, address, uint256, bytes calldata) external returns (bytes4) {
        (reentered,) = address(pythons).call(abi.encodeCall(PixelPythons.mint, ()));
        return IERC721Receiver.onERC721Received.selector;
    }
}

contract RejectingOwner {
    function withdraw(PixelPythons pythons) external {
        pythons.withdraw();
    }
}

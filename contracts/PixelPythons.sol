// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract PixelPythons is ERC721, Ownable, ReentrancyGuard {
    error InvalidConfiguration();
    error MintClosed();
    error SoldOut();
    error IncorrectPayment();
    error WithdrawalFailed();

    event MintOpenChanged(bool isOpen);
    event ProceedsWithdrawn(address indexed recipient, uint256 amountWei);

    uint32 public immutable maxSupply;
    uint256 public immutable mintPriceWei;
    uint256 public totalMinted;
    bool public mintOpen;
    string private metadataBaseURI;

    constructor(address owner_, uint32 maxSupply_, uint256 mintPriceWei_, string memory baseURI_)
        ERC721("Pixel Pythons", "PYTHON")
        Ownable(owner_)
    {
        bytes memory metadataUriBytes = bytes(baseURI_);

        if (
            maxSupply_ == 0 || metadataUriBytes.length == 0
                || metadataUriBytes[metadataUriBytes.length - 1] != bytes1("/")
        ) {
            revert InvalidConfiguration();
        }

        maxSupply = maxSupply_;
        mintPriceWei = mintPriceWei_;
        metadataBaseURI = baseURI_;
    }

    function mint() external payable nonReentrant returns (uint256 tokenId) {
        if (!mintOpen) {
            revert MintClosed();
        }

        if (totalMinted >= maxSupply) {
            revert SoldOut();
        }

        if (msg.value != mintPriceWei) {
            revert IncorrectPayment();
        }

        tokenId = ++totalMinted;
        _safeMint(msg.sender, tokenId);
    }

    function setMintOpen(bool isOpen) external onlyOwner {
        mintOpen = isOpen;
        emit MintOpenChanged(isOpen);
    }

    function withdraw() external nonReentrant onlyOwner {
        uint256 amountWei = address(this).balance;
        address recipient = owner();

        emit ProceedsWithdrawn(recipient, amountWei);

        (bool isSuccessful,) = payable(recipient).call{value: amountWei}("");

        if (!isSuccessful) {
            revert WithdrawalFailed();
        }
    }

    function _baseURI() internal view override returns (string memory) {
        return metadataBaseURI;
    }
}

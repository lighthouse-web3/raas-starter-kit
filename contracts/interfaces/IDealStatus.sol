// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./IAggregatorOracle.sol";

interface IDealStatus is IAggregatorOracle {
    function submit(bytes memory _cid) external returns (uint256);

    function submitRaaS(
        bytes memory _cid,
        uint256 _replication_target,
        uint256 _repair_threshold,
        uint256 _renew_threshold
    ) external returns (uint256);

    function complete(
        uint256 _id,
        uint64 _dealId,
        uint64 _minerId,
        InclusionProof memory _proof,
        InclusionVerifierData memory _verifierData
    ) external returns (InclusionAuxData memory);

    function getAllDeals(bytes memory _cid) external view returns (Deal[] memory);

    function getAllCIDs() external view returns (bytes[] memory);

    function getActiveDeals(bytes memory _cid) external returns (Deal[] memory);

    function getExpiringDeals(bytes memory _cid, uint64 epochs) external returns (Deal[] memory);

    function changeMaxReplications(uint256 _maxReplications) external;

    function getMaxReplications() external view returns (uint256);
}

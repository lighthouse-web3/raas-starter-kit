// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

import "./interfaces/IAggregatorOracle.sol";
import {Proof} from "./data-segment/Proof.sol";
import {MarketTypes} from "@zondax/filecoin-solidity/contracts/v0.8/types/MarketTypes.sol";
import {MarketAPI} from "@zondax/filecoin-solidity/contracts/v0.8/MarketAPI.sol";
import {CommonTypes} from "@zondax/filecoin-solidity/contracts/v0.8/types/CommonTypes.sol";

// Delta that implements the AggregatorOracle interface
contract DealStatus is IAggregatorOracle, Proof {
    ///////////////////
    // State Variables
    ///////////////////

    uint256 private s_transactionId;
    mapping(uint256 => bytes) private s_txIdToCid;
    mapping(bytes => Deal[]) private s_cidToDeals;

    ///////////////////
    // Functions
    ///////////////////

    //constructor
    constructor() {
        s_transactionId = 0;
    }

    // external functions

    /**
     * @notice Submits a new transaction with the given content identifier.
     * @dev Increments the transaction ID, saves the content identifier, and emits a SubmitAggregatorRequest event.
     * @param _cid The content identifier for the new transaction.
     * @return The ID of the newly created transaction.
     */

    function submit(bytes memory _cid) external returns (uint256) {
        // Increment the transaction ID
        s_transactionId++;

        // Save _cid
        s_txIdToCid[s_transactionId] = _cid;

        // Emit the event
        emit SubmitAggregatorRequest(s_transactionId, _cid);
        return s_transactionId;
    }

    /**
     * @notice Submits a new transaction with the given content identifier and RaaS parameters.
     * @dev Increments the transaction ID, saves the content identifier, and emits a SubmitAggregatorRequestWithRaaS event.
     * @param _cid The content identifier for the new transaction.
     * @param _replication_target The number of replications of data needed.
     * @param _repair_threshold The threshold to repair the deal if miner faults.
     * @param _renew_threshold The threshold to renew the deal.
     * @return The ID of the newly created transaction.
     */

    function submitRaaS(
        bytes memory _cid,
        uint256 _replication_target,
        uint256 _repair_threshold,
        uint256 _renew_threshold
    ) external returns (uint256) {
        // Increment the transaction ID
        s_transactionId++;

        // Save _cid
        s_txIdToCid[s_transactionId] = _cid;

        // Emit the event
        emit SubmitAggregatorRequestWithRaaS(
            s_transactionId,
            _cid,
            _replication_target,
            _repair_threshold,
            _renew_threshold
        );
        return s_transactionId;
    }

    /**
     * @notice Completes a transaction with the given transaction ID, deal ID, miner ID, inclusion proof, and inclusion verifier data.
     * @dev Emits a CompleteAggregatorRequest event.
     * @param _id The ID of the transaction to complete.
     * @param _dealId The ID of the deal to complete.
     * @param _minerId The ID of the miner that completed the deal.
     * @param _proof The inclusion proof for the transaction.
     * @param _verifierData The inclusion verifier data for the transaction.
     * @return The inclusion auxiliary data proof for the given file proof and verifier data.
     */

    function complete(
        uint256 _id,
        uint64 _dealId,
        uint64 _minerId,
        InclusionProof memory _proof,
        InclusionVerifierData memory _verifierData
    ) external returns (InclusionAuxData memory) {
        require(_id <= s_transactionId, "Delta.complete: invalid tx id");
        // Emit the event
        emit CompleteAggregatorRequest(_id, _dealId);

        // save the _dealId if it is not already saved
        bytes memory cid = s_txIdToCid[_id];
        for (uint256 i = 0; i < s_cidToDeals[cid].length; i++) {
            if (s_cidToDeals[cid][i].dealId == _dealId) {
                return computeExpectedAuxData(_proof, _verifierData);
            }
        }

        Deal memory deal = Deal(_dealId, _minerId);
        s_cidToDeals[cid].push(deal);

        // Perform validation logic
        // return this.computeExpectedAuxDataWithDeal(_dealId, _proof, _verifierData);
        return computeExpectedAuxData(_proof, _verifierData);
    }

    // View functions

    /**
     * @notice Retrieves all active deals associated with a given content identifier.
     * @dev Iterates through all deals associated with the content identifier, checks their activation and termination status, and removes any inactive deals from the returned array.
     * @param _cid The content identifier for which to retrieve active deals.
     * @return An array of Deal structs representing all active deals associated with the given content identifier.
     */

    function getActiveDeals(bytes memory _cid) external view returns (Deal[] memory) {
        // get all the deal ids for the cid
        Deal[] memory activeDealIds;
        activeDealIds = this.getAllDeals(_cid);

        for (uint256 i = 0; i < activeDealIds.length; i++) {
            uint64 dealID = activeDealIds[i].dealId;
            // get the deal's expiration epoch
            (int64 activated, int64 terminated) = this.getDealActivationData(dealID);

            if (terminated > 0 || activated == -1) {
                delete activeDealIds[i];
            }
        }

        return activeDealIds;
    }

    /**
     * @notice Retrieves all expiring deals associated with a given content identifier.
     * @dev Iterates through all deals associated with the content identifier, checks their expiration status, and removes any non-expiring deals from the returned array.
     * @param _cid The content identifier for which to retrieve expiring deals.
     * @param epochs The number of epochs before a deal's expiration to consider it expiring.
     * @return An array of Deal structs representing all expiring deals associated with the given content identifier.
     */

    function getExpiringDeals(
        bytes memory _cid,
        uint64 epochs
    ) external view returns (Deal[] memory) {
        // the logic is similar to the above, but use this api call:
        // https://github.com/Zondax/filecoin-solidity/blob/master/contracts/v0.8/MarketAPI.sol#LL110C9-L110C9
        Deal[] memory expiringDealIds;
        expiringDealIds = this.getAllDeals(_cid);

        for (uint256 i = 0; i < expiringDealIds.length; i++) {
            uint64 dealId = expiringDealIds[i].dealId;
            // get the deal's expiration epoch
            (, int64 endEpoch) = this.getDealTermData(dealId);
            if (block.number < uint64(endEpoch) - epochs) {
                delete expiringDealIds[i];
            }
        }

        return expiringDealIds;
    }

    //Getter Functions

    /**
     * @notice Retrieves the activation and termination data for a given deal.
     * @dev Calls the MarketAPI to get the deal's activation status and then unwraps the activation and termination epochs.
     * @param _dealId The ID of the deal for which to retrieve activation data.
     * @return dealActivation The activation epoch of the deal or -1.
     * @return dealTermination The termination epoch of the deal or -1.
     */

    function getDealActivationData(
        uint64 _dealId
    ) public view returns (int64 dealActivation, int64 dealTermination) {
        MarketTypes.GetDealActivationReturn memory dealActivationStatus = MarketAPI
            .getDealActivation(_dealId);
        return (
            CommonTypes.ChainEpoch.unwrap(dealActivationStatus.activated),
            CommonTypes.ChainEpoch.unwrap(dealActivationStatus.terminated)
        );
    }

    /**
     * @notice Retrieves the start and end epochs for a given deal.
     * @dev Calls the MarketAPI to get the deal's start and end epochs and then unwraps them.
     * @param _dealId The ID of the deal for which to retrieve term data.
     * @return startEpoch The start epoch of the deal.
     * @return endEpoch The end epoch of the deal.
     */
    function getDealTermData(
        uint64 _dealId
    ) public view returns (int64 startEpoch, int64 endEpoch) {
        MarketTypes.GetDealTermReturn memory dealTerm = MarketAPI.getDealTerm(_dealId);
        return (
            CommonTypes.ChainEpoch.unwrap(dealTerm.start),
            CommonTypes.ChainEpoch.unwrap(dealTerm.end)
        );
    }

    /**
     * @notice Retrieves all deals associated with a given content identifier.
     * @dev Returns the array of deals associated with the given content identifier.
     * @param _cid The content identifier for which to retrieve deals.
     * @return An array of Deal structs representing all deals associated with the given content identifier.
     */

    function getAllDeals(bytes memory _cid) external view returns (Deal[] memory) {
        return s_cidToDeals[_cid];
    }

    /**
     * @notice Retrieves all content identifiers associated with the contract.
     * @dev Returns the array of content identifiers associated with the aggregator.
     * @return An array of bytes representing all content identifiers associated with the aggregator.
     */

    function getAllCIDs() external view returns (bytes[] memory) {
        bytes[] memory cids = new bytes[](s_transactionId);
        for (uint256 i = 0; i < s_transactionId; i++) {
            cids[i] = s_txIdToCid[i + 1];
        }
        return cids;
    }
}

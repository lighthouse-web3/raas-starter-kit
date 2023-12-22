const axios = require("axios")
const { ethers } = require("hardhat")
const EventEmitter = require("events")
const logger = require("./winston")
// Location of fetched data for each CID from edge
const lighthouseDealDownloadEndpoint = process.env.LIGHTHOUSE_DEAL_DOWNLOAD_ENDPOINT
const lighthouseDealInfosEndpoint = process.env.LIGHTHOUSE_DEAL_INFOS_ENDPOINT
const { getDealInfo } = require("./lotusApi.js")
const {
    getCidInfo,
    updateCidRecord,
    createCidRecord,
    updateCidRecordAll,
} = require("./db-operations/raas-jobs")
const { createDeal, getDealbyId, updateDeal } = require("./db-operations/raas-deals")
const { needRenewal } = require("./repairAndRenewal")
require("dotenv").config()

const contractName = "DealStatus"
const contractInstance = process.env.DEAL_STATUS_ADDRESS // The user will also input
if (!lighthouseDealDownloadEndpoint) {
    throw new Error("Missing environment variables: data endpoints")
}

/// A new aggregator implementation should be created for each aggregator contract
class LighthouseAggregator {
    constructor() {
        // Each job is an object with the following properties:
        // txID: the transaction ID of the job
        // cid: the CID of the file
        // lighthouse_cid: the lighthouse CID of the file
        this.eventEmitter = new EventEmitter()
        // Load previous app job state

        logger.info("Aggregator initialized, polling for deals...")
    }

    async processDealInfos(lighthouse_cid, transactionId, currentReplications, replicationTarget) {
        let response
        try {
            response = await axios.get(lighthouseDealInfosEndpoint, {
                params: {
                    cid: lighthouse_cid,
                    // network: "testnet", // Change the network to mainnet when ready
                },
            })
        } catch (error) {
            logger.info("No deal found polling lighthouse for lighthouse_cid: " + lighthouse_cid)
            return
        }

        if (!response.data) {
            logger.info("No deal found polling lighthouse for lighthouse_cid: " + lighthouse_cid)
        } else {
            let dealIds = []
            let miner = []
            let expirationEpoch = []
            let inclusion_proof = []
            let verifier_data = []
            // logger.info("response.data.dealInfo: " + response.data.dealInfo)
            if (!response.data.dealInfo) {
                logger.info("Waiting for nonzero dealID: " + lighthouse_cid)
                return
            }
            // console.log("response.data.dealInfo: ", response.data.dealInfo[0])

            await Promise.all(
                response.data.dealInfo.map(async (item) => {
                    try {
                        const dealInfo = await getDealInfo(Number(item.dealId))

                        const x = await needRenewal(item.dealId)
                        if (dealInfo && !x) {
                            dealIds.push(item.dealId)
                            inclusion_proof.push(item.proof.inclusionProof)
                            verifier_data.push(item.proof.verifierData)
                            if (item.storageProvider.startsWith("f0")) {
                                miner.push(item.storageProvider.replace("f0", ""))
                            } else {
                                miner.push(item.storageProvider.replace("t0", ""))
                            }
                            expirationEpoch.push(dealInfo.Proposal.EndEpoch)
                        }
                    } catch (error) {
                        logger.error(error)
                    }
                })
            )

            // console.log("dealIds: ", dealIds)
            let dealInfos = {
                txID: transactionId,
                cid: lighthouse_cid,
                dealID: dealIds,
                inclusion_proof: inclusion_proof,
                verifier_data: verifier_data,
                // For each deal, the miner address is returned with a t0 prefix
                // Replace the t0 prefix with an empty string to get the address
                miner: miner,
                expirationEpoch: expirationEpoch,
            }
            // console.log(dealInfos.dealID.length)
            if (
                dealInfos.dealID.length >= replicationTarget &&
                dealInfos.dealID.length >= currentReplications
            ) {
                // console.log(replicationTarget, currentReplications, dealInfos.dealID.length)
                const newCidInfo = {
                    cid: lighthouse_cid,
                    dealIDs: dealInfos.dealID,
                    miners: dealInfos.miner,
                    currentReplications: dealInfos.dealID.length,

                    cidStatus: "complete",
                }
                await updateCidRecordAll(newCidInfo)
                // await updateCidRecord(
                //     lighthouse_cid,
                //     "currentReplications",
                //     dealInfos.dealID.length
                // )
                // await updateArrayInCidRecord(lighthouse_cid, "dealIDs", dealInfos.dealID)
                // await updateArrayInCidRecord(lighthouse_cid, "miners", dealInfos.miner)
                // await updateCidRecord(lighthouse_cid, "cidStatus", "complete")
                // await doLastUpdate(lighthouse_cid)
            } else if (dealInfos.dealID.length > currentReplications) {
                const newCidInfo = {
                    cid: lighthouse_cid,
                    dealIDs: dealInfos.dealID,
                    miners: dealInfos.miner,
                    currentReplications: dealInfos.dealID.length,

                    cidStatus: "incomplete",
                }
                await updateCidRecordAll(newCidInfo)
                // await updateCidRecord(
                //     lighthouse_cid,
                //     "currentReplications",
                //     dealInfos.dealID.length
                // )
                // await updateArrayInCidRecord(lighthouse_cid, "dealIDs", dealInfos.dealID)
                // await updateArrayInCidRecord(lighthouse_cid, "miners", dealInfos.miner)
                // await doLastUpdate(lighthouse_cid)
            } else return

            // If we receive a nonzero dealID, emit the DealReceived event
            if (dealInfos.dealID[0] != null) {
                logger.info(
                    "Lighthouse deal infos processed after receiving nonzero dealIDs: " +
                        JSON.stringify(dealInfos.dealID)
                )

                // this.eventEmitter.emit("DealReceived", dealInfos)
                await this.callCompleteFunction(dealInfos)
                // await Promise.all(

                return
            } else {
                logger.info("Waiting for nonzero dealID: " + lighthouse_cid)
            }
        }
    }

    async lighthouseProcessWithRetry(cidString, transactionId, _replication_target) {
        let retries = 1 // Number of retries

        while (retries >= 0) {
            try {
                const cidInfo = await getCidInfo(cidString)
                if (cidInfo) {
                    if (cidInfo.transactionId !== transactionId) {
                        await updateCidRecord(cidString, "transactionId", transactionId)
                    }
                    if (cidInfo.replicationTarget !== _replication_target) {
                        await updateCidRecord(cidString, "replicationTarget", _replication_target)
                    }
                    if (cidInfo.currentReplications >= _replication_target) {
                        await updateCidRecord(cidString, "cidStatus", "complete")
                    } else {
                        await updateCidRecord(cidString, "cidStatus", "incomplete")
                    }
                } else {
                    await createCidRecord({
                        cid: cidString,
                        transactionId: transactionId,
                        dealIDs: [],
                        miners: [],
                        currentReplications: 0,
                        replicationTarget: _replication_target,
                        cidStatus: _replication_target === 0 ? "complete" : "incomplete",
                    })
                }
                // await this.processDealInfos(18, 1000, lighthouseCID, transactionId)
                return cidString // Return the result if successful
            } catch (error) {
                logger.error(error)
                if (retries === 0) {
                    throw error // If no more retries left, rethrow the error
                }
            }

            retries-- // Decrement the retry counter
        }
    }
    async callCompleteFunction(dealInfos) {
        // Create a listener for the data retrieval endpoints to complete deals
        // Event listeners for the 'done' and 'error' events
        const dealStatus = await ethers.getContractAt(contractName, contractInstance)

        // Listener for edge aggregator
        // lighthouseAggregatorInstance.eventEmitter.on("DealReceived", async (dealInfos) => {
        // Process the dealInfos
        let txID = dealInfos.txID
        let dealIDs = dealInfos.dealID
        let miners = dealInfos.miner
        let inclusion_proof = dealInfos.inclusion_proof
        let verifier_data = dealInfos.verifier_data
        let lighthouse_cid = dealInfos.cid
        let expirationEpoch = dealInfos.expirationEpoch
        inclusion_proof.forEach((value, index) => {
            inclusion_proof[index].proofIndex.index = "0x" + value.proofIndex.index
            inclusion_proof[index].proofIndex.path.forEach((value, i) => {
                inclusion_proof[index].proofIndex.path[i] = "0x" + value
            })
            inclusion_proof[index].proofSubtree.index = "0x" + value.proofSubtree.index
            inclusion_proof[index].proofSubtree.path.forEach((value, i) => {
                inclusion_proof[index].proofSubtree.path[i] = "0x" + value
            })
        })

        verifier_data.forEach((value, index) => {
            verifier_data[index].commPc = "0x" + value.commPc
            verifier_data[index].sizePc = parseInt(value.sizePc, 16)
        })

        logger.info("Deal received with dealIds: " + JSON.stringify(dealIDs))
        try {
            // For each dealID, complete the deal
            for (let i = 0; i < dealIDs.length; i++) {
                // console.log("Completing deal with deal ID: ", dealIDs[i])
                // console.log(`txID: Type - ${typeof txID}, Value - ${txID}`)
                // console.log(`dealID: Type - ${typeof dealIDs[i]}, Value - ${dealIDs[i]}`)
                // console.log(`miner: Type - ${typeof miners[i]}, Value - ${miners[i]}`)
                const dbDealInfo = await getDealbyId(Number(dealIDs[i]))
                if (dbDealInfo == null || !dbDealInfo.cids.includes(lighthouse_cid)) {
                    // await dealStatus.complete(
                    //     txID,
                    //     dealIDs[i],
                    //     miners[i],
                    //     [
                    //         [
                    //             Number(inclusion_proof[i].proofIndex.index),
                    //             inclusion_proof[i].proofIndex.path,
                    //         ],
                    //         [
                    //             Number(inclusion_proof[i].proofSubtree.index),
                    //             inclusion_proof[i].proofSubtree.path,
                    //         ],
                    //     ],
                    //     [verifier_data[i].commPc, verifier_data[i].sizePc],
                    //     { gasLimit: ethers.utils.parseUnits("5000000", "wei") }
                    // )
                    // logger.info("complete function called for deal ID: " + dealIDs[i])
                    // dealInfos.dealID.forEach(async (dealID, i) => {
                    // const dealInfo = await getDealbyId(dealID)
                    if (dbDealInfo) {
                        await updateDeal(dealIDs[i], lighthouse_cid)
                    } else {
                        await createDeal({
                            dealId: dealIDs[i],
                            cids: [lighthouse_cid],
                            expirationEpoch: expirationEpoch[i],
                        })
                    }
                    // })
                }
            }
        } catch (err) {
            logger.error("Error submitting file for completion: " + err)
        }
        // })
    }
}

module.exports = LighthouseAggregator

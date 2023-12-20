const axios = require("axios")

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
    updateArrayInCidRecord,
} = require("./db-operations/raas-jobs")
const { createDeal, getDealbyId, updateDeal } = require("./db-operations/raas-deals")
const { needRenewal } = require("./repairAndRenewal")

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
        let response = await axios.get(lighthouseDealInfosEndpoint, {
            params: {
                cid: lighthouse_cid,
                network: "testnet", // Change the network to mainnet when ready
            },
        })
        if (!response.data) {
            logger.info("No deal found polling lighthouse for lighthouse_cid: " + lighthouse_cid)
        } else {
            let dealIds = []
            let miner = []
            let expirationEpoch = []
            // logger.info("response.data.dealInfo: " + response.data.dealInfo)
            if (!response.data.dealInfo) {
                logger.info("Waiting for nonzero dealID: " + lighthouse_cid)
                return
            }
            try {
                await Promise.all(
                    response.data.dealInfo.map(async (item) => {
                        const dealInfo = await getDealInfo(Number(item.dealId))
                        const x = await needRenewal(item.dealId)
                        if (dealInfo && !x) {
                            dealIds.push(item.dealId)
                            miner.push(item.storageProvider.replace("t0", ""))
                            expirationEpoch.push(dealInfo.Proposal.EndEpoch)
                        }
                    })
                )
            } catch (error) {
                logger.error(error)
            }
            // console.log("dealIds: ", dealIds)
            let dealInfos = {
                txID: transactionId,
                dealID: dealIds,
                inclusion_proof: response.data.proof.fileProof.inclusionProof,
                verifier_data: response.data.proof.fileProof.verifierData,
                // For each deal, the miner address is returned with a t0 prefix
                // Replace the t0 prefix with an empty string to get the address
                miner: miner,
            }
            if (dealInfos.dealID.length > currentReplications) {
                await updateCidRecord(
                    lighthouse_cid,
                    "currentReplications",
                    dealInfos.dealID.length
                )
                await updateArrayInCidRecord(lighthouse_cid, "dealIDs", dealInfos.dealID)
                await updateArrayInCidRecord(lighthouse_cid, "miners", dealInfos.miner)
            } else return
            if (dealInfos.dealID.length >= replicationTarget) {
                await updateCidRecord(lighthouse_cid, "cidStatus", "complete")
            }

            // If we receive a nonzero dealID, emit the DealReceived event
            if (dealInfos.dealID[0] != null) {
                logger.info(
                    "Lighthouse deal infos processed after receiving nonzero dealID: " + dealInfos
                )
                this.eventEmitter.emit("DealReceived", dealInfos)

                // await Promise.all(
                dealInfos.dealID.forEach(async (dealID, i) => {
                    const dealInfo = await getDealbyId(dealID)
                    if (dealInfo) {
                        await updateDeal(dealID, lighthouse_cid)
                    } else {
                        await createDeal({
                            dealId: dealID,
                            cids: [lighthouse_cid],
                            expirationEpoch: expirationEpoch[i],
                        })
                    }
                })

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
                        await updateCidRecord(cidString, "transactionId", Number(transactionId))
                    }
                    if (cidInfo.replicationTarget !== _replication_target) {
                        await updateCidRecord(
                            cidString,
                            "replicationTarget",
                            Number(_replication_target)
                        )
                    }
                    if (cidInfo.currentReplications >= _replication_target) {
                        await updateCidRecord(cidString, "cidStatus", "complete")
                    }
                } else {
                    await createCidRecord({
                        cid: cidString,
                        transactionId: Number(transactionId),
                        dealIDs: [],
                        miners: [],
                        currentReplications: 0,
                        replicationTarget: Number(_replication_target),
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
}

module.exports = LighthouseAggregator

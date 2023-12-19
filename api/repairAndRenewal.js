const { getDealInfo, getBlockNumber } = require("./lotusApi.js")
const logger = require("./winston")
const { getAllDeals, updateDeal, deleteDeal } = require("./db-operations/raas-deals")
const { getCidInfo, updateCidRecord, updateArrayInCidRecord } = require("./db-operations/raas-jobs")

async function executeRepairJobs() {
    const REPAIR_EPOCHS = 1000 // Replace with the actual value
    const dealInfos = await getAllDeals()
    // Traverse through all the dealIds in dealNodeJobs
    for (const index in dealInfos) {
        const deal = dealInfos[index]
        try {
            logger.info("Running repair job for deal: " + deal.dealId)
            // Run getDealInfo for all deal ids
            const dealInfo = await getDealInfo(Number(deal.dealId))

            // Check if the response.data.result.state.slashepoch - EPOCHs < getBlockNumber()
            const blockNumber = await getBlockNumber()
            if (
                dealInfo.State.SectorStartEpoch > -1 &&
                dealInfo.State.SlashEpoch != -1 &&
                blockNumber - dealInfo.State.SlashEpoch > REPAIR_EPOCHS
            ) {
                await deleteDeal(deal.dealId)
                await updateCidAfterDealExpiration(deal)
            }
        } catch (error) {
            logger.error(error)
        }
    }
}

async function executeRenewalJobs() {
    const dealInfos = await getAllDeals()

    // Traverse through all the dealIds in dealNodeJobs
    for (const index in dealInfos) {
        // Run getDealInfo for all deal ids
        const deal = dealInfos[index]
        logger.info("Running renewal job for deal: " + deal.dealId)
        try {
            const x = await needRenewal(deal.dealId)
            if (x) {
                await deleteDeal(deal.dealId)
                await updateCidAfterDealExpiration(deal)
            }
        } catch (error) {
            logger.error(error)
        }
    }
}

async function needRenewal(dealId) {
    try {
        const RENEWAL_EPOCHS = 1000 // Replace with the actual value
        const dealInfo = await getDealInfo(Number(dealId))
        const blockNumber = await getBlockNumber()
        if (dealInfo.Proposal.EndEpoch - blockNumber < RENEWAL_EPOCHS) {
            return true
        }
        return false
    } catch (error) {
        logger.error(error)
        throw error
    }
}

async function updateCidAfterDealExpiration(deal) {
    for (const cid of deal.cids) {
        const cidInfo = await getCidInfo(cid)
        for (let i = cidInfo.dealIDs.length - 1; i >= 0; i--) {
            if (cidInfo.dealIDs[i] == deal.dealId) {
                cidInfo.dealIDs.splice(i, 1)
                cidInfo.miners.splice(i, 1)
            }
        }
    }
    await updateArrayInCidRecord(cidInfo.cid, "dealIDs", cidInfo.dealIDs)
    await updateArrayInCidRecord(cidInfo.cid, "miners", cidInfo.miners)
    await updateCidRecord(cidInfo.cid, "currentReplications", Number(cidInfo.replications - 1))
    await updateCidRecord(cidInfo.cid, "status", "incomplete")
}
// console.log(await needRenewal(164540))
module.exports = { executeRepairJobs, executeRenewalJobs, needRenewal }

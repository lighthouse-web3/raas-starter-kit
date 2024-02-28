const express = require("express")
const { ethers } = require("hardhat")
const cors = require("cors")

const app = express()

const path = require("path")

require("dotenv").config()
const port = 1337
const contractName = "DealStatus"
const contractInstance = process.env.DEAL_STATUS_ADDRESS // The user will also input
const LighthouseAggregator = require("./lighthouseAggregator.js")
const { executeRenewalJobs, executeRepairJobs } = require("./repairAndRenewal.js")
const logger = require("./winston")
const getNonZeroTransactionIdRecords = require("./db-operations/raas-jobs/getNonZeroTransactionIdRecords.js")
let lighthouseAggregatorInstance
let isDealCreationListenerActive = false

app.use(cors())
app.listen(port, () => {
    if (!isDealCreationListenerActive) {
        isDealCreationListenerActive = true
        initializeDealCreationListener()
        // storedNodeJobs = loadJobsFromState()
        lighthouseAggregatorInstance = new LighthouseAggregator()
    }

    console.log(`App started and is listening on port ${port}`)
    // console.log("Existing jobs on service node: ", storedNodeJobs)
    setInterval(async () => {
        console.log("checking for deals")
        const incompleteCidRecords = await getNonZeroTransactionIdRecords()
        console.log(incompleteCidRecords)
        // return
        incompleteCidRecords.forEach(async (job) => {
            lighthouseAggregatorInstance.processDealInfos(
                job.cid,
                job.transactionId,
                job.currentReplications,
                job.replicationTarget
            )
        })

        //     setTimeout(async () => {
        //         console.log("Executing jobs")
        //         await executeRenewalJobs()
        //     }, 300000)
    }, 6000000) // 10000 milliseconds = 10 seconds

    // setInterval(async () => {
    //     console.log("executing repair jobs")
    //     await executeRepairJobs()
    // }, 1800000) // 10000 milliseconds = 10 seconds
})

// app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, "public")))

app.use(express.json())
app.use(express.urlencoded({ extended: false }))

async function initializeDealCreationListener() {
    const dealStatus = await ethers.getContractAt(contractName, contractInstance)
    let processedTransactionIds = new Set()

    /// Logic for handling SubmitAggregatorRequestWithRaaS events
    function handleEvent(
        transactionId,
        cid,
        _replication_target,
        _repair_threshold,
        _renew_threshold
    ) {
        console.log(
            `Received SubmitAggregatorRequestWithRaaS event: (Transaction ID: ${transactionId}, CID: ${cid}), Replication target: ${_replication_target}, Repair threshold: ${_repair_threshold}, Renew threshold: ${_renew_threshold}`
        )
        // Store the txID of the job in the job queue
        // storedNodeJobs.forEach((job) => {
        //     if (job.cid === ethers.utils.toUtf8String(cid)) {
        //         job.txID = transactionId
        //     }
        // })

        if (processedTransactionIds.has(transactionId)) {
            console.log(`Ignoring already processed transaction ID: ${transactionId}`)
            return
        }

        processedTransactionIds.add(transactionId)
        const cidString = ethers.utils.toUtf8String(cid)

        ;(async () => {
            if (dealStatus.listenerCount("SubmitAggregatorRequestWithRaaS") === 0) {
                dealStatus.once("SubmitAggregatorRequestWithRaaS", handleEvent)
            }
            try {
                const result = await lighthouseAggregatorInstance.lighthouseProcessWithRetry(
                    cidString,
                    Number(transactionId),
                    Number(_replication_target)
                )
                return result
            } catch (error) {
                logger.error("File processing error. Please try again:" + error)
            }

            if (dealStatus.listenerCount("SubmitAggregatorRequestWithRaaS") === 0) {
                dealStatus.once("SubmitAggregatorRequestWithRaaS", handleEvent)
            }
        })()
    }

    // Start listening to the first event and recursively handle the next events
    if (dealStatus.listenerCount("SubmitAggregatorRequestWithRaaS") === 0) {
        dealStatus.once("SubmitAggregatorRequestWithRaaS", handleEvent)
    }
}

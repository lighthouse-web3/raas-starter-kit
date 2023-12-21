const express = require("express")
const { ethers } = require("hardhat")
const cors = require("cors")

const { networkConfig } = require("../helper-hardhat-config")

const axios = require("axios")
const app = express()
const fs = require("fs")
const path = require("path")
const multer = require("multer")
const sleep = require("util").promisify(setTimeout)

const port = 1337
const contractName = "DealStatus"
const contractInstance = "0x16c74b630d8c28bfa0f353cf19c5b114407a8051" // The user will also input
const LighthouseAggregator = require("./lighthouseAggregator.js")
const upload = multer({ dest: "temp/" }) // Temporary directory for uploads
const { executeRenewalJobs, executeRepairJobs } = require("./repairAndRenewal.js")
const { getIncompleteCidRecords } = require("./db-operations/raas-jobs")
const logger = require("./winston")
let lighthouseAggregatorInstance
let isDealCreationListenerActive = false

app.use(cors())
app.listen(port, () => {
    if (!isDealCreationListenerActive) {
        isDealCreationListenerActive = true
        initializeDealCreationListener()
        initializeDataRetrievalListener()
        // storedNodeJobs = loadJobsFromState()
        lighthouseAggregatorInstance = new LighthouseAggregator()
    }

    console.log(`App started and is listening on port ${port}`)
    // console.log("Existing jobs on service node: ", storedNodeJobs)
    setInterval(async () => {
        console.log("checking for deals")
        const incompleteCidRecords = await getIncompleteCidRecords()
        incompleteCidRecords.forEach(async (job) => {
            lighthouseAggregatorInstance.processDealInfos(
                job.cid,
                job.transactionId,
                job.currentReplications,
                job.replicationTarget
            )
        })

        setTimeout(async () => {
            console.log("Executing jobs")
            await executeRenewalJobs()
        }, 5000) // 5000 milliseconds = 5 seconds
    }, 10000) // 10000 milliseconds = 10 seconds

    setInterval(async () => {
        console.log("executing repair jobs")
        await executeRepairJobs()
    }, 20000) // 10000 milliseconds = 10 seconds
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

// Initialize the listener for the Data Retrieval event
async function initializeDataRetrievalListener() {
    // Create a listener for the data retrieval endpoints to complete deals
    // Event listeners for the 'done' and 'error' events
    const dealStatus = await ethers.getContractAt(contractName, contractInstance)

    // Listener for edge aggregator
    lighthouseAggregatorInstance.eventEmitter.on("DealReceived", async (dealInfos) => {
        // Process the dealInfos
        let txID = dealInfos.txID
        let dealIDs = dealInfos.dealID
        let miners = dealInfos.miner
        let inclusionProof = {
            proofIndex: {
                index: "0x" + dealInfos.inclusion_proof.proofIndex.index,
                path: dealInfos.inclusion_proof.proofIndex.path.map((value) => "0x" + value),
            },
            proofSubtree: {
                index: "0x" + dealInfos.inclusion_proof.proofSubtree.index,
                path: dealInfos.inclusion_proof.proofSubtree.path.map((value) => "0x" + value),
            },
        }
        let verifierData = dealInfos.verifier_data
        verifierData.commPc = "0x" + verifierData.commPc
        // The size piece is originally in hex. Convert it to a number.
        verifierData.sizePc = parseInt(verifierData.sizePc, 16)
        // Add on the dealInfos to the existing job stored inside the storedNodeJobs.
        // storedNodeJobs.forEach((job) => {
        //     if (job.txID === dealInfos.txID) {
        //         job.dealInfos = dealInfos
        //     }
        // })
        // saveJobsToState()
        logger.info("Deal received with dealInfos: " + JSON.stringify(dealInfos))
        try {
            // For each dealID, complete the deal
            for (let i = 0; i < dealIDs.length; i++) {
                // console.log("Completing deal with deal ID: ", dealIDs[i])
                // console.log(`txID: Type - ${typeof txID}, Value - ${txID}`)
                // console.log(`dealID: Type - ${typeof dealIDs[i]}, Value - ${dealIDs[i]}`)
                // console.log(`miner: Type - ${typeof miners[i]}, Value - ${miners[i]}`)

                // await dealStatus.complete(
                //     txID,
                //     dealIDs[i],
                //     miners[i],
                //     [
                //         [Number(inclusionProof.proofIndex.index), inclusionProof.proofIndex.path],
                //         [
                //             Number(inclusionProof.proofSubtree.index),
                //             inclusionProof.proofSubtree.path,
                //         ],
                //     ],
                //     [verifierData.commPc, verifierData.sizePc],
                //     { gasLimit: ethers.utils.parseUnits("3000000", "wei") }
                // )
                logger.info("Deal completed for deal ID: " + dealIDs[i])
            }
        } catch (err) {
            logger.error("Error submitting file for completion: " + err)
        }
    })

    lighthouseAggregatorInstance.eventEmitter.on("Error", (error) => {
        logger.error("An error occurred:" + error)
    })
}

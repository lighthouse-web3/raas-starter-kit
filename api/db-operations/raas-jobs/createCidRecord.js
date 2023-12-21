const client = require("../ddbClient")
const { CidRecord } = require("../utils/constants")
const { marshall } = require("@aws-sdk/util-dynamodb")
const logger = require("../../winston")
const { PutItemCommand } = require("@aws-sdk/client-dynamodb")

const createCidRecord = async (record) => {
    try {
        // console.log(record)
        // console.log(CidRecord)
        record.lastUpdate = Math.floor(Date.now() / 1000)

        const params = {
            TableName: CidRecord,
            Item: marshall(record),
        }
        const command = new PutItemCommand(params)
        const response = await client.send(command)
        logger.info("Created record for Cid ", record.cid)
        return "Put Successful"
    } catch (error) {
        console.log(error)
        throw new Error()
    }
}

// createCidRecord({
//     cid: "QmS7Do1mDZNBJAVyE8N9r6wYMdg27LiSj5W9mmm9TZoeWp",
//     transactionId: 1,
//     dealIDs: [],
//     miners: [],
//     currentReplications: 0,
//     replicationTarget: 3,
//     cidStatus: "incomplete",
//     lastUpdate: 1703101963,
// })
module.exports = createCidRecord

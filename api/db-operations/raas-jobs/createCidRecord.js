const client = require("../ddbClient")
const { CidRecord } = require("../utils/constants")
const { marshall } = require("@aws-sdk/util-dynamodb")

const { PutItemCommand } = require("@aws-sdk/client-dynamodb")

const createCidRecord = async (record) => {
    try {
        // console.log(record)
        // console.log(CidRecord)
        const params = {
            TableName: CidRecord,
            Item: marshall(record),
        }
        const command = new PutItemCommand(params)
        const response = await client.send(command)
        console.log(response)
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
//     status: "incomplete",
// })
module.exports = createCidRecord

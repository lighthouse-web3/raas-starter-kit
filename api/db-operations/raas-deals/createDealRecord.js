const client = require("../ddbClient")
const { DealRecord } = require("../utils/constants")
const { marshall } = require("@aws-sdk/util-dynamodb")
const logger = require("../../winston")
const { PutItemCommand } = require("@aws-sdk/client-dynamodb")

const createDeal = async (record) => {
    try {
        // console.log(record)
        // console.log(DealRecord)
        const params = {
            TableName: DealRecord,
            Item: marshall(record),
        }
        const command = new PutItemCommand(params)
        const response = await client.send(command)
        logger.info("Created DealId ", record.dealId)
        return "Put Successful"
    } catch (error) {
        console.log(error)
        throw new Error()
    }
}

// createDeal({
//     dealId: 60000000,
//     cids: ["QmZ2Y3"],
//     expirationEpoch: 1234564890,
// })
module.exports = createDeal

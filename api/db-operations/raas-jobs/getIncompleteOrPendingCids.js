const { ScanCommand } = require("@aws-sdk/client-dynamodb")
const { CidRecord } = require("../utils/constants")
const client = require("../ddbClient")
const { unmarshall } = require("@aws-sdk/util-dynamodb")
const logger = require("../../winston")
const getIncompleteOrPendingCidRecords = async () => {
    try {
        const params = {
            TableName: CidRecord,
            FilterExpression: "#cidStatus = :status1 OR #cidStatus = :status2",
            ExpressionAttributeNames: {
                "#cidStatus": "cidStatus",
            },
            ExpressionAttributeValues: {
                ":status1": { S: "incomplete" },
                ":status2": { S: "Pending" },
            },
        }
        const command = new ScanCommand(params)
        const response = await client.send(command)
        const unmarshalledItems = response.Items.map((item) => unmarshall(item))
        logger.info("Received all incomplete or pending cids")
        return unmarshalledItems
    } catch (error) {
        console.log(error)
        throw new Error()
    }
}

// getIncompleteCidRecords()

module.exports = getIncompleteOrPendingCidRecords

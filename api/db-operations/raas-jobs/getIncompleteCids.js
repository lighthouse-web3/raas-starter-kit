const { ScanCommand } = require("@aws-sdk/client-dynamodb")
const { CidRecord } = require("../utils/constants")
const client = require("../ddbClient")
const { unmarshall } = require("@aws-sdk/util-dynamodb")
const logger = require("../../winston")
const getIncompleteCidRecords = async () => {
    try {
        const params = {
            TableName: CidRecord,
            FilterExpression: "#status = :status",
            ExpressionAttributeNames: {
                "#status": "status",
            },
            ExpressionAttributeValues: {
                ":status": { S: "incomplete" },
            },
        }
        const command = new ScanCommand(params)
        const response = await client.send(command)
        const unmarshalledItems = response.Items.map((item) => unmarshall(item))
        logger.info("Recieved all incomplete cids")
        return unmarshalledItems
    } catch (error) {
        console.log(error)
        throw new Error()
    }
}

// getIncompleteCidRecords()

module.exports = getIncompleteCidRecords

const { ScanCommand } = require("@aws-sdk/client-dynamodb")
const { CidRecord } = require("../utils/constants")
const client = require("../ddbClient")
const { unmarshall } = require("@aws-sdk/util-dynamodb")
const logger = require("../../winston")

const getNonZeroTransactionIdRecords = async () => {
    try {
        const params = {
            TableName: CidRecord,
            FilterExpression: "#transactionId <> :zero",
            ExpressionAttributeNames: {
                "#transactionId": "transactionId",
            },
            ExpressionAttributeValues: {
                ":zero": { N: "0" },
            },
        }
        const command = new ScanCommand(params)
        const response = await client.send(command)
        const unmarshalledItems = response.Items.map((item) => unmarshall(item))
        logger.info("Received all records with non-zero transactionId")
        // console.log(unmarshalledItems)
        return unmarshalledItems
    } catch (error) {
        console.log(error)
        throw new Error()
    }
}

module.exports = getNonZeroTransactionIdRecords

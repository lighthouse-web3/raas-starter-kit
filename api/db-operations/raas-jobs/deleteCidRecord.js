const { DeleteItemCommand } = require("@aws-sdk/client-dynamodb")
const { CidRecord } = require("../utils/constants")
const client = require("../ddbClient")
const logger = require("../../winston")
const deleteCidRecord = async (cid) => {
    try {
        const params = {
            TableName: CidRecord,
            Key: { cid: { S: cid } },
        }
        const command = new DeleteItemCommand(params)
        const response = await client.send(command)
        logger.info("Deleted Cid " + cid)
        return "Delete Successful"
    } catch (error) {
        console.log(error)
        throw new Error()
    }
}

// deleteCidRecord("QmYGqc5hNSQDQfMAvv3VhsPbhMjwbwaPLXDeaBgSBsqvGn")

module.exports = deleteCidRecord

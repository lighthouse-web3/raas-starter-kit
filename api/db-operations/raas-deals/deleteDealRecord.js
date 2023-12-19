const { DeleteItemCommand } = require("@aws-sdk/client-dynamodb")
const { DealRecord } = require("../utils/constants")
const client = require("../ddbClient")
const { marshall } = require("@aws-sdk/util-dynamodb")
const logger = require("../../winston")
const deleteDeal = async (dealId) => {
    try {
        const params = {
            TableName: DealRecord,
            Key: marshall({ dealId: dealId }),
        }
        const command = new DeleteItemCommand(params)
        const response = await client.send(command)
        logger.info("Deleted DealId " + dealId)
        return "Delete Successful"
    } catch (error) {
        console.log(error)
        throw new Error()
    }
}
// deleteDeal(164539)
module.exports = deleteDeal

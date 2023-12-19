const client = require("../ddbClient")
const { DealRecord } = require("../utils/constants")
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb")

const { GetItemCommand } = require("@aws-sdk/client-dynamodb")
// module.exports

const getDeal = async (dealId) => {
    try {
        const params = {
            TableName: DealRecord,
            Key: marshall({ dealId: dealId }),
        }
        const command = new GetItemCommand(params)
        const response = await client.send(command)
        console.log(response)
        if (!response.Item) {
            return null
        }
        return unmarshall(response.Item)
    } catch (error) {
        console.log(error)
        throw new Error()
    }
}
// getDeal(164526)
module.exports = getDeal

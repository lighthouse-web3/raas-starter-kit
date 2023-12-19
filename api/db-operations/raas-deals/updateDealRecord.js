const { UpdateItemCommand } = require("@aws-sdk/client-dynamodb")
const { DealRecord } = require("../utils/constants")
const client = require("../ddbClient")
const { marshall } = require("@aws-sdk/util-dynamodb")

const updateCidInDeal = async (dealId, newCid) => {
    try {
        const params = {
            TableName: DealRecord,
            Key: marshall({ dealId: dealId }),
            UpdateExpression: "set #attrName = list_append(#attrName, :newCid)",
            ExpressionAttributeNames: {
                "#attrName": "cids",
            },
            ExpressionAttributeValues: {
                ":newCid": { L: [{ S: newCid }] },
            },
            ReturnValues: "UPDATED_NEW",
        }
        const command = new UpdateItemCommand(params)
        const response = await client.send(command)
        console.log(response)
        return "Update Successful"
    } catch (error) {
        console.log(error)
        throw new Error()
    }
}

// updateCidInDeal(60000000, "QmZ45Y4")

module.exports = updateCidInDeal

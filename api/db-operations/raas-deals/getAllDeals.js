const { ScanCommand } = require("@aws-sdk/client-dynamodb")
const { DealRecord } = require("../utils/constants")
const client = require("../ddbClient")
const { unmarshall } = require("@aws-sdk/util-dynamodb")
const getAllDeals = async () => {
    try {
        const params = {
            TableName: DealRecord,
        }
        const command = new ScanCommand(params)
        const response = await client.send(command)
        console.log(response)
        const unmarshalledItems = response.Items.map((item) => unmarshall(item))
        console.log(unmarshalledItems)
        return unmarshalledItems
    } catch (error) {
        console.log(error)
        throw new Error()
    }
}
getAllDeals()
module.exports = getAllDeals

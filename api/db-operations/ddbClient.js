const { DynamoDBClient } = require("@aws-sdk/client-dynamodb")
require("dotenv").config()
const client = new DynamoDBClient({
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    region: "ap-south-1",
})

module.exports = client

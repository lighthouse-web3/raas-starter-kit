const createCidRecord = require("./createCidRecord")
const {
    updateCidRecord,
    updateArrayInCidRecord,
    doLastUpdate,
    updateCidRecordAll,
} = require("./updateCidRecord")
const getIncompleteOrPendingCidRecords = require("./getIncompleteOrPendingCids")
const deleteCidRecord = require("./deleteCidRecord")
const getCidInfo = require("./getCidInfo")
module.exports = {
    createCidRecord,
    updateCidRecord,
    updateArrayInCidRecord,
    getIncompleteOrPendingCidRecords,
    deleteCidRecord,
    getCidInfo,
    doLastUpdate,
    updateCidRecordAll,
}

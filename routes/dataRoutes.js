const express = require("express");
const router = express.Router();
const { getAggregatedData } = require("../services/aggregationService");
const {
  getCollections,
  getDataByCollection,
  getAllCollectionsData,
} = require("../controllers/dataController");

router.get("/collections", getCollections);
router.get("/data", getDataByCollection);
router.get("/aggregated-data", getAggregatedData);
router.get("/all-data", getAllCollectionsData);

module.exports = router;

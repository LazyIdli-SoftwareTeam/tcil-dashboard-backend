const mongoose = require("mongoose");

const possibleStartKeys = [
  "start_time",
  "count_start_time",
  "cc_count_start",
  "start_count_time",
  "createdAt",
];

const possibleEndKeys = [
  "finalized",
  "finalize_time",
  "count_end_time",
  "cc_count_end",
  "updatedAt",
];

const groupMap = {
  lr_collection: "Security",
  security_lr_counter: "Security",
  cc_collection: "CC Table",
  cc_sup_collection: "CC Table",
  qc_lady: "QC Table",
  qc_staffs: "QC Table",
  qc_sup: "QC Table",
  detour: "QC Table",
  ir_staff: "IR Table",
  ir_table_out: "IR Table",
  ir_sup: "IR Table",
  audit: "Audit Table",
  audit_sup: "Audit Table",
};

const getAggregatedData = async (req, res) => {
  try {
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    const allData = {};

    for (const { name: collectionName } of collections) {
      const col = mongoose.connection.db.collection(collectionName);
      const documents = await col.find({}).toArray();

      for (const doc of documents) {
        const lr = doc.lr_number || doc.lrNumber;
        if (!lr) continue;

        const startKey = possibleStartKeys.find((key) => doc[key]);
        const endKey = possibleEndKeys.find((key) => doc[key]);

        let start = startKey ? doc[startKey] : null;
        let end = endKey ? doc[endKey] : null;

        // Fallback: If start is missing but end exists, use end as start
        if (typeof start !== "number" && typeof end === "number") {
          start = end;
        }

        if (typeof start !== "number" || typeof end !== "number") continue;

        const group = groupMap[collectionName] || "Others";

        if (!allData[lr]) {
          allData[lr] = [];
        }

        allData[lr].push({
          collection: collectionName,
          group,
          start,
          end,
          start_ist: new Date(start).toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
          }),
          end_ist: new Date(end).toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
          }),
          duration_minutes: ((end - start) / (1000 * 60)).toFixed(2),
        });
      }
    }

    for (const lr in allData) {
      allData[lr].sort((a, b) => a.start - b.start);
    }

    res.json(allData);
  } catch (error) {
    console.error("Aggregation Error:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getAggregatedData };

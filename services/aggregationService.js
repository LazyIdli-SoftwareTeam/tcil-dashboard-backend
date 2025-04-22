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
    const { startTime, endTime, ...doc } = req.query;

    const startMinutes =
      startTime && startTime.includes(":")
        ? parseInt(startTime.split(":")[0]) * 60 +
          parseInt(startTime.split(":")[1])
        : null;
    const endMinutes =
      endTime && endTime.includes(":")
        ? parseInt(endTime.split(":")[0]) * 60 + parseInt(endTime.split(":")[1])
        : null;

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

        let createdAt = doc.createdAt || null;

        // Removed logging for createdAt

        const startKey = possibleStartKeys.find((key) => doc[key]);
        const endKey = possibleEndKeys.find((key) => doc[key]);

        let start = startKey ? doc[startKey] : null;
        let end = endKey ? doc[endKey] : null;

        if (typeof start !== "number" && typeof end === "number") {
          start = end;
        }

        if (typeof start !== "number" || typeof end !== "number") continue;

        const istStart = new Date(start).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        });
        const [istHrs, istMins] = new Date(istStart)
          .toTimeString()
          .split(":")
          .map(Number);
        const totalStartMinutes = istHrs * 60 + istMins;

        if (
          startMinutes !== null &&
          endMinutes !== null &&
          (totalStartMinutes < startMinutes || totalStartMinutes > endMinutes)
        ) {
          continue;
        }

        const group = groupMap[collectionName] || "Others";

        const start_ist = new Date(start).toLocaleTimeString("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });

        const end_ist = new Date(end).toLocaleTimeString("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });

        if (!allData[lr]) {
          allData[lr] = {};
        }

        if (!allData[lr][group]) {
          allData[lr][group] = [];
        }

        // Send raw createdAt if from 'lr_collection'
        const extraFields =
          collectionName === "lr_collection" && createdAt
            ? {
                createdAt, // ← raw value passed here
              }
            : {};

        allData[lr][group].push({ start_ist, end_ist, ...extraFields, ...doc });
      }
    }

    // Final formatting
    const finalResult = Object.entries(allData).map(([lr, groups]) => {
      let total_duration = 0;
      const formattedGroups = {};

      for (const [group, times] of Object.entries(groups)) {
        formattedGroups[group] = times.map((t) => {
          const [sH, sM] = t.start_ist.split(":").map(Number);
          const [eH, eM] = t.end_ist.split(":").map(Number);
          const duration = eH * 60 + eM - (sH * 60 + sM);
          total_duration += duration;
          return t;
        });
      }

      return {
        lr_number: lr,
        ...formattedGroups,
        total_duration,
      };
    });

    finalResult.sort((a, b) => a.lr_number.localeCompare(b.lr_number));

    res.json(finalResult);
  } catch (error) {
    console.error("Aggregation Error:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getAggregatedData };

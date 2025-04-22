const mongoose = require("mongoose");

const getCollections = async (req, res) => {
  try {
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    res.json(collections.map((col) => col.name));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getDataByCollection = async (req, res) => {
  const { collection, filter } = req.query;

  if (!collection)
    return res.status(400).json({ error: "Collection required" });

  // Only proceed if the collection is "lr_collection"
  if (collection !== "lr_collection") {
    return res.status(400).json({
      error: "Invalid collection. Only 'lr_collection' is supported.",
    });
  }

  try {
    const col = mongoose.connection.db.collection(collection);
    const documents = await col.find({}).toArray();

    // Get current date values
    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0)).getTime();
    const startOfWeek = new Date(
      now.setDate(now.getDate() - now.getDay())
    ).getTime();
    const startOfMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    ).getTime();

    // Filter based on the selected period: day, week, or month
    const filterStart =
      {
        day: startOfDay,
        week: startOfWeek,
        month: startOfMonth,
      }[filter] || 0;

    const possibleStartKeys = [
      "start_time",
      "count_start_time",
      "cc_count_start",
      "start_count_time",
      "createdAt", // We're using createdAt field as the start time
    ];

    const possibleEndKeys = [
      "finalized",
      "finalize_time",
      "sup_finalizeTime",
      "count_end_time",
      "cc_count_end",
      "updatedAt",
    ];

    // Process the documents to calculate the durations
    const data = documents
      .map((doc) => {
        let startKey = possibleStartKeys.find((key) => doc[key]);
        let endKey = possibleEndKeys.find((key) => doc[key]);

        if (!startKey && endKey) startKey = endKey; // If no start, use end as start
        if (!startKey || !endKey) return null; // If no valid start or end, skip the document

        const start = doc[startKey];
        const end = doc[endKey];

        if (typeof start !== "number" || typeof end !== "number") return null; // Invalid time values

        // Apply filter to only include records from the selected time range
        if (start < filterStart) return null; // If the start time is before the filter, skip it

        const durationMinutes = (end - start) / (1000 * 60);

        return {
          ...doc,
          start_time_ist: new Date(start).toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
          }),
          finalized_ist: new Date(end).toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
          }),
          duration_minutes: durationMinutes.toFixed(2),
          duration_hours: (durationMinutes / 60).toFixed(2),
        };
      })
      .filter((d) => d !== null); // Remove null entries

    res.json(data); // Send the processed data
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ New controller: Get data from ALL collections
const getAllCollectionsData = async (req, res) => {
  try {
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();

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

    const allData = [];

    for (const col of collections) {
      const colName = col.name;
      const colRef = mongoose.connection.db.collection(colName);
      const docs = await colRef.find({}).toArray();

      for (const doc of docs) {
        let startKey = possibleStartKeys.find((k) => doc[k]);
        let endKey = possibleEndKeys.find((k) => doc[k]);

        if (!startKey && endKey) startKey = endKey;
        if (!startKey || !endKey) continue;

        const start = doc[startKey];
        const end = doc[endKey];

        if (typeof start !== "number" || typeof end !== "number") continue;

        const durationMinutes = (end - start) / (1000 * 60);

        allData.push({
          ...doc,
          collection: colName,
          start_time_ist: new Date(start).toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
          }),
          finalized_ist: new Date(end).toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
          }),
          duration_minutes: durationMinutes.toFixed(2),
          duration_hours: (durationMinutes / 60).toFixed(2),
        });
      }
    }

    res.json(allData);
  } catch (error) {
    console.error("Error fetching all collections data:", error.message);
    res.status(500).json({ error: error.message });
  }
};

// Export all controllers
module.exports = {
  getCollections,
  getDataByCollection,
  getAllCollectionsData,
};

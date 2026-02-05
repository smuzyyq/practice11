require("dotenv").config();

const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();

const PORT = process.env.PORT || 3000;
const MONGO_URL = process.env.MONGO_URI;
const DB_NAME = "shop";

app.use(express.json());

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

let db, items; 

MongoClient.connect(MONGO_URL)
  .then(client => {
    db = client.db(DB_NAME);
    items = db.collection("items"); 
    console.log("MongoDB connected");
  })
  .catch(err => console.error("Mongo error:", err));

app.get("/", (req, res) => {
  res.json({
    links: ["/api/items", "/api/items/:id"]
  });
});

app.get("/api/items", async (req, res) => {
  try {
    const { sortBy, order, category, minPrice, maxPrice, fields } = req.query;

    const filter = {};

    if (category) {
      filter.category = { $regex: `^${category}$`, $options: "i" };
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    const sort = {};
    if (sortBy) {
      sort[sortBy] = order === "desc" ? -1 : 1;
    }

    let projection = {};
    if (fields) {
      fields.split(",").forEach(field => {
        projection[field.trim()] = 1;
      });
    }

    const itemsList = await items
      .find(filter)
      .project(projection)
      .sort(sort)
      .toArray();

    res.json({
      count: itemsList.length,
      items: itemsList
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/items/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid item id" });
    }

    const item = await items.findOne({ _id: new ObjectId(id) });

    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json(item);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/items", async (req, res) => {
  try {
    const { name, price, category } = req.body;

    if (!name || price === undefined || !category) {
      return res.status(400).json({ error: "Missing required fields: name, price, category" });
    }

    const newItem = {
      name,
      price: Number(price),
      category,
      createdAt: new Date()
    };

    const result = await items.insertOne(newItem);

    res.status(201).json({
      _id: result.insertedId,
      ...newItem
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/api/items/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid item id" });
    }

    const { name, price, category } = req.body;

    if (!name || price === undefined || !category) {
      return res.status(400).json({ error: "Missing required fields for full update" });
    }

    const updatedItem = {
      name,
      price: Number(price),
      category,
      updatedAt: new Date()
    };

    const result = await items.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updatedItem },
      { returnDocument: "after" }
    );

    if (!result.value) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json(result.value);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.patch("/api/items/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid item id" });
    }

    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: "No fields provided for update" });
    }

    const updateData = { ...req.body };
    if (updateData.price !== undefined) {
      updateData.price = Number(updateData.price);
    }
    updateData.updatedAt = new Date();

    const result = await items.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: "after" }
    );

    if (!result.value) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json(result.value);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.delete("/api/items/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid item id" });
    }

    const result = await items.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.status(204).send(); 
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
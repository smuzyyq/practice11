require("dotenv").config();

const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();

const PORT = process.env.PORT || 3000;
const MONGO_URL = process.env.MONGO_URI;
const DB_NAME = "shop";

app.use(express.json());

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

let db;
let products;
let items;

async function connectDB() {
  try {
    const client = await MongoClient.connect(MONGO_URL);
    db = client.db(DB_NAME);

    products = db.collection("products");
    items = db.collection("items");

    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ Mongo connection error:", err);
  }
}

connectDB();

app.get("/", (req, res) => {
  res.json({
    endpoints: [
      "/api/products",
      "/api/items",
      "/version"
    ]
  });
});



app.get("/api/products", async (req, res) => {
  try {
    if (!products) return res.status(500).json({ error: "DB not ready" });

    const list = await products.find().toArray();

    res.json({
      count: list.length,
      products: list
    });

  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/products/:id", async (req, res) => {
  try {
    if (!products) return res.status(500).json({ error: "DB not ready" });

    const { id } = req.params;

    if (!ObjectId.isValid(id))
      return res.status(400).json({ error: "Invalid id" });

    const product = await products.findOne({
      _id: new ObjectId(id)
    });

    if (!product)
      return res.status(404).json({ error: "Product not found" });

    res.json(product);

  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/products", async (req, res) => {
  try {
    if (!products) return res.status(500).json({ error: "DB not ready" });

    const { name, price, category } = req.body;

    if (!name || price === undefined || !category)
      return res.status(400).json({ error: "Missing fields" });

    const newProduct = { name, price, category };

    const result = await products.insertOne(newProduct);

    res.status(201).json({
      _id: result.insertedId,
      ...newProduct
    });

  } catch {
    res.status(500).json({ error: "Server error" });
  }
});



app.get("/api/items", async (req, res) => {
  try {
    if (!items) return res.status(500).json({ error: "DB not ready" });

    const list = await items.find().toArray();

    res.json({
      count: list.length,
      items: list
    });

  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/items/:id", async (req, res) => {
  try {
    if (!items) return res.status(500).json({ error: "DB not ready" });

    const { id } = req.params;

    if (!ObjectId.isValid(id))
      return res.status(400).json({ error: "Invalid id" });

    const item = await items.findOne({
      _id: new ObjectId(id)
    });

    if (!item)
      return res.status(404).json({ error: "Item not found" });

    res.json(item);

  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/items", async (req, res) => {
  try {
    if (!items) return res.status(500).json({ error: "DB not ready" });

    const { name, price } = req.body;

    if (!name || price === undefined)
      return res.status(400).json({ error: "Missing fields" });

    const newItem = { name, price };

    const result = await items.insertOne(newItem);

    res.status(201).json({
      _id: result.insertedId,
      ...newItem
    });

  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/api/items/:id", async (req, res) => {
  try {
    if (!items) return res.status(500).json({ error: "DB not ready" });

    const { id } = req.params;
    const { name, price } = req.body;

    if (!ObjectId.isValid(id))
      return res.status(400).json({ error: "Invalid id" });

    if (!name || price === undefined)
      return res.status(400).json({ error: "Missing fields" });

    const result = await items.replaceOne(
      { _id: new ObjectId(id) },
      { name, price }
    );

    if (result.matchedCount === 0)
      return res.status(404).json({ error: "Item not found" });

    res.json({ message: "Item updated" });

  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

app.patch("/api/items/:id", async (req, res) => {
  try {
    if (!items) return res.status(500).json({ error: "DB not ready" });

    const { id } = req.params;

    if (!ObjectId.isValid(id))
      return res.status(400).json({ error: "Invalid id" });

    const result = await items.updateOne(
      { _id: new ObjectId(id) },
      { $set: req.body }
    );

    if (result.matchedCount === 0)
      return res.status(404).json({ error: "Item not found" });

    res.json({ message: "Item patched" });

  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

app.delete("/api/items/:id", async (req, res) => {
  try {
    if (!items) return res.status(500).json({ error: "DB not ready" });

    const { id } = req.params;

    if (!ObjectId.isValid(id))
      return res.status(400).json({ error: "Invalid id" });

    const result = await items.deleteOne({
      _id: new ObjectId(id)
    });

    if (result.deletedCount === 0)
      return res.status(404).json({ error: "Item not found" });

    res.status(204).send();

  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/version", (req, res) => {
  res.json({
    version: "1.2",
    updatedAt: "2026-02-05"
  });
});

app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

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

let db, products;

MongoClient.connect(MONGO_URL)
  .then(client => {
    db = client.db(DB_NAME);
    products = db.collection("products");
    console.log("MongoDB connected");
  })
  .catch(err => console.error("Mongo error:", err));



app.get("/", (req, res) => {
  res.json({
    links: [
      "/api/products",
      "/api/products/:id"
    ]
  });
});


app.get("/api/products", async (req, res) => {
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
      projection[field] = 1;
    });
  }

  const productsList = await products
    .find(filter)
    .project(projection)
    .sort(sort)
    .toArray();

  res.json({
    count: productsList.length,
    products: productsList
  });
});


app.get("/api/products/:id", async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid product id" });
  }

  const product = await products.findOne({ _id: new ObjectId(id) });

  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }

  res.json(product);
});


app.post("/api/products", async (req, res) => {
  const { name, price, category } = req.body;

  if (!name || price === undefined || !category) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const newProduct = { name, price, category };
  const result = await products.insertOne(newProduct);

  res.status(201).json({
    _id: result.insertedId,
    ...newProduct
  });
});

app.get("/version", (req, res) => {
  res.json({
    version: "1.1",
    updatedAt: "2026-01-29"
  });
});

app.use((req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});




app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

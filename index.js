require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;

//middleware
app.use(cors());
app.use(express.json());

//mongo db config

const { MongoClient, ServerApiVersion } = require("mongodb");

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.b30s3ik.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const courseCollection = client.db("courseDB").collection("courses");

    app.get("/courses", async (req, res) => {
      const { creatorEmail } = req.query;

      let query = {};
      if (creatorEmail) {
        query.creatorEmail = creatorEmail;
      }

      const result = await courseCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/courses", async (req, res) => {
      const newCourse = req.body;
      console.log("Received course:", newCourse);

      const result = await courseCollection.insertOne(newCourse);
      res.send({ insertedId: result.insertedId });
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Course Station Server Starting");
});

app.listen(port, () => {
  console.log(`Course Station Server is Running on PORT ${port}`);
});

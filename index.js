const express = require("express");
const app = express();
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
const port = 5000 || process.env.PORT;
const cors = require('cors');

// middlewares
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wlof2pa.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    const categoryCollection = client.db("JobDB").collection("categories");
    const hotJobsCollection = client.db("JobDB").collection("hotjobs");
    const jobsCollection = client.db("JobDB").collection("jobs");

    // get all categories
    app.get("/categories", async (req, res) => {
      const cursor = categoryCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // get all hotjobs
    app.get("/hotjobs", async (req, res) => {
      const cursor = hotJobsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // get jobs by category
    app.get("/jobs", async (req, res) => {
      let query = {};

      if (req.query?.category) {
        //  regex with the 'i' option for case-insensitive search
        query = {
          category: { $regex: new RegExp(`^${req.query.category}$`, "i") },
        };
      }

      // console.log(query);
      const result = await jobsCollection.find(query).toArray();

      res.send(result);
    });

    // search by job title
    app.get("/search", async (req, res) => {
      let query = {};

      if (req.query?.title) {
        //  regex with the 'i' option for case-insensitive search
        query = {
          job_title: { $regex: new RegExp(`^${req.query.title}$`, "i") },
        };
      }

      // console.log(query);
      const result = await jobsCollection.find(query).toArray();

      res.send(result);
    });


  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Job server is running");
});

app.listen(port, () => {
  console.log(`app is running on port: ${port}`);
});

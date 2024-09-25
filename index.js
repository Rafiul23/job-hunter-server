const express = require("express");
const app = express();
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = 5000 || process.env.PORT;
const cors = require("cors");
const bcrypt = require("bcrypt");

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
    const userCollection = client.db("JobDB").collection("users");
    const favouriteColloection = client.db('JobDB').collection('favouritejobs');

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

    // post a job
    app.post('/job', async(req, res)=>{
      const newJob = req.body;
      const result = await jobsCollection.insertOne(newJob);
      res.send(result);
    })

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

    // get single job data
    app.get("/job/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobsCollection.findOne(query);
      res.send(result);
    });

    // create a new user
    app.post("/user", async (req, res) => {
      const newUser = req.body;
      const exist = await userCollection.findOne({ email: newUser.email });
      if (exist) {
        return res.send({ message: "User already exists" });
      }
     if(newUser?.password){
      const hashedPassword = bcrypt.hashSync(newUser.password, 14);
      const result = await userCollection.insertOne({
        ...newUser,
        password: hashedPassword,
      })
      res.send(result);
    } else {
      const result = await userCollection.insertOne(newUser);
      res.send(result);
    };

    });

    // get a user by email
    app.get("/user", async (req, res) => {
      let query = {};
      if (req.query?.email) {
        query = {
          email: req.query?.email,
        };
      }

      const result = await userCollection.findOne(query);
      res.send(result);
    });

    // get all users 
    app.get('/users', async(req, res)=>{
      const result = await userCollection.find().toArray();
      res.send(result);
    })

    // block an active user
    app.patch('/user/block/:id', async(req, res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const options = {upsert: true};
      const updateStatus = {
        $set: {
          status: 'blocked'
        }
      };
      const result = await userCollection.updateOne(filter,updateStatus, options);
      res.send(result);
    })

    // unblock an user
    app.patch('/user/active/:id', async(req, res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const options = {upsert: true};
      const updateStatus = {
        $set: {
          status: 'active'
        }
      };
      const result = await userCollection.updateOne(filter,updateStatus, options);
      res.send(result);
    })

    // delete a user
    app.delete('/user/:id', async(req, res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await userCollection.deleteOne(query);
      res.send(result);
    })

    // post a fovourite job in a collection
    app.post('/favourite', async(req, res)=>{
      let query = {};
      if(req.query?.email && req.query?.id){
        query = {
          userEmail: req.query.email,
          job_id: req.query.id
        }
      };
      const isExist = await favouriteColloection.findOne(query);
      if(isExist){
       return res.send({message: 'This job already exists in your favourite list!'});
      } else {
      const favJob = req.body;
      const result = await favouriteColloection.insertOne(favJob);
      res.send(result);
      }
    })

    // get favourite jobs list
    app.get('/favourite', async(req, res)=>{
      let query = {};
      if(req.query?.email){
        query = {
          userEmail: req.query.email
        }
      }
      const result = await favouriteColloection.find(query).toArray();
      res.send(result);
    });

    // delete a favourite job
    app.delete('/favourite/:id', async(req, res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await favouriteColloection.deleteOne(query);
      res.send(result);
    })
    


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

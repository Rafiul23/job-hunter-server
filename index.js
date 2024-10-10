const express = require("express");
const app = express();
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = 5000 || process.env.PORT;
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// middlewares
app.use(
  cors({
    origin: ["http://localhost:3000"],
    credentials: true,
  })
);
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
    const jobsCollection = client.db("JobDB").collection("jobs");
    const userCollection = client.db("JobDB").collection("users");
    const favouriteColloection = client.db("JobDB").collection("favouritejobs");
    const appliedColloection = client.db("JobDB").collection("appliedjobs");

    // job related api
    // get all categories
    app.get("/categories", async (req, res) => {
      const cursor = categoryCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // get all hotjobs
    app.get("/hotjobs", async (req, res) => {
      let query = {};
      if (req.query?.status) {
        query = {
          status: req.query?.status,
        };
      }
      const result = await jobsCollection.find(query).toArray();
      res.send(result);
    });

    // code for pagination
    app.get("/jobsCount", async (req, res) => {
      const count = await jobsCollection.estimatedDocumentCount();
      res.send({ count });
    });

    // get jobs by pagination
    app.get("/jobs/paginated", async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const query = {};
      const options = {
        projection: {
          _id: 1,
          company_name: 1,
          job_title: 1,
          deadline: 1,
          status: 1,
        },
      };
      const result = await jobsCollection
        .find(query, options)
        .skip(page * size)
        .limit(size)
        .toArray();
      res.send(result);
    });

    // apply on a job
    app.post("/jobs-apply", async (req, res) => {
      const appliedJob = req.body;
      const result = await appliedColloection.insertOne(appliedJob);
      res.send(result);
    });

    // security needed - loggedin user only - need verifyToken
    // get applied jobs
    app.get("/applied-jobs", async (req, res) => {
      let query = {};
      if (req?.query?.email) {
        query = {
          userEmail: req.query.email,
        };
      }
      const result = await appliedColloection.find(query).toArray();
      res.send(result);
    });

    // security needed - recruiter only
    // get recruiter's jobs by email
    app.get("/my-jobs", async (req, res) => {
      let query = {};
      if (req?.query?.email) {
        query = {
          employer_email: req.query.email,
        };
      }
      const options = {
        projection: {
          _id: 1,
          company_name: 1,
          job_title: 1,
          deadline: 1,
          employer_email: 1,
        },
      };
      const result = await jobsCollection.find(query, options).toArray();
      res.send(result);
    });

    // security needed - recruiter only
    // get all resumes for one jobs
    app.get("/resumes", async (req, res) => {
      let query = {};
      if (req?.query?.id && req?.query?.email) {
        query = {
          job_id: req.query.id,
          employer_email: req.query.email,
        };
      }
      const result = await appliedColloection.find(query).toArray();
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

    // security needed - admin only
    // post a job
    app.post("/job", async (req, res) => {
      const newJob = req.body;
      const result = await jobsCollection.insertOne(newJob);
      res.send(result);
    });

    // security needed - admin only
    // delete a job
    app.delete("/jobs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobsCollection.deleteOne(query);
      res.send(result);
    });

    // security needed - admin only
    // update a job data
    app.put("/jobs/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedJob = req.body;
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          company_name: updatedJob.company_name,
          job_title: updatedJob.job_title,
          job_description: updatedJob.job_description,
          location: updatedJob.location,
          experience: updatedJob.experience,
          qualifications: updatedJob.qualifications,
          salary_range: updatedJob.salary_range,
          deadline: updatedJob.deadline,
          category: updatedJob.category,
          onsite_or_remote: updatedJob.onsite_or_remote,
          job_type: updatedJob.job_type,
          employer_email: updatedJob.employer_email,
          job_post: updatedJob.job_post,
        },
      };

      const result = await jobsCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });

    // security needed - admin only
    // api for upgrading a job to hotjob
    app.patch("/jobs/hot/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateStatus = {
        $set: {
          status: "hot",
        },
      };
      const result = await jobsCollection.updateOne(
        filter,
        updateStatus,
        options
      );
      res.send(result);
    });

    // security needed - admin only
    // downgrade a job
    app.patch("/jobs/gen/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateStatus = {
        $set: {
          status: null,
        },
      };
      const result = await jobsCollection.updateOne(
        filter,
        updateStatus,
        options
      );
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

    // get single job data
    app.get("/job/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobsCollection.findOne(query);
      res.send(result);
    });

    // post a fovourite job in a collection
    app.post("/favourite", async (req, res) => {
      const favJob = req.body;
      const result = await favouriteColloection.insertOne(favJob);
      res.send(result);
    });

    // security needed - loggedin user only - need verifyToken
    // get favourite jobs list
    app.get("/favourite", async (req, res) => {
      let query = {};
      if (req.query?.email) {
        query = {
          userEmail: req.query.email,
        };
      }
      const result = await favouriteColloection.find(query).toArray();
      res.send(result);
    });

    // security needed - loggedin user only - need verifyToken
    // delete a favourite job
    app.delete("/favourite/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await favouriteColloection.deleteOne(query);
      res.send(result);
    });

    // does exist related api
    // security needed - loggedin user only - need verifyToken
    // does exist in favourite
    app.get("/fav-exist", async (req, res) => {
      let query = {};
      if (req.query?.email && req.query?.id) {
        query = {
          userEmail: req.query.email,
          job_id: req.query.id,
        };
      }
      const isExist = await favouriteColloection.findOne(query);
      if (isExist) {
        return res.send({ message: true });
      } else {
        return res.send({ message: false });
      }
    });

    // security needed - loggedin user only - need verifyToken
    // does exist in applied
    app.get("/applied-exist", async (req, res) => {
      let query = {};
      if (req.query?.email && req.query?.id) {
        query = {
          userEmail: req.query.email,
          job_id: req.query.id,
        };
      }
      const isExist = await appliedColloection.findOne(query);
      if (isExist) {
        return res.send({ message: true });
      } else {
        return res.send({ message: false });
      }
    });

    // user related api
    // create a new user
    app.post("/user", async (req, res) => {
      const newUser = req.body;
      const exist = await userCollection.findOne({ email: newUser.email });
      if (exist) {
        return res.send({ message: "User already exists" });
      }
      if (newUser?.password) {
        const hashedPassword = bcrypt.hashSync(newUser.password, 14);
        const result = await userCollection.insertOne({
          ...newUser,
          password: hashedPassword,
        });
        res.send(result);
      } else {
        const result = await userCollection.insertOne(newUser);
        res.send(result);
      }
    });

    // jwt related api
    // post a jwt
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      // console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "6h",
      });
      res.cookie("token", token, {
          httpOnly: true,
          secure: false
        })
        .send({ success: true });
    });

    // security needed - loggedin user only - need verifyToken
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

    // security needed - admin only
    // get all users
    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // security needed - admin only
    // block an active user
    app.patch("/user/block/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateStatus = {
        $set: {
          status: "blocked",
        },
      };
      const result = await userCollection.updateOne(
        filter,
        updateStatus,
        options
      );
      res.send(result);
    });

    // security needed - admin only
    // unblock an user
    app.patch("/user/active/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateStatus = {
        $set: {
          status: "active",
        },
      };
      const result = await userCollection.updateOne(
        filter,
        updateStatus,
        options
      );
      res.send(result);
    });

    // security needed - admin only
    // make admin api
    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateStatus = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(
        filter,
        updateStatus,
        options
      );
      res.send(result);
    });

    // security needed - admin only
    // make recruiter api
    app.patch("/users/recruiter/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateStatus = {
        $set: {
          role: "recruiter",
        },
      };
      const result = await userCollection.updateOne(
        filter,
        updateStatus,
        options
      );
      res.send(result);
    });

    // security needed - admin only
    // make user api
    app.patch("/users/user/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateStatus = {
        $set: {
          role: "user",
        },
      };
      const result = await userCollection.updateOne(
        filter,
        updateStatus,
        options
      );
      res.send(result);
    });

    // security needed - admin only
    // delete a user
    app.delete("/user/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
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

const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// check for dotenv user and password
// console.log(process.env.DB_USER);
// console.log(process.env.DB_PASSWORD);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.7em2cfy.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

//verify jwt
const verifyJWT = (req, res, next) => {
  console.log(req.headers.authorization);
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
    if (error) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const servicesCollection = client.db("carDoctor").collection("services");

    const bookingCollection = client.db("carDoctor").collection("bookings");

    //jwt JsonWebToken
    app.post("/jwt", (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      console.log(token);

      res.send({ token });
    });

    //get data from collection or db (api)
    app.get("/services", async (req, res) => {
      const sort = req.query.sort;
      const search = req.query.search;
      console.log(search);
      const query = {
        title: { $regex: search, $options: "i" },
      };

      //if we query logical operator orting
      // const query = { price: { $lt: 100 } };
      //normal query sorting
      // const query = {};
      const options = {
        sort: { price: sort === "asc" ? 1 : -1 },
      };
      const cursor = servicesCollection.find(query, options);
      const result = await cursor.toArray();
      // const result =await servicesCollection.find().toArray();
      res.send(result);
    });

    //find one db
    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = {
        // Include only the `title` and `price` and specific fields in the returned document
        projection: { title: 1, price: 1, service_id: 1, img: 1 },
      };

      //booking collection get from db
      app.get("/getbookings", verifyJWT, async (req, res) => {
        const decoded = req.decoded;
        console.log("decoded inside", decoded);
        if (decoded.email !== req.query.email) {
          return res.status(403).send({ error: 1, message: "forbiden access" });
        }
        let query = {};
        if (req.query?.email) {
          query = { email: req.query.email };
        }
        const result = await bookingCollection.find(query).toArray();
        res.send(result);
      });

      //bookings collection db create
      app.post("/addbookings", async (req, res) => {
        const booking = req.body;
        // console.log(booking);
        const result = await bookingCollection.insertOne(booking);
        res.send(result);
      });

      //bookings collection db update
      app.patch("/updateBooking/:id", async (req, res) => {
        const filter = { _id: new ObjectId(req.params.id) };
        const updatebooking = req.body;
        console.log(updatebooking);
        const updatedContent = {
          $set: {
            status: updatebooking.status,
          },
        };
        const result = await bookingCollection.updateOne(
          filter,
          updatedContent
        );
        res.send(result);
      });

      //booking collection delete from db
      app.delete("/deleteBookings/:id", async (req, res) => {
        const result = await bookingCollection.deleteOne({
          _id: new ObjectId(req.params.id),
        });
        res.send(result);
      });

      const result = await servicesCollection.findOne(query, options);
      res.send(result);
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
  res.send("car doctor are running");
});

app.listen(port, (req, res) => {
  console.log(`car doctor running in port: ${port}`);
});

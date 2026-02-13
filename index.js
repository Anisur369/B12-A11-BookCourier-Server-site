require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;
const stripe = require("stripe")(process.env.STRIPE_KEY);
// middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = process.env.DB_URI;

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
    // db server connection
    await client.connect();
    const db = client.db("zap_shift_db");
    const parcelsCollection = db.collection("parcels");
    const coverageCollection = db.collection("warehouses");
    const booksCollection = db.collection("books");

    // books related apis
    app.get("/books", async (req, res) => {
      const booksCollection = db.collection("books");
      const result = await booksCollection.find().toArray();
      res.send(result);
    });

    app.get("/book/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const book = await booksCollection.findOne(query);
      res.send(book);
    });

    // parcels related apis

    app.post("/parcels", async (req, res) => {
      const parcels = req.body;
      parcels.createdAt = new Date();
      const result = await parcelsCollection.insertOne(parcels);
      res.send(result);
    });

    app.get("/parcels", async (req, res) => {
      const result = await parcelsCollection.find().toArray();
      res.send(result);
      const email = req.query.email;
      let query = {};
      if (email) {
        query = { email: email };
        const cursor = parcelsCollection.find(query);
        const result = await cursor.toArray();
        res.send(result);
      } else {
        console.log("inside else");
      }
    });

    app.get("/parcels/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await parcelsCollection.findOne(query);
      res.send(result);
    });

    app.delete("/parcels/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await parcelsCollection.deleteOne(query);
      res.send(result);
    });

    app.put("/parcels/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedParcels = req.body;
      const updateDoc = {
        $set: {
          ...updatedParcels,
        },
      };
      const result = await parcelsCollection.updateOne(
        filter,
        updateDoc,
        options,
      );
      res.send(result);
    });

    // payment related apis
    app.post("/create-checkout-session", async (req, res) => {
      const { cost: price } = req.body;
      const paymentInfo = req.body;

      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: "usd",
              unit_amount: price * 100, // Convert to cents
              product_data: {
                name: "Parcel Payment",
              },
            },
            quantity: 1,
          },
        ],
        customer_email: paymentInfo.senderEmail,
        mode: "payment",
        metadata: {
          parcelId: paymentInfo.parcelId,
        },
        success_url: `${process.env.CLIENT_URL}/dashboard/payment-success`,
        cancel_url: `${process.env.CLIENT_URL}/dashboard/payment-canceled`,
      });
      console.log(session);
      res.send({ url: session.url });
      // res.json({ id: session.id });
    });

    // Coverage related api
    app.get("/coverage", async (req, res) => {
      const result = await coverageCollection.find().toArray();
      console.log(result);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } catch (err) {
    // Ensures that the client will close when you finish/error
    // await client.close();
    console.error(err);
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World! Server is running...");
});

app.listen(port, () => {
  console.log(`Server is running on port: http://localhost:${port}`);
});

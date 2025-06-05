const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const port = process.env.PORT || 8156

app.use(cors())
app.use(express.json())

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ng1qfb3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true
  }
})

async function run() {
  try {
    await client.connect()

    const db = client.db('BookBarn')
    const bookCollection = db.collection('Books')
    const reviewCollection = db.collection('Reviews')
    const cartCollection = db.collection('Cart')
    const userCollection = db.collection('User')
    const contactCollection = db.collection('ContactMessages');

    app.get('/books', async (req, res) => {
      const result = await bookCollection.find().toArray()
      res.send(result)
    })

    app.get('/reviews', async (req, res) => {
      const result = await reviewCollection.find().toArray()
      res.send(result)
    })

    app.post('/users', async (req, res) => {
      const user = req.body
      const result = await userCollection.insertOne(user)
      res.send(result)
    })

    app.get('/users/:email', async (req, res) => {
      const email = req.params.email
      const user = await userCollection.findOne({ email })
      if (user) {
        res.send(user)
      } else {
        res.status(404).send({ message: 'User not found' })
      }
    })

    app.get('/users', async (req, res) => {
      const result = await userCollection.find().toArray()
      res.send(result)
    })

    app.post('/carts', async (req, res) => {
      const { email, _id: bookId, count = 1, ...bookData } = req.body;

      const existingCartItem = await cartCollection.findOne({ email, bookId });

      if (existingCartItem) {
        const result = await cartCollection.updateOne(
          { email, bookId },
          { $set: { count } }
        );
        res.send(result);
      } else {
        const newCartItem = {
          email,
          bookId,
          count,
          ...bookData,
        };
        const result = await cartCollection.insertOne(newCartItem);
        res.send(result);
      }
    })

    app.get('/carts', async (req, res) => {
      const email = req.query.email;
      let query = {};
      if(email){
        query.email = email;
      }
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });

    // Fixed DELETE route: deletes by cart _id (ObjectId) and email
    app.delete('/carts/:id', async (req, res) => {
      const id = req.params.id;
      const email = req.query.email;

      if (!email) {
        return res.status(400).send({ message: "Email is required" });
      }

      try {
        const result = await cartCollection.deleteOne({
          _id: new ObjectId(id),
          email: email,
        });

        if (result.deletedCount === 1) {
          res.send({ message: "Deleted successfully" });
        } else {
          res.status(404).send({ message: "Cart item not found" });
        }
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Server error" });
      }
    });

    app.post('/contact', async (req, res) => {
      const { name, email, message } = req.body;
      if (!name || !email || !message) {
        return res.status(400).send({ message: 'All fields are required.' });
      }
      try {
        const result = await contactCollection.insertOne({
          name,
          email,
          message,
          createdAt: new Date(),
        });
        res.send({ success: true, insertedId: result.insertedId });
      } catch (err) {
        console.error(err);
        res.status(500).send({ success: false, message: 'Server error.' });
      }
    });

    await client.db('admin').command({ ping: 1 })
    console.log('Pinged your deployment. You successfully connected to MongoDB!')
  } finally {
    // await client.close()
  }
}
run().catch(console.dir)

app.get('/', (req, res) => {
  res.send('server is running')
})

app.listen(port, () => {
  console.log(`BookBarn is running on port ${port}`)
})

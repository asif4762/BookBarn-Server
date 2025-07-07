const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const port = process.env.PORT || 8157
const SSLCommerzPayment = require('sslcommerz-lts')

app.use(cors())
app.use(express.json())

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ng1qfb3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})

async function run() {
  try {
    await client.connect()

    const db = client.db('BookBarn')
    const bookCollection = db.collection('Books')
    const reviewCollection = db.collection('Reviews')
    const cartCollection = db.collection('Cart')
    const userCollection = db.collection('User')
    const contactCollection = db.collection('ContactMessages')
    const billingCollection = db.collection('Billings')

    // Get all books

    // GET all contact messages
app.get('/contact', async (req, res) => {
  try {
    const messages = await contactCollection.find().sort({ createdAt: -1 }).toArray();
    res.send(messages);
  } catch (error) {
    console.error('Error fetching contact messages:', error);
    res.status(500).send({ message: 'Failed to fetch contact messages' });
  }
});


    app.get('/books', async (req, res) => {
      try {
        const result = await bookCollection.find().toArray()
        res.send(result)
      } catch (error) {
        console.error(error)
        res.status(500).send({ message: 'Server error' })
      }
    })

    app.get('/reviews', async (req, res) => {
  try {
    const reviews = await reviewCollection.find().toArray();
    res.send(reviews);
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).send({ message: "Server error" });
  }
});

    // Get books by category
    app.get('/books/:course', async (req, res) => {
      const course = req.params.course
      const result = await bookCollection.find({ course }).toArray()
      res.send(result)
    })

    // Get cart items for a user
    app.get('/carts', async (req, res) => {
      const email = req.query.email
      if (!email) return res.status(400).send({ message: 'Email is required' })

      try {
        const items = await cartCollection.find({ email }).toArray()
        res.send(items)
      } catch (error) {
        console.error('Error fetching cart:', error)
        res.status(500).send({ message: 'Internal server error' })
      }
    })
    // Add new book
app.post('/books', async (req, res) => {
  try {
    const book = req.body;

    // Validate required fields (you can customize this)
    const requiredFields = [
      "title", "author", "course", "condition", "image", "id",
      "price", "quantity", "orderCount", "sellerName", "location", "bookDescription"
    ];
    for (const field of requiredFields) {
      if (!book[field]) {
        return res.status(400).send({ message: `Missing required field: ${field}` });
      }
    }

    // Check if book with same id exists (optional)
    const existingBook = await bookCollection.findOne({ id: book.id });
    if (existingBook) {
      return res.status(400).send({ message: "Book with this ID already exists." });
    }

    // Insert book into collection
    const result = await bookCollection.insertOne(book);
    res.status(201).send({ message: "Book added successfully", insertedId: result.insertedId });
  } catch (error) {
    console.error("Error adding book:", error);
    res.status(500).send({ message: "Server error" });
  }
});

    // Add or update cart item
    app.post('/carts', async (req, res) => {
  try {
    const { email, _id: bookId, count = 1, ...bookData } = req.body;

    if (!email || !bookId) {
      return res.status(400).send({ message: 'Email and book ID are required' });
    }

    const existingCartItem = await cartCollection.findOne({ email, bookId });

    if (existingCartItem) {
      // Update the count for existing item
      const result = await cartCollection.updateOne(
        { email, bookId },
        { $set: { count } }
      );
      return res.send(result);
    } else {
      // Insert new cart item
      const newCartItem = { email, bookId, count, ...bookData };
      const result = await cartCollection.insertOne(newCartItem);
      return res.send(result);
    }
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: 'Server error' });
  }
});


    // Update cart item count
    app.put('/carts/:id', async (req, res) => {
  const id = req.params.id;
  const { count } = req.body;
  const email = req.query.email;

  if (!email) return res.status(400).send({ message: 'Email is required' });
  if (!count || count < 1)
    return res.status(400).send({ message: 'Count must be positive' });

  try {
    const result = await cartCollection.updateOne(
      { _id: new ObjectId(id), email },
      { $set: { count } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({ message: 'Cart item not found' });
    }

    return res.send({ success: true, updatedCount: count });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: 'Server error' });
  }
});


    // Delete cart item
    app.delete('/carts/:id', async (req, res) => {
      const id = req.params.id
      const email = req.query.email

      if (!email) return res.status(400).send({ message: 'Email is required' })

      try {
        const result = await cartCollection.deleteOne({
          _id: new ObjectId(id),
          email: email,
        })

        if (result.deletedCount === 1) {
          res.send({ message: 'Deleted successfully' })
        } else {
          res.status(404).send({ message: 'Cart item not found' })
        }
      } catch (error) {
        console.error(error)
        res.status(500).send({ message: 'Server error' })
      }
    })

    app.delete('/books/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const result = await bookCollection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 1) {
      res.send({ message: 'Book deleted successfully' });
    } else {
      res.status(404).send({ message: 'Book not found' });
    }
  } catch (error) {
    console.error("Error deleting book:", error);
    res.status(500).send({ message: "Server error" });
  }
});

// PATCH /users/:email  — update user info like role
app.patch('/users/:email', async (req, res) => {
  const email = req.params.email;
  const { role } = req.body;

  if (!role || (role !== 'admin' && role !== 'user')) {
    return res.status(400).send({ message: 'Invalid role provided' });
  }

  try {
    const result = await userCollection.updateOne(
      { email },
      { $set: { role } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({ message: 'User not found' });
    }

    res.send({ message: 'User role updated successfully' });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).send({ message: 'Server error' });
  }
});


app.get('/billings', async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).send({ message: 'Email query param is required' });

  try {
    const billings = await billingCollection
      .find({ email })
      .sort({ purchasedAt: -1 })  // optional: latest purchase first
      .toArray();

    res.send(billings);
  } catch (error) {
    console.error('Error fetching billing records:', error);
    res.status(500).send({ message: 'Failed to fetch billing records' });
  }
});



    // Initiate payment with SSLCommerz
    app.post('/initiate-payment', async (req, res) => {
      try {
        const { email, items } = req.body

        if (!email || !items || !Array.isArray(items)) {
          return res.status(400).send({ message: 'Invalid payment data' })
        }

        const totalAmount = items.reduce(
          (sum, item) => sum + item.price * (item.quantity || 1),
          0
        )

        const tran_id = 'TID' + Date.now()

        const data = {
          total_amount: totalAmount,
          currency: 'BDT',
          tran_id,
          success_url: `http://localhost:8157/payment-success?tran_id=${tran_id}&email=${email}`,
          fail_url: 'http://localhost:3000/payment-fail',
          cancel_url: 'http://localhost:3000/payment-cancel',
          ipn_url: 'http://localhost:8157/ipn',
          shipping_method: 'Courier',
          product_name: 'Books',
          product_category: 'Education',
          product_profile: 'general',

          // Required customer info
          cus_name: email,
          cus_email: email,
          cus_add1: 'Dhaka',
          cus_phone: '01700000000',

          // Required shipping info (SSLCommerz needs ship_city!)
          ship_name: email,
          ship_add1: 'Dhaka',
          ship_city: 'Dhaka', // Required!
          ship_postcode: '1200',
          ship_country: 'Bangladesh',
        }

        const sslcz = new SSLCommerzPayment(
          process.env.SSLCZ_STORE_ID,
          process.env.SSLCZ_STORE_PASS,
          false // false for sandbox environment
        )

        const apiResponse = await sslcz.init(data)

        if (!apiResponse.GatewayPageURL) {
          console.error('SSLCommerz response missing GatewayPageURL:', apiResponse)
          return res.status(500).send({ message: 'Payment gateway URL not found' })
        }

        res.send({ GatewayPageURL: apiResponse.GatewayPageURL })
      } catch (error) {
        console.error('Error in /initiate-payment:', error)
        res.status(500).send({ message: 'Internal server error', error: error.message })
      }
    })

    // Handle payment success redirect from SSLCommerz
app.post('/payment-success', async (req, res) => {
  const { tran_id, email } = req.query;

  if (!tran_id || !email) {
    return res.status(400).send({ message: 'Missing tran_id or email in query params' });
  }

  try {
    const cartItems = await cartCollection.find({ email }).toArray();

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).send({ message: 'No items in cart' });
    }

    const billingData = {
      email,
      transactionId: tran_id,
      items: cartItems.map(item => ({
        bookId: item.bookId,
        title: item.title,
        author: item.author,
        price: item.price,
        quantity: item.count,
        image: item.image,
      })),
      purchasedAt: new Date(),
    };

    await billingCollection.insertOne(billingData);
    await cartCollection.deleteMany({ email });

    // Redirect or send success response
    res.redirect('http://localhost:5173/dashboard/delivery-status');
  } catch (error) {
    console.error('Payment success processing failed:', error);
    res.status(500).send({ message: 'Payment success processing failed' });
  }
});

app.get('/users/:email', async (req, res) => {
  try {
    const email = req.params.email;
    const result = await userCollection.findOne({ email });
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch user' });
  }
});


app.get('/users', async (req, res) => {
  try {
    const result = await userCollection.find().toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch users' });
  }
});


// Save new user to MongoDB
app.post('/users', async (req, res) => {
  try {
    const newUser = req.body;
    if (!newUser?.email || !newUser?.name) {
      return res.status(400).send({ message: 'Name and email are required' });
    }

    // Check if user already exists
    const existing = await userCollection.findOne({ email: newUser.email });
    if (existing) {
      return res.status(200).send({ message: 'User already exists' });
    }

    const result = await userCollection.insertOne(newUser);
    res.send(result);
  } catch (error) {
    console.error("Error saving user:", error);
    res.status(500).send({ message: 'Failed to save user', error: error.message });
  }
});



    // Contact form message save
    app.post('/contact', async (req, res) => {
      const { name, email, message } = req.body
      if (!name || !email || !message) {
        return res.status(400).send({ message: 'All fields are required.' })
      }
      try {
        const result = await contactCollection.insertOne({
          name,
          email,
          message,
          createdAt: new Date(),
        })
        res.send({ success: true, insertedId: result.insertedId })
      } catch (err) {
        console.error(err)
        res.status(500).send({ success: false, message: 'Server error.' })
      }
    })

    await client.db('admin').command({ ping: 1 })
    console.log('Pinged your deployment. You successfully connected to MongoDB!')
  } finally {
    // keep connection alive
  }
}
run().catch(console.dir)

app.get('/', (req, res) => {
  res.send('server is running')
})

app.listen(port, () => {
  console.log(`BookBarn is running on port ${port}`)
})

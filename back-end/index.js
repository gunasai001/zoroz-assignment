const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors');
const User = require('./models/User');
const Order = require('./models/Order');

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost/ecommerce',
    ttl: 24 * 60 * 60 // 1 day
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));

// Auth middleware
const requireAuth = async (req, res, next) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

app.get('/api/auth/status', async (req, res) => {
  try {
    // Check if there's a session and userId exists
    if (!req.session.userId) {
      return res.status(401).json({ 
        authenticated: false,
        message: 'No active session'
      });
    }

    // Find the user by session userId
    const user = await User.findById(req.session.userId)
      .select('-password -cart'); // Exclude sensitive fields

    if (!user) {
      // Clear invalid session if user doesn't exist
      req.session.destroy();
      return res.status(401).json({ 
        authenticated: false,
        message: 'User not found'
      });
    }

    // Return user data if session is valid
    res.json({
      authenticated: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
        // Add any other user fields you want to return
      }
    });

  } catch (error) {
    console.error('Auth status check error:', error);
    res.status(500).json({ 
      authenticated: false,
      message: 'Error checking authentication status'
    });
  }
});


// Auth routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    
    const user = new User({ email, password, name });
    await user.save();
    
    req.session.userId = user._id;
    res.json({ user: { id: user._id, email: user.email, name: user.name } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    req.session.userId = user._id;
    res.json({ user: { id: user._id, email: user.email, name: user.name } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ message: 'Could not log out' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
});

// Cart routes
app.get('/api/cart', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('cart');
    res.json({ cart: user.cart || [] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/cart', requireAuth, async (req, res) => {
  try {
    const { productId, title, price, image, quantity } = req.body;
    if (!productId || !title || !price || !image || !quantity) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const user = await User.findById(req.session.userId);
    const existingItemIndex = user.cart.findIndex(item => 
      item.productId === productId
    );
    
    if (existingItemIndex > -1) {
      user.cart[existingItemIndex] = {
        productId, title, price, image, quantity
      };
    } else {
      user.cart.push({ productId, title, price, image, quantity });
    }
    
    await user.save();
    res.json({ cart: user.cart });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/cart/:productId', requireAuth, async (req, res) => {
  try {
    const productId = parseInt(req.params.productId);
    const user = await User.findById(req.session.userId);
    
    user.cart = user.cart.filter(item => item.productId !== productId);
    await user.save();
    
    res.json({ cart: user.cart });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/cart/clear', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    user.cart = [];
    await user.save();
    
    res.json({ cart: user.cart });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/cart/:productId/:quantity', requireAuth, async (req, res) => {
  try {
    const productId = Number(req.params.productId);
    const { quantity } = req.body;

    if (!Number.isInteger(quantity) || quantity < 0) {
      return res.status(400).json({ message: 'Invalid quantity' });
    }

    const user = await User.findById(req.session.userId);
    const itemIndex = user.cart.findIndex(item => Number(item.productId) === productId);

    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    if (quantity === 0) {
      // Remove item if quantity is 0
      user.cart.splice(itemIndex, 1);
    } else {
      // Update quantity
      user.cart[itemIndex].quantity = quantity;
    }

    await user.save();
    res.json({ cart: user.cart });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


app.post('/api/orders', requireAuth, async (req, res) => {
  try {
    const { items, shippingDetails, totalAmount, paymentDetails } = req.body;

    // Validate request data
    if (!items || !items.length || !shippingDetails || !totalAmount) {
      return res.status(400).json({ message: 'Missing required order information' });
    }

    // Create new order
    const order = new Order({
      userId: req.user._id,
      items,
      shippingDetails,
      totalAmount,
      paymentDetails,
      status: 'processing'
    });

    // Save the order
    await order.save();

    // Clear the user's cart after successful order
    const user = await User.findById(req.user._id);
    user.cart = [];
    await user.save();

    // Send response
    res.status(201).json({
      message: 'Order placed successfully',
      orderId: order._id,
      order: {
        id: order._id,
        status: order.status,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt
      }
    });

  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ message: 'Failed to create order' });
  }
});

// Get user's orders
app.get('/api/orders', requireAuth, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id })
      .sort({ createdAt: -1 });

    res.json({ orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
});

// Get specific order details
app.get('/api/orders/:orderId', requireAuth, async (req, res) => {
  try {
    const order = await Order.findOne({ 
      _id: req.params.orderId,
      userId: req.user._id 
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({ order });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ message: 'Failed to fetch order details' });
  }
});


// Start server
const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/ecommerce')
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => console.error('Database connection error:', err));
import { createContext, useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    const initializeCart = async () => {
      if (user) {
        await fetchCart();
      } else {
        setCart([]);
      }
      setLoading(false);
    };

    initializeCart();
  }, [user]);

  const fetchCart = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/cart', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch cart');
      }
      
      const data = await response.json();
      setCart(data.cart || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching cart:', err);
      setError(err.message);
      setCart([]);
    }
  };

  const addToCart = async (product, quantity = 1) => {
    if (!user) {
      setError('Please login to add items to cart');
      return;
    }

    try {
      const productData = {
        productId: product.id,
        title: product.title,
        price: product.price,
        image: product.image,
        quantity: quantity
      };

      const response = await fetch('http://localhost:5000/api/cart/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(productData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add item to cart');
      }

      const data = await response.json();
      setCart(data.cart);
      setError(null);
    } catch (err) {
      console.error('Error adding to cart:', err);
      setError(err.message);
    }
  };

  const updateQuantity = async (productId, newQuantity) => {
    if (!user) {
      setError('Please login to update cart');
      return;
    }

    try {
     
      if (newQuantity < 1) {
        return removeFromCart(productId);
      }

      const cartItem = cart.find(item => Number(item.productId) === Number(productId));
      if (!cartItem) {
        throw new Error('Product not found in cart');
      }

      const updatedCart = cart.map(item =>
        Number(item.productId) === Number(productId)
          ? { ...item, quantity: newQuantity }
          : item
      );
      setCart(updatedCart);

      const response = await fetch(`http://localhost:5000/api/cart/${productId}/${newQuantity}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ quantity: newQuantity })
      });

      if (!response.ok) {
        setCart(cart);
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update quantity');
      }

      const data = await response.json();
      setCart(data.cart);
      setError(null);
    } catch (err) {
      console.error('Error updating quantity:', err);
      setError(err.message);
      await fetchCart();
    }
  };

  const removeFromCart = async (productId) => {
    if (!user) {
      setError('Please login to remove items');
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/cart/${productId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to remove item from cart');
      }

      const data = await response.json();
      setCart(data.cart);
      setError(null);
    } catch (err) {
      console.error('Error removing from cart:', err);
      setError(err.message);
    }
  };

  const clearCart = async () => {
    if (!user) return;
    
    try {
      const response = await fetch('http://localhost:5000/api/cart/clear', {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to clear cart');
      }

      setCart([]);
      setError(null);
    } catch (err) {
      console.error('Error clearing cart:', err);
      setError(err.message);
    }
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getCartItemsCount = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const value = {
    cart,
    loading,
    error,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    getCartItemsCount
  };

  return (
    <CartContext.Provider value={value}>
      {!loading && children}
    </CartContext.Provider>
  );
}

CartProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export default CartProvider;
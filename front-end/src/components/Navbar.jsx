import { Link } from 'react-router-dom';
import { ShoppingCart, User, LogOut, LogIn, UserPlus } from 'lucide-react';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext';
import { useState, useRef, useEffect } from 'react';

const Navbar = () => {
  const { cart, getCartTotal } = useCart();
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef(null);

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      setShowUserMenu(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <nav className="bg-gray-800 text-white p-4 shadow-lg">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold">ShopHub</Link>
        
        <div className="flex items-center gap-6">
          <Link 
            to="/products" 
            className="hover:text-gray-200 transition duration-150"
          >
            Products
          </Link>
          
          <Link 
            to="/checkout" 
            className="relative flex items-center gap-2 hover:text-gray-200 transition duration-150"
          >
            <ShoppingCart className="w-6 h-6" />
            {totalItems > 0 && (
              <div className="flex flex-col items-start">
                <span className="absolute -top-2 -right-2 bg-red-500 rounded-full w-5 h-5 flex items-center justify-center text-xs">
                  {totalItems}
                </span>
                <span className="text-sm">${getCartTotal().toFixed(2)}</span>
              </div>
            )}
          </Link>

          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 hover:text-gray-200 transition duration-150 focus:outline-none"
              >
                <User className="w-6 h-6" />
                <span className="text-sm hidden md:inline">{user.name}</span>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                  <div className="py-1">
                    <div className="px-4 py-2 text-sm text-gray-700 border-b">
                      Signed in as<br />
                      <span className="font-medium">{user.email}</span>
                    </div>
                    
                    <Link
                      to="/orders"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setShowUserMenu(false)}
                    >
                      Your Orders
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link
                to="/login"
                className="flex items-center gap-1 hover:text-gray-200 transition duration-150"
              >
                <LogIn className="w-5 h-5" />
                <span className="hidden md:inline">Sign In</span>
              </Link>
              <Link
                to="/register"
                className="flex items-center gap-1 hover:text-gray-200 transition duration-150"
              >
                <UserPlus className="w-5 h-5" />
                <span className="hidden md:inline">Register</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
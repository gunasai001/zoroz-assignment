import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to ShopHub</h1>
        <p className="text-xl mb-8">Discover amazing products at great prices</p>
        <Link
          to="/products"
          className="bg-gray-800 text-white px-6 py-3 rounded-lg hover:bg-gray-950"
        >
          Shop Now
        </Link>
      </div>
    </div>
  );
};

export default Home;
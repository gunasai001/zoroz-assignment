import { useLocation, Link } from 'react-router-dom';
import { CheckCircle, XCircle } from 'lucide-react';

const PaymentStatus = () => {
  const location = useLocation();
  const success = location.state?.success;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto text-center">
        {success ? (
          <>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">Payment Successful!</h2>
            <p className="mb-6">Thank you for your purchase.</p>
          </>
        ) : (
          <>
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">Payment Failed</h2>
            <p className="mb-6">Please try again or contact support.</p>
          </>
        )}
        <Link
          to="/"
          className="bg-gray-800 text-white px-6 py-3 rounded-lg hover:bg-gray-950"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
};

export default PaymentStatus;
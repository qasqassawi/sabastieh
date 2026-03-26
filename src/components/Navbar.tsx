import { Link } from 'react-router-dom';
import { ShoppingCart, LayoutDashboard } from 'lucide-react';
import { useCart } from '../context/CartContext';
import './Navbar.css';

export default function Navbar() {
  const { totalItems } = useCart();

  return (
    <>
      <div className="floating-nav">
        <Link to="/admin" className="nav-action-btn admin-secret-btn" aria-label="الإدارة">
          <LayoutDashboard size={22} />
        </Link>
        <Link to="/checkout" className="nav-action-btn cart-btn" aria-label="السلة">
          <ShoppingCart size={22} />
          {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
        </Link>
      </div>
    </>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { products } from '../data/products';
import type { Product } from '../data/products';
import { useCart } from '../context/CartContext';
import { useBakery } from '../context/BakeryContext';
import { Plus } from 'lucide-react';
import './Catalog.css';

export default function Catalog() {
  const { items, totalPrice, addToCart } = useCart();
  const navigate = useNavigate();
  const { isBakeryOpen, openTime, closeTime, productAvailability, productQuantities } = useBakery();
  const [activeCategory, setActiveCategory] = useState<string>('الخبز');

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  // We only have Bread and Pastries in segment control per the image
  const categories = ['الخبز', 'المعجنات'];

  const filteredProducts = products.filter(p => {
    // Basic category filter
    if (p.category !== activeCategory) return false;
    return true;
  });

  return (
    <div className="mobile-catalog">
      {/* Hero Header */}
      <div className="hero-header">
        <div className="hero-content">
          <span className="hero-subtitle">مخبز</span>
          <h1 className="hero-title" style={{fontSize: '2.5rem'}}>سبسطية</h1>
          <span className="hero-tagline">طازج كل يوم</span>
        </div>
      </div>

      <div className="catalog-body">
        {!isBakeryOpen ? (
          <div className="bakery-closed-state card">
            <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: '#991b1b' }}>المخبز مغلق حالياً 🌙</h2>
            <p style={{ fontSize: '1.2rem', color: '#4a3b32', marginBottom: '0.5rem' }}>عذراً، لا يمكننا استقبال طلبات في الوقت الحالي.</p>
            <p style={{ color: '#8c7662' }}>أوقات العمل المعتادة هي من <strong>{openTime}</strong> إلى <strong>{closeTime}</strong>.</p>
          </div>
        ) : (
          <>
            {/* Segmented Control */}
            <div className="segmented-control">
              {categories.map(cat => (
                <button
                  key={cat}
                  className={`segment-btn ${activeCategory === cat ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Section Title */}
            <div className="section-title">
              <h2>{activeCategory} {activeCategory === 'الخبز' ? '🍞' : '🥐'}</h2>
            </div>

            {/* Products List */}
            <div className="products-list">
              {filteredProducts.length > 0 ? (
                filteredProducts.map(product => {
                  const isAvailable = productAvailability[product.id] !== false;
                  const hasQuantity = (product.id !== 'p5' && product.id !== 'p6') || (productQuantities[product.id] || 0) > 0;
                  const finalAvailable = isAvailable && hasQuantity;

                  return (
                    <ProductCard
                      key={product.id}
                      product={product}
                      isAvailable={finalAvailable}
                      onAdd={(qty) => addToCart(product, qty)}
                    />
                  );
                })
              ) : (
                <div className="no-products-message">
                  عذراً، لا يوجد منتجات متوفرة حالياً في هذا القسم.
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {totalItems > 0 && (
        <div className="cart-summary-bar" onClick={() => navigate('/checkout')}>
          <div className="cart-summary-total">
             {totalPrice.toFixed(3)} د.أ
          </div>
          <div className="cart-summary-text">
            عرض السلة
          </div>
          <div className="cart-summary-count">
            {totalItems}
          </div>
        </div>
      )}
    </div>
  );
}

function ProductCard({ product, onAdd, isAvailable }: { product: Product, onAdd: (qty: number) => void, isAvailable: boolean }) {
  const { items, updateQuantity } = useCart();
  const quantity = items.find(item => item.product.id === product.id)?.quantity || 0;

  const displayPrice = product.price < 1 
    ? `${product.price * 1000} فلس` 
    : `${product.price.toFixed(3)} د.أ`;

  return (
    <div className={`mobile-product-card ${quantity > 0 ? 'active-card' : ''} ${!isAvailable ? 'unavailable-card' : ''}`}>
      <div className="mobile-product-image">
        <img src={product.imageUrl} alt={product.name} loading="lazy" />
        {!isAvailable && (
          <div className="unavailable-overlay">
            <span>غير متوفر</span>
          </div>
        )}
      </div>

      <div className="mobile-product-info">
        <h3 className="mobile-product-name">
          {product.name}
        </h3>
        <span className="mobile-product-unit">{product.unit || 'رغيف'}</span>
        <div className="mobile-product-price">
          {isAvailable ? displayPrice : (
            <span className="unavailable-text-inline">غير متوفر حالياً</span>
          )}
        </div>
      </div>

      <div className="mobile-product-add">
        {isAvailable ? (
          quantity > 0 ? (
            <div className="qty-controller">
              <button
                className="qty-btn"
                onClick={() => updateQuantity(product.id, quantity - 1)}
                aria-label="Decrease"
              >
                -
              </button>
              <span className="qty-value">{quantity}</span>
              <button
                className="qty-btn"
                onClick={() => updateQuantity(product.id, quantity + 1)}
                aria-label="Increase"
              >
                +
              </button>
            </div>
          ) : (
            <button 
              className="add-btn-circle"
              onClick={() => onAdd(1)}
              aria-label="Add to cart"
            >
              <Plus size={20} />
            </button>
          )
        ) : (
          <button className="add-btn-circle disabled" disabled>
            <Plus size={20} />
          </button>
        )}
      </div>
    </div>
  );
}

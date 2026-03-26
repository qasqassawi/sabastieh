import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, MarkerF } from '@react-google-maps/api';
import { useGoogleMaps } from '../context/GoogleMapsContext';
import { useBakery } from '../context/BakeryContext';
import { LogOut, RefreshCcw, ChevronUp, ChevronDown, Share2, Printer, QrCode, MapPin, ArrowRight } from 'lucide-react';
import { products } from '../data/products';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import './AdminDashboard.css';

const AMMAN_CENTER = { lat: 31.9539, lng: 35.9284 };

type OrderStatus = 'قيد التحضير' | 'مع السائق' | 'تم التوصيل';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  customerName: string;
  phone?: string;
  total: number;
  status: OrderStatus;
  location: { lat: number; lng: number };
  items: string;
  itemDetails?: OrderItem[];
  deliveryFee?: number;
  createdAt: string;
}

let audioCtx: AudioContext | null = null;
const playAlertSound = () => {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); 
    oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.5);
    
    gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
    
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.5);
  } catch (e) {
    console.error("Audio play failed", e);
  }
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(
    sessionStorage.getItem('admin_auth') === 'true'
  );
  const [passwordInput, setPasswordInput] = useState('');

  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [lastUpdate, setLastUpdate] = useState(new Date().toLocaleTimeString());
  const [unseenOrderIds, setUnseenOrderIds] = useState<Set<string>>(new Set());

  const { isLoaded } = useGoogleMaps();

  const { 
    manualStatus, setManualStatus, 
    openTime, setOpenTime, 
    closeTime, setCloseTime, 
    isBakeryOpen,
    productAvailability, setProductAvailability,
    productQuantities, setProductQuantity
  } = useBakery();

  const handleLogout = () => {
    sessionStorage.removeItem('admin_auth');
    setIsAuthenticated(false);
  };

  const adjustTime = (type: 'open' | 'close', field: 'hour' | 'minute', amount: number) => {
    const current = type === 'open' ? openTime : closeTime;
    const setter = type === 'open' ? setOpenTime : setCloseTime;
    
    let [h, m] = current.split(':').map(Number);
    if (field === 'hour') {
      h = (h + amount + 24) % 24;
    } else {
      m = (m + amount + 60) % 60;
    }
    setter(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
  };

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `منذ ${days} يوم`;
    if (hours > 0) return `منذ ${hours} ساعة`;
    return `منذ ${mins} دقيقة`;
  };

  // Real-time Firestore Sync
  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedOrders: Order[] = [];
      snapshot.forEach((doc) => {
        fetchedOrders.push({ id: doc.id, ...doc.data() } as Order);
      });

      setOrders(prevOrders => {
        // Identify new orders for the persistent alert
        const newIds = fetchedOrders.map(o => o.id);
        const oldIds = prevOrders.map(o => o.id);
        const reallyNew = newIds.filter(id => !oldIds.includes(id) && oldIds.length > 0);
        
        if (reallyNew.length > 0) {
          setUnseenOrderIds(prev => {
            const next = new Set(prev);
            reallyNew.forEach(id => next.add(id));
            return next;
          });
        }
        return fetchedOrders;
      });
      setLastUpdate(new Date().toLocaleTimeString());
    });

    return () => unsubscribe();
  }, []);

  // Persistent Looping Alert Sound
  useEffect(() => {
    if (unseenOrderIds.size === 0) return;

    // Play sound every 4 seconds until cleared
    const alarmInterval = setInterval(() => {
      playAlertSound();
    }, 4000);

    return () => clearInterval(alarmInterval);
  }, [unseenOrderIds.size]);

  // Handle order selection to clear alert
  const handleSelectOrder = (order: Order) => {
    setSelectedOrder(order);
    if (unseenOrderIds.has(order.id)) {
      setUnseenOrderIds(prev => {
        const next = new Set(prev);
        next.delete(order.id);
        return next;
      });
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === '3981170') {
      setIsAuthenticated(true);
      sessionStorage.setItem('admin_auth', 'true');
    } else {
      alert('كلمة المرور غير صحيحة');
    }
  };

  const updateOrderStatus = async (id: string, newStatus: OrderStatus) => {
    try {
      // Update in Cloud
      const orderRef = doc(db, "orders", id);
      await updateDoc(orderRef, { status: newStatus });
      
      // Local update for UI responsiveness
      if (selectedOrder?.id === id) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    } catch (e) {
      console.error("Status update sync failed", e);
    }
  };

  const handleShare = async (order: Order) => {
    const mapsUrl = `https://www.google.com/maps?q=${order.location.lat},${order.location.lng}`;
    const shareText = `طلب من: ${order.customerName}\nالهاتف: ${order.phone}\nالأصناف: ${order.items}\nالسعر: ${order.total.toFixed(3)} د.أ\nالموقع: ${mapsUrl}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `طلب ${order.customerName}`,
          text: shareText,
        });
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      // Fallback: Copy to clipboard
      await navigator.clipboard.writeText(shareText);
      alert('تم نسخ تفاصيل الطلب والموقع للمشاركة');
    }
  };

  const handlePrint = (order: Order) => {
    const mapsUrl = `https://www.google.com/maps?q=${order.location.lat},${order.location.lng}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(mapsUrl)}`;
    
    // Calculate subtotal if itemDetails is present
    const subtotal = order.itemDetails 
      ? order.itemDetails.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      : (order.total - (order.deliveryFee || 0.50));

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html dir="rtl">
        <head>
          <title>فاتورة - ${order.customerName}</title>
          <style>
            body { font-family: 'Arial', sans-serif; padding: 20px; color: #333; text-align: right; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
            .header img { height: 80px; margin-bottom: 10px; }
            .order-info { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
            .order-info div { flex: 1; }
            .qr-section { text-align: center; margin-right: 20px; }
            .order-info p { margin: 5px 0; font-size: 1.1rem; }
            .items { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .items th, .items td { border-bottom: 1px solid #eee; padding: 10px; text-align: right; }
            .summary-table { width: 100%; margin-top: 20px; }
            .summary-table td { padding: 5px 0; }
            .total-row { font-size: 1.3rem; font-weight: bold; border-top: 2px solid #000; padding-top: 10px; }
            .qr-label { font-size: 0.8rem; color: #666; margin-top: 5px; }
            .price-col { text-align: left !important; }
          </style>
        </head>
        <body onload="setTimeout(() => { window.print(); window.close(); }, 500);">
          <div class="header">
            <img src="${window.location.origin}/logo.jpg" alt="Logo" />
            <h1>مخبز سبسطية</h1>
            <p>تاريخ الطلب: ${new Date(order.createdAt).toLocaleString('ar-JO')}</p>
          </div>
          <div class="order-info">
            <div>
              <p><strong>العميل:</strong> ${order.customerName}</p>
              <p><strong>الهاتف:</strong> ${order.phone || 'غير مسجل'}</p>
              <p><strong>وقت الطلب:</strong> ${new Date(order.createdAt).toLocaleTimeString('ar-JO')}</p>
            </div>
            <div class="qr-section">
              <img src="${qrCodeUrl}" alt="QR Location" width="120" height="120" />
              <div class="qr-label">امسح الموقع (Google Maps)</div>
            </div>
          </div>
          <table class="items">
            <thead>
              <tr>
                <th>الصنف والكمية</th>
                <th class="price-col">السعر</th>
              </tr>
            </thead>
            <tbody>
              ${order.itemDetails 
                ? order.itemDetails.map(item => `
                    <tr>
                      <td>${item.name} × ${item.quantity}</td>
                      <td class="price-col">${(item.price * item.quantity).toFixed(3)} د.أ</td>
                    </tr>`).join('')
                : `<tr><td>${order.items}</td><td class="price-col">${subtotal.toFixed(3)} د.أ</td></tr>`
              }
            </tbody>
          </table>
          <table class="summary-table">
            <tr>
              <td>المجموع الفرعي:</td>
              <td class="price-col">${subtotal.toFixed(3)} د.أ</td>
            </tr>
            <tr>
              <td>رسوم التوصيل:</td>
              <td class="price-col">${(order.deliveryFee || 0.50).toFixed(3)} د.أ</td>
            </tr>
            <tr class="total-row">
              <td>الإجمالي الكلي:</td>
              <td class="price-col">${order.total.toFixed(3)} د.أ</td>
            </tr>
          </table>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleQRLocation = (order: Order) => {
    const mapsUrl = `https://www.google.com/maps?q=${order.location.lat},${order.location.lng}`;
    window.open(mapsUrl, '_blank');
  };

  if (!isAuthenticated) {
    return (
      <div className="admin-login-container" dir="rtl">
        <div className="admin-login-form card">
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <img 
              src="/logo.jpg" 
              alt="Logo" 
              style={{ height: '100px', width: '100px', borderRadius: '50%', objectFit: 'cover', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }} 
            />
          </div>
          <button 
            className="back-to-home-link"
            onClick={() => navigate('/')}
            style={{display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--admin-accent-orange)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '1.5rem', fontWeight: 700}}
          >
            <ArrowRight size={20} />
            العودة للرئيسية
          </button>
          <form onSubmit={handleLogin}>
            <h2>تسجيل دخول الإدارة</h2>
            <div className="form-group">
              <label>كلمة المرور</label>
              <input 
                type="password" 
                value={passwordInput} 
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="أدخل كلمة المرور"
                autoFocus
                style={{textAlign: 'center'}}
              />
            </div>
            <button type="submit" className="btn btn-primary submit-btn">دخول</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-header-modern">
        <button className="logout-btn-modern" onClick={handleLogout}>
          <LogOut size={18} style={{marginLeft: '8px'}} />
          خروج
        </button>
        <div className="header-center-info">
          <h1>لوحة التحكم</h1>
        <div className="update-info">
            آخـر مزامنة: {lastUpdate}
            <br />
            تحديث تلقائي (Real-time)
          </div>
        </div>
        <button className="refresh-btn-modern" onClick={() => window.location.reload()} title="إعادة التحميل">
          <RefreshCcw size={24} />
        </button>
        <button 
          className="cleanup-btn-modern" 
          onClick={async () => {
            if (!window.confirm('تنظيف الطلبات المنتهية من السحابة؟')) return;
            const completed = orders.filter(o => o.status === 'تم التوصيل');
            for (const o of completed) {
              await deleteDoc(doc(db, "orders", o.id));
            }
            alert('تم التنظيف بنجاح');
          }}
          title="تنظيف الطلبات المنتهية"
          style={{
            marginRight: '1rem',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--admin-accent-red)',
            color: 'var(--admin-accent-red)',
            padding: '0.5rem 1rem',
            borderRadius: '12px',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          تنظيف الذاكرة
        </button>
      </div>

      <div className="admin-top-controls">
        {/* Bakery Status Card */}
        <div className="admin-card-modern">
            <h2 className="card-title-modern">حالة المخبز</h2>
            <div className="status-card-content">
              <div className="status-indicator-modern">
                <div className={`glow-orb ${!isBakeryOpen ? 'off' : ''}`}></div>
                <span style={{color: isBakeryOpen ? 'var(--admin-accent-green)' : 'var(--admin-accent-red)'}}>
                  المخبز {isBakeryOpen ? 'مفتوح' : 'مغلق'}
                </span>
              </div>
              <button 
                className={`status-toggle-btn ${manualStatus === 'closed' || (manualStatus === 'auto' && !isBakeryOpen) ? 'open-action' : ''}`}
                onClick={() => setManualStatus(isBakeryOpen ? 'closed' : 'open')}
              >
                {isBakeryOpen ? 'إغلاق' : 'فتح'}
              </button>
            </div>
        </div>

        {/* Scheduling Card */}
        <div className="admin-card-modern">
            <div className="schedule-header">
                <button 
                  className={`auto-toggle-btn ${manualStatus === 'auto' ? 'active' : ''}`}
                  onClick={() => setManualStatus(manualStatus === 'auto' ? (isBakeryOpen ? 'open' : 'closed') : 'auto')}
                >
                  تلقائي
                </button>
                <h2 className="card-title-modern" style={{marginBottom: 0}}>جدول الفتح والإغلاق</h2>
            </div>

            <div className="time-pickers-container">
              {/* Opening Time */}
              <div className="time-picker-column">
                <span className="time-picker-label">وقت الفتح</span>
                <div className="time-picker-controls">
                  <div className="time-segment">
                    <button className="arrow-btn" onClick={() => adjustTime('open', 'minute', 1)}><ChevronUp size={20}/></button>
                    <span className="time-digit">{openTime.split(':')[1]}</span>
                    <button className="arrow-btn" onClick={() => adjustTime('open', 'minute', -1)}><ChevronDown size={20}/></button>
                  </div>
                  <span className="time-separator">:</span>
                  <div className="time-segment">
                    <button className="arrow-btn" onClick={() => adjustTime('open', 'hour', 1)}><ChevronUp size={20}/></button>
                    <span className="time-digit">{openTime.split(':')[0]}</span>
                    <button className="arrow-btn" onClick={() => adjustTime('open', 'hour', -1)}><ChevronDown size={20}/></button>
                  </div>
                </div>
              </div>

              <div className="time-divider-vertical"></div>

              {/* Closing Time */}
              <div className="time-picker-column">
                <span className="time-picker-label">وقت الإغلاق</span>
                <div className="time-picker-controls">
                  <div className="time-segment">
                    <button className="arrow-btn" onClick={() => adjustTime('close', 'minute', 1)}><ChevronUp size={20}/></button>
                    <span className="time-digit">{closeTime.split(':')[1]}</span>
                    <button className="arrow-btn" onClick={() => adjustTime('close', 'minute', -1)}><ChevronDown size={20}/></button>
                  </div>
                  <span className="time-separator">:</span>
                  <div className="time-segment">
                    <button className="arrow-btn" onClick={() => adjustTime('close', 'hour', 1)}><ChevronUp size={20}/></button>
                    <span className="time-digit">{closeTime.split(':')[0]}</span>
                    <button className="arrow-btn" onClick={() => adjustTime('close', 'hour', -1)}><ChevronDown size={20}/></button>
                  </div>
                </div>
              </div>
            </div>

            <p className="schedule-help-text">فعّل "تلقائي" لتطبيق الجدول تلقائياً</p>
            <button className="save-schedule-btn" onClick={() => setManualStatus('auto')}>
              حفظ وتفعيل التلقائي
            </button>
        </div>

        {/* Product Management Card */}
        <div className="admin-card-modern">
          <h2 className="card-title-modern">إدارة المنتجات</h2>
          <div className="product-management-list">
            {['الخبز', 'المعجنات'].map(category => (
              <div key={category} className="product-category-group">
                <div className="product-group-label" style={{marginTop: category === 'المعجنات' ? '1.5rem' : '0'}}>
                  {category}
                </div>
                {products
                  .filter(p => p.category === category)
                  .map(product => {
                    const id = product.id;
                    const isAvailable = productAvailability[id] !== false;
                    
                    return (
                      <div key={id} className="admin-product-item">
                        <div className="product-item-right">
                          <label className="switch">
                            <input 
                              type="checkbox" 
                              checked={isAvailable}
                              onChange={(e) => setProductAvailability(id, e.target.checked)}
                            />
                            <span className="slider round"></span>
                          </label>
                          <div className="product-name-admin">{product.name}</div>
                        </div>
                        
                        {(id === 'p5' || id === 'p6') && (
                          <div className="product-quantity-control">
                            <span className="qty-label-admin">الكمية:</span>
                            <input 
                              type="number" 
                              className="qty-input-admin"
                              value={productQuantities[id] || 0}
                              onChange={(e) => setProductQuantity(id, parseInt(e.target.value) || 0)}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="orders-list-panel">
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
            <h2 style={{textShadow: '0 0 10px rgba(0,0,0,0.5)', margin: 0}}>الطلبات النشطة ({orders.length})</h2>
            {orders.length > 50 && <span style={{fontSize: '0.8rem', color: '#9CA3AF'}}>يتم عرض آخر 50 طلباً</span>}
          </div>
          <div className="orders-list">
            {orders.slice(0, 50).map(order => (
              <div 
                key={order.id} 
                className={`order-card-modern ${selectedOrder?.id === order.id ? 'selected' : ''} ${unseenOrderIds.has(order.id) ? 'new-order-pulse' : ''}`}
                onClick={() => handleSelectOrder(order)}
              >
                <div className="order-card-header">
                  <h3 className="customer-name-modern">{order.customerName}</h3>
                  <span className={`status-badge-modern ${order.status === 'تم التوصيل' ? 'success' : 'pending'}`}>
                    {order.status}
                  </span>
                </div>
                
                <span className="customer-phone-modern">{order.phone || '07XXXXXXXX'}</span>
                
                <p className="order-items-modern">
                  {order.items.replace(/،/g, ' • ')}
                </p>

                <div className="order-location-modern">
                  <span>
                    {order.location?.lat?.toFixed(5) || '0.00000'}, {order.location?.lng?.toFixed(5) || '0.00000'}
                  </span>
                  <MapPin size={16} className="location-pin-icon" />
                </div>

                <hr className="card-divider-modern" />

                <div className="order-card-footer">
                   <span className="order-time-ago">{getTimeAgo(order.createdAt)}</span>
                   <span className="order-total-modern">{order.total.toFixed(3)} د.أ</span>
                </div>

                <div className="order-actions-row">
                   <button className="action-btn-modern" onClick={(e) => { e.stopPropagation(); handleShare(order); }}>
                     <Share2 size={16} /> مشاركة
                   </button>
                   <button className="action-btn-modern qr" onClick={(e) => { e.stopPropagation(); handleQRLocation(order); }}>
                     <QrCode size={16} /> <span>موقع QR</span>
                   </button>
                   <button className="action-btn-modern print" onClick={(e) => { e.stopPropagation(); handlePrint(order); }}>
                     <Printer size={16} /> طباعة
                   </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="map-panel card" style={{background: '#1a1a1a', border: '1px solid #2a2a2a'}}>
          {selectedOrder ? (
            <div className="selected-order-actions">
              <h3 style={{color: 'white'}}>تحديث حالة الطلب: {selectedOrder.id}</h3>
              <div className="status-buttons">
                <button 
                  className={`btn ${selectedOrder.status === 'قيد التحضير' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{background: selectedOrder.status === 'قيد التحضير' ? 'var(--admin-accent-orange)' : '#333', color: selectedOrder.status === 'قيد التحضير' ? 'black' : 'white', border: 'none'}}
                  onClick={() => updateOrderStatus(selectedOrder.id, 'قيد التحضير')}
                >
                  قيد التحضير
                </button>
                <button 
                  className={`btn ${selectedOrder.status === 'مع السائق' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{background: selectedOrder.status === 'مع السائق' ? 'var(--admin-accent-orange)' : '#333', color: selectedOrder.status === 'مع السائق' ? 'black' : 'white', border: 'none'}}
                  onClick={() => updateOrderStatus(selectedOrder.id, 'مع السائق')}
                >
                  مع السائق
                </button>
                <button 
                  className={`btn ${selectedOrder.status === 'تم التوصيل' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{background: selectedOrder.status === 'تم التوصيل' ? 'var(--admin-accent-green)' : '#333', color: selectedOrder.status === 'تم التوصيل' ? 'black' : 'white', border: 'none'}}
                  onClick={() => updateOrderStatus(selectedOrder.id, 'تم التوصيل')}
                >
                  تم التوصيل
                </button>
              </div>
            </div>
          ) : (
            <p className="map-prompt" style={{color: '#888'}}>اختر طلباً لعرض التفاصيل وتحديث الحالة</p>
          )}

          <div className="map-container" style={{height: '400px'}}>
            {isLoaded ? (
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%', borderRadius: '16px' }}
                center={selectedOrder ? selectedOrder.location : AMMAN_CENTER}
                zoom={12}
                options={{
                  styles: [
                    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
                    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
                    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
                    { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
                    { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
                    { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
                    { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
                    { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
                    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
                    { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
                    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
                    { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
                    { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
                    { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
                    { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
                    { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
                    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
                    { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] },
                  ],
                  gestureHandling: 'greedy',
                }}
              >
                {orders.filter(o => o.status !== 'تم التوصيل' && o.location && typeof o.location.lat === 'number' && typeof o.location.lng === 'number').map(order => (
                  <MarkerF 
                    key={order.id}
                    position={order.location}
                    onClick={() => setSelectedOrder(order)}
                    label={{
                      text: order.customerName ? order.customerName.charAt(0) : '?',
                      color: 'white',
                      fontWeight: 'bold'
                    }}
                  />
                ))}
              </GoogleMap>
            ) : (
              <div className="map-loading">جاري تحميل الخريطة...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

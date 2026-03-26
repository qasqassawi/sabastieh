import { useState, useCallback, useEffect } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, X, MapPin, ChevronLeft } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { GoogleMap, MarkerF, Autocomplete, Polygon } from '@react-google-maps/api';
import { useGoogleMaps } from '../context/GoogleMapsContext';
import './Checkout.css';

const AMMAN_CENTER = { lat: 31.9539, lng: 35.9284 };

const DELIVERY_ZONE_POINTS = [
  { lat: 31.969180, lng: 35.995053 },
  { lat: 31.964411, lng: 35.991534 },
  { lat: 31.960841, lng: 35.986490 },
  { lat: 31.951675, lng: 35.993227 },
  { lat: 31.949410, lng: 35.985428 },
  { lat: 31.963982, lng: 35.969679 }
];

export default function Checkout() {
  const { items, totalPrice, updateQuantity, setSlicingOption, clearCart } = useCart();
  const navigate = useNavigate();

  const [detailedAddress, setDetailedAddress] = useState('');
  const [isPickingLocation, setIsPickingLocation] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoSuccess, setGeoSuccess] = useState(false);
  const [mapCenter, setMapCenter] = useState(AMMAN_CENTER);
  const [isLocating, setIsLocating] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number} | null>(null);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [lastOrderData, setLastOrderData] = useState<{
    itemCount: number;
    subtotal: number;
    deliveryFee: number;
    total: number;
  } | null>(null);
  
  const [isInsideZone, setIsInsideZone] = useState<boolean | null>(null);

  const { isLoaded, loadError } = useGoogleMaps();

  const reverseGeocode = useCallback((lat: number, lng: number) => {
    if (!isLoaded || !window.google) return;
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        setDetailedAddress(results[0].formatted_address);
      } else {
        console.error("Geocoding failed:", status);
      }
    });
  }, [isLoaded]);

  const onAutocompleteLoad = (autocompleteInstance: google.maps.places.Autocomplete) => {
    setAutocomplete(autocompleteInstance);
  };

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place.geometry && place.geometry.location) {
        const loc = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        };
        setSelectedLocation(loc);
        setMapCenter(loc);
        setDetailedAddress(place.formatted_address || '');
        setGeoSuccess(true);
        setGeoError(null);
      }
    } else {
      console.log('Autocomplete is not loaded yet');
    }
  };

  const checkZone = useCallback((lat: number, lng: number) => {
    try {
      if (!window.google || !window.google.maps || !window.google.maps.geometry || !window.google.maps.geometry.poly) {
        return;
      }
      
      const point = new google.maps.LatLng(lat, lng);
      const polygon = new google.maps.Polygon({ paths: DELIVERY_ZONE_POINTS });
      const result = google.maps.geometry.poly.containsLocation(point, polygon);
      setIsInsideZone(result);
      
      if (result) {
        setGeoSuccess(true);
        setGeoError(null);
      } else {
        setGeoSuccess(false);
        setGeoError("نعتذر، مخبز سبسطية يغطي حالياً منطقة ماركا الجنوبية المحددة لضمان سرعة التوصيل");
      }
    } catch (err) {
      console.error("Geofencing check error:", err);
    }
  }, []);

  // Load saved address and location if available on mount
  useEffect(() => {
    if (items.length === 0) return; // Don't prompt for anything if cart is empty

    const savedAddress = localStorage.getItem('userAddress');
    const savedLocation = localStorage.getItem('userLocation');
    if (savedAddress) setDetailedAddress(savedAddress);
    if (savedLocation) {
      try {
        const loc = JSON.parse(savedLocation);
        if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
          setSelectedLocation(loc);
          setMapCenter(loc);
          setGeoSuccess(true);
        }
      } catch (e) {
        console.error("Error parsing saved location", e);
      }
    }
  }, [items.length]);

  const [autoLocateAttempted, setAutoLocateAttempted] = useState(false);

  // Automatic Location Detection - Trigger as soon as map is ready
  useEffect(() => {
    // Optimization: Don't auto-locate if cart is empty or already attempted
    if (items.length === 0 || autoLocateAttempted || !isLoaded) {
      return;
    }

    const performAutoLocate = async () => {
      setAutoLocateAttempted(true);
      setIsLocating(true);
      
      try {
        // 1. Try Capacitor Native Geolocation (Best for mobile app)
        const permissions = await Geolocation.checkPermissions();
        if (permissions.location !== 'granted') {
          await Geolocation.requestPermissions();
        }

        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000
        });

        const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
        setSelectedLocation(loc);
        setMapCenter(loc);
        reverseGeocode(loc.lat, loc.lng);
        checkZone(loc.lat, loc.lng);
        setGeoSuccess(true);
        setIsLocating(false);
      } catch (nativeErr) {
        console.warn("Native Geolocation failed, falling back to Web API:", nativeErr);
        
        // 2. Fallback to Web Geolocation API
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
              setSelectedLocation(loc);
              setMapCenter(loc);
              reverseGeocode(loc.lat, loc.lng);
              checkZone(loc.lat, loc.lng);
              setGeoSuccess(true);
              setIsLocating(false);
            },
            () => {
              setIsLocating(false);
              if (!selectedLocation) {
                setGeoError("يرجى تفعيل نظام تحديد المواقع (GPS) للحصول على أدق موقع للتوصيل.");
              }
            },
            { enableHighAccuracy: true, timeout: 8000 }
          );
        } else {
          setIsLocating(false);
          setGeoError("نظام تحديد المواقع غير مدعوم في هذا المتصفح.");
        }
      }
    };

    performAutoLocate();
  }, [isLoaded, autoLocateAttempted, items.length, selectedLocation, checkZone, reverseGeocode]);

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setSelectedLocation({ lat, lng });
    reverseGeocode(lat, lng);
    checkZone(lat, lng);
  }, [reverseGeocode, checkZone]);

  const DELIVERY_FEE = 0.50;
  const finalTotal = totalPrice + DELIVERY_FEE;

  const handleConfirmOrder = () => {
    if (!geoSuccess || !selectedLocation) return;
    
    // Check if any bread item (except Shrak p6) missing slicing option
    const missingSlicing = items.some(item => 
      item.product.category === 'الخبز' && 
      item.product.id !== 'p6' && 
      !item.slicingOption
    );

    if (missingSlicing) {
      alert('يرجى اختيار خيار التقطيع لجميع أنواع الخبز');
      return;
    }
    
    const orderItemDetails = items.map(item => ({
      name: item.product.name,
      quantity: item.quantity,
      price: item.product.price
    }));

    const newOrder = {
      customerName: localStorage.getItem('userName') || 'عميل مجهول',
      phone: localStorage.getItem('userPhone') || '',
      items: items.map(item => `${item.quantity}x ${item.product.name}`).join('، '),
      itemDetails: orderItemDetails,
      deliveryFee: DELIVERY_FEE,
      total: finalTotal,
      status: 'قيد التحضير',
      location: selectedLocation,
      detailedAddress: detailedAddress,
      createdAt: new Date().toISOString(),
      itemsWithDetails: items.map(item => ({
        name: item.product.name,
        quantity: item.quantity,
        slicingOption: item.slicingOption || 'whole'
      }))
    };

    // Save to Cloud Firestore for multi-device sync
    try {
      addDoc(collection(db, "orders"), newOrder);
    } catch (e) {
      console.error("Firestore sync failed, order will be local only", e);
    }

    // Keep saving to localStorage as a fallback/backup
    const existingOrders = JSON.parse(localStorage.getItem('bakery_orders') || '[]');
    localStorage.setItem('bakery_orders', JSON.stringify([{ ...newOrder, id: `ORD-${Date.now()}` }, ...existingOrders]));

    // Persist address and location for next time
    localStorage.setItem('userAddress', detailedAddress);
    localStorage.setItem('userLocation', JSON.stringify(selectedLocation));

    setLastOrderData({
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: totalPrice,
      deliveryFee: DELIVERY_FEE,
      total: finalTotal
    });

    setOrderPlaced(true);
    clearCart();
  };

  if (orderPlaced && lastOrderData) {
    return (
      <div className="checkout-mobile-container success-view-container" dir="rtl">
        <button className="close-btn success-close" onClick={() => navigate('/')}>
          <X size={24} />
        </button>
        <div className="success-content">
          <div className="success-icon-wrapper">
            <div className="success-icon-circle">
              <CheckCircle2 size={64} color="white" strokeWidth={3} />
            </div>
          </div>

          <h1 className="success-main-title">تم استلام طلبك!</h1>
          <p className="success-sub-title">سيتم توصيل طلبك في أقرب وقت ممكن</p>

          <div className="order-details-card">
            <h3 className="card-header-title">تفاصيل الطلب</h3>
            
            <div className="detail-row">
              <span className="detail-label">عدد المنتجات</span>
              <span className="detail-value">{lastOrderData.itemCount} قطعة</span>
            </div>

            <div className="detail-row">
              <span className="detail-label">المجموع الفرعي</span>
              <span className="detail-value">{lastOrderData.subtotal.toFixed(3)} د.أ</span>
            </div>

            <div className="detail-row">
              <span className="detail-label">رسوم التوصيل</span>
              <span className="detail-value">{lastOrderData.deliveryFee.toFixed(3)} د.أ</span>
            </div>

            <div className="detail-row total-row-final">
              <span className="detail-label">الإجمالي</span>
              <span className="detail-value orange">{lastOrderData.total.toFixed(3)} د.أ</span>
            </div>
          </div>

          <div className="success-footer">
            <button className="new-order-btn" onClick={() => navigate('/')}>
              طلب جديد
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="checkout-mobile-container">
        <div className="checkout-header-modern">
          <button className="close-btn" onClick={() => navigate('/')}><X size={20} /></button>
          <div className="header-titles">
            <h1>سلة الطلب</h1>
            <p>السلة فارغة</p>
          </div>
        </div>
        <div className="empty-state-content" style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '2rem', textAlign: 'center'}}>
          <div className="empty-cart-icon" style={{fontSize: '4rem', marginBottom: '1.5rem'}}>🧺</div>
          <h2 style={{color: '#1a1a1a', marginBottom: '0.5rem', fontSize: '1.5rem', fontWeight: 800}}>سلة الطلب فارغة</h2>
          <p style={{color: '#8C7662', marginBottom: '2rem', fontSize: '1.1rem'}}>لم تقم بإضافة أي منتجات بعد.</p>
          <button className="submit-btn-modern active" onClick={() => navigate('/')}>
            تصفح المخبوزات
          </button>
        </div>
      </div>
    );
  }

  const userName = localStorage.getItem('userName') || 'الضيف';

  if (isPickingLocation) {
    return (
      <div className="checkout-mobile-container picker-view-bg">
        <div className="checkout-header-modern picker-header">
          <button className="back-btn-picker" onClick={() => setIsPickingLocation(false)}>
            <ChevronLeft size={24} />
          </button>
          <div className="header-titles">
            <h1 style={{fontSize: '1.2rem'}}>موقع التوصيل</h1>
          </div>
        </div>

        <div className="picker-map-container">
          <div className="location-fixed-badge">
             <MapPin size={16} />
             <span>تم تحديد الموقع</span>
          </div>
          {isLoaded ? (
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '100%' }}
              center={mapCenter}
              zoom={15}
              onClick={handleMapClick}
              options={{
                disableDefaultUI: true,
                zoomControl: true,
                gestureHandling: 'greedy',
              }}
            >
              {selectedLocation && <MarkerF position={selectedLocation} />}
              <Polygon 
                paths={DELIVERY_ZONE_POINTS}
                options={{
                  fillColor: "#E87A4F",
                  fillOpacity: 0.1,
                  strokeWeight: 0, // Transparent bound per user request
                  clickable: false
                }}
              />
            </GoogleMap>
          ) : (
            <div className="map-loading-placeholder">
              {loadError ? 'خطأ في تحميل الخريطة' : 'جاري التحميل...'}
            </div>
          )}
          
          <button 
            className={`map-gps-btn ${isLocating ? 'locating' : ''}`} 
            onClick={() => {
              if (navigator.geolocation) {
                  setIsLocating(true);
                  navigator.geolocation.getCurrentPosition((p) => {
                      const loc = { lat: p.coords.latitude, lng: p.coords.longitude };
                      setMapCenter(loc);
                      setSelectedLocation(loc);
                      reverseGeocode(loc.lat, loc.lng);
                      checkZone(loc.lat, loc.lng);
                      setGeoSuccess(true);
                      setGeoError(null);
                      setIsLocating(false);
                  }, () => setIsLocating(false));
              }
            }}
            disabled={isLocating}
          >
             <MapPin size={24} />
          </button>
        </div>

        <div className="picker-details-section">
          {geoError && (
            <div className="error-text" style={{textAlign: 'right', marginBottom: '1rem', color: '#b91c1c', fontSize: '0.9rem'}}>
              {geoError}
            </div>
          )}
          <div className="coordinates-grid">
            <div className="coord-box">
              <label>خط الطول</label>
              <div className="coord-value">{selectedLocation?.lng?.toFixed(5) || '0.00000'}</div>
            </div>
            <div className="coord-box">
              <label>خط العرض</label>
              <div className="coord-value">{selectedLocation?.lat?.toFixed(5) || '0.00000'}</div>
            </div>
          </div>

          <div className="address-detail-input">
            <label className="picker-label">العنوان التفصيلي (أو ابحث هنا)</label>
            {isLoaded ? (
              <Autocomplete
                onLoad={onAutocompleteLoad}
                onPlaceChanged={onPlaceChanged}
              >
                <input 
                  type="text"
                  className="address-input-v2"
                  placeholder="ابحث عن عنوانك أو اكتبه بالتفصيل..."
                  value={detailedAddress}
                  onChange={(e) => setDetailedAddress(e.target.value)}
                />
              </Autocomplete>
            ) : (
              <input 
                type="text"
                className="address-input-v2"
                placeholder="مثال : شارع الرينبو ، بناء رقم 5 ، عمان"
                value={detailedAddress}
                onChange={(e) => setDetailedAddress(e.target.value)}
              />
            )}
          </div>

          <div className={`status-badge-picker ${isInsideZone === false ? 'out-of-zone' : ''}`}>
            {isInsideZone === true && <CheckCircle2 size={18} color="#16a34a" />}
            {isInsideZone === false && <X size={18} color="#b91c1c" />}
            <span>
              {isInsideZone === true ? "خدمة التوصيل متاحة لموقعك في ماركا الجنوبية" : 
               isInsideZone === false ? "نعتذر، موقعك خارج نطاق تغطية التوصيل حالياً" : 
               "جاري فحص النطاق..."}
            </span>
          </div>

          <div className="picker-footer">
            <button 
              className={`confirm-location-btn ${isInsideZone === false ? 'disabled' : ''}`} 
              onClick={() => isInsideZone !== false && setIsPickingLocation(false)}
              disabled={isInsideZone === false}
            >
              تأكيد الموقع <CheckCircle2 size={20} style={{marginRight: '8px'}} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-mobile-container">
      <div className="checkout-header-modern">
        <button className="close-btn" onClick={() => navigate('/')}><X size={20} /></button>
        <div className="header-titles">
          <h1>سلة الطلب</h1>
          <p>طلب: {userName}</p>
        </div>
      </div>

      <div className="checkout-scroll-content">
        
        {/* Products Section */}
        <div className="section">
          <h2 className="section-title-modern">المنتجات</h2>
          <div className="card products-card-modern">
            {items.map(({ product, quantity }) => (
              <div key={product.id} className="checkout-item-modern-v2">
                <div className="item-header-row">
                  <div className="item-price-total-v2">
                    {product.price < 1 ? `${(product.price * quantity * 1000).toFixed(0)} فلس` : `${(product.price * quantity).toFixed(3)} د.أ`}
                  </div>
                </div>
                
                <div className="item-main-content-v2">
                  <div className="qty-controller-modern-v2">
                    <button className="qty-btn-v2" onClick={() => updateQuantity(product.id, quantity + 1)}>+</button>
                    <span className="qty-value-v2">{quantity}</span>
                    <button className="qty-btn-v2" onClick={() => updateQuantity(product.id, quantity - 1)}>-</button>
                  </div>

                  <div className="item-details-v2">
                    <h3>{product.name}</h3>
                    <p className="unit-price-modern-v2">
                      {product.price < 1 ? `${(product.price * 1000).toFixed(0)} فلس` : `${product.price.toFixed(3)} د.أ`} / {product.unit}
                    </p>
                  </div>
                </div>

                {product.category === 'الخبز' && product.id !== 'p6' && (
                  <div className="slicing-selector-container-v2">
                    <label className="slicing-label-v2">
                      * تقطيع الخبز
                    </label>
                    <div className="slicing-options-v2">
                      <button 
                        className={`slicing-opt-btn-v2 ${items.find(i => i.product.id === product.id)?.slicingOption === 'whole' ? 'selected' : ''}`}
                        onClick={() => setSlicingOption(product.id, 'whole')}
                      >
                        غير مقطع
                      </button>
                      <button 
                        className={`slicing-opt-btn-v2 ${items.find(i => i.product.id === product.id)?.slicingOption === 'sliced' ? 'selected' : ''}`}
                        onClick={() => setSlicingOption(product.id, 'sliced')}
                      >
                        مقطع
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Location Section */}
        <div className="section">
          <h2 className="section-title-modern">موقع التوصيل</h2>
          <div className="card location-card-modern" onClick={() => setIsPickingLocation(true)}>
            <div className="location-left">
              <ChevronLeft size={20} color="#8C7662" />
            </div>
            <div className="location-right">
              <div className="location-texts">
                <span className="title">حدد موقع التوصيل</span>
                <span className="desc">
                  {detailedAddress || 'اضغط لإضافة العنوان'}
                </span>
              </div>
              <MapPin size={24} color="#b91c1c" className="pin-icon" />
            </div>
          </div>
          
          {/* Preview Area if location selected */}
          {geoSuccess && selectedLocation && (
            <div className="address-preview-strip">
               <span>تم تحديد الموقع بنجاح ✅</span>
            </div>
          )}
        </div>

        {/* Summary Section */}
        <div className="section">
          <h2 className="section-title-modern">ملخص الطلب</h2>
          <div className="card summary-card-modern">
            <div className="summary-row-modern">
               <span>المجموع الفرعي</span>
               <span>{totalPrice.toFixed(3)} د.أ</span>
            </div>
            <div className="summary-row-modern">
               <span>رسوم التوصيل</span>
               <span>{DELIVERY_FEE.toFixed(3)} د.أ</span>
            </div>
            <hr className="summary-divider" />
            <div className="summary-row-modern total-row-modern">
               <span>الإجمالي</span>
               <span className="total-value">{finalTotal.toFixed(3)} د.أ</span>
            </div>
          </div>
        </div>
      </div>

      <div className="checkout-footer-modern">
        <button 
          className={`submit-btn-modern ${(!geoSuccess || !selectedLocation || items.some(item => item.product.category === 'الخبز' && item.product.id !== 'p6' && !item.slicingOption)) ? 'disabled' : 'active'}`}
          disabled={!geoSuccess || !selectedLocation || items.some(item => item.product.category === 'الخبز' && item.product.id !== 'p6' && !item.slicingOption)}
          onClick={handleConfirmOrder}
        >
          {(!geoSuccess || !selectedLocation) 
            ? 'حدد موقع التوصيل أولاً' 
            : items.some(item => item.product.category === 'الخبز' && item.product.id !== 'p6' && !item.slicingOption)
              ? 'اختر خيار التقطيع للخبز'
              : 'تأكيد الطلب'}
        </button>
      </div>
    </div>
  );
}

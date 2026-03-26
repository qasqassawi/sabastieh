import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Welcome.css';

const Welcome = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [agreed, setAgreed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && phone.trim() && agreed) {
      localStorage.setItem('userName', name.trim());
      localStorage.setItem('userPhone', phone.trim());
      localStorage.setItem('termsAccepted', 'true');
      navigate('/');
    }
  };

  return (
    <div className="welcome-container" dir="rtl">
      <div className="welcome-icon-wrapper">
        <div className="welcome-dot dot-1"></div>
        <div className="welcome-dot dot-2"></div>
        <div className="welcome-icon-circle" style={{ overflow: 'hidden', padding: '0' }}>
          <img 
            src="/logo.jpg" 
            alt="شعار مخبز سبسطية" 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
        </div>
      </div>
      
      <h1 className="welcome-title">مرحباً بك في مخبز سبسطية</h1>
      <p className="welcome-subtitle">أدخل بياناتك للمتابعة</p>

      <form className="welcome-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">الاسم الكامل</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="اسمك الكريم"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="phone">رقم الهاتف</label>
          <input
            type="tel"
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="07XXXXXXXX"
            pattern="[0-9]{10}"
            title="يجب أن يتكون رقم الهاتف من 10 أرقام"
            required
          />
        </div>

        <div className="terms-container">
          <input 
            type="checkbox" 
            id="terms" 
            checked={agreed} 
            onChange={(e) => setAgreed(e.target.checked)} 
            required
          />
          <label htmlFor="terms">
            لقد قرأت وأوافق على <span className="terms-link">الشروط والأحكام</span> المتعلقة بالطلب والتوصيل
          </label>
        </div>

        <button type="submit" className={`submit-button ${!agreed ? 'disabled' : ''}`} disabled={!agreed}>
          ابدأ الطلب
        </button>
      </form>
    </div>
  );
};

export default Welcome;

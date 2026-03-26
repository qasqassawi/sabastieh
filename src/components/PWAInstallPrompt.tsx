import React, { useState, useEffect } from 'react';
import { Share, MoreVertical, Smartphone, Info } from 'lucide-react';
import './PWAInstallPrompt.css';

interface PWAInstallPromptProps {
  children: React.ReactNode;
}

export default function PWAInstallPrompt({ children }: PWAInstallPromptProps) {
  const [isStandalone, setIsStandalone] = useState(true); // Default to true to avoid flicker

  useEffect(() => {
    const checkStandalone = () => {
      // Bypass check for admin route or ?bypass=true
      const params = new URLSearchParams(window.location.search);
      if (window.location.pathname === '/admin' || params.get('bypass') === 'true') {
        setIsStandalone(true);
        return;
      }

      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as any).standalone || 
        document.referrer.includes('android-app://');
      
      setIsStandalone(!!isStandaloneMode);
    };

    checkStandalone();
    
    // Also check on window focus to handle the transition back after adding to home screen
    window.addEventListener('focus', checkStandalone);
    return () => window.removeEventListener('focus', checkStandalone);
  }, []);

  if (isStandalone) {
    return <>{children}</>;
  }

  return (
    <div className="pwa-prompt-overlay">
      <div className="pwa-prompt-card">
        <div className="pwa-icon-main">
          <Smartphone size={40} />
        </div>
        
        <h1 className="pwa-title">ثبت التطبيق أولاً</h1>
        <p className="pwa-desc">
          للحصول على أفضل تجربة تصفح وطلب، يرجى إضافة تطبيق مخبز سبسطية إلى الشاشة الرئيسية لهاتفك.
        </p>

        <div className="instructions-grid">
          <div className="instruction-item">
            <div className="instruction-header">
              <Share size={18} />
              <span>أجهزة الأيفون (iPhone)</span>
            </div>
            <div className="step">
              <div className="step-num">1</div>
              <span>اضغط على زر المشاركة (Share) في المتصفح.</span>
            </div>
            <div className="step">
              <div className="step-num">2</div>
              <span>اختر "Add to Home Screen" أو "إضافة للشاشة الرئيسية".</span>
            </div>
          </div>

          <div className="instruction-item">
            <div className="instruction-header">
              <MoreVertical size={18} />
              <span>أجهزة الأندرويد (Android)</span>
            </div>
            <div className="step">
              <div className="step-num">1</div>
              <span>اضغط على النقاط الثلاث في زاوية المتصفح.</span>
            </div>
            <div className="step">
              <div className="step-num">2</div>
              <span>اختر "Add to Home screen" أو "إضافة للشاشة الرئيسية" (وقد تجدها أحياناً تحت خيار "Add to").</span>
            </div>
          </div>
        </div>

        <p className="pwa-footer-note">
          <Info size={14} style={{verticalAlign: 'middle', marginLeft: '4px'}} />
          بعد الإضافة، ابحث عن أيقونة "سبسطية" في شاشة هاتفك المسها لفتح التطبيق.
        </p>

        <a href="/admin" className="pwa-admin-link">لوحة الإدارة</a>
      </div>
    </div>
  );
}

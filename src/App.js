import React, { useEffect, useState } from "react";
import axios from "axios";
import { FiArrowLeft, FiArrowRight } from "react-icons/fi";
import "./App.css";
import '@fortawesome/fontawesome-free/css/all.min.css';
import { initializeApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';
import SHA512 from 'crypto-js/sha512';
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import Slider from "react-slick";

// ================ STYLES AND FONTS ================
// Add Google Fonts for consistent typography
const fontLink = document.createElement('link');
fontLink.href = 'https://fonts.googleapis.com/css2?family=Marcellus&family=DM+Sans:wght@400;500;700&display=swap';
fontLink.rel = 'stylesheet';
document.head.appendChild(fontLink);

// ================ CUSTOM COMPONENTS ================
// Custom arrow components for the carousel
const PrevArrow = ({ className, style, onClick }) => {
  return (
    <button
      className="custom-arrow prev-arrow"
      style={{ ...style }}
      onClick={onClick}
      aria-label="Previous"
    >
      <FiArrowLeft size={24} />
    </button>
  );
};

const NextArrow = ({ className, style, onClick }) => {
  return (
    <button
      className="custom-arrow next-arrow"
      style={{ ...style }}
      onClick={onClick}
      aria-label="Next"
    >
      <FiArrowRight size={24} />
    </button>
  );
};

// ================ FIREBASE CONFIGURATION ================
// Firebase configuration for authentication and analytics
const firebaseConfig = {
  apiKey: "AIzaSyC14KBARTHpl2H63sFT9y9fBKBV9lA8fvM",
  authDomain: "ode-spa-webapp.firebaseapp.com",
  projectId: "ode-spa-webapp",
  storageBucket: "ode-spa-webapp.firebasestorage.app",
  messagingSenderId: "758935829641",
  appId: "1:758935829641:web:fd73be8e6c576e1a939a58",
  measurementId: "G-TC6MK1Y6FV"
};

// Initialize Firebase services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const analytics = getAnalytics(app);

// ================ RECAPTCHA SETUP ================
/**
 * Sets up reCAPTCHA verification for phone authentication
 * Creates an invisible reCAPTCHA verifier instance
 */
const setupRecaptcha = () => {
  window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
    'size': 'invisible',
    'callback': (response) => {
      console.log('reCAPTCHA verified');
    },
    'expired-callback': () => {
      console.log('reCAPTCHA expired');
    }
  });
};

// ================ MAIN APP COMPONENT ================
const App = () => {
  // ================ STATE MANAGEMENT ================
  // UI State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  // Authentication State
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [otpVerified, setOtpVerified] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [otpError, setOtpError] = useState('');

  // Guest Information State
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestInfo, setGuestInfo] = useState(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState(null);
  const [guestId, setGuestId] = useState(null);

  // Membership and Payment State
  const [membershipId, setMembershipId] = useState(null);
  const [invoiceId, setInvoiceId] = useState(null);
  const [paymentResult, setPaymentResult] = useState(null);
  const [memberships, setMemberships] = useState([]);

  // Loading States
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isCreatingGuest, setIsCreatingGuest] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isTakingMembership, setIsTakingMembership] = useState({});

  // ================ CAROUSEL SETTINGS ================
  const settings = {
    dots: false,
    infinite: true,
    speed: 600,
    cssEase: "ease-in-out",
    autoplay: true,
    autoplaySpeed: 4000,
    slidesToShow: 3, // Default: Large screens
    slidesToScroll: 1,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1,
        },
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
    ],
    prevArrow: <PrevArrow />,
    nextArrow: <NextArrow />
  };
  

  // ================ EFFECTS ================
  // Initialize reCAPTCHA on component mount
  useEffect(() => {
    setupRecaptcha();
  }, []);
  useEffect(() => {
    if (memberships.length > 0) {
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 500);
    }
  }, [memberships]);
  
  // Fetch membership data from API
  useEffect(() => {
    const fetchMemberships = async () => {
      try {
        const response = await axios.get(
          "https://api.zenoti.com/v1/centers/center_id/memberships?center_id=92d41019-c790-4668-9158-a693e531c1a4&show_in_catalog=true&expand=Null",
          {
            headers: {
              accept: "application/json",
              Authorization:`apikey ${process.env.REACT_APP_ZENOTI_API_KEY}`
                
            },
          }
        );
        const data = response.data.memberships || [];
        const sortedData = data.sort((a, b) => (a.price?.sales || 0) - (b.price?.sales || 0));
        const enrichedData = sortedData.map((item) => {
          const price = item.price?.sales;
        
          switch (price) {
            case 15000:
              return {
                ...item,
                validity_in_months: 6,
                discount_percentage: 35
              };
            case 25000:
              return {
                ...item,
                validity_in_months: 12,
                discount_percentage: 50
              };
            case 35000:
              return {
                ...item,
                validity_in_months: 18,
                discount_percentage: 50
              };
            case 50000:
              return {
                ...item,
                validity_in_months: 24,
                discount_percentage: 50
              };
            case 65000:
              return {
                ...item,
                validity_in_months: 36,
                discount_percentage: 50
              };
            case 100000:
              return {
                ...item,
                validity_in_months: 42,
                discount_percentage: 50
              };
            default:
              return item;
          }
        });
        
        setMemberships(enrichedData);
        setError('');
        setRetryCount(0);
      } catch (err) {
        console.error("Error fetching memberships:", err);
        if (err.response?.status === 429 && retryCount < 3) {
          setRetryCount((prev) => prev + 1);
          setTimeout(fetchMemberships, 2000 * (retryCount + 1));
        } else {
          setError("Failed to fetch memberships. Please try again later.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMemberships();
  }, [retryCount]);

  // Load persisted data from localStorage
  useEffect(() => {
    const storedGuestInfo = localStorage.getItem('guestInfo');
    const storedShowOTPModal = localStorage.getItem('showOTPModal');
    if (storedGuestInfo) {
      setGuestInfo(JSON.parse(storedGuestInfo));
    }
    if (storedShowOTPModal === 'true') {
      setShowOTPModal(true);
    }
  }, []);

  // Persist data to localStorage
  useEffect(() => {
    if (guestInfo) {
      localStorage.setItem('guestInfo', JSON.stringify(guestInfo));
    } else {
      localStorage.removeItem('guestInfo');
    }
    localStorage.setItem('showOTPModal', showOTPModal ? 'true' : 'false');
  }, [guestInfo, showOTPModal]);

  // Handle payment result from URL parameters
  useEffect(() => {
    const handlePaymentResult = async () => {
      const queryParams = new URLSearchParams(window.location.search);
      const status = queryParams.get("status");
      const error_message = queryParams.get("error_message");
      const sisinvoiceid = queryParams.get("sisinvoiceid");
      const productinfo = queryParams.get("productinfo");
      const amount = queryParams.get("amount");

      if (status) {
        setPaymentResult({
          status,
          error_message,
          sisinvoiceid,
          productinfo,
          amount,
          invoiceStatus: sisinvoiceid === 'true' ? 'closed' : 'pending'
        });
        setShowOTPModal(false);
      }
    };

    handlePaymentResult();
  }, []);

  // ================ EVENT HANDLERS ================
  /**
   * Handles membership selection and initiates the purchase flow
   * @param {Object} membership - The selected membership object
   */
  const handleSelect = (membership) => {
    if (isTakingMembership[membership.id]) return;
    
    setIsTakingMembership(prev => ({ ...prev, [membership.id]: true }));
    setSelectedIndex(memberships.indexOf(membership));
    setShowOTPModal(true);
    setStep(1);
    setPhone('');
    setOtp('');
    setOtpVerified(false);
    setShowGuestForm(false);
    setGuestInfo(null);
    setMembershipId(membership.id);
    
    setTimeout(() => {
      setIsTakingMembership(prev => ({ ...prev, [membership.id]: false }));
    }, 1000);
  };

  /**
   * Validates phone number format
   * @param {string} number - Phone number to validate
   * @returns {boolean} - Whether the phone number is valid
   */
  const validatePhoneNumber = (number) => {
    if (!number) {
      setPhoneError('Phone number is required');
      return false;
    }
    if (!/^\d+$/.test(number)) {
      setPhoneError('Phone number should contain only digits');
      return false;
    }
    if (number.length !== 10) {
      setPhoneError('Phone number should be 10 digits');
      return false;
    }
    setPhoneError('');
    return true;
  };

  /**
   * Handles phone number input changes
   * @param {Event} e - Input change event
   */
  const handlePhoneChange = (e) => {
    const value = e.target.value;
    if (value.length <= 10) {
      setPhone(value);
      if (phoneError) {
        setPhoneError('');
      }
    }
  };

  /**
   * Sends OTP to the provided phone number
   */
  const sendOtp = async () => {
    if (!validatePhoneNumber(phone)) {
      return;
    }
    try {
      setIsSendingOtp(true);
      setOtpError('');
      if (!window.recaptchaVerifier) {
        setupRecaptcha();
      }

      const formattedPhone = '+91' + phone;
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, window.recaptchaVerifier);
      setConfirmationResult(confirmation);
      setStep(2);
    } catch (err) {
      console.error("Error in OTP sending", err);
      let errorMessage = 'Failed to send OTP. Please try again.';
      
      if (err.code === 'auth/captcha-check-failed') {
        errorMessage = 'Verification failed. Please try again.';
        window.recaptchaVerifier = null;
        setupRecaptcha();
      } else if (err.code === 'auth/invalid-phone-number') {
        errorMessage = 'Invalid phone number format. Please check and try again.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Too many attempts. Please try again later.';
      }
      
      setOtpError(errorMessage);
    } finally {
      setIsSendingOtp(false);
    }
  };

  /**
   * Verifies the entered OTP
   */
  const verifyOtp = async () => {
    try {
      setIsVerifyingOtp(true);
      await confirmationResult.confirm(otp);
      setOtpVerified(true);
      const response = await axios.get(
        `https://api.zenoti.com/v1/guests/search?phone=${phone}`,
        {
          headers: {
            Authorization: 'apikey 061fb3b3f6974acc828ced31bef595cca3f57e5bc194496785492e2b70362283',
            accept: 'application/json',
          },
        }
      );
      const guests = response.data.guests;
      if (guests.length > 0) {
        setGuestId(guests[0].id);
        createInvoice(guests[0].id);
      } else {
        setShowGuestForm(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  /**
   * Generates hash for payment verification
   * @param {Object} paymentData - Payment data object
   * @param {string} salt - Salt for hash generation
   * @returns {string} - Generated hash
   */
  const generateHash = (paymentData, salt) => {
    const { key, txnid, amount, productinfo, firstname, email, phone, udf1 = '', udf2 = '', udf3 = '', udf4 = '', udf5 = '' } = paymentData;
    const hashString = `${key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}||||||${salt}`;
    return SHA512(hashString).toString();
  };

  /**
   * Initiates payment process
   * @param {Object} guestDetails - Guest details for payment
   */
  const fetchPayment = (guestDetails) => {
    setIsProcessingPayment(true);
    const paymentData = {
      key: process.env.REACT_APP_PAYU_KEY,
      txnid: invoiceId,
      amount: guestDetails.price,
      productinfo: guestDetails.membership,
      firstname: guestDetails.firstName,
      email: '',
      phone: phone,
      udf1: '', udf2: '', udf3: '', udf4: '', udf5: '',
      salt: process.env.REACT_APP_PAYU_SALT,
      surl: "https://odespa-backend1.onrender.com/api/payu/success",
      furl: "https://odespa-backend1.onrender.com/api/payu/failure",
    };

    const hash = generateHash(paymentData, paymentData.salt);
    paymentData.hash = hash;

    const form = document.createElement('form');
    form.action = 'https://secure.payu.in/_payment';
    form.method = 'POST';

    for (const key in paymentData) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = paymentData[key];
      form.appendChild(input);
    }

    document.body.appendChild(form);
    form.submit();
  };

  /**
   * Fetches guest ID from API
   */
  const fetchGuestId = async () => {
    try {
      const response = await axios.get(
        `https://api.zenoti.com/v1/guests/search?phone=${phone}`,
        {
          headers: {
            Authorization: 'apikey 061fb3b3f6974acc828ced31bef595cca3f57e5bc194496785492e2b70362283',
            accept: 'application/json',
          },
        }
      );
      const guests = response.data.guests;
      if (guests.length > 0) {
        setGuestId(guests[0].id);
        createInvoice(guests[0].id);
      } else {
        setShowGuestForm(true);
      }
    } catch (err) {
      console.error('Error searching guest:', err);
    }
  };

  /**
   * Creates a new guest account
   */
  const createGuest = async () => {
    try {
      setIsCreatingGuest(true);
      const payload = {
        center_id: "92d41019-c790-4668-9158-a693e531c1a4",
        personal_info: {
          first_name: firstName,
          last_name: lastName,
          mobile_phone: {
            country_code: 95,
            number: phone
          },
          gender: gender === 1 ? 1 : 0
        }
      };
      const response = await axios.post(
        'https://api.zenoti.com/v1/guests',
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'apikey 061fb3b3f6974acc828ced31bef595cca3f57e5bc194496785492e2b70362283',
          }
        }
      );
      setGuestInfo(response.data);
      setGuestId(response.data.id);
      createInvoice(response.data.id);
    } catch (err) {
      console.error('Error creating guest:', err);
    } finally {
      setIsCreatingGuest(false);
    }
  };

  /**
   * Creates an invoice for the selected membership
   * @param {string} guestId - ID of the guest
   */
  const createInvoice = async (guestId) => {
    try {
      if (!membershipId) {
        throw new Error('No membership selected');
      }

      const payload = {
        center_id: "92d41019-c790-4668-9158-a693e531c1a4",
        membership_ids: membershipId,
        user_id: guestId,
      };

      const response = await fetch('https://api.zenoti.com/v1/invoices/memberships', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'apikey 061fb3b3f6974acc828ced31bef595cca3f57e5bc194496785492e2b70362283',
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 429) {
        throw new Error('RATE_LIMIT');
      }

      const data = await response.json();

      if (data.success) {
        setInvoiceId(data.invoice_id);
        console.log('Invoice created with ID:', data.invoice_id);
        fetchInvoiceDetails(data.invoice_id);
      } else {
        throw new Error(data.error?.message || 'Failed to create invoice');
      }
    } catch (err) {
      console.error('Error creating invoice:', err);
    }
  };

  /**
   * Fetches invoice details from API
   * @param {string} invoiceId - ID of the invoice
   */
  const fetchInvoiceDetails = async (invoiceId) => {
    try {
      const url = `https://api.zenoti.com/v1/invoices/${invoiceId}?expand=InvoiceItems&expand=Transactions`;
      const options = {
        method: 'GET',
        headers: {
          accept: 'application/json',
          Authorization: 'apikey 061fb3b3f6974acc828ced31bef595cca3f57e5bc194496785492e2b70362283'
        }
      };

      const response = await fetch(url, options);
      const data = await response.json();
      if (data.invoice && data.invoice.guest) {
        setGuestInfo({
          firstName: data.invoice.guest.first_name,
          lastName: data.invoice.guest.last_name,
          phone: data.invoice.guest.mobile_phone,
          membership: data.invoice.invoice_items[0].name,
          netPrice: data.invoice.invoice_items[0].price.sales,
          tax: data.invoice.invoice_items[0].price.tax,
          price: data.invoice.invoice_items[0].price.final,
        });
        setShowOTPModal(true);
      }
    } catch (err) {
      console.error('Error fetching invoice details:', err);
    }
  };

  // ================ UTILITY FUNCTIONS ================
  /**
   * Closes the OTP modal and clears guest info
   */
  const handleCloseModal = () => {
    setShowOTPModal(false);
    setGuestInfo(null);
    localStorage.removeItem('guestInfo');
    localStorage.setItem('showOTPModal', 'false');
  };

  /**
   * Closes the payment result modal and clears URL parameters
   */
  const handleClosePaymentResult = () => {
    setPaymentResult(null);
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  /**
   * Capitalizes the first letter of a string
   * @param {string} message - String to capitalize
   * @returns {string} - Capitalized string
   */
  const capitalizeFirstLetter = (message) => {
    if (!message) return "";
    return message.charAt(0).toUpperCase() + message.slice(1).toLowerCase();
  };

  /**
   * Handles keyboard events for form submission
   * @param {Event} e - Keyboard event
   * @param {Function} action - Action to perform on Enter key
   */
  const handleKeyPress = (e, action) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      action();
    }
  };

  // ================ RENDER ================
  return (
    <div className="membership-section">
      <h1 className="heading" style={{ fontFamily: 'Marcellus, serif', color: "#555555" }}>
        Your Perfect Package Ode Spa Membership
      </h1>

      {loading ? (
        <div className="center-spinner">
          <div className="lds-spinner">
            {Array.from({ length: 12 }).map((_, i) => <div key={i}></div>)}
          </div>
        </div>
      ) : error ? (
        <p>{error}</p>
      ) : (
        <div className="carousel-container">
          <Slider {...settings}>
            {memberships.map((m) => (
              <div 
                className="service-style3 membership-type" 
                key={m.id}
                style={{
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  margin: '0 16px',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
                onClick={() => handleSelect(m)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div>
                  <h2 style={{ 
                    fontFamily: 'Marcellus, serif',
                    color: "#555555",
                    transition: 'all 0.3s ease',
                    margin: 0
                  }}>INR {m.price?.sales?.toLocaleString()}</h2>
                </div>
                <div>
                  <p style={{ 
                    fontFamily: 'DM Sans, sans-serif',
                    transition: 'all 0.3s ease',
                    marginBottom: m.price?.sales === 15000 ? '0.5rem' : '1.5rem'
                  }}>
                    {m.price?.sales === 15000 ? (
                      <>
                        Peak Time Discount - 20%<br />
                        Non-Peak Time Discount - 35%<br />
                        Validity - {m.validity_in_months || 6} months
                      </>
                    ) : (
                      <>
                        Discount on services - {m.discount_percentage || 50}%<br className="d-xs-none d-lg-block" />
                        Validity - {m.validity_in_months || 12} months
                      </>
                    )}
                  </p>
                </div>
                <div>
                  <button 
                    className="select-location" 
                    style={{ 
                      fontFamily: 'DM Sans, sans-serif',
                      transition: 'all 0.3s ease',
                      position: 'relative',
                      overflow: 'hidden',
                      color: '#555555',
                      marginTop: 'auto'
                    }} 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(m);
                    }}
                    disabled={isTakingMembership[m.id]}
                  >
                    {isTakingMembership[m.id] ? (
                      <div className="button-spinner"></div>
                    ) : (
                      'Take Membership'
                    )}
                  </button>
                </div>
              </div>
            ))}
          </Slider>
        </div>
      )}

      {/* Payment Result Modal */}
      {paymentResult && (
        <div className="modern-modal modern-payment-result-bg">
          <div className="modern-modal-card modern-payment-result-card animate-modal-in" style={{maxWidth: 400, padding: '2.5rem 2rem 2rem 2rem', textAlign: 'center', position: 'relative', background: 'rgba(255,255,255,0.75)', boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.18)', backdropFilter: 'blur(12px)', borderRadius: '22px', border: '1.5px solid rgba(255,255,255,0.25)'}}>
            <span
              className="modern-modal-close"
              onClick={handleClosePaymentResult}
              style={{position: 'absolute', top: 18, right: 18, fontSize: 24, color: '#ff4d4f', cursor: 'pointer'}}
              title="Close"
            >&#10006;</span>
            
            {paymentResult.status === 'success' ? (
              <>
                <h2 style={{
                  fontSize: '2rem',
                  fontWeight: 700,
                  color: '#4BB543',
                  marginBottom: '1.2rem',
                  letterSpacing: '0.01em',
                }}>Payment Successful</h2>
                <div style={{margin: '1.2rem 0', fontSize: '1.1rem'}}>
                  <div style={{
                    padding: '1rem',
                    background: '#f8f9fa',
                    borderRadius: '8px',
                    marginBottom: '1rem'
                  }}>
                    <div><strong>Payment Status:</strong> Successful</div>
                    <div><strong>Invoice Status:</strong> {paymentResult.invoiceStatus === 'closed' ? 'Closed' : 'Pending'}</div>
                    {paymentResult.sisinvoiceid === 'true' && (
                      <>
                        <div><strong>Product:</strong> {paymentResult.productinfo}</div>
                        <div><strong>Amount:</strong> ₹{paymentResult.amount}</div>
                      </>
                    )}
                  </div>
                  {paymentResult.invoiceStatus === 'closed' ? (
                    <div style={{color: '#4BB543'}}>
                      Your membership has been activated successfully!
                    </div>
                  ) : (
                    <div style={{color: '#ff9800'}}>
                      Your invoice is still open. Please contact support if this persists.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  marginBottom: '1.5rem',
                }}>
                  <div style={{
                    background: 'rgba(255, 77, 79, 0.12)',
                    borderRadius: '50%',
                    width: 70,
                    height: 70,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 18,
                    boxShadow: '0 2px 12px 0 rgba(255,77,79,0.10)'
                  }}>
                    <svg width="38" height="38" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="19" cy="19" r="19" fill="#ff4d4f" fillOpacity="0.18"/>
                      <path d="M13.5 13.5L24.5 24.5M24.5 13.5L13.5 24.5" stroke="#ff4d4f" strokeWidth="2.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <h2 style={{
                    fontSize: '2rem',
                    fontWeight: 700,
                    color: '#ff4d4f',
                    marginBottom: '0.7rem',
                    letterSpacing: '0.01em',
                    fontFamily: 'Marcellus, serif',
                  }}>Payment Failed</h2>
                </div>
                {paymentResult.error_message && (
                  <div style={{
                    color: '#ff4d4f',
                    background: 'rgba(255,77,79,0.08)',
                    borderRadius: 12,
                    padding: '1rem 1.2rem',
                    margin: '0 0 1.2rem 0',
                    fontSize: '1.08rem',
                    fontWeight: 500,
                    boxShadow: '0 1px 6px 0 rgba(255,77,79,0.07)',
                    fontFamily: 'DM Sans, sans-serif',
                  }}>{capitalizeFirstLetter(paymentResult.error_message)}</div>
                )}
                <div style={{color: '#b69348', fontSize: '1rem', marginTop: 8, fontFamily: 'DM Sans, sans-serif'}}>
                  If you need help, please contact our support team.
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* User Details/OTP Modal */}
      {showOTPModal && guestInfo && (
        <div className="modern-modal">
          <div className="modern-modal-card animate-modal-in">
            <div className="modern-modal-header">
              <h2 style={{ fontFamily: 'Marcellus, serif', color: "#555555" }}>User Details</h2>
              <span className="modern-modal-close" onClick={handleCloseModal}>&#10006;</span>
            </div>
            <div className="modern-modal-details" style={{ fontFamily: 'DM Sans, sans-serif' }}>
              <div className="modern-modal-row"><span>Name:</span> <strong>{guestInfo?.firstName} {guestInfo?.lastName}</strong></div>
              <div className="modern-modal-row"><span>Phone:</span> <strong>{guestInfo?.phone?.includes('+91') ? guestInfo.phone.replace('+91', '').trim() : guestInfo?.phone}</strong></div>
              <div className="modern-modal-row"><span>Selected Membership:</span> <strong>{guestInfo?.membership}</strong></div>
              <div className="modern-modal-row"><span>Price:</span> <strong>₹{guestInfo?.netPrice?.toLocaleString()}</strong></div>
              <div className="modern-modal-row"><span>GST:</span> <strong>₹{guestInfo?.tax?.toLocaleString()}</strong></div>
              <div className="modern-modal-row"><span>Total Amount:</span> <strong>₹{guestInfo?.price?.toLocaleString()}</strong></div>
            </div>
            <button 
              className="modern-modal-confirm" 
              onClick={() => fetchPayment(guestInfo)}
              disabled={isProcessingPayment}
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              {isProcessingPayment ? (
                <div className="button-spinner"></div>
              ) : (
                'Confirm'
              )}
            </button>
          </div>
        </div>
      )}

      {/* OTP Verification Modal */}
      {showOTPModal && !guestInfo && (step === 1 || (step === 2 && !otpVerified) || (otpVerified && showGuestForm && !guestInfo)) && (
        <div className="modern-modal">
          <div className="modern-modal-card animate-modal-in">
            {step === 1 && (
              <>
                <div className="modern-modal-header" style={{ fontFamily: 'Marcellus, serif', color: '#555555' }}>
                  <h2>Enter Mobile Number</h2>
                  <span className="modern-modal-close" onClick={handleCloseModal}>&#10006;</span>
                </div>
                <div className="modern-modal-details" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <input
                      type="tel"
                      className="modern-modal-input"
                      placeholder="eg: 9876543210"
                      value={phone}
                      onChange={handlePhoneChange}
                      onKeyPress={(e) => handleKeyPress(e, sendOtp)}
                      maxLength={10}
                      style={{
                        marginBottom: phoneError ? '0.5rem' : '1.2rem',
                        borderColor: phoneError ? '#ff4d4f' : '#d9d9d9'
                      }} 
                    />
                    {phoneError && (
                      <div style={{
                        color: '#ff4d4f',
                        fontSize: '0.875rem',
                        marginBottom: '1.2rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <i className="fas fa-exclamation-circle"></i>
                        {phoneError}
                      </div>
                    )}
                    {otpError && (
                      <div style={{
                        backgroundColor: '#fff2f0',
                        border: '1px solid #ffccc7',
                        borderRadius: '6px',
                        padding: '12px 16px',
                        marginBottom: '1.2rem',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px'
                      }}>
                        <i className="fas fa-exclamation-circle" style={{
                          color: '#ff4d4f',
                          fontSize: '16px',
                          marginTop: '2px'
                        }}></i>
                        <div style={{
                          color: '#ff4d4f',
                          fontSize: '0.875rem',
                          lineHeight: '1.5',
                          fontFamily: 'DM Sans, sans-serif'
                        }}>
                          {otpError}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <button 
                  className="modern-modal-confirm" 
                  onClick={sendOtp}
                  disabled={isSendingOtp}
                  style={{ 
                    fontFamily: 'DM Sans, sans-serif',
                    opacity: isSendingOtp ? 0.5 : 1,
                    cursor: isSendingOtp ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isSendingOtp ? (
                    <div className="button-spinner"></div>
                  ) : (
                    'Continue'
                  )}
                </button>
              </>
            )}
            {step === 2 && !otpVerified && (
              <>
                <div className="modern-modal-header">
                  <button className="modern-modal-back-icon-btn" onClick={() => setStep(1)} aria-label="Back" style={{margin: 0}}>
                    <FiArrowLeft className="arrow-icon-1" />
                  </button>
                  <h2 style={{textAlign: 'center', fontFamily: 'Marcellus, serif', color: '#555555'}}>OTP Verification</h2>
                  <span className="modern-modal-close" onClick={handleCloseModal}>&#10006;</span>
                </div>
                <div className="modern-modal-details">
                  <input
                    type="text"
                    className="modern-modal-input"
                    placeholder="Enter OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    onKeyPress={(e) => handleKeyPress(e, () => otp.length === 6 && !isVerifyingOtp && verifyOtp())}
                    maxLength={6}
                    style={{marginBottom: '1.2rem'}} 
                  />
                </div>
                <button 
                  className="modern-modal-confirm" 
                  onClick={verifyOtp} 
                  disabled={otp.length !== 6 || isVerifyingOtp}
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                >
                  {isVerifyingOtp ? (
                    <div className="button-spinner"></div>
                  ) : (
                    'Continue'
                  )}
                </button>
              </>
            )}
            {otpVerified && showGuestForm && !guestInfo && (
              <>
                <div className="modern-modal-header" style={{ fontFamily: 'Marcellus, serif', color: '#555555' }}>
                  <h2>Create Account</h2>
                  <span className="modern-modal-close" onClick={handleCloseModal}>&#10006;</span>
                </div>
                <div className="modern-modal-details" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  <input
                    className="modern-modal-input"
                    placeholder="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    onKeyPress={(e) => handleKeyPress(e, () => firstName && lastName && gender && createGuest())} 
                  />
                  <input
                    className="modern-modal-input"
                    placeholder="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    onKeyPress={(e) => handleKeyPress(e, () => firstName && lastName && gender && createGuest())} 
                  />
                  <div style={{marginBottom: '1.2rem'}}>
                    <label style={{marginRight: '1.5rem'}}>
                      <input
                        type="radio"
                        name="gender"
                        value={1}
                        checked={gender === 1}
                        onChange={() => setGender(1)} /> Male
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="gender"
                        value={2}
                        checked={gender === 2}
                        onChange={() => setGender(2)} /> Female
                    </label>
                  </div>
                </div>
                <button 
                  className="modern-modal-confirm" 
                  onClick={createGuest}
                  disabled={isCreatingGuest}
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                >
                  {isCreatingGuest ? (
                    <div className="button-spinner"></div>
                  ) : (
                    'Submit'
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}
      <div id="recaptcha-container"></div>
    </div>
  );
};

export default App;
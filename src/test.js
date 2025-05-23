import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { FiArrowLeft, FiArrowRight } from "react-icons/fi";
import "./App.css";
import '@fortawesome/fontawesome-free/css/all.min.css';
import { initializeApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';
import SHA512 from 'crypto-js/sha512';

// Add Google Fonts import
const fontLink = document.createElement('link');
fontLink.href = 'https://fonts.googleapis.com/css2?family=Marcellus&family=DM+Sans:wght@400;500;700&display=swap';
fontLink.rel = 'stylesheet';
document.head.appendChild(fontLink);

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyC14KBARTHpl2H63sFT9y9fBKBV9lA8fvM",
  authDomain: "ode-spa-webapp.firebaseapp.com",
  projectId: "ode-spa-webapp",
  storageBucket: "ode-spa-webapp.firebasestorage.app",
  messagingSenderId: "758935829641",
  appId: "1:758935829641:web:fd73be8e6c576e1a939a58",
  measurementId: "G-TC6MK1Y6FV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const analytics = getAnalytics(app);

// Configure reCAPTCHA
const setupRecaptcha = () => {
  window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
    'size': 'invisible',
    'callback': (response) => {
      // reCAPTCHA solved, allow signInWithPhoneNumber.
      console.log('reCAPTCHA verified');
    },
    'expired-callback': () => {
      // Response expired. Ask user to solve reCAPTCHA again.
      console.log('reCAPTCHA expired');
    }
  });
};

const App = () => {
   //const carouselRef = useRef(null);
   const [currentIndex, setCurrentIndex] = useState(0);
   const [selectedIndex, setSelectedIndex] = useState(null);
   //const [isAutoScrolling, setIsAutoScrolling] = useState(true);
   //const [memberships, setMemberships] = useState([]);
   //const [loading, setLoading] = useState(true);
   //const [error, setError] = useState('');
   const [showOTPModal, setShowOTPModal] = useState(false);
   const [step, setStep] = useState(1);
   const [phone, setPhone] = useState('');
   const [otp, setOtp] = useState('');
   const [confirmationResult, setConfirmationResult] = useState(null);
   const [otpVerified, setOtpVerified] = useState(false);
   const [showGuestForm, setShowGuestForm] = useState(false);
   const [guestInfo, setGuestInfo] = useState(null);
   const [firstName, setFirstName] = useState('');
   const [lastName, setLastName] = useState('');
   const [gender, setGender] = useState(null);
   const [guestId, setGuestId] = useState(null);
   const [membershipId, setMembershipId] = useState(null);
   const [invoiceId, setInvoiceId] = useState(null);
  const [paymentResult, setPaymentResult] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [renderedCards, setRenderedCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isCreatingGuest, setIsCreatingGuest] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isTakingMembership, setIsTakingMembership] = useState({});
  const [phoneError, setPhoneError] = useState('');
  const [otpError, setOtpError] = useState('');
  const carouselRef = useRef(null);
  const scrollInterval = useRef(null);
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000;

   // Initialize reCAPTCHA when component mounts
   useEffect(() => {
    setupRecaptcha();
  }, []);

  useEffect(() => {
    const resetScroll = () => {
      if (carouselRef.current) {
        requestAnimationFrame(() => {
          carouselRef.current.scrollLeft = 0;
        });
      }
    };
  
    resetScroll();
    window.addEventListener('resize', resetScroll);
    window.addEventListener('load', resetScroll);
  
    return () => {
      window.removeEventListener('resize', resetScroll);
      window.removeEventListener('load', resetScroll);
    };
  }, []);
  

  // Fetch membership data
  useEffect(() => {
    const fetchMemberships = async () => {
      try {
        const response = await axios.get(
          "https://api.zenoti.com/v1/centers/center_id/memberships?center_id=92d41019-c790-4668-9158-a693e531c1a4&show_in_catalog=true&expand=Null",
          {
            headers: {
              accept: "application/json",
              Authorization:
                "apikey 061fb3b3f6974acc828ced31bef595cca3f57e5bc194496785492e2b70362283",
            },
          }
        );
        const data = response.data.memberships || [];
        // Sort memberships by price from low to high
        const sortedData = data.sort((a, b) => (a.price?.sales || 0) - (b.price?.sales || 0));
        setMemberships(sortedData);
        setRenderedCards([...sortedData]);
        setError('');
        setRetryCount(0);
        
        // Aggressive scroll reset after data load
        const resetScrollWithRetry = (attempts = 5) => {
          if (attempts <= 0) return;
          
          if (carouselRef.current) {
            // Force layout recalculation
            carouselRef.current.style.display = 'none';
            void carouselRef.current.offsetHeight; // Force reflow
            carouselRef.current.style.display = '';

            // Multiple scroll reset attempts
            carouselRef.current.scrollLeft = 0;
            carouselRef.current.scrollTo({
              left: 0,
              behavior: 'auto'
            });
          }
          
          // Try again after a short delay
          setTimeout(() => resetScrollWithRetry(attempts - 1), 100);
        };
        
        // Initial reset
        resetScrollWithRetry();

        // Additional reset after a longer delay
        setTimeout(() => {
          if (carouselRef.current) {
            carouselRef.current.scrollLeft = 0;
            carouselRef.current.scrollTo({
              left: 0,
              behavior: 'auto'
            });
          }
        }, 500);
      } catch (err) {
        console.error("Error fetching memberships:", err);
        if (err.response?.status === 429 && retryCount < MAX_RETRIES) {
          setRetryCount((prev) => prev + 1);
          setTimeout(fetchMemberships, RETRY_DELAY * (retryCount + 1));
        } else {
          setError("Failed to fetch memberships. Please try again later.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMemberships();
  }, [retryCount]);

  // Infinite scroll logic
  useEffect(() => {
    if (!renderedCards.length || !isAutoScrolling) return;

    const scrollSpeed = window.innerWidth <= 768 ? 0.5 : 1; // Slower scroll on mobile
    scrollInterval.current = setInterval(() => {
      if (!carouselRef.current) return;

      const container = carouselRef.current;
      const cardWidth = container.querySelector('.service-style3.membership-type')?.offsetWidth || 0;
      const gap = window.innerWidth <= 768 ? 18 : 32; // Smaller gap on mobile
      const scrollAmount = cardWidth + gap;

      // Smooth scrolling
      container.scrollLeft += scrollSpeed;

      // Check if we need to add more cards
      if (container.scrollLeft + container.clientWidth >= container.scrollWidth - scrollAmount) {
        setRenderedCards(prev => {
          // Only add new cards if we haven't already added them
          const lastCard = prev[prev.length - 1];
          const firstNewCard = memberships[0];
          if (lastCard?.id === firstNewCard?.id) return prev;
          return [...prev, ...memberships];
        });
      }
    }, 20);

    return () => clearInterval(scrollInterval.current);
  }, [renderedCards, memberships, isAutoScrolling]);

  const scrollCarousel = (direction) => {
    if (!carouselRef.current) return;
    
    const container = carouselRef.current;
    const cardWidth = container.querySelector('.service-style3.membership-type')?.offsetWidth || 0;
    const gap = window.innerWidth <= 768 ? 18 : 32; // Smaller gap on mobile
    const scrollAmount = cardWidth + gap;
    
    const currentScroll = container.scrollLeft;
    const targetScroll = direction === "left" 
      ? Math.max(0, currentScroll - scrollAmount)
      : currentScroll + scrollAmount;
    
    // Smooth scroll to target position
    container.scrollTo({
      left: targetScroll,
      behavior: 'smooth'
    });
    
    // Add more cards if needed
    if (direction === "right" && 
        container.scrollLeft + container.clientWidth >= container.scrollWidth - scrollAmount) {
      setRenderedCards(prev => {
        // Only add new cards if we haven't already added them
        const lastCard = prev[prev.length - 1];
        const firstNewCard = memberships[0];
        if (lastCard?.id === firstNewCard?.id) return prev;
        return [...prev, ...memberships];
      });
    }
  };

  const handleUserInteraction = () => {
    setIsAutoScrolling(false);
    setTimeout(() => setIsAutoScrolling(true), 5000); // resume after 5s
  };

  //   alert(`Selected membership: ${membership.name}`);
  // };
//everthing  is fine 
  const handleSelect = (membership) => {
    // Prevent multiple rapid clicks
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
    handleUserInteraction();
    
    // Reset the taking membership state after a delay
    setTimeout(() => {
      setIsTakingMembership(prev => ({ ...prev, [membership.id]: false }));
    }, 1000);
  };

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

  const handlePhoneChange = (e) => {
    const value = e.target.value;
    if (value.length <= 10) {
      setPhone(value);
      // Remove real-time validation
      if (phoneError) {
        setPhoneError('');
      }
    }
  };

  const sendOtp = async () => {
    if (!validatePhoneNumber(phone)) {
      return;
    }
    try {
      setIsSendingOtp(true);
      setOtpError(''); // Clear any previous errors
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


  const verifyOtp = async () => {
    try {
      setIsVerifyingOtp(true);
      await confirmationResult.confirm(otp);
      setOtpVerified(true);
      // After OTP verification, check if guest exists
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
      //alert('Incorrect OTP');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const generateHash = (paymentData, salt) => {
    const { key, txnid, amount, productinfo, firstname, email, phone, udf1 = '', udf2 = '', udf3 = '', udf4 = '', udf5 = '' } = paymentData;
    const hashString = `${key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}||||||${salt}`;
    return SHA512(hashString).toString();
  };


  const fetchPayment = (guestDetails) => {
    setIsProcessingPayment(true);
    const paymentData = {
      key: '26sF13CI',
      txnid: invoiceId, //'TXN' + Math.random().toString(36).substring(7),
      amount: guestDetails.price,
      productinfo: guestDetails.membership,
      firstname: guestDetails.firstName,
      email: '',
      phone: phone,
      udf1: '', udf2: '', udf3: '', udf4: '', udf5: '',
      salt: '0Rd0lVQEvO',
      surl: "https://odespa-backend1.onrender.com/api/payu/success",
      furl: "https://odespa-backend1.onrender.com/api/payu/failure",
    };


    const hash = generateHash(paymentData, paymentData.salt);
    paymentData.hash = hash;


    const form = document.createElement('form');
    form.action = 'https://secure.payu.in/_payment';
    form.method = 'POST';
    //form.target = '_blank';


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
      //alert('Guest is present');
      createInvoice(guests[0].id);
    } else {
      setShowGuestForm(true);
      //alert('You don\'t have an account. Please create one.');
    }
  } catch (err) {
    console.error('Error searching guest:', err);
    if (err.response?.status === 429) {
      //alert('Too many requests. Please try again in a few moments.');
    } else {
      //alert('Failed to search guest. Please try again.');
    }
  }
};

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
    //alert('Guest created successfully!');
    createInvoice(response.data.id);
  } catch (err) {
    console.error('Error creating guest:', err);
    if (err.response?.status === 429) {
      //alert('Too many requests. Please try again in a few moments.');
    } else {
      //alert('Guest creation failed. Please try again.');
    }
  } finally {
    setIsCreatingGuest(false);
  }
};

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
    if (err.message === 'RATE_LIMIT') {
      //alert('Too many requests. Please try again in a few moments.');
       console.log(err.message)
    } else if (err.message === 'No membership selected') {
      //alert('Please select a membership first.');
       console.log(err.message)
    } else {
      //alert('Invoice creation failed. Please try again.');
      console.log(err)
    }
  }
};

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
    console.log(data)
    if (data.invoice && data.invoice.guest) {
      setGuestInfo({
        firstName: data.invoice.guest.first_name,
        lastName: data.invoice.guest.last_name,
        phone: data.invoice.guest.mobile_phone,
        membership: data.invoice.invoice_items[0].name,
        netPrice:data.invoice.invoice_items[0].price.sales,
        tax:data.invoice.invoice_items[0].price.tax,
        price:data.invoice.invoice_items[0].price.final,
      });
      setShowOTPModal(true);
    }
  } catch (err) {
    console.error('Error fetching invoice details:', err);
  }
};

// Load guestInfo and showOTPModal from localStorage on mount
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

// Persist guestInfo and showOTPModal to localStorage when they change
useEffect(() => {
  if (guestInfo) {
    localStorage.setItem('guestInfo', JSON.stringify(guestInfo));
  } else {
    localStorage.removeItem('guestInfo');
  }
  localStorage.setItem('showOTPModal', showOTPModal ? 'true' : 'false');
}, [guestInfo, showOTPModal]);

// When cancel icon is clicked, close modal and clear guestInfo from localStorage
const handleCloseModal = () => {
  setShowOTPModal(false);
  setGuestInfo(null);
  localStorage.removeItem('guestInfo');
  localStorage.setItem('showOTPModal', 'false');
};

// Add payment result handling
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
      setShowOTPModal(false); // Hide OTP/User modal if pe
    }
  };

  handlePaymentResult();
}, []);

// Close payment result modal
const handleClosePaymentResult = () => {
  setPaymentResult(null);
  // Clear query params from URL
  window.history.replaceState({}, document.title, window.location.pathname);
};

// Utility function to capitalize only the first letter of the message
const capitalizeFirstLetter = (message) => {
  if (!message) return "";
  return message.charAt(0).toUpperCase() + message.slice(1).toLowerCase();
};

// Add keyboard event handler for Enter key
const handleKeyPress = (e, action) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    action();
  }
};

// Center the first card in the carousel on mobile view
useEffect(() => {
  if (!carouselRef.current || !renderedCards.length) return;

  const isMobile = window.innerWidth <= 768;
  if (!isMobile) return;

  const firstCard = carouselRef.current.querySelector('.service-style3.membership-type');
  if (!firstCard) return;

  const container = carouselRef.current;
  const cardWidth = firstCard.offsetWidth;
  const containerWidth = container.offsetWidth;
  const gap = 18; // gap for mobile

  // Center the first card
  const scrollTo = Math.max(0, (cardWidth + gap) / 2 - containerWidth / 2);
  
  // Use requestAnimationFrame for smoother initial positioning
  requestAnimationFrame(() => {
    container.scrollLeft = scrollTo;
  });
}, [renderedCards]);

// Handle window resize
useEffect(() => {
  const handleResize = () => {
    if (!carouselRef.current) return;
    
    // Reset scroll position on resize
    requestAnimationFrame(() => {
      carouselRef.current.scrollLeft = 0;
    });
  };

  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);

// Ensure all cards are rendered initially
useEffect(() => {
  if (memberships.length > 0) {
    setRenderedCards([...memberships]);
  }
}, [memberships]);

  return (
    <div className="membership-section">
      <h1 className="heading" style={{ fontFamily: 'Marcellus, serif' ,color:"#555555" }}>Your Perfect Package Ode Spa Membership</h1>

      {loading ? (
        <div className="center-spinner">
          <div className="lds-spinner">
            {Array.from({ length: 12 }).map((_, i) => <div key={i}></div>)}
          </div>
        </div>
      ) : error ? (
        <p>{error}</p>
      ) : (
        <div
          className="carousel-container"
          onMouseEnter={() => setIsAutoScrolling(false)}
          onMouseLeave={() => setIsAutoScrolling(true)}
        >
          <button className="arrow left" onClick={() => {
            scrollCarousel('left');
            handleUserInteraction();
          }}>
            <FiArrowLeft className="arrow-icon" />
          </button>

          <div
            className="carousel-wrapper"
            ref={carouselRef}
            onTouchStart={() => setIsAutoScrolling(false)}
            onTouchEnd={() => setTimeout(() => setIsAutoScrolling(true), 5000)}
          >
            {renderedCards.map((m, idx) => (
              <div 
                className="service-style3 membership-type" 
                key={`${m.id}-${idx}`}
                style={{
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onClick={() => handleSelect(m)}
                onTouchStart={(e) => {
                  // Only prevent default if it's a touch on the card itself, not the button
                  if (e.target === e.currentTarget) {
                    e.preventDefault();
                  }
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
                }}
                onTouchEnd={(e) => {
                  // Only prevent default if it's a touch on the card itself, not the button
                  if (e.target === e.currentTarget) {
                    e.preventDefault();
                  }
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
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
                    transition: 'all 0.3s ease'
                  }}>INR {m.price?.sales?.toLocaleString()}</h2>
                </div>
                <div>
                  <p style={{ 
                    fontFamily: 'DM Sans, sans-serif',
                    transition: 'all 0.3s ease'
                  }}>
                    Discount on services - {m.discount_percentage || 50}%<br className="d-xs-none d-lg-block" />
                    Validity - {m.validity_in_months || 12} months
                  </p>
                </div>
                <div>
                  <button 
                    className="select-location" 
                    style={{ 
                      fontFamily: 'DM Sans, sans-serif',
                      transition: 'all 0.3s ease',
                      position: 'relative',
                      overflow: 'hidden'
                    }} 
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent card click
                      handleSelect(m);
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation(); // Prevent card touch
                      e.currentTarget.style.transform = 'scale(1.02)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                    }}
                    onTouchEnd={(e) => {
                      e.stopPropagation(); // Prevent card touch
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
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
          </div>

          <button className="arrow right" onClick={() => {
            scrollCarousel('right');
            handleUserInteraction();
          }}>
            <FiArrowRight className="arrow-icon" />
          </button>
        </div>
      )}

       {/* Payment Result Modal */}
       {paymentResult && (
        <div className="modern-modal">
          <div className="modern-modal-card animate-modal-in" style={{maxWidth: 380, padding: '2.5rem 2rem 2rem 2rem', textAlign: 'center', position: 'relative'}}>
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
                <h2 style={{
                  fontSize: '2rem',
                  fontWeight: 700,
                  color: '#ff4d4f',
                  marginBottom: '1.2rem',
                  letterSpacing: '0.01em',
                }}>Payment Failed</h2>
                {paymentResult.error_message && (
                  <div style={{
                    color: '#ff4d4f',
                    background: '#fff0f0',
                    borderRadius: 8,
                    padding: '0.8rem 1rem',
                    margin: '1.2rem 0',
                    fontSize: '1.05rem',
                    fontWeight: 500,
                  }}>{capitalizeFirstLetter(paymentResult.error_message)}</div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* User Details/OTP Modal (unchanged) */}
      {showOTPModal && guestInfo && (
        <div className="modern-modal">
          <div className="modern-modal-card animate-modal-in">
            <div className="modern-modal-header">
              
              <h2 style={{ fontFamily: 'Marcellus, serif' ,color:"#555555" }}>User Details</h2>
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
      {showOTPModal && !guestInfo && (step === 1 || (step === 2 && !otpVerified) || (otpVerified && showGuestForm && !guestInfo)) && (
        <div className="modern-modal">
          <div className="modern-modal-card animate-modal-in">
            {step === 1 && (
              <>
                <div className="modern-modal-header" style={{ fontFamily: 'Marcellus, serif' ,color:'#555555' }}>
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
                <div className="modern-modal-header" >
                  <button className="modern-modal-back-icon-btn" onClick={() => setStep(1)} aria-label="Back" style={{margin: 0}}>
                  <FiArrowLeft className="arrow-icon-1" />
                  </button>
                  <h2 style={{textAlign: 'center',fontFamily: 'Marcellus, serif' ,color:'#555555'}}>OTP Verification</h2>
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
                    style={{marginBottom: '1.2rem'}} />
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
                <div className="modern-modal-header" style={{ fontFamily: 'Marcellus, serif' ,color:'#555555' }}>
                  <h2>Create Account</h2>
                  <span className="modern-modal-close" onClick={handleCloseModal}>&#10006;</span>
                </div>
                <div className="modern-modal-details" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  <input
                    className="modern-modal-input"
                    placeholder="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    onKeyPress={(e) => handleKeyPress(e, () => firstName && lastName && gender && createGuest())} />
                  <input
                    className="modern-modal-input"
                    placeholder="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    onKeyPress={(e) => handleKeyPress(e, () => firstName && lastName && gender && createGuest())} />
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
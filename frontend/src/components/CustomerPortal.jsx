import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  ShoppingCart,
  CheckCircle2,
  AlertCircle,
  Eye,
  Store,
  HelpCircle,
  Mic,
  MicOff,
  Plus,
  X
} from 'lucide-react';
import RevenueLogo from './RevenueLogo';
import RazorpayModal from './RazorpayModal';

// Rich Markdown & Visual Formatter for Chat Messages
function FormattedMessage({ text, sender }) {
  if (!text) return null;

  const lines = text.split('\n');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {lines.map((line, lIdx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={lIdx} style={{ height: '4px' }} />;

        const isBullet = trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('* ');
        const cleanContent = isBullet ? trimmed.replace(/^[•\-*]\s*/, '') : trimmed;

        // Split by **bold** tags
        const parts = cleanContent.split(/(\*\*.*?\*\*)/g);

        const renderedLine = parts.map((part, pIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            const boldText = part.slice(2, -2);
            return (
              <strong key={pIdx} style={{ color: sender === 'user' ? '#ffffff' : '#0f172a', fontWeight: 800 }}>
                {boldText}
              </strong>
            );
          }
          return part;
        });

        if (isBullet) {
          return (
            <div
              key={lIdx}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                padding: '5px 10px',
                borderRadius: '8px',
                background: sender === 'user' ? 'rgba(255,255,255,0.12)' : '#f1f5f9',
                marginTop: '2px'
              }}
            >
              <span style={{ color: sender === 'user' ? '#ffffff' : '#7c3aed', fontWeight: 800, fontSize: '0.9rem', lineHeight: '1.2' }}>•</span>
              <div style={{ flex: 1, lineHeight: 1.45, fontSize: '0.84rem' }}>{renderedLine}</div>
            </div>
          );
        }

        return (
          <div key={lIdx} style={{ lineHeight: 1.45, fontSize: '0.84rem' }}>
            {renderedLine}
          </div>
        );
      })}
    </div>
  );
}

export default function CustomerPortal({ currentUser, onCartUpdate, onAuditUpdate }) {
  const customerId = currentUser?.id || 'cust_demo_01';

  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [aiResponse, setAiResponse] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Multimodal State: Image Attachment
  const [attachedImage, setAttachedImage] = useState(null); // { file, dataUrl, name, size }

  // Multimodal State: Voice Recognition
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  // System Notification
  const [notification, setNotification] = useState(null);

  // Selected Product for Details Modal
  const [detailProduct, setDetailProduct] = useState(null);

  // Checkout Modal State
  const [checkoutOrder, setCheckoutOrder] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, isListening]);

  // Clean up speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore abort error
        }
      }
    };
  }, []);

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4500);
  };

  // ==========================================
  // 1. VOICE SHOPPING (WEB SPEECH API)
  // ==========================================
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      showNotification('Speech recognition is not supported in this browser. Please use Chrome/Edge or type your request.', 'error');
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-IN'; // Default to Indian English for rupee context & accents

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setIsListening(false);
        if (transcript && transcript.trim()) {
          // Send immediately with VOICE modality badge
          handleSendMessage({ customText: transcript, modality: 'VOICE' });
        }
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        console.warn('Speech recognition event error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          showNotification('Microphone access was denied. Please allow microphone permissions in browser settings.', 'error');
        } else if (event.error === 'no-speech') {
          showNotification("I couldn't hear that clearly. Please try speaking again or type your request.", 'error');
        } else {
          showNotification(`Speech recognition issue (${event.error}). Please try again or type.`, 'error');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start voice recognition:', err);
      setIsListening(false);
      showNotification('Could not initialize microphone. Please check permissions.', 'error');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore stop error
      }
    }
    setIsListening(false);
  };

  // ==========================================
  // 2. IMAGE ATTACHMENT HANDLERS
  // ==========================================
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showNotification('Please upload a valid image file (PNG, JPG, WEBP).', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showNotification('Image size should be under 10MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAttachedImage({
        file,
        dataUrl: reader.result,
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB'
      });
      // Clear input so user can re-select same file if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setAttachedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ==========================================
  // 3. MULTIMODAL MESSAGE DISPATCHER
  // ==========================================
  const handleSendMessage = async (options = {}) => {
    const query = (options.customText !== undefined ? options.customText : inputMessage).trim();
    const imageToSend = options.image !== undefined ? options.image : attachedImage;
    const modality = options.modality || (imageToSend ? (query ? 'MULTIMODAL' : 'IMAGE') : 'TEXT');

    if (!query && !imageToSend) {
      return;
    }

    const userMsg = {
      sender: 'user',
      text: query,
      image: imageToSend?.dataUrl || null,
      imageName: imageToSend?.name || null,
      modality: modality,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setAttachedImage(null);
    setIsLoading(true);
    setHasSearched(true);

    try {
      const res = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          image_data: imageToSend?.dataUrl || null,
          image_name: imageToSend?.name || null,
          customer_id: customerId,
          last_products: aiResponse?.compared_products || [],
          last_bundle: aiResponse?.bundle || null,
          last_selected_product_id: aiResponse?.primary_product?.id || null,
          modality: modality
        })
      });

      const data = await res.json();
      setIsLoading(false);
      setAiResponse(data);

      const aiMsg = {
        sender: 'ai',
        text: data.ai_message || data.message,
        visualAttributes: data.visual_attributes || null,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionType: data.action_type,
        primaryProduct: data.primary_product,
        bundle: data.bundle,
        modality: data.modality
      };
      setMessages(prev => [...prev, aiMsg]);

      if (data.cart_updated && onCartUpdate) {
        onCartUpdate();
        showNotification(data.ai_message.split('\n')[0].replace(/\*\*/g, ''));
      }

      if (onAuditUpdate) onAuditUpdate();

      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (err) {
      console.error(err);
      setIsLoading(false);
      showNotification('Could not connect to AI shopping assistant.', 'error');
    }
  };

  // ==========================================
  // 4. CART & CHECKOUT HANDLERS
  // ==========================================
  const handleAddToCart = async (product) => {
    if (!product) return;
    if (product.is_external || product.origin === 'EXTERNAL') {
      showNotification(`"${product.name}" is an Online Discovery item. Click "View Source" to purchase on the retailer site.`, 'error');
      return;
    }

    try {
      const res = await fetch('http://localhost:8000/api/cart/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customerId,
          product_id: product.id || product.product_id,
          quantity: 1
        })
      });

      if (res.ok) {
        showNotification(`Added "${product.name}" (${product.merchant_name || 'In-Store'}) to your cart!`);
        if (onCartUpdate) onCartUpdate();
        if (onAuditUpdate) onAuditUpdate();
      } else {
        const data = await res.json();
        showNotification(data.error || 'Failed to add item to cart', 'error');
      }
    } catch (err) {
      console.error(err);
      showNotification('Cart update failed', 'error');
    }
  };

  const handleAddBundleToCart = async (bundle) => {
    if (!bundle || !bundle.product_ids || bundle.product_ids.length === 0) {
      showNotification('No bundle products available to add.', 'error');
      return;
    }

    try {
      const res = await fetch('http://localhost:8000/api/cart/add-bundle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customerId,
          product_ids: bundle.product_ids
        })
      });

      if (res.ok) {
        showNotification(`✨ Added complete ${bundle.bundle_title || 'bundle'} (${bundle.items?.length || bundle.product_ids.length} items) to your cart for ₹${bundle.total_price?.toLocaleString('en-IN')}!`);
        if (onCartUpdate) onCartUpdate();
        if (onAuditUpdate) onAuditUpdate();
      } else {
        const data = await res.json();
        showNotification(data.error || 'Failed to add bundle to cart', 'error');
      }
    } catch (err) {
      console.error(err);
      showNotification('Bundle cart update failed', 'error');
    }
  };

  const handleBuyNow = async (product) => {
    if (!product) return;
    if (product.is_external || product.origin === 'EXTERNAL') {
      if (product.source_url) {
        window.open(product.source_url, '_blank', 'noopener,noreferrer');
      }
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch('http://localhost:8000/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: product.price,
          customer_id: customerId,
          items: [{ product_id: product.id || product.product_id, name: product.name, price: product.price, quantity: 1 }]
        })
      });
      const order = await res.json();
      setIsLoading(false);
      setCheckoutOrder(order);
    } catch (err) {
      console.error(err);
      setIsLoading(false);
      showNotification('Failed to initialize checkout', 'error');
    }
  };

  const examplePrompts = [
    { label: "Birthday Cake under ₹1,000", text: "Find me a chocolate birthday cake under ₹1,000" },
    { label: "Running Shoes under ₹4,000", text: "I need black running shoes under ₹4,000" },
    { label: "Gaming Laptop under ₹60,000", text: "gaming laptop under ₹60,000" },
    { label: "Cake + Party Setup", text: "I need a birthday cake for 10 people under ₹1,500" }
  ];

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1440px', margin: '0 auto', fontFamily: "'Inter', sans-serif" }} className="animate-fade-in">
      
      {/* REAL SYSTEM NOTIFICATION BANNER */}
      {notification && (
        <div style={{
          background: notification.type === 'error' ? '#fef2f2' : '#ecfdf5',
          border: `1px solid ${notification.type === 'error' ? '#fecaca' : '#a7f3d0'}`,
          borderRadius: '14px',
          padding: '12px 18px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: notification.type === 'error' ? '#991b1b' : '#065f46',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.04)'
        }} className="animate-fade-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {notification.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{notification.msg}</span>
          </div>
          <button onClick={() => setNotification(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: 'inherit', fontWeight: 700 }}>✕</button>
        </div>
      )}

      {/* HIDDEN FILE INPUT FOR IMAGE UPLOADS */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageSelect}
        accept="image/*"
        style={{ display: 'none' }}
      />

      {/* =======================================================
          1. INITIAL LANDING VIEW (BEFORE SEARCH)
          ======================================================= */}
      {!hasSearched ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '70vh',
          textAlign: 'center',
          padding: '40px 20px'
        }}>
          {/* Brand Logo & Header */}
          <div style={{ marginBottom: '16px' }}>
            <RevenueLogo size={74} />
          </div>

          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', marginBottom: '8px' }}>
            Multimodal AI Shopping Assistant
          </h1>
          <p style={{ fontSize: '1rem', color: '#64748b', maxWidth: '640px', lineHeight: 1.55, marginBottom: '28px' }}>
            Speak via microphone 🎙️, upload a product photo 🖼️, or type a request. We search live merchant stores and create budget-bounded baskets in real-time.
          </p>

          {/* ChatGPT-Style Centered Input Box */}
          <div style={{
            width: '100%',
            maxWidth: '760px',
            background: '#ffffff',
            borderRadius: '24px',
            padding: '12px 16px',
            boxShadow: '0 12px 40px rgba(15, 23, 42, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)',
            border: isListening ? '2px solid #ef4444' : '1.5px solid #e2e8f0',
            marginBottom: '24px',
            transition: 'all 0.25s ease'
          }}>
            {/* Image Preview Chip if attached */}
            {attachedImage && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#faf5ff',
                border: '1px solid #d8b4fe',
                padding: '6px 12px',
                borderRadius: '12px',
                marginBottom: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <img
                    src={attachedImage.dataUrl}
                    alt="Attached preview"
                    style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #c084fc' }}
                  />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>{attachedImage.name}</div>
                    <div style={{ fontSize: '0.68rem', color: '#7c3aed', fontWeight: 600 }}>Image Reference Attached ({attachedImage.size})</div>
                  </div>
                </div>
                <button
                  onClick={handleRemoveImage}
                  title="Remove image"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9333ea', padding: '4px' }}
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Live Listening Indicator */}
            {isListening && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                padding: '6px 12px',
                borderRadius: '10px',
                marginBottom: '8px',
                color: '#dc2626',
                fontSize: '0.8rem',
                fontWeight: 700
              }}>
                <span className="pulse-glow" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></span>
                Listening to your voice... Speak your request now (e.g. "I need black running shoes under ₹4,000")
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Attachment Button [ + ] */}
              <button
                onClick={() => fileInputRef.current?.click()}
                title="Upload product photo or screenshot"
                style={{
                  background: attachedImage ? '#f3e8ff' : '#f8fafc',
                  border: '1px solid #cbd5e1',
                  color: attachedImage ? '#7c3aed' : '#64748b',
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                <Plus size={18} />
              </button>

              {/* Microphone Button [ 🎤 ] */}
              <button
                onClick={isListening ? stopListening : startListening}
                title={isListening ? "Stop listening" : "Click to speak using microphone"}
                style={{
                  background: isListening ? '#fee2e2' : '#f8fafc',
                  border: isListening ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                  color: isListening ? '#dc2626' : '#64748b',
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                {isListening ? <MicOff size={18} color="#dc2626" /> : <Mic size={18} />}
              </button>

              {/* Text Input */}
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={attachedImage ? "Ask AI about this image (e.g. 'Find something like this under ₹3,000')..." : "Ask me what you're looking for..."}
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  fontSize: '0.98rem',
                  color: '#0f172a',
                  background: 'transparent',
                  padding: '4px 8px'
                }}
              />

              {/* Send Button */}
              <button
                onClick={() => handleSendMessage()}
                disabled={(!inputMessage.trim() && !attachedImage) || isLoading}
                style={{
                  background: (inputMessage.trim() || attachedImage) ? 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)' : '#e2e8f0',
                  color: (inputMessage.trim() || attachedImage) ? '#ffffff' : '#94a3b8',
                  border: 'none',
                  padding: '11px 22px',
                  borderRadius: '14px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: (inputMessage.trim() || attachedImage) ? 'pointer' : 'default',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: (inputMessage.trim() || attachedImage) ? '0 4px 14px rgba(124, 58, 237, 0.3)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                Send <Send size={14} />
              </button>
            </div>
          </div>

          {/* Example Prompts */}
          <div>
            <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
              Or Try A Multimodal Shopping Prompt:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', maxWidth: '840px' }}>
              {examplePrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage({ customText: p.text })}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    color: '#475569',
                    padding: '7px 14px',
                    borderRadius: '20px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#c084fc';
                    e.currentTarget.style.color = '#7c3aed';
                    e.currentTarget.style.background = '#faf5ff';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.color = '#475569';
                    e.currentTarget.style.background = '#ffffff';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  "{p.text}"
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        
        /* =======================================================
           2. ACTIVE CHAT & PRODUCT WORKSPACE
           ======================================================= */
        <div>
          {/* Main 2-Column Responsive Layout: Left Conversational Feed + Right Product Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '460px 1fr', gap: '24px', alignItems: 'start' }}>
            
            {/* Left Chat Transcript Column */}
            <div style={{
              background: '#ffffff',
              borderRadius: '24px',
              border: '1px solid #e2e8f0',
              height: 'calc(100vh - 120px)',
              minHeight: '640px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)',
              overflow: 'hidden'
            }}>
              {/* Chat Header */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', background: '#faf5ff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <RevenueLogo size={28} withGlow={false} />
                  <div>
                    <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>AI Shopping Assistant</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 700 }}>● Live Merchant Catalog</span>
                      <span style={{ fontSize: '0.68rem', color: '#7c3aed', fontWeight: 700 }}>● Multimodal Voice & Vision</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setMessages([]);
                    setAiResponse(null);
                    setHasSearched(false);
                    setAttachedImage(null);
                  }}
                  title="New Search"
                  style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '5px 10px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', cursor: 'pointer' }}
                >
                  New Chat
                </button>
              </div>

              {/* Messages Container (Scrollable) */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                      gap: '4px'
                    }}
                  >
                    {/* Timestamp & Modality Badge */}
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600, padding: '0 4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {msg.sender === 'user' ? 'You' : 'AI Assistant'}
                      {msg.modality === 'VOICE' && <span style={{ color: '#ef4444', fontWeight: 700 }}>🎙️ Spoken Voice</span>}
                      {msg.modality === 'IMAGE' && <span style={{ color: '#7c3aed', fontWeight: 700 }}>🖼️ Image Reference</span>}
                      {msg.modality === 'MULTIMODAL' && <span style={{ color: '#4f46e5', fontWeight: 700 }}>✨ Multimodal</span>}
                      • {msg.time}
                    </div>

                    <div
                      style={{
                        maxWidth: '92%',
                        background: msg.sender === 'user' ? 'linear-gradient(135deg, #7c3aed, #4f46e5)' : '#f8fafc',
                        color: msg.sender === 'user' ? '#ffffff' : '#1e293b',
                        border: msg.sender === 'user' ? 'none' : '1px solid #e2e8f0',
                        padding: '12px 16px',
                        borderRadius: msg.sender === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        boxShadow: msg.sender === 'user' ? '0 4px 12px rgba(124, 58, 237, 0.2)' : '0 2px 6px rgba(0, 0, 0, 0.02)'
                      }}
                    >
                      {/* Uploaded Image Preview inside Chat Bubble */}
                      {msg.image && (
                        <div style={{ marginBottom: msg.text ? '10px' : '0' }}>
                          <img
                            src={msg.image}
                            alt={msg.imageName || 'Uploaded product'}
                            style={{
                              maxWidth: '100%',
                              maxHeight: '180px',
                              borderRadius: '12px',
                              objectFit: 'cover',
                              border: '1.5px solid rgba(255, 255, 255, 0.4)'
                            }}
                          />
                          {msg.imageName && (
                            <div style={{ fontSize: '0.68rem', opacity: 0.9, marginTop: '2px', fontWeight: 600 }}>
                              📁 {msg.imageName}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Main Message Text */}
                      {msg.text && <FormattedMessage text={msg.text} sender={msg.sender} />}

                      {/* AI VISUAL ANALYSIS EXPLANATION CARD */}
                      {msg.visualAttributes && (
                        <div style={{
                          marginTop: '10px',
                          background: '#ffffff',
                          borderRadius: '12px',
                          border: '1px solid #e9d5ff',
                          padding: '10px 12px',
                          fontSize: '0.78rem'
                        }}>
                          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#7c3aed', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Sparkles size={12} /> Visual Attribute Understanding
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            <span style={{ background: '#f5f3ff', color: '#6d28d9', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '0.7rem' }}>
                              🏷️ {msg.visualAttributes.category}
                            </span>
                            <span style={{ background: '#ecfdf5', color: '#047857', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '0.7rem' }}>
                              🎨 {msg.visualAttributes.color}
                            </span>
                            <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '0.7rem' }}>
                              👟 {msg.visualAttributes.style}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* AI BASKET GROWTH / BUNDLE RECOMMENDATION CARD IN CHAT */}
                      {msg.bundle && msg.bundle.complementary_items && msg.bundle.complementary_items.length > 0 && (
                        <div style={{
                          marginTop: '12px',
                          background: '#ffffff',
                          borderRadius: '16px',
                          border: '1.5px solid #d8b4fe',
                          padding: '14px',
                          boxShadow: '0 4px 14px rgba(124, 58, 237, 0.08)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#7c3aed', background: '#faf5ff', padding: '3px 8px', borderRadius: '6px', border: '1px solid #e9d5ff', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Sparkles size={12} /> {msg.bundle.bundle_title || 'AI Basket Growth Bundle'}
                            </span>
                            {msg.bundle.budget_limit && (
                              <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 700 }}>
                                Budget: ₹{msg.bundle.budget_limit.toLocaleString('en-IN')}
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px', fontSize: '0.78rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a', fontWeight: 700 }}>
                              <span>🎂 {msg.bundle.main_product?.name} (Main)</span>
                              <span>₹{msg.bundle.main_product?.price?.toLocaleString('en-IN')}</span>
                            </div>
                            {msg.bundle.complementary_items.map((it, i) => (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                                <span>➕ {it.name}</span>
                                <span style={{ fontWeight: 600, color: '#0f172a' }}>₹{it.price?.toLocaleString('en-IN')}</span>
                              </div>
                            ))}
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '6px', marginTop: '2px', fontWeight: 800, color: '#7c3aed' }}>
                              <span>Total Bundle ({msg.bundle.items?.length || msg.bundle.product_ids?.length} items):</span>
                              <span>₹{msg.bundle.total_price?.toLocaleString('en-IN')}</span>
                            </div>
                            {msg.bundle.remaining_budget !== null && (
                              <div style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 600, textAlign: 'right' }}>
                                Remaining under budget: ₹{msg.bundle.remaining_budget.toLocaleString('en-IN')}
                              </div>
                            )}
                          </div>

                          {/* ACTION BUTTONS: DIRECT CART ADDITION (ZERO NEW SEARCH) */}
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => handleAddBundleToCart(msg.bundle)}
                              style={{
                                flex: 1,
                                minWidth: '150px',
                                background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                                color: '#ffffff',
                                border: 'none',
                                padding: '8px 12px',
                                borderRadius: '10px',
                                fontSize: '0.78rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                boxShadow: '0 3px 10px rgba(124, 58, 237, 0.25)'
                              }}
                            >
                              <Sparkles size={13} /> Add Complete Bundle (₹{msg.bundle.total_price?.toLocaleString('en-IN')})
                            </button>
                            <button
                              onClick={() => handleAddToCart(msg.bundle.main_product)}
                              style={{
                                background: '#f8fafc',
                                color: '#475569',
                                border: '1px solid #cbd5e1',
                                padding: '8px 12px',
                                borderRadius: '10px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              Just {msg.bundle.main_product?.name?.split(' ')[0] || 'Main'} (₹{msg.bundle.main_product?.price?.toLocaleString('en-IN')})
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Quick action button for comparison */}
                      {msg.primaryProduct && !msg.primaryProduct.is_external && msg.actionType === 'COMPARISON' && (
                        <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleAddToCart(msg.primaryProduct)}
                            style={{
                              background: '#7c3aed',
                              color: '#ffffff',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <ShoppingCart size={12} /> Add {msg.primaryProduct.name} (₹{msg.primaryProduct.price})
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#7c3aed', fontSize: '0.8rem', fontWeight: 600, padding: '8px' }}>
                    <Sparkles size={16} className="pulse-glow" /> AI Agent is analyzing multimodal query & merchant catalog...
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Reply Suggestion Chips */}
              <div style={{ padding: '8px 16px', background: '#faf5ff', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '6px', overflowX: 'auto' }}>
                <button
                  className="chip"
                  onClick={() => handleSendMessage({ customText: "Add the second one" })}
                  style={{ fontSize: '0.72rem', whiteSpace: 'nowrap', background: '#ffffff', border: '1px solid #e9d5ff', color: '#7c3aed', fontWeight: 700 }}
                >
                  🛒 Add the second one
                </button>
                <button
                  className="chip"
                  onClick={() => handleSendMessage({ customText: "Which one is best?" })}
                  style={{ fontSize: '0.72rem', whiteSpace: 'nowrap', background: '#ffffff', border: '1px solid #e9d5ff', color: '#7c3aed', fontWeight: 700 }}
                >
                  🤔 Which one is best?
                </button>
                <button
                  className="chip"
                  onClick={() => handleSendMessage({ customText: "Add complete bundle" })}
                  style={{ fontSize: '0.72rem', whiteSpace: 'nowrap', background: '#ffffff', border: '1px solid #e9d5ff', color: '#7c3aed', fontWeight: 700 }}
                >
                  ✨ Add complete bundle
                </button>
              </div>

              {/* PERMANENT ANCHORED CHAT INPUT BAR AT BOTTOM OF CHAT */}
              <div style={{ padding: '14px 16px', background: '#ffffff', borderTop: '1px solid #e2e8f0' }}>
                
                {/* Image Preview Chip if attached */}
                {attachedImage && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#faf5ff',
                    border: '1px solid #d8b4fe',
                    padding: '6px 12px',
                    borderRadius: '12px',
                    marginBottom: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <img
                        src={attachedImage.dataUrl}
                        alt="Attached preview"
                        style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #c084fc' }}
                      />
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0f172a' }}>{attachedImage.name}</div>
                        <div style={{ fontSize: '0.65rem', color: '#7c3aed', fontWeight: 600 }}>Image Reference Attached</div>
                      </div>
                    </div>
                    <button
                      onClick={handleRemoveImage}
                      title="Remove image"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9333ea', padding: '2px' }}
                    >
                      <X size={15} />
                    </button>
                  </div>
                )}

                {/* Live Listening Indicator */}
                {isListening && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    padding: '6px 10px',
                    borderRadius: '10px',
                    marginBottom: '8px',
                    color: '#dc2626',
                    fontSize: '0.75rem',
                    fontWeight: 700
                  }}>
                    <span className="pulse-glow" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></span>
                    Listening... Speak your request now
                  </div>
                )}

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#f8fafc',
                  borderRadius: '16px',
                  padding: '6px 8px 6px 10px',
                  border: isListening ? '1.5px solid #ef4444' : '1.5px solid #cbd5e1'
                }}>
                  {/* Attachment Button [ + ] */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    title="Upload product photo or screenshot"
                    style={{
                      background: attachedImage ? '#f3e8ff' : '#ffffff',
                      border: '1px solid #cbd5e1',
                      color: attachedImage ? '#7c3aed' : '#64748b',
                      width: '34px',
                      height: '34px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Plus size={16} />
                  </button>

                  {/* Microphone Button [ 🎤 ] */}
                  <button
                    onClick={isListening ? stopListening : startListening}
                    title={isListening ? "Stop listening" : "Click to speak"}
                    style={{
                      background: isListening ? '#fee2e2' : '#ffffff',
                      border: isListening ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                      color: isListening ? '#dc2626' : '#64748b',
                      width: '34px',
                      height: '34px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {isListening ? <MicOff size={16} color="#dc2626" /> : <Mic size={16} />}
                  </button>

                  {/* Input Field */}
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder={attachedImage ? "Ask about this photo (or send)..." : "Ask me what you're looking for..."}
                    style={{
                      flex: 1,
                      border: 'none',
                      outline: 'none',
                      fontSize: '0.88rem',
                      color: '#0f172a',
                      background: 'transparent',
                      padding: '4px'
                    }}
                  />

                  {/* Send Button */}
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={(!inputMessage.trim() && !attachedImage) || isLoading}
                    style={{
                      background: (inputMessage.trim() || attachedImage) ? 'linear-gradient(135deg, #7c3aed, #4f46e5)' : '#cbd5e1',
                      color: '#ffffff',
                      border: 'none',
                      padding: '9px 15px',
                      borderRadius: '12px',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: (inputMessage.trim() || attachedImage) ? 'pointer' : 'default',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Send size={13} />
                  </button>
                </div>
              </div>
            </div>

            {/* Right Product Cards Display Area */}
            <div style={{ height: 'calc(100vh - 120px)', overflowY: 'auto', paddingRight: '6px' }}>
              {isLoading && messages.length === 1 ? (
                <div style={{ background: '#ffffff', borderRadius: '24px', border: '1px solid #e2e8f0', padding: '54px', textAlign: 'center' }}>
                  <Sparkles size={36} color="#7c3aed" className="pulse-glow" style={{ margin: '0 auto 14px auto' }} />
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Searching Verified Merchant Catalogs...</h3>
                  <p style={{ fontSize: '0.825rem', color: '#64748b', marginTop: '6px' }}>
                    Matching visual attributes and natural language against live SQLite merchant inventory.
                  </p>
                </div>
              ) : aiResponse?.compared_products && aiResponse.compared_products.length > 0 ? (
                <div>
                  {/* AI Basket Growth Bundle Card (Top of Product Grid) */}
                  {aiResponse.bundle && aiResponse.bundle.complementary_items && aiResponse.bundle.complementary_items.length > 0 && (
                    <div style={{
                      background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
                      borderRadius: '20px',
                      border: '2px solid #c084fc',
                      padding: '18px 20px',
                      marginBottom: '20px',
                      boxShadow: '0 6px 20px rgba(124, 58, 237, 0.1)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ background: '#7c3aed', color: '#ffffff', padding: '4px 10px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Sparkles size={12} /> AI Basket Growth Recommendation
                          </span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                            {aiResponse.bundle.bundle_title || 'Complete Setup'}
                          </span>
                        </div>
                        {aiResponse.bundle.budget_limit && (
                          <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700, background: '#ecfdf5', padding: '4px 10px', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                            ✓ Within Budget (₹{aiResponse.bundle.budget_limit.toLocaleString('en-IN')})
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '14px' }}>
                        <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '12px', border: '1px solid #e9d5ff' }}>
                          <div style={{ fontSize: '0.68rem', color: '#7c3aed', fontWeight: 800 }}>PRIMARY ITEM</div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>{aiResponse.bundle.main_product?.name}</div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#059669' }}>₹{aiResponse.bundle.main_product?.price?.toLocaleString('en-IN')}</div>
                        </div>
                        {aiResponse.bundle.complementary_items.map((item, idx) => (
                          <div key={idx} style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '12px', border: '1px solid #e9d5ff' }}>
                            <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 800 }}>COMPLEMENTARY ADD-ON</div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>{item.name}</div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#059669' }}>₹{item.price?.toLocaleString('en-IN')}</div>
                          </div>
                        ))}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', paddingTop: '10px', borderTop: '1px solid #e9d5ff' }}>
                        <div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                            Total Bundle: <span style={{ color: '#7c3aed' }}>₹{aiResponse.bundle.total_price?.toLocaleString('en-IN')}</span>
                          </div>
                          {aiResponse.bundle.remaining_budget !== null && (
                            <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700 }}>
                              Remaining budget: ₹{aiResponse.bundle.remaining_budget.toLocaleString('en-IN')}
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button
                            onClick={() => handleAddBundleToCart(aiResponse.bundle)}
                            style={{
                              background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                              color: '#ffffff',
                              border: 'none',
                              padding: '10px 18px',
                              borderRadius: '12px',
                              fontSize: '0.85rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              boxShadow: '0 4px 14px rgba(124, 58, 237, 0.3)'
                            }}
                          >
                            <Sparkles size={15} /> Add Complete Bundle (₹{aiResponse.bundle.total_price?.toLocaleString('en-IN')})
                          </button>
                          <button
                            onClick={() => handleAddToCart(aiResponse.bundle.main_product)}
                            style={{
                              background: '#ffffff',
                              color: '#475569',
                              border: '1px solid #cbd5e1',
                              padding: '10px 16px',
                              borderRadius: '12px',
                              fontSize: '0.82rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            Just {aiResponse.bundle.main_product?.name?.split(' ')[0] || 'Main'} (₹{aiResponse.bundle.main_product?.price?.toLocaleString('en-IN')})
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Results Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Sparkles size={20} color="#7c3aed" /> Available In-Store Products ({aiResponse.compared_products.length})
                    </h2>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {aiResponse.in_store_products && aiResponse.in_store_products.length > 0 && (
                        <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700, background: '#ecfdf5', padding: '5px 12px', borderRadius: '12px', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Store size={13} /> {aiResponse.in_store_products.length} Real Merchant Item(s)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Grid of Product Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '18px' }}>
                    {aiResponse.compared_products.map((prod, pIdx) => {
                      return (
                        <div
                          key={prod.id || prod.product_id || pIdx}
                          style={{
                            background: '#ffffff',
                            borderRadius: '20px',
                            border: '1px solid #e2e8f0',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
                            position: 'relative',
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-3px)';
                            e.currentTarget.style.boxShadow = '0 10px 25px rgba(124, 58, 237, 0.1)';
                            e.currentTarget.style.borderColor = '#c084fc';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 16px rgba(15, 23, 42, 0.04)';
                            e.currentTarget.style.borderColor = '#e2e8f0';
                          }}
                        >
                          {/* Store / Merchant Badge & Positional Index Badge */}
                          <div style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 2, display: 'flex', gap: '4px' }}>
                            <span style={{
                              background: '#059669',
                              color: '#ffffff',
                              padding: '4px 9px',
                              borderRadius: '8px',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              boxShadow: '0 2px 6px rgba(5, 150, 105, 0.3)'
                            }}>
                              <Store size={11} /> {prod.merchant_name || 'In-Store'}
                            </span>
                            <span style={{
                              background: '#334155',
                              color: '#ffffff',
                              padding: '4px 8px',
                              borderRadius: '8px',
                              fontSize: '0.68rem',
                              fontWeight: 800
                            }}>
                              #{pIdx + 1}
                            </span>
                          </div>

                          {/* Product Image */}
                          <div style={{ position: 'relative', height: '150px', width: '100%', borderRadius: '14px', overflow: 'hidden', marginBottom: '12px', background: '#f8fafc' }}>
                            <img
                              src={prod.image_url || prod.image || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80'}
                              alt={prod.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </div>

                          {/* Product Info */}
                          <div style={{ marginBottom: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                              <span style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                {prod.category}
                              </span>
                              {prod.rating && (
                                <span style={{ fontSize: '0.72rem', color: '#d97706', fontWeight: 700 }}>
                                  ★ {prod.rating}
                                </span>
                              )}
                            </div>
                            
                            <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px', lineHeight: 1.3 }}>
                              {prod.name}
                            </h4>

                            <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700, marginBottom: '6px' }}>
                              🏪 Sold by: <strong>{prod.merchant_name || 'Merchant'}</strong>
                            </div>

                            <p style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4, height: '36px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                              {prod.description}
                            </p>
                          </div>

                          {/* Price & Stock Row */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                            <div>
                              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                                ₹{prod.price?.toLocaleString('en-IN')}
                              </div>
                              <div style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 700 }}>
                                {prod.stock ? `${prod.stock} in stock` : 'In stock'}
                              </div>
                            </div>
                            <button
                              onClick={() => setDetailProduct(prod)}
                              title="View product details"
                              style={{
                                background: '#f1f5f9',
                                border: 'none',
                                color: '#475569',
                                padding: '6px 10px',
                                borderRadius: '8px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Eye size={13} /> Specs
                            </button>
                          </div>

                          {/* Action Buttons: Add to Cart & Buy Now */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <button
                              onClick={() => handleAddToCart(prod)}
                              style={{
                                background: '#ecfdf5',
                                color: '#059669',
                                border: '1px solid #a7f3d0',
                                padding: '9px 8px',
                                borderRadius: '10px',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px'
                              }}
                            >
                              <ShoppingCart size={13} /> Add to Cart
                            </button>
                            <button
                              onClick={() => handleBuyNow(prod)}
                              style={{
                                background: 'linear-gradient(135deg, #059669, #047857)',
                                color: '#ffffff',
                                border: 'none',
                                padding: '9px 8px',
                                borderRadius: '10px',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              Buy Now
                            </button>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* NO PRODUCTS FOUND EMPTY STATE */
                <div style={{
                  background: '#ffffff',
                  borderRadius: '24px',
                  border: '1px solid #e2e8f0',
                  padding: '48px 32px',
                  textAlign: 'center',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.02)'
                }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                    <HelpCircle size={28} color="#dc2626" />
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                    No Matching Products In Live Catalog
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: '460px', margin: '0 auto 20px auto', lineHeight: 1.5 }}>
                    {aiResponse?.ai_message || "I couldn't find a close match in this store's catalog. Try uploading another photo or adjusting your search budget."}
                  </p>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => handleSendMessage({ customText: "Find me a chocolate cake under ₹1,000" })}
                      style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '8px 14px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      "Find me a chocolate cake under ₹1,000"
                    </button>
                    <button
                      onClick={() => handleSendMessage({ customText: "I need black running shoes under ₹4,000" })}
                      style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '8px 14px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      "I need black running shoes under ₹4,000"
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* PRODUCT DETAILS MODAL */}
      {detailProduct && (
        <div className="modal-overlay" onClick={() => setDetailProduct(null)}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '560px', padding: '28px', background: '#ffffff', borderRadius: '24px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 800, textTransform: 'uppercase' }}>
                    {detailProduct.category}
                  </span>
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: '#ecfdf5',
                    color: '#047857'
                  }}>
                    🏪 {detailProduct.merchant_name || 'In-Store'}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>{detailProduct.name}</h3>
              </div>
              <button onClick={() => setDetailProduct(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontWeight: 700 }}>✕</button>
            </div>

            <img
              src={detailProduct.image_url || detailProduct.image}
              alt={detailProduct.name}
              style={{ width: '100%', height: '220px', objectFit: 'cover', borderRadius: '16px', marginBottom: '16px' }}
            />

            <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.5, marginBottom: '16px' }}>
              {detailProduct.description}
            </div>

            <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.78rem', color: '#475569', marginBottom: '20px' }}>
              <strong>Merchant / Seller:</strong> {detailProduct.merchant_name || 'Revenue Pilot Merchant'}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>₹{detailProduct.price?.toLocaleString('en-IN')}</div>
                <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700 }}>
                  {detailProduct.stock ? `${detailProduct.stock} units available` : 'In stock'}
                </span>
              </div>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    handleAddToCart(detailProduct);
                    setDetailProduct(null);
                  }}
                  className="btn-secondary"
                  style={{ fontSize: '0.85rem' }}
                >
                  <ShoppingCart size={15} /> Add to Cart
                </button>
                <button
                  onClick={() => {
                    setDetailProduct(null);
                    handleBuyNow(detailProduct);
                  }}
                  className="btn-primary"
                  style={{ fontSize: '0.85rem' }}
                >
                  Buy Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RAZORPAY CHECKOUT MODAL */}
      {checkoutOrder && (
        <RazorpayModal
          orderData={checkoutOrder}
          onClose={() => setCheckoutOrder(null)}
          onSuccess={(res) => {
            setCheckoutOrder(null);
            showNotification(`Payment successful! Razorpay ID: ${res.payment_id}`);
            if (onCartUpdate) onCartUpdate();
            if (onAuditUpdate) onAuditUpdate();
          }}
          onFailure={(err) => {
            showNotification(err?.message || 'Payment simulation failed', 'error');
            if (onAuditUpdate) onAuditUpdate();
          }}
        />
      )}

    </div>
  );
}

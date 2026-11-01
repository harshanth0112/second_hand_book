import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { getInbox, getMessages, markConversationRead, handleOfferAction } from '../api/chat';
import { OfferCard } from '../components/OfferCard';
import {
  Send,
  MessageSquare,
  Tag,
  ArrowLeft,
  BookOpen,
  CheckCheck,
  Check,
  Clock,
  AlertCircle,
} from 'lucide-react';

export function Chat() {
  const { id: activeConvId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, refreshUnreadTotal } = useSocket();

  const [inbox, setInbox] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loadingInbox, setLoadingInbox] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputText, setInputText] = useState('');
  const [offerInput, setOfferInput] = useState('');
  const [showOfferBox, setShowOfferBox] = useState(false);
  const [isTypingPeer, setIsTypingPeer] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const activeConversation = inbox.find((c) => c._id === activeConvId);
  const isSeller = activeConversation && user && activeConversation.seller?._id === user._id;
  const isBuyer = activeConversation && user && activeConversation.buyer?._id === user._id;
  const isSellListing = activeConversation?.listing?.listingType === 'sell';

  // Load inbox
  const loadInbox = async () => {
    try {
      const data = await getInbox();
      setInbox(data || []);
    } catch (err) {
      console.error('Failed to load inbox:', err);
    } finally {
      setLoadingInbox(false);
    }
  };

  useEffect(() => {
    loadInbox();
  }, []);

  // When active conversation changes, load messages & join socket room
  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      return;
    }

    let isMounted = true;
    setLoadingMessages(true);

    async function loadThread() {
      try {
        const res = await getMessages(activeConvId, { limit: 50 });
        if (!isMounted) return;
        setMessages((res.items || []).reverse()); // chronological order
        await markConversationRead(activeConvId);
        refreshUnreadTotal();
        loadInbox();
      } catch (err) {
        console.error('Failed to load messages:', err);
      } finally {
        if (isMounted) setLoadingMessages(false);
      }
    }

    loadThread();

    if (socket) {
      socket.emit('conversation:join', { conversationId: activeConvId });
    }

    return () => {
      isMounted = false;
    };
  }, [activeConvId, socket]);

  // Socket event listeners for active chat
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (newMsg) => {
      if (newMsg.conversation === activeConvId) {
        setMessages((prev) => [...prev, newMsg]);
        socket.emit('message:read', { conversationId: activeConvId });
      }
      loadInbox();
    };

    const handleTyping = ({ conversationId, isTyping }) => {
      if (conversationId === activeConvId) {
        setIsTypingPeer(isTyping);
      }
    };

    const handleRead = ({ conversationId }) => {
      if (conversationId === activeConvId) {
        setMessages((prev) =>
          prev.map((m) => (m.readAt ? m : { ...m, readAt: new Date().toISOString() }))
        );
      }
    };

    socket.on('message:new', handleNewMessage);
    socket.on('typing', handleTyping);
    socket.on('message:read', handleRead);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('typing', handleTyping);
      socket.off('message:read', handleRead);
    };
  }, [socket, activeConvId]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTypingPeer]);

  // Handle typing debounce
  const handleInputChange = (e) => {
    setInputText(e.target.value);
    if (!socket || !activeConvId) return;

    socket.emit('typing', { conversationId: activeConvId, isTyping: true });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', { conversationId: activeConvId, isTyping: false });
    }, 1500);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !socket || !activeConvId) return;

    const textToSend = inputText.trim();
    setInputText('');

    socket.emit(
      'message:send',
      {
        conversationId: activeConvId,
        type: 'text',
        text: textToSend,
      },
      (ack) => {
        if (!ack?.ok) {
          alert(ack?.error || 'Failed to send message');
        }
      }
    );
  };

  const handleSendOffer = (e) => {
    e.preventDefault();
    const amount = parseInt(offerInput, 10);
    if (isNaN(amount) || amount < 1 || !socket || !activeConvId) return;

    socket.emit(
      'message:send',
      {
        conversationId: activeConvId,
        type: 'offer',
        offerAmount: amount,
      },
      (ack) => {
        if (!ack?.ok) {
          alert(ack?.error || 'Failed to send offer');
        } else {
          setOfferInput('');
          setShowOfferBox(false);
        }
      }
    );
  };

  const handleOfferDecision = async (messageId, action) => {
    try {
      await handleOfferAction(messageId, action);
      const res = await getMessages(activeConvId, { limit: 50 });
      setMessages((res.items || []).reverse());
      loadInbox();
    } catch (err) {
      alert(err.message || 'Action failed');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm h-[80vh] flex flex-col md:flex-row">
        {/* Left Pane: Inbox List */}
        <div
          className={`w-full md:w-80 border-r border-gray-200 flex flex-col ${
            activeConvId ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-900 text-base flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              Messages
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {loadingInbox ? (
              <div className="p-6 text-center text-xs text-gray-500">Loading inbox...</div>
            ) : inbox.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-500">No conversations yet.</div>
            ) : (
              inbox.map((conv) => {
                const other = user._id === conv.buyer?._id ? conv.seller : conv.buyer;
                const isActive = conv._id === activeConvId;

                return (
                  <button
                    key={conv._id}
                    onClick={() => navigate(`/chat/${conv._id}`)}
                    className={`w-full text-left p-3.5 flex items-start gap-3 transition ${
                      isActive ? 'bg-blue-50/70' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0 border border-blue-200">
                      {other?.name ? other.name.charAt(0).toUpperCase() : 'U'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-semibold text-gray-900 text-xs truncate">
                          {other?.name}
                        </span>
                        {conv.unreadCount > 0 && (
                          <span className="w-4 h-4 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] font-medium text-gray-700 truncate mb-0.5">
                        {conv.listing?.title}
                      </p>

                      <p className="text-[11px] text-gray-500 truncate">
                        {conv.lastMessage || 'Started conversation'}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Message Thread */}
        <div
          className={`flex-1 flex flex-col bg-gray-50/40 ${
            !activeConvId ? 'hidden md:flex items-center justify-center' : 'flex'
          }`}
        >
          {!activeConvId ? (
            <div className="text-center p-8 text-gray-400">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Select a conversation to start chatting</p>
            </div>
          ) : (
            <>
              {/* Thread Header */}
              <div className="p-3.5 bg-white border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => navigate('/chat')}
                    className="md:hidden inline-flex h-11 w-11 shrink-0 items-center justify-center text-gray-500 hover:text-gray-800"
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">
                      {isSeller ? activeConversation?.buyer?.name : activeConversation?.seller?.name}
                    </h3>
                    <Link
                      to={`/listings/${activeConversation?.listing?._id}`}
                      className="text-xs text-blue-600 hover:underline line-clamp-1"
                    >
                      {activeConversation?.listing?.title}
                      {activeConversation?.agreedPrice && (
                        <span className="ml-1 text-emerald-700 font-semibold">
                          (Agreed: ₹{activeConversation.agreedPrice})
                        </span>
                      )}
                    </Link>
                  </div>
                </div>

                {/* Offer Toggle (Buyer Only, Sell Listing Only) */}
                {isBuyer && isSellListing && (
                  <button
                    type="button"
                    onClick={() => setShowOfferBox(!showOfferBox)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition"
                  >
                    <Tag className="w-3.5 h-3.5" />
                    Make Price Offer
                  </button>
                )}
              </div>

              {/* Offer Popover */}
              {showOfferBox && (
                <form
                  onSubmit={handleSendOffer}
                  className="p-3 bg-amber-50 border-b border-amber-200 flex items-center gap-2"
                >
                  <span className="text-xs font-semibold text-amber-900">Your Offer: ₹</span>
                  <input
                    type="number"
                    min={1}
                    max={activeConversation?.listing?.price || 100000}
                    value={offerInput}
                    onChange={(e) => setOfferInput(e.target.value)}
                    placeholder={`1 - ${activeConversation?.listing?.price}`}
                    required
                    className="w-24 px-2 py-1 bg-white border border-amber-300 rounded text-xs focus:ring-1 focus:ring-amber-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold shadow-xs"
                  >
                    Send Offer
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowOfferBox(false)}
                    className="text-xs text-gray-500 hover:text-gray-800 ml-auto"
                  >
                    Cancel
                  </button>
                </form>
              )}

              {/* Message List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMessages ? (
                  <div className="text-center text-xs text-gray-500 py-8">Loading history...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-xs text-gray-400 py-8">
                    Send a message to greet the {isSeller ? 'buyer' : 'seller'}!
                  </div>
                ) : (
                  messages.map((m) => {
                    if (m.type === 'system') {
                      return (
                        <div key={m._id} className="text-center my-2">
                          <span className="text-[11px] font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
                            {m.text}
                          </span>
                        </div>
                      );
                    }

                    const isMine = user._id === (m.sender?._id || m.sender);

                    return (
                      <div
                        key={m._id}
                        className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                      >
                        {m.type === 'offer' ? (
                          <OfferCard
                            message={m}
                            isSeller={isSeller}
                            onAction={handleOfferDecision}
                          />
                        ) : (
                          <div
                            className={`max-w-sm rounded-2xl px-4 py-2 text-xs leading-relaxed ${
                              isMine
                                ? 'bg-blue-600 text-white rounded-br-none shadow-xs'
                                : 'bg-white text-gray-900 border border-gray-200 rounded-bl-none shadow-xs'
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{m.text}</p>
                          </div>
                        )}

                        <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-400 px-1">
                          <span>
                            {new Date(m.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {isMine && (
                            <span>
                              {m.readAt ? (
                                <CheckCheck className="w-3 h-3 text-blue-500" />
                              ) : (
                                <Check className="w-3 h-3 text-gray-400" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}

                {isTypingPeer && (
                  <div className="text-xs text-gray-500 italic pl-2">
                    {isSeller ? activeConversation?.buyer?.name : activeConversation?.seller?.name} is typing...
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Form */}
              <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-200 flex gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={handleInputChange}
                  maxLength={1000}
                  placeholder="Type a message..."
                  className="min-h-11 lg:min-h-0 min-w-0 flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-xs"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="inline-flex min-h-11 lg:min-h-0 shrink-0 items-center justify-center gap-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  Send
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { Search, Settings, ArrowLeft, Send, Image as ImageIcon, Phone, Video, CheckCheck, AlertCircle, X } from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { useUser } from '../contexts/UserContext';
import { 
  Conversation, 
  ChatMessage, 
  UserContact,
  subscribeToUserConversations, 
  subscribeToChatMessages, 
  sendFirestoreMessage, 
  getOrCreateChatRoom,
  fetchAllUsers,
  ONLINE_FRIENDS 
} from '../services/messengerService';

interface MessengerOverlayProps {
  onClose: () => void;
  isDarkMode: boolean;
}

export const MessengerOverlay: React.FC<MessengerOverlayProps> = ({ onClose, isDarkMode }) => {
  const { currentUser } = useUser();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeChat, setActiveChat] = useState<Conversation | null>(null);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState<UserContact[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [showPopup, setShowPopup] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Subscribe to real-time conversations from Firestore
  useEffect(() => {
    if (!currentUser?.uid) {
      setConversations([]);
      return;
    }

    const unsubscribe = subscribeToUserConversations(currentUser.uid, (convs) => {
      setConversations(convs);
    });

    // Fetch all registered users for starting new chats
    fetchAllUsers().then((users) => {
      // Exclude current user from contact list
      setAllUsers(users.filter(u => u.uid !== currentUser.uid));
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [currentUser?.uid]);

  // 2. Subscribe to real-time messages when an active chat is selected
  useEffect(() => {
    if (!activeChat?.id || !currentUser?.uid) return;

    const unsubscribe = subscribeToChatMessages(activeChat.id, currentUser.uid, (msgs) => {
      setActiveChat((prev) => {
        if (!prev || prev.id !== activeChat.id) return prev;
        return {
          ...prev,
          messages: msgs,
        };
      });
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [activeChat?.id, currentUser?.uid]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeChat?.messages]);

  // Filter conversations and available users by search query
  const filteredConversations = conversations.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = allUsers.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChat || !currentUser?.uid || isSending) return;

    const textToSend = inputText.trim();
    setInputText('');
    setIsSending(true);
    setErrorMessage(null);

    try {
      await sendFirestoreMessage(activeChat.id, textToSend, currentUser.uid);
    } catch (err: any) {
      console.error('Failed to send message:', err);
      setErrorMessage(err.message || 'Failed to send message. Please check permissions or connection.');
    } finally {
      setIsSending(false);
    }
  };

  const handleSelectUserContact = async (contact: UserContact) => {
    if (!currentUser?.uid) return;
    try {
      const roomId = await getOrCreateChatRoom(
        currentUser.uid,
        currentUser.name || currentUser.username || 'User',
        currentUser.avatarUrl || '',
        contact.uid,
        contact.name,
        contact.avatarUrl
      );

      const existingConv = conversations.find(c => c.id === roomId);
      if (existingConv) {
        setActiveChat(existingConv);
      } else {
        setActiveChat({
          id: roomId,
          name: contact.name,
          avatar: contact.avatarUrl,
          lastMessage: 'Started conversation',
          time: 'Just now',
          participants: [currentUser.uid, contact.uid],
          messages: [],
          isOnline: true,
        });
      }
      setSearchQuery('');
    } catch (e: any) {
      console.error('Error starting conversation:', e);
      setErrorMessage('Could not open conversation.');
    }
  };

  return (
    <div className={`fixed inset-0 z-50 ${isDarkMode ? 'bg-[#0a0d14] text-white' : 'bg-white text-slate-900'} flex flex-col select-none animate-in fade-in duration-200`}>
      
      {/* Error banner if message send failed */}
      {errorMessage && (
        <div className="absolute top-16 left-4 right-4 z-50 bg-rose-600 text-white p-3 rounded-xl shadow-lg flex items-center justify-between text-xs font-bold animate-in slide-in-from-top">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="underline text-[10px]">Dismiss</button>
        </div>
      )}

      {activeChat ? (
        /* Active Chat Room View */
        <div className="flex flex-col h-full">
          {/* Chat Header */}
          <div className={`px-4 py-3 border-b ${isDarkMode ? 'border-slate-800 bg-[#0d111a]' : 'border-slate-200 bg-white'} flex items-center justify-between shrink-0 shadow-sm`}>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setActiveChat(null)}
                className={`p-2 rounded-full ${isDarkMode ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700'} cursor-pointer`}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="relative">
                <UserAvatar src={activeChat.avatar} alt={activeChat.name} className="w-10 h-10 rounded-full object-cover" />
                {activeChat.isOnline && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
                )}
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight">{activeChat.name}</h3>
                <span className="text-[11px] text-emerald-500 font-medium">
                  {activeChat.isOnline ? 'Active now' : 'Active recently'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button className={`p-2.5 rounded-full ${isDarkMode ? 'hover:bg-slate-800 text-blue-400' : 'hover:bg-slate-100 text-blue-600'} cursor-pointer`}>
                <Phone className="w-5 h-5" />
              </button>
              <button className={`p-2.5 rounded-full ${isDarkMode ? 'hover:bg-slate-800 text-blue-400' : 'hover:bg-slate-100 text-blue-600'} cursor-pointer`}>
                <Video className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages History */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 flex flex-col">
            <div className="text-center my-4">
              <UserAvatar src={activeChat.avatar} alt={activeChat.name} className="w-16 h-16 rounded-full mx-auto mb-2 object-cover shadow-md" />
              <h4 className="font-extrabold text-base">{activeChat.name}</h4>
              <p className="text-xs text-gray-400">Connected securely on BINISTA Messenger</p>
            </div>

            {activeChat.messages.length === 0 ? (
              <div className="text-center py-8 text-xs text-gray-400 font-medium">
                No messages yet. Send a message to start chatting in real-time!
              </div>
            ) : (
              activeChat.messages.map(msg => (
                <div 
                  key={msg.id} 
                  className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-medium leading-relaxed shadow-sm ${
                    msg.sender === 'me'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-xs'
                      : isDarkMode ? 'bg-slate-800 text-white rounded-bl-xs' : 'bg-slate-100 text-slate-900 rounded-bl-xs'
                  }`}>
                    {msg.text}
                    <div className={`text-[9px] mt-1 text-right flex items-center justify-end gap-1 ${msg.sender === 'me' ? 'text-blue-100' : 'text-gray-400'}`}>
                      <span>{msg.time}</span>
                      {msg.sender === 'me' && <CheckCheck className="w-3 h-3 text-blue-200 inline" />}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input Box */}
          <form 
            onSubmit={handleSendMessage}
            className={`p-3 border-t ${isDarkMode ? 'border-slate-800 bg-[#0d111a]' : 'border-slate-200 bg-white'} flex items-center gap-2 shrink-0`}
          >
            <button type="button" className={`p-2 rounded-full text-blue-500 hover:bg-blue-500/10 cursor-pointer`}>
              <ImageIcon className="w-5 h-5" />
            </button>
            <input
              type="text"
              placeholder="Aa"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className={`flex-1 px-4 py-2.5 rounded-full text-xs sm:text-sm focus:outline-none ${
                isDarkMode ? 'bg-slate-900 text-white border border-slate-700' : 'bg-slate-100 text-slate-900 border border-slate-200'
              }`}
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isSending}
              className="p-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 cursor-pointer shadow-md"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      ) : (
        /* Conversations List View */
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-4 py-3 flex items-center justify-between shrink-0">
            <div>
              <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 bg-clip-text text-transparent">
                BINISTA
              </h1>
              <span className={`text-xs font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Messages
              </span>
            </div>
            <button 
              onClick={onClose}
              className={`w-9 h-9 rounded-full ${isDarkMode ? 'bg-slate-900 hover:bg-slate-800 text-gray-300' : 'bg-slate-100 hover:bg-slate-200 text-gray-700'} flex items-center justify-center cursor-pointer`}
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="px-4 pb-3 shrink-0">
            <div className={`flex items-center gap-2 px-3.5 py-2.5 rounded-full ${isDarkMode ? 'bg-slate-900 border border-slate-800' : 'bg-slate-100 border border-slate-200'}`}>
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Search conversations or users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs sm:text-sm focus:outline-none placeholder-gray-400"
              />
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
            
            {/* Online Now Section */}
            <div className="px-4 py-2 mb-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-extrabold text-gray-400 tracking-wider">Online Now</span>
              </div>
              <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
                {ONLINE_FRIENDS.map(friend => (
                  <div key={friend.id} className="flex flex-col items-center gap-1 shrink-0 cursor-pointer">
                    <div className="relative">
                      <UserAvatar src={friend.avatar} alt={friend.name} className="w-12 h-12 rounded-full object-cover border-2 border-blue-500/30" />
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#0a0d14] rounded-full"></span>
                    </div>
                    <span className="text-[10px] font-medium truncate w-12 text-center">{friend.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* If searching, show matching registered users to start chat with */}
            {searchQuery.trim() && filteredUsers.length > 0 && (
              <div className="px-4 mb-3">
                <h3 className="text-[11px] font-extrabold text-blue-500 uppercase tracking-wider mb-2">Users on BINISTA</h3>
                <div className="space-y-1">
                  {filteredUsers.map(user => (
                    <div
                      key={user.uid}
                      onClick={() => handleSelectUserContact(user)}
                      className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer ${isDarkMode ? 'hover:bg-slate-900' : 'hover:bg-slate-100'}`}
                    >
                      <UserAvatar src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
                      <div>
                        <h4 className="font-bold text-xs">{user.name}</h4>
                        <span className="text-[10px] text-gray-400">@{user.username}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Conversations List */}
            <div className="space-y-1 px-2">
              {filteredConversations.length === 0 ? (
                <div className="text-center py-12 text-xs text-gray-400 font-medium">
                  No conversations yet. Search for a user above to start chatting!
                </div>
              ) : (
                filteredConversations.map(conv => (
                  <div
                    key={conv.id}
                    onClick={() => {
                      setActiveChat(conv);
                    }}
                    className={`flex items-center gap-3 p-3 rounded-2xl transition-all cursor-pointer ${
                      isDarkMode ? 'hover:bg-slate-950/60' : 'hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <UserAvatar src={conv.avatar} alt={conv.name} className="w-13 h-13 rounded-full object-cover" />
                      {conv.isOnline && (
                        <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-[#0a0d14] rounded-full"></span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <h4 className={`font-bold text-xs sm:text-sm truncate ${conv.unreadCount ? 'font-black text-white' : 'text-slate-200'}`}>
                          {conv.name}
                        </h4>
                        <span className="text-[10px] text-gray-400 shrink-0 ml-2">{conv.time}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className={`text-xs truncate ${conv.unreadCount ? 'font-black text-white' : 'text-gray-400'}`}>
                          {conv.lastMessage}
                        </p>
                        {conv.unreadCount ? (
                          <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-extrabold text-[10px] flex items-center justify-center shrink-0 ml-2 shadow-md">
                            {conv.unreadCount}
                          </span>
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 ml-2"></span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      )}

      {/* Coming Soon Popup Modal */}
      {showPopup && (
        <div 
          onClick={onClose}
          className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 sm:p-7 max-w-sm w-full text-center relative border border-slate-100 shadow-xl overflow-hidden"
          >
            {/* Close X Button */}
            <button
              onClick={onClose}
              className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer z-10"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Top Icon & Animated Bubble Container */}
            <div className="flex flex-col items-center justify-center pt-2 pb-4">
              <div className="relative mb-3">
                {/* Bold Messenger outline icon */}
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-xs">
                  <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" aria-hidden="true">
                    <path
                      d="M12 2.75C6.89 2.75 2.75 6.56 2.75 11.26c0 2.68 1.34 5.08 3.44 6.63v2.79l3.12-1.71c.85.23 1.74.36 2.69.36 5.11 0 9.25-3.81 9.25-8.51S17.11 2.75 12 2.75Z"
                      stroke="currentColor"
                      strokeWidth="1.85"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="m13.04 14.44-2.58-2.75-5.05 2.75 5.55-5.88 2.65 2.75 4.97-2.75-5.54 5.88Z"
                      fill="currentColor"
                    />
                  </svg>
                </div>

                {/* Animated message bubble appearing smoothly */}
                <div className="absolute -bottom-3 -right-3 bg-blue-600 text-white px-2.5 py-1.5 rounded-xl rounded-bl-xs shadow-md animate-in zoom-in-50 duration-300 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            </div>

            {/* Text Content with subtle fade-in */}
            <div className="space-y-2 mb-6 animate-in fade-in duration-500">
              <span className="inline-block text-[11px] font-extrabold uppercase tracking-widest text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full mb-1">
                Coming Soon
              </span>
              <h3 className="text-xl font-black tracking-tight text-slate-900">
                Messenger
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed px-2">
                Something exciting is on the way.
              </p>
              <p className="text-xs sm:text-sm text-slate-600 font-normal leading-relaxed px-2 mt-3 pt-2 border-t border-slate-100">
                আপনার যোগাযোগের অভিজ্ঞতাকে আরও সমৃদ্ধ করতে BINISTA মেসেঞ্জার নিয়ে আসছে নতুন কিছু। বন্ধুদের সঙ্গে কথা বলা, মুহূর্ত ভাগ করে নেওয়া আরও সহজ ও আনন্দময় হবে।
                <span className="block mt-2 font-medium text-slate-700">আমরা প্রস্তুত করছি আপনার জন্য নতুন এক অভিজ্ঞতা।</span>
              </p>
            </div>

            {/* Button */}
            <button
              onClick={onClose}
              className="w-full py-3 bg-slate-900 hover:bg-black text-white font-bold text-xs sm:text-sm rounded-xl transition active:scale-95 cursor-pointer shadow-sm"
            >
              Got it
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

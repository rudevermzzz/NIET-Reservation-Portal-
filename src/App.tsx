import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  User, 
  Check, 
  X, 
  TrendingUp, 
  Building, 
  Users, 
  Info, 
  AlertCircle, 
  Trash2, 
  Layers, 
  BarChart3, 
  CheckSquare, 
  ChevronRight, 
  Sparkles,
  HelpCircle,
  Moon,
  Sun,
  Lock,
  Unlock,
  KeyRound,
  Mail
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Interfaces
interface Booking {
  id: string;
  room: string;
  title: string;
  organizer: string;
  role: string;
  date: string; // YYYY-MM-DD
  slots: string[]; // e.g. ["10:00 AM", "11:30 AM"]
  color: 'red' | 'amber' | 'emerald' | 'slate';
}

interface ApprovalRequest {
  id: string;
  requesterName: string;
  role: string;
  email?: string; // Target email ID for confirmation / rejection notifications
  date: string; // YYYY-MM-DD
  room: string;
  slots: string[];
  purpose: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Queried';
  timestamp: number;
  queryMessage?: string;
}

// Date helper utilities
const getLocalDateString = (date: Date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getRelativeDateString = (offsetDays: number) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return getLocalDateString(date);
};

const getRelativeDateLabel = (offsetDays: number) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const dayName = weekdays[date.getDay()] || 'Day';
  const monthName = months[date.getMonth()] || 'Month';
  const dayNum = date.getDate();
  
  return `${dayName}, ${monthName} ${dayNum}`;
};

// Map time slots to 24hr hour and minutes for past-time checking
const SLOT_TIMES: { [key: string]: { hour: number; minute: number } } = {
  "10:00 AM": { hour: 10, minute: 0 },
  "11:30 AM": { hour: 11, minute: 30 },
  "01:00 PM": { hour: 13, minute: 0 },
  "02:30 PM": { hour: 14, minute: 30 },
  "04:00 PM": { hour: 16, minute: 0 }
};

const isSlotInPast = (dateStr: string, slot: string) => {
  const todayStr = getLocalDateString();
  if (dateStr < todayStr) return true;
  if (dateStr > todayStr) return false;
  
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  const slotTime = SLOT_TIMES[slot];
  if (!slotTime) return false;
  
  if (currentHour > slotTime.hour) {
    return true;
  }
  if (currentHour === slotTime.hour && currentMinute >= slotTime.minute) {
    return true;
  }
  return false;
};

// Room details
const ROOMS = [
  { id: 'Board Room', name: 'Board Room', capacity: 10, amenities: ['📺 Smart TV', '🪵 Big Table', '📶 High-speed Wi-Fi'], location: '5th Floor, Block A', color: 'slate' as const },
  { id: 'Meeting Room 1', name: 'Meeting Room 1', capacity: 5, amenities: ['📶 High-speed Wi-Fi', '❄️ AC Room'], location: '5th Floor, Block A', color: 'indigo' as const },
  { id: 'Meeting Room 2', name: 'Meeting Room 2', capacity: 5, amenities: ['📶 High-speed Wi-Fi', '❄️ AC Room'], location: '5th Floor, Block A', color: 'emerald' as const },
];

const TIME_SLOTS = ["10:00 AM", "11:30 AM", "01:00 PM", "02:30 PM", "04:00 PM"];

// Default Initial Bookings relative to today
const INITIAL_BOOKINGS: Booking[] = [];

// Default Initial Approval Queue relative to today
const INITIAL_REQUESTS: ApprovalRequest[] = [];

export default function App() {
  // Navigation / Views: 'dashboard' | 'my-bookings' | 'insights'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'my-bookings' | 'insights'>('dashboard');
  
  // Portal View Mode: 'booker' (for students/faculty who want to request bookings) or 'admin' (superuser approving bookings)
  const [portalMode, setPortalMode] = useState<'booker' | 'admin'>('booker');
  
  // Onboarding role selector state shown at startup
  const [showRoleSelector, setShowRoleSelector] = useState<boolean>(true);
  
  // Superuser Admin Exclusive Security State
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('niet_admin_authenticated') === 'true';
  });
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  
  // Storage & Core Data States
  const [bookings, setBookings] = useState<Booking[]>(() => {
    const saved = localStorage.getItem('niet_bookings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Booking[];
        // Filter out dates that are older than today to satisfy "earlier dates vanish as time passes"
        const todayStr = getLocalDateString();
        const active = parsed.filter(b => b.date >= todayStr);
        return active.length > 0 ? active : INITIAL_BOOKINGS;
      } catch (e) {
        return INITIAL_BOOKINGS;
      }
    }
    return INITIAL_BOOKINGS;
  });

  const [requests, setRequests] = useState<ApprovalRequest[]>(() => {
    const saved = localStorage.getItem('niet_requests');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as ApprovalRequest[];
        const todayStr = getLocalDateString();
        const active = parsed.filter(r => r.date >= todayStr);
        return active.length > 0 ? active : INITIAL_REQUESTS;
      } catch (e) {
        return INITIAL_REQUESTS;
      }
    }
    return INITIAL_REQUESTS;
  });

  const [personas, setPersonas] = useState<{name: string; role: string; email: string; pin?: string}[]>(() => {
    const saved = localStorage.getItem('niet_personas');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [];
  });

  const [activeBookerName, setActiveBookerName] = useState<string>(() => {
    return localStorage.getItem('niet_active_booker_name') || 'All Bookers';
  });

  useEffect(() => {
    localStorage.setItem('niet_active_booker_name', activeBookerName);
  }, [activeBookerName]);

  const lastServerStateRef = useRef<{ bookings?: string; requests?: string; personas?: string }>({});

  // Polling server for real-time multi-device sync
  useEffect(() => {
    const syncFromServer = async () => {
      try {
        const res = await fetch("/api/state");
        if (!res.ok) return;
        const data = await res.json();
        
        if (data.bookings) {
          const bookingsStr = JSON.stringify(data.bookings);
          lastServerStateRef.current.bookings = bookingsStr;
          if (bookingsStr !== localStorage.getItem("niet_bookings")) {
            setBookings(data.bookings);
            localStorage.setItem("niet_bookings", bookingsStr);
          }
        }
        
        if (data.requests) {
          const requestsStr = JSON.stringify(data.requests);
          lastServerStateRef.current.requests = requestsStr;
          if (requestsStr !== localStorage.getItem("niet_requests")) {
            setRequests(data.requests);
            localStorage.setItem("niet_requests", requestsStr);
          }
        }

        if (data.personas) {
          const personasStr = JSON.stringify(data.personas);
          lastServerStateRef.current.personas = personasStr;
          if (personasStr !== localStorage.getItem("niet_personas")) {
            setPersonas(data.personas);
            localStorage.setItem("niet_personas", personasStr);
          }
        }
      } catch (err) {
        console.error("Error polling state from server:", err);
      }
    };

    syncFromServer();
    const interval = setInterval(syncFromServer, 3000);
    return () => clearInterval(interval);
  }, []);

  // Sync bookings to server on change
  useEffect(() => {
    const localStr = JSON.stringify(bookings);
    localStorage.setItem("niet_bookings", localStr);

    if (localStr === lastServerStateRef.current.bookings) {
      return;
    }

    const syncBookings = async () => {
      try {
        await fetch("/api/state/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookings })
        });
        lastServerStateRef.current.bookings = localStr;
      } catch (err) {
        console.error("Error syncing bookings to server:", err);
      }
    };
    syncBookings();
  }, [bookings]);

  // Sync requests to server on change
  useEffect(() => {
    const localStr = JSON.stringify(requests);
    localStorage.setItem("niet_requests", localStr);

    if (localStr === lastServerStateRef.current.requests) {
      return;
    }

    const syncRequests = async () => {
      try {
        await fetch("/api/state/requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requests })
        });
        lastServerStateRef.current.requests = localStr;
      } catch (err) {
        console.error("Error syncing requests to server:", err);
      }
    };
    syncRequests();
  }, [requests]);

  // Sync personas to server on change
  useEffect(() => {
    const localStr = JSON.stringify(personas);
    localStorage.setItem("niet_personas", localStr);

    if (localStr === lastServerStateRef.current.personas) {
      return;
    }

    const syncPersonas = async () => {
      try {
        await fetch("/api/state/personas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ personas })
        });
        lastServerStateRef.current.personas = localStr;
      } catch (err) {
        console.error("Error syncing personas to server:", err);
      }
    };
    syncPersonas();
  }, [personas]);

  // Calendar dates starting from today
  const dates = [
    { label: getRelativeDateLabel(0), value: getRelativeDateString(0), isToday: true },
    { label: getRelativeDateLabel(1), value: getRelativeDateString(1) },
    { label: getRelativeDateLabel(2), value: getRelativeDateString(2) },
    { label: getRelativeDateLabel(3), value: getRelativeDateString(3) },
    { label: getRelativeDateLabel(4), value: getRelativeDateString(4) },
    { label: getRelativeDateLabel(5), value: getRelativeDateString(5) },
    { label: getRelativeDateLabel(6), value: getRelativeDateString(6) },
  ];
  
  const [selectedDate, setSelectedDate] = useState<string>(getRelativeDateString(0));

  // Filters State
  const [selectedRoomFilters, setSelectedRoomFilters] = useState<string[]>(ROOMS.map(r => r.name));

  // Reservation Form Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formRoom, setFormRoom] = useState<string>(ROOMS[0].name);
  const [formSlots, setFormSlots] = useState<string[]>(['10:00 AM']);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState('Final Year Student');
  const [formPurpose, setFormPurpose] = useState('');
  const [formDate, setFormDate] = useState(getRelativeDateString(0));
  const [formError, setFormError] = useState('');

  // Custom persona states (avoiding window.prompt)
  const [isCreatePersonaModalOpen, setIsCreatePersonaModalOpen] = useState(false);
  const [personaFormName, setPersonaFormName] = useState('');
  const [personaFormRole, setPersonaFormRole] = useState('Student Startup');
  const [personaFormEmail, setPersonaFormEmail] = useState('');
  const [personaFormPIN, setPersonaFormPIN] = useState('');
  const [personaFormError, setPersonaFormError] = useState('');
  const [isProfileSwitcherOpen, setIsProfileSwitcherOpen] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [verificationPersona, setVerificationPersona] = useState<{name: string; role: string; email: string; pin?: string} | null>(null);
  const [verificationPin, setVerificationPin] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [cancelingBookingId, setCancelingBookingId] = useState<string | null>(null);
  const [deletingPersonaName, setDeletingPersonaName] = useState<string | null>(null);

  // Toast alert notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Local state for inline Query/Clarification input instead of window.prompt
  const [queryingId, setQueryingId] = useState<string | null>(null);
  const [queryText, setQueryText] = useState<string>('');
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>('');

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('niet_bookings', JSON.stringify(bookings));
  }, [bookings]);

  useEffect(() => {
    localStorage.setItem('niet_requests', JSON.stringify(requests));
  }, [requests]);

  // Show dynamic toast alert helper
  const triggerToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Send email notifications to the backend
  const sendEmailNotification = async (params: {
    email: string;
    name: string;
    room: string;
    date: string;
    slots: string[];
    status: 'Pending' | 'Approved' | 'Rejected' | 'Queried';
  }) => {
    try {
      const response = await fetch('/api/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });
      const data = await response.json();
      console.log('[Email Notification Service]', data);
      if (data.simulated) {
        triggerToast(`Email simulated: ${params.status} notification sent to console!`, "info");
      } else if (data.success) {
        triggerToast(`Confirmation email sent to ${params.email}!`, "success");
      }
    } catch (error) {
      console.error('[Email Notification Error]', error);
    }
  };

  // Security PIN validation handlers
  const handlePinKeyPress = (val: string) => {
    setPinError('');
    let nextInput = pinInput;
    if (val === 'clear') {
      nextInput = '';
    } else if (val === 'delete') {
      nextInput = pinInput.slice(0, -1);
    } else {
      if (pinInput.length >= 4) return;
      nextInput = pinInput + val;
    }
    setPinInput(nextInput);

    if (nextInput.length === 4) {
      if (nextInput === '2233') {
        setIsAdminAuthenticated(true);
        localStorage.setItem('niet_admin_authenticated', 'true');
        setPortalMode('admin');
        setIsPinModalOpen(false);
        triggerToast("🔑 Admin Access Granted. Welcome, Superuser!", "success");
      } else {
        setPinError('Incorrect Passcode');
        triggerToast("❌ Access Denied: Invalid security PIN.", "error");
        setTimeout(() => {
          setPinInput('');
        }, 600);
      }
    }
  };

  useEffect(() => {
    if (!isPinModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handlePinKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        handlePinKeyPress('delete');
      } else if (e.key === 'Escape') {
        setIsPinModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPinModalOpen, pinInput]);

  // Toggle selected room filter
  const handleRoomFilterToggle = (roomName: string) => {
    if (selectedRoomFilters.includes(roomName)) {
      if (selectedRoomFilters.length > 1) {
        setSelectedRoomFilters(selectedRoomFilters.filter(name => name !== roomName));
      } else {
        triggerToast("At least one room filter must be active", "info");
      }
    } else {
      setSelectedRoomFilters([...selectedRoomFilters, roomName]);
    }
  };

  // Open booking modal prefilled
  const openBookingWithPrefill = (roomName: string, slotTime: string, dateStr: string) => {
    if (isSlotInPast(dateStr, slotTime)) {
      triggerToast("Cannot book a slot that has already passed.", "error");
      return;
    }
    setFormRoom(roomName);
    setFormSlots([slotTime]);
    setFormDate(dateStr);
    
    const matchingPersona = personas.find(p => p.name === activeBookerName);
    if (matchingPersona) {
      setFormName(matchingPersona.name);
      setFormEmail(matchingPersona.email || '');
      setFormRole(matchingPersona.role || 'Final Year Student');
    } else {
      setFormName('');
      setFormEmail('');
      setFormRole('Final Year Student');
    }
    
    setFormPurpose('');
    setFormError('');
    setIsModalOpen(true);
  };

  // Open a completely fresh booking request modal
  const openNewRequestModal = () => {
    const todayStr = getLocalDateString();
    const dateToUse = selectedDate < todayStr ? todayStr : selectedDate;
    
    setFormDate(dateToUse);
    setFormRoom(ROOMS[0].name);

    // Find first available non-past slot
    const availableSlots = TIME_SLOTS.filter(s => !isSlotInPast(dateToUse, s));
    if (availableSlots.length > 0) {
      setFormSlots([availableSlots[0]]);
    } else {
      setFormSlots([]);
    }
    
    const matchingPersona = personas.find(p => p.name === activeBookerName);
    if (matchingPersona) {
      setFormName(matchingPersona.name);
      setFormEmail(matchingPersona.email || '');
      setFormRole(matchingPersona.role || 'Final Year Student');
    } else {
      setFormName('');
      setFormEmail('');
      setFormRole('Final Year Student');
    }
    
    setFormPurpose('');
    setFormError('');
    setIsModalOpen(true);
  };

  // Handle slot multi-selection in form
  const handleFormSlotToggle = (slot: string) => {
    if (formSlots.includes(slot)) {
      if (formSlots.length > 1) {
        setFormSlots(formSlots.filter(s => s !== slot));
      }
    } else {
      setFormSlots([...formSlots, slot].sort((a, b) => TIME_SLOTS.indexOf(a) - TIME_SLOTS.indexOf(b)));
    }
  };

  // Validate and submit booking request
  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formName.trim()) {
      setFormError('Please enter your full name.');
      return;
    }
    if (!formEmail.trim() || !formEmail.includes('@')) {
      setFormError('Please enter a valid email address for confirmation notifications.');
      return;
    }
    if (!formPurpose.trim()) {
      setFormError('Please describe the purpose of incubation space usage.');
      return;
    }
    if (formSlots.length === 0) {
      setFormError('Please select at least one time slot.');
      return;
    }

    // Validate if date is in the past
    if (formDate < getLocalDateString()) {
      setFormError('Cannot select a date in the past.');
      return;
    }

    // Validate if any of the selected slots are in the past today
    if (formDate === getLocalDateString()) {
      const hasPastSlot = formSlots.some(s => isSlotInPast(formDate, s));
      if (hasPastSlot) {
        setFormError('One or more of the selected time blocks have already passed today.');
        return;
      }
    }

    // Check overlaps against existing active bookings
    const isOverlapping = bookings.some(b => 
      b.date === formDate &&
      b.room === formRoom &&
      b.slots.some(s => formSlots.includes(s))
    );

    if (isOverlapping) {
      setFormError('This slot is already booked. Please choose another time or room.');
      return;
    }

    const trimmedName = formName.trim();
    const trimmedEmail = formEmail.trim();

    // Dynamically learn new persona if it doesn't exist
    const hasPersona = personas.some(p => p.name.toLowerCase() === trimmedName.toLowerCase());
    if (!hasPersona) {
      const newPersona = {
        name: trimmedName,
        role: formRole,
        email: trimmedEmail
      };
      setPersonas(prev => [...prev, newPersona]);
      setActiveBookerName(trimmedName);
    }

    // Create Booking Request
    const newRequest: ApprovalRequest = {
      id: `r-${Date.now()}`,
      requesterName: trimmedName,
      email: trimmedEmail,
      role: formRole,
      date: formDate,
      room: formRoom,
      slots: [...formSlots],
      purpose: formPurpose.trim(),
      status: 'Pending',
      timestamp: Date.now()
    };

    setRequests(prev => [newRequest, ...prev]);
    setIsModalOpen(false);
    triggerToast("Booking request submitted! Awaiting Superuser approval.", "success");

    // Send async email notification
    sendEmailNotification({
      email: newRequest.email!,
      name: newRequest.requesterName,
      room: newRequest.room,
      date: newRequest.date,
      slots: newRequest.slots,
      status: 'Pending'
    });
  };

  // Admin approval flow
  const handleApproveRequest = (id: string) => {
    const req = requests.find(r => r.id === id);
    if (!req) return;

    // Final double check for overlaps before making booking official
    const isOverlapping = bookings.some(b => 
      b.date === req.date &&
      b.room === req.room &&
      b.slots.some(s => req.slots.includes(s))
    );

    if (isOverlapping) {
      triggerToast("Cannot approve: Overlapping booking already exists in the system.", "error");
      return;
    }

    // Determine color based on room/requester
    const colors: ('red' | 'amber' | 'emerald' | 'slate')[] = ['red', 'amber', 'emerald'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newBooking: Booking = {
      id: `b-${Date.now()}`,
      room: req.room,
      title: req.purpose.length > 20 ? req.purpose.substring(0, 18) + '...' : req.purpose,
      organizer: req.requesterName,
      role: req.role,
      date: req.date,
      slots: req.slots,
      color: req.room === 'Board Room' ? 'slate' : randomColor
    };

    // Update States
    setBookings(prev => [...prev, newBooking]);
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'Approved' } : r));

    triggerToast(`Booking approved for ${req.requesterName}!`, "success");

    // Send async approval email
    if (req.email) {
      sendEmailNotification({
        email: req.email,
        name: req.requesterName,
        room: req.room,
        date: req.date,
        slots: req.slots,
        status: 'Approved'
      });
    }
  };

  // Admin rejection flow
  const handleRejectRequest = (id: string) => {
    const req = requests.find(r => r.id === id);
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'Rejected' } : r));
    triggerToast("Reservation request rejected.", "info");

    // Send async rejection email
    if (req && req.email) {
      sendEmailNotification({
        email: req.email,
        name: req.requesterName,
        room: req.room,
        date: req.date,
        slots: req.slots,
        status: 'Rejected'
      });
    }
  };

  // Admin query details flow
  const handleQueryRequest = (id: string, queryMsg?: string) => {
    const req = requests.find(r => r.id === id);
    if (!req) return;
    
    if (queryMsg !== undefined) {
      setRequests(prev => prev.map(r => r.id === id ? { 
        ...r, 
        status: 'Queried', 
        queryMessage: queryMsg 
      } : r));
      triggerToast(`Query sent to ${req.requesterName}!`, "info");
      setQueryingId(null);
      setQueryText('');

      // Send async query email
      if (req.email) {
        sendEmailNotification({
          email: req.email,
          name: req.requesterName,
          room: req.room,
          date: req.date,
          slots: req.slots,
          status: 'Queried'
        });
      }
      return;
    }

    // Toggle inline query input
    if (queryingId === id) {
      setQueryingId(null);
      setQueryText('');
    } else {
      setQueryingId(id);
      setQueryText("Please provide more details about your meeting purpose and startup requirements.");
    }
  };

  // Booker response/clarification flow
  const handleReplyToQuery = (id: string, replyMsg: string) => {
    setRequests(prev => prev.map(r => r.id === id ? {
      ...r,
      status: 'Pending',
      purpose: `${r.purpose}\n\n[Clarification Reply]: "${replyMsg}"`
    } : r));
    triggerToast("Clarification submitted! Your request is back in the Admin approval queue.", "success");
  };

  // Cancel reservation
  const handleCancelBooking = (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    setBookings(prev => prev.filter(b => b.id !== bookingId));
    triggerToast("Booking canceled successfully.", "info");
  };

  // Delete requests history item
  const handleDeleteRequestItem = (requestId: string) => {
    setRequests(prev => prev.filter(r => r.id !== requestId));
    triggerToast("Request history log removed.", "info");
  };

  // Utility Calculations for Dashboard and Insights
  const activeRequests = requests.filter(r => r.status === 'Pending' || r.status === 'Queried');
  const filteredRequests = requests.filter(r => 
    activeBookerName === 'All Bookers' || r.requesterName.toLowerCase() === activeBookerName.toLowerCase()
  );
  const processedToday = requests.filter(r => r.status !== 'Pending' && r.status !== 'Queried').length;
  const totalApprovedToday = bookings.filter(b => b.date === selectedDate).length;

  // Insight calculations
  const totalBookingsAllTime = bookings.length;
  const roomUtilStats = ROOMS.map(room => {
    const count = bookings.filter(b => b.room === room.name).length;
    return {
      name: room.name,
      count,
      percentage: Math.min(Math.round((count / (totalBookingsAllTime || 1)) * 100), 100)
    };
  });

  const roleStats = () => {
    const counts: { [key: string]: number } = {};
    bookings.forEach(b => {
      counts[b.role] = (counts[b.role] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased selection:bg-red-100 selection:text-red-900">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="fixed top-5 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3.5 bg-white border border-slate-200 rounded-xl shadow-xl max-w-md"
            id="global-toast"
          >
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />}
            {toast.type === 'error' && <XCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />}
            {toast.type === 'info' && <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />}
            <span className="text-sm font-semibold text-slate-800">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Section */}
      <header className="min-h-[72px] md:h-20 bg-white border-b border-slate-200 flex flex-col md:flex-row items-center justify-between px-4 md:px-8 py-3 md:py-0 flex-shrink-0 z-10 sticky top-0 gap-4 md:gap-0 shadow-xs" id="main-header">
        <div className="flex items-center flex-shrink-0">
          <img 
            src="https://niettbi.org/img/logo.png" 
            alt="NIET Technology Business Incubator Logo" 
            className="h-12 sm:h-14 md:h-16 w-auto object-contain transition-all duration-300 hover:scale-[1.01]"
            referrerPolicy="no-referrer"
            id="niet-tbi-logo"
          />
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
          <nav className="flex gap-1.5 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/40">
            <button 
              id="tab-dashboard"
              onClick={() => setActiveTab('dashboard')}
              className={`text-xs md:text-sm font-black px-4.5 py-2 rounded-xl transition-all duration-300 font-display cursor-pointer ${
                activeTab === 'dashboard' 
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-500/15' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              Dashboard
            </button>
            <button 
              id="tab-bookings"
              onClick={() => setActiveTab('my-bookings')}
              className={`text-xs md:text-sm font-black px-4.5 py-2 rounded-xl transition-all duration-300 font-display cursor-pointer ${
                activeTab === 'my-bookings' 
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-500/15' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              My Bookings
            </button>
            <button 
              id="tab-insights"
              onClick={() => setActiveTab('insights')}
              className={`text-xs md:text-sm font-black px-4.5 py-2 rounded-xl transition-all duration-300 font-display cursor-pointer ${
                activeTab === 'insights' 
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-500/15' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              Insights
            </button>
          </nav>
          
          <div className="hidden lg:block h-8 w-px bg-slate-200/80"></div>
          
          <div className="flex items-center gap-2">
            {/* Active Booker Profile Selection - Only visible in booker mode */}
            {portalMode === 'booker' && (
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-extrabold px-1.5 uppercase tracking-wider hidden sm:inline">Active User:</span>
                <select
                  value={activeBookerName}
                  onChange={(e) => {
                    const selected = e.target.value;
                    if (selected === '__create_new__') {
                      setPersonaFormName('');
                      setPersonaFormEmail('');
                      setPersonaFormRole('Student Startup');
                      setPersonaFormPIN('');
                      setPersonaFormError('');
                      setIsCreatePersonaModalOpen(true);
                    } else if (selected === 'All Bookers') {
                      setActiveBookerName('All Bookers');
                      triggerToast("Now viewing all bookings globally (Shared Observer).", "info");
                    } else {
                      const targetPersona = personas.find(p => p.name === selected);
                      if (targetPersona) {
                        setVerificationPersona(targetPersona);
                        setVerificationPin('');
                        setVerificationError('');
                        setIsVerificationModalOpen(true);
                      }
                    }
                  }}
                  className="bg-white text-slate-800 text-[11px] font-black border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer hover:border-slate-300 max-w-[150px] md:max-w-[200px]"
                >
                  <option value="All Bookers">👥 All Bookers (Shared)</option>
                  {personas.map(p => (
                    <option key={p.name} value={p.name}>👤 {p.name}</option>
                  ))}
                  <option value="__create_new__">➕ Create Persona...</option>
                </select>
              </div>
            )}

            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1" id="view-mode-selector">
              <button 
                id="mode-booker"
                onClick={() => {
                  setPortalMode('booker');
                  triggerToast("Switched to Booker View. Click any slot to request!", "success");
                }}
                className={`flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  portalMode === 'booker' 
                    ? 'bg-red-600 text-white shadow-sm' 
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                Booker View
              </button>
              <button 
                id="mode-admin"
                onClick={() => {
                  if (isAdminAuthenticated) {
                    setPortalMode('admin');
                    triggerToast("Switched to Superuser Admin View. Review the approval queue!", "info");
                  } else {
                    setPinInput('');
                    setPinError('');
                    setIsPinModalOpen(true);
                  }
                }}
                className={`flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  portalMode === 'admin' 
                    ? 'bg-red-600 text-white shadow-sm' 
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                <Building className="w-3.5 h-3.5" />
                <span>Admin Queue</span>
                {!isAdminAuthenticated && <Lock className="w-3 h-3 text-slate-400 ml-0.5 flex-shrink-0" />}
              </button>
            </div>

            <button
              onClick={() => setShowRoleSelector(true)}
              className="p-1.5 bg-slate-100 border border-slate-200 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer flex items-center justify-center"
              title="Configure Portal Onboarding"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {isAdminAuthenticated && (
              <button
                onClick={() => {
                  setIsAdminAuthenticated(false);
                  localStorage.removeItem('niet_admin_authenticated');
                  setPortalMode('booker');
                  triggerToast("Superuser session logged out and locked successfully.", "success");
                }}
                className="p-1.5 bg-slate-100 border border-slate-200 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                title="Lock Admin Queue"
              >
                <Unlock className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative" id="portal-body">
        
        {/* Dynamic Workspace Container depending on active Tab */}
        
        {/* ==================== VIEW 1: DASHBOARD ==================== */}
        {activeTab === 'dashboard' && (
          <>
            {/* Sidebar Controls */}
            <aside className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-slate-200 p-6 flex flex-col gap-6 md:gap-8 flex-shrink-0 overflow-y-auto" id="left-sidebar">
              
              {/* Action Button - Moved to Top */}
              <div>
                <button 
                  id="btn-request-booking"
                  onClick={openNewRequestModal}
                  className="w-full bg-red-600 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-red-100 hover:bg-red-700 hover:shadow-red-200 active:scale-[0.98] hover:scale-[1.01] transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Request Booking
                </button>
              </div>

              <div className="h-px bg-slate-100"></div>

              {/* Interactive Calendar Select Date */}
              <section>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select Date</h3>
                  <CalendarIcon className="w-4 h-4 text-slate-400" />
                </div>
                
                {/* Horizontal scroll on mobile, list stack on desktop */}
                <div className="flex md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
                  {dates.map((d) => {
                    const isSelected = selectedDate === d.value;
                    const dateBookingsCount = bookings.filter(b => b.date === d.value).length;

                    return (
                      <button
                        key={d.value}
                        onClick={() => setSelectedDate(d.value)}
                        className={`text-left p-3 rounded-xl border flex-shrink-0 transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-red-600 border-red-600 text-white shadow-md shadow-red-100' 
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                        style={{ minWidth: '120px' }}
                      >
                        <p className={`text-xs font-bold ${isSelected ? 'text-red-100' : 'text-slate-500'}`}>
                          {d.label} {d.isToday && <span className="text-[10px] bg-red-500 text-white px-1 py-0.5 rounded ml-1 font-bold">Today</span>}
                        </p>
                        <p className={`text-sm font-black mt-1 ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                          {dateBookingsCount} Reserved
                        </p>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Room Filters */}
              <section>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Room Filters</h3>
                  <Filter className="w-4 h-4 text-slate-400" />
                </div>
                
                <div className="space-y-2">
                  {ROOMS.map((room) => {
                    const isChecked = selectedRoomFilters.includes(room.name);
                    return (
                      <label 
                        key={room.id}
                        className={`flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer ${
                          isChecked 
                            ? 'bg-slate-50 border-slate-200' 
                            : 'border-transparent hover:bg-slate-50 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input 
                             type="checkbox" 
                             checked={isChecked} 
                             onChange={() => handleRoomFilterToggle(room.name)}
                             className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
                           />
                           <div>
                             <span className="text-xs font-bold text-slate-800 block">{room.name}</span>
                             <span className="text-[10px] text-slate-500 font-medium">Max {room.capacity} seats</span>
                           </div>
                         </div>
                       </label>
                     );
                   })}
                </div>
              </section>
            </aside>

            {/* Main Content Area: Grid View */}
            <main className="flex-1 p-4 md:p-6 flex flex-col overflow-y-auto" id="main-content">
              
              {/* Header Title Bar */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 mb-6">
                <div>
                  <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight font-display bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                    Incubation Space Schedule
                  </h2>
                  <p className="text-xs md:text-sm text-slate-500 font-bold mt-1">
                    Real-time availability for NIET Faculty, Incubatees, &amp; Students (Viewing: <span className="font-extrabold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-md border border-red-100">{selectedDate}</span>)
                  </p>
                </div>
                
                {/* Visual Guide Indicators */}
                <div className="flex flex-wrap gap-2.5 text-[10px] font-black text-slate-500 bg-white border border-slate-200/80 px-3.5 py-2 rounded-xl shadow-3xs">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-100 border-2 border-red-400"></span> Faculty</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-100 border-2 border-amber-400"></span> Student</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-100 border-2 border-emerald-400"></span> Incubatee</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-100 border-2 border-slate-400"></span> Blocked</span>
                </div>
              </div>

              {/* Booker Action Required Queries Banner */}
              {portalMode === 'booker' && activeBookerName !== 'All Bookers' && requests.filter(r => r.status === 'Queried' && r.requesterName.toLowerCase() === activeBookerName.toLowerCase()).length > 0 && (
                <div className="mb-6 bg-amber-50/90 border-2 border-amber-300 rounded-2xl p-4 shadow-md">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-100 text-amber-700 rounded-xl flex-shrink-0">
                      <HelpCircle className="w-5 h-5 text-amber-600 animate-pulse" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-black text-amber-900">⚠️ Clarification Requested by Admin</h4>
                      <p className="text-xs text-amber-800 font-medium mt-0.5">
                        The Superuser Administrator requires additional details to approve your request(s). Please submit a clarification response below:
                      </p>
                      
                      <div className="mt-3 space-y-3">
                        {requests.filter(r => r.status === 'Queried' && r.requesterName.toLowerCase() === activeBookerName.toLowerCase()).map((req) => (
                          <div key={req.id} className="bg-white border border-amber-200 rounded-xl p-3 shadow-3xs max-w-2xl">
                            <div className="flex justify-between items-start flex-wrap gap-1">
                              <span className="font-extrabold text-xs text-slate-800">{req.room}</span>
                              <div className="flex gap-1.5 items-center">
                                {activeBookerName === 'All Bookers' && (
                                  <span className="text-[9px] bg-red-100 text-red-800 px-2 py-0.5 rounded font-extrabold">For: {req.requesterName}</span>
                                )}
                                <span className="text-[9px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-black">{req.date} &bull; {req.slots[0]}</span>
                              </div>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1 italic">Original Purpose: "{req.purpose}"</p>
                            
                            <div className="mt-2 bg-amber-50/50 border-l-4 border-amber-500 p-2 rounded text-xs">
                              <p className="font-extrabold text-amber-900">Admin Question:</p>
                              <p className="text-amber-950 font-medium italic mt-0.5">"{req.queryMessage}"</p>
                            </div>
                            
                            <div className="mt-3">
                              {replyingId === req.id ? (
                                <div className="flex flex-col gap-2 mt-2 max-w-xl">
                                  <textarea
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    rows={2}
                                    className="w-full text-xs p-2 border border-amber-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white text-slate-900"
                                    placeholder="Type your response to the Administrator..."
                                  />
                                  <div className="flex gap-2 justify-end">
                                    <button
                                      onClick={() => {
                                        setReplyingId(null);
                                        setReplyText('');
                                      }}
                                      className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() => {
                                        handleReplyToQuery(req.id, replyText.trim());
                                        setReplyingId(null);
                                        setReplyText('');
                                      }}
                                      disabled={!replyText.trim()}
                                      className="px-3.5 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-lg cursor-pointer shadow-sm"
                                    >
                                      Submit Reply
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setReplyingId(req.id);
                                    setReplyText('');
                                  }}
                                  className="bg-amber-600 hover:bg-amber-700 active:scale-[0.97] text-white font-extrabold px-3.5 py-1.5 rounded-lg transition-all text-xs cursor-pointer shadow-sm"
                                >
                                  Submit Clarification Details
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Booker Guidance Banner - Answers user question: Where is the page visible to those who want to book? */}
              {portalMode === 'booker' ? (() => {
                const persona = personas.find(p => p.name === activeBookerName);
                return (
                  <div className="mb-6 bg-gradient-to-r from-red-50/40 to-slate-50/40 backdrop-blur-md border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all duration-300 hover:shadow-lg hover:shadow-red-500/5 hover:border-red-200/60" id="booker-portal-guide">
                    <div className="flex gap-4 items-center w-full sm:w-auto">
                      <div className="relative flex items-center justify-center">
                        <span className="absolute inline-flex h-10 w-10 rounded-xl bg-red-400 opacity-20 animate-ping"></span>
                        <div className="relative p-2.5 bg-gradient-to-tr from-red-500 to-rose-600 text-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-red-500/20">
                          <Sparkles className="w-5 h-5" />
                        </div>
                      </div>
                      <div>
                        <h4 className="text-base font-extrabold text-slate-800 tracking-tight">
                          {activeBookerName === 'All Bookers' ? '👋 Welcome to the Booker Portal' : `👋 Welcome, ${activeBookerName}`}
                        </h4>
                        {persona && (
                          <p className="text-[10.5px] text-slate-500 font-bold mt-0.5 flex items-center gap-1.5">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span>Active Persona: <span className="text-red-600">{persona.role}</span></span>
                            <span className="text-slate-300">&bull;</span>
                            <span className="text-slate-400 font-mono text-[9px]">{persona.email}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-3 flex-shrink-0 w-full sm:w-auto justify-end">
                      <button 
                        onClick={() => setActiveTab('my-bookings')}
                        className="flex-1 sm:flex-none text-xs bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50 font-bold px-4.5 py-2.5 rounded-xl border border-slate-200/80 transition-all duration-250 shadow-xs hover:shadow-md cursor-pointer active:scale-98"
                      >
                        {activeBookerName === 'All Bookers' ? 'Track All Bookings' : 'Track My Bookings'}
                      </button>
                      <button 
                        onClick={openNewRequestModal}
                        className="flex-1 sm:flex-none text-xs bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold px-4.5 py-2.5 rounded-xl transition-all duration-250 shadow-md shadow-red-500/25 hover:shadow-lg hover:shadow-red-500/35 active:scale-98 cursor-pointer"
                      >
                        Request Reservation
                      </button>
                    </div>
                  </div>
                );
              })() : (
                <div className="mb-6 bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-start gap-3" id="admin-portal-guide">
                  <div className="p-2 bg-slate-800 text-red-400 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Building className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">🔑 Superuser Administrator Panel Active</h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      You are in <span className="text-slate-200 font-medium">Superuser Admin mode</span>. The right sidebar displays the real-time <span className="text-slate-200 font-medium">Approval Queue</span>. Click <span className="text-red-400 font-medium">Approve</span> to instantly place a confirmed session, or <span className="text-slate-400 font-medium">Reject</span> to deny. Use <span className="text-slate-200 font-medium">Booker View</span> at the top right to simulate requests.
                    </p>
                  </div>
                </div>
              )}

              {/* Dynamic Room Availability Grid */}
              <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-sm flex flex-col flex-1 min-w-[700px] md:min-w-0" id="schedule-grid-container">
                
                {/* Grid header row */}
                <div className="grid grid-cols-6 border-b border-slate-200 bg-slate-50/70 backdrop-blur-xs">
                  <div className="p-4 border-r border-slate-200 font-display font-black text-[11px] text-slate-500 uppercase tracking-widest flex items-center justify-center">
                    Workspace
                  </div>
                  {TIME_SLOTS.map((slot) => (
                    <div key={slot} className="p-4 text-center text-xs font-black text-slate-600 uppercase tracking-wide border-r last:border-r-0 border-slate-200/50">
                      <div className="flex justify-center items-center gap-1.5 font-display text-slate-700">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{slot}</span>
                      </div>
                      <span className="text-[9px] text-slate-400 block font-bold tracking-tight mt-0.5 font-mono uppercase bg-slate-100/60 inline-block px-1.5 py-0.5 rounded-md">1.5 Hr Block</span>
                    </div>
                  ))}
                </div>

                {/* Grid row contents */}
                <div className="divide-y divide-slate-100 flex-1 flex flex-col justify-stretch">
                  {ROOMS.filter(r => selectedRoomFilters.includes(r.name)).map((room) => {
                    // Collect active bookings for this room and selected date
                    const activeBookings = bookings.filter(b => b.room === room.name && b.date === selectedDate);
                    
                    // Generate list of blocks using spanning algorithm
                    const renderedCells: React.ReactNode[] = [];
                    let skipCount = 0;

                    for (let i = 0; i < TIME_SLOTS.length; i++) {
                      if (skipCount > 0) {
                        skipCount--;
                        continue;
                      }

                      const slot = TIME_SLOTS[i];
                      // Find if a booking covers this slot
                      const activeBooking = activeBookings.find(b => b.slots.includes(slot));

                      if (activeBooking) {
                        // Find how many consecutive slots this booking spans in our schedule list starting from i
                        let span = 1;
                        for (let j = i + 1; j < TIME_SLOTS.length; j++) {
                          if (activeBooking.slots.includes(TIME_SLOTS[j])) {
                            span++;
                          } else {
                            break;
                          }
                        }

                        // Determine styles based on booking's color
                        let cardStyle = '';
                        let textStyle = '';
                        let barColor = '';
                        let borderStyle = '';

                        if (activeBooking.color === 'red') {
                          cardStyle = 'bg-gradient-to-br from-red-50/90 to-rose-50/40 hover:from-red-50 hover:to-rose-50 border-red-200/80 hover:border-red-300';
                          textStyle = 'text-red-900';
                          barColor = 'bg-gradient-to-b from-red-500 to-rose-600';
                          borderStyle = 'border-red-100';
                        } else if (activeBooking.color === 'amber') {
                          cardStyle = 'bg-gradient-to-br from-amber-50/90 to-yellow-50/40 hover:from-amber-50 hover:to-yellow-50 border-amber-200/80 hover:border-amber-300';
                          textStyle = 'text-amber-900';
                          barColor = 'bg-gradient-to-b from-amber-500 to-yellow-600';
                          borderStyle = 'border-amber-100';
                        } else if (activeBooking.color === 'emerald') {
                          cardStyle = 'bg-gradient-to-br from-emerald-50/90 to-teal-50/40 hover:from-emerald-50 hover:to-teal-50 border-emerald-200/80 hover:border-emerald-300';
                          textStyle = 'text-emerald-900';
                          barColor = 'bg-gradient-to-b from-emerald-500 to-teal-600';
                          borderStyle = 'border-emerald-100';
                        } else {
                          cardStyle = 'bg-gradient-to-br from-slate-100/95 to-slate-50/80 border-slate-200 opacity-80';
                          textStyle = 'text-slate-700';
                          barColor = 'bg-gradient-to-b from-slate-400 to-slate-500';
                          borderStyle = 'border-slate-200';
                        }

                        renderedCells.push(
                          <div 
                            key={`booking-${activeBooking.id}`} 
                            className="p-2 border-r last:border-r-0 border-slate-100 h-full flex items-stretch"
                            style={{ gridColumn: `span ${span} / span ${span}` }}
                          >
                            <motion.div 
                              whileHover={{ y: -1, scale: 1.005 }}
                              transition={{ type: "spring", stiffness: 450, damping: 25 }}
                              className={`w-full rounded-2xl border p-3 relative overflow-hidden flex flex-col justify-between group cursor-default shadow-3xs hover:shadow-2xs transition-all ${cardStyle}`}
                            >
                              {/* Edge left color border */}
                              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${barColor}`}></div>
                              
                              <div>
                                <div className="flex justify-between items-start gap-1">
                                  <p className={`text-xs font-black truncate leading-snug font-display ${textStyle}`}>
                                    {activeBooking.title}
                                  </p>
                                  {activeBooking.color !== 'slate' && (portalMode === 'admin' || (activeBookerName !== 'All Bookers' && activeBooking.organizer.toLowerCase() === activeBookerName.toLowerCase())) && (
                                    <div className="flex gap-1 items-center z-10">
                                      {cancelingBookingId === activeBooking.id ? (
                                        <div className="flex gap-1 animate-fade-in">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleCancelBooking(activeBooking.id);
                                              setCancelingBookingId(null);
                                            }}
                                            className="bg-rose-600 text-white font-black text-[8px] tracking-wider uppercase px-1.5 py-0.5 rounded shadow-xs cursor-pointer hover:bg-rose-700 active:scale-95 transition-all"
                                            title="Confirm Cancel"
                                          >
                                            Cancel?
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setCancelingBookingId(null);
                                            }}
                                            className="bg-slate-300/80 text-slate-800 font-extrabold text-[8px] px-1.5 py-0.5 rounded shadow-xs cursor-pointer hover:bg-slate-400 active:scale-95 transition-all"
                                            title="Keep Booking"
                                          >
                                            No
                                          </button>
                                        </div>
                                      ) : (
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setCancelingBookingId(activeBooking.id);
                                          }}
                                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-600 rounded transition-all cursor-pointer bg-white/70 hover:bg-white shadow-3xs"
                                          title="Cancel Booking"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <p className={`text-[10px] font-bold opacity-80 mt-1 leading-none flex items-center gap-1 ${textStyle}`}>
                                  <User className="w-3 h-3 opacity-60" />
                                  <span>{activeBooking.organizer}</span>
                                </p>
                              </div>

                              <div className="flex justify-between items-center text-[9px] font-black mt-2.5 pt-2 border-t border-slate-100/40">
                                <span className={`uppercase tracking-wider px-1.5 py-0.5 rounded font-mono ${
                                  activeBooking.color === 'red' ? 'bg-red-900/10 text-red-900' :
                                  activeBooking.color === 'amber' ? 'bg-amber-900/10 text-amber-900' :
                                  activeBooking.color === 'emerald' ? 'bg-emerald-900/10 text-emerald-900' :
                                  'bg-slate-900/10 text-slate-900'
                                }`}>{activeBooking.role}</span>
                                <span className="bg-white/80 backdrop-blur-xs px-1.5 py-0.5 rounded-md border border-slate-200/50 text-slate-600 font-mono font-bold flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5" />
                                  <span>{span * 1.5} hrs</span>
                                </span>
                              </div>
                            </motion.div>
                          </div>
                        );

                        skipCount = span - 1;
                      } else {
                        const isPast = isSlotInPast(selectedDate, slot);

                        if (isPast) {
                          // Render past slot as non-interactive/closed
                          renderedCells.push(
                            <div 
                              key={`passed-${room.id}-${slot}`}
                              className="p-2 border-r last:border-r-0 border-slate-100 h-full flex items-stretch select-none"
                              style={{ gridColumn: 'span 1 / span 1' }}
                            >
                              <div className="w-full h-full bg-slate-50/40 rounded-2xl flex flex-col items-center justify-center p-2 border border-slate-100 text-center">
                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none font-mono">
                                  Past / Closed
                                </span>
                              </div>
                            </div>
                          );
                        } else {
                          // Render interactive Available Slot
                          renderedCells.push(
                            <div 
                              key={`available-${room.id}-${slot}`}
                              className="p-2 border-r last:border-r-0 border-slate-100 h-full flex items-stretch"
                              style={{ gridColumn: 'span 1 / span 1' }}
                            >
                              <button
                                onClick={() => openBookingWithPrefill(room.name, slot, selectedDate)}
                                className="w-full h-full border border-dashed border-slate-200 hover:border-red-400 hover:bg-red-50/20 rounded-2xl flex flex-col items-center justify-center transition-all p-2 group cursor-pointer"
                              >
                                <Plus className="w-4 h-4 text-slate-300 group-hover:text-red-500 group-hover:scale-110 transition-all" />
                                <span className="text-[10px] font-black text-slate-300 group-hover:text-red-600 uppercase tracking-wide mt-1">
                                  Available
                                </span>
                              </button>
                            </div>
                          );
                        }
                      }
                    }

                    return (
                      <div key={room.id} className="grid grid-cols-6 items-stretch min-h-[100px]">
                        {/* Column 1: Room Label block */}
                        <div className="p-4 border-r border-slate-200 bg-slate-50/10 flex flex-col justify-center gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${
                              room.name === 'Board Room' ? 'bg-slate-500' :
                              room.name === 'Meeting Room 1' ? 'bg-indigo-500' : 'bg-emerald-500'
                            }`}></span>
                            <span className="text-xs font-black text-slate-800 tracking-tight leading-tight block font-display">
                              {room.name}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 text-[9px] font-extrabold text-slate-600 font-mono">
                              <Users className="w-2.5 h-2.5 text-slate-400" />
                              {room.capacity} seats
                            </span>
                            <span className="inline-flex items-center bg-slate-100 text-[9px] font-extrabold text-slate-500 px-1.5 py-0.5 rounded-md">
                              {room.location.split(',')[0]}
                            </span>
                          </div>
                        </div>

                        {/* Columns 2-6: Interactive Dynamic grid cells */}
                        {renderedCells}
                      </div>
                    );
                  })}
                </div>
              </div>
            </main>

            {/* Dynamic Right Panel based on Portal Mode */}
            {portalMode === 'admin' ? (
              <section className="w-full md:w-[320px] bg-white border-t md:border-t-0 md:border-l border-slate-200 flex flex-col flex-shrink-0" id="approval-queue">
                <div className="p-5 border-b border-slate-100">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="text-sm font-bold text-slate-950 uppercase tracking-tight">Approval Queue</h3>
                    <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-black tracking-wide">
                      {activeRequests.length} PENDING
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">Superuser review and booking authorization console</p>
                </div>
                
                <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto" id="queue-items">
                  <AnimatePresence initial={false}>
                    {activeRequests.length === 0 ? (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="h-full flex flex-col items-center justify-center text-center p-6"
                      >
                        <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                          <Check className="w-6 h-6 text-emerald-600" />
                        </div>
                        <p className="text-xs font-bold text-slate-800">Queue is Clear</p>
                        <p className="text-[11px] text-slate-500 mt-1 max-w-[200px]">
                          All incubator reservations have been processed. Excellent!
                        </p>
                      </motion.div>
                    ) : (
                      activeRequests.map((req) => (
                        <motion.div 
                          key={req.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20, scale: 0.95 }}
                          className={`border rounded-xl p-4 shadow-sm transition-all flex flex-col ${
                            req.status === 'Queried' 
                              ? 'bg-purple-50/40 border-purple-200 hover:border-purple-300' 
                              : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex justify-between mb-2 items-start">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-bold text-slate-900 leading-tight truncate max-w-[120px]" title={req.requesterName}>
                                  {req.requesterName}
                                </p>
                                {req.status === 'Queried' && (
                                  <span className="text-[8px] font-extrabold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded uppercase tracking-wide">
                                    Queried
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-red-600 font-extrabold uppercase tracking-wide mt-0.5">
                                {req.role}
                              </p>
                              {req.email && (
                                <p className="text-[10px] text-slate-500 font-medium lowercase truncate max-w-[130px]" title={req.email}>
                                  {req.email}
                                </p>
                              )}
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-xs font-bold text-slate-900">{req.slots[0]}</p>
                              <p className="text-[9px] text-slate-500 mt-0.5 truncate max-w-[100px]" title={req.room}>
                                {req.room}
                              </p>
                            </div>
                          </div>

                          <div className="bg-white border border-slate-100 p-2.5 rounded-lg mb-2">
                            <p className="text-[11px] text-slate-600 italic leading-snug">
                              &ldquo;{req.purpose}&rdquo;
                            </p>
                          </div>

                          {req.status === 'Queried' && req.queryMessage && (
                            <div className="bg-purple-100/40 border border-purple-200/80 p-2 rounded-lg text-[10px] text-purple-950 mb-3">
                              <p className="font-extrabold text-purple-800">Your query:</p>
                              <p className="italic font-medium">"{req.queryMessage}"</p>
                            </div>
                          )}

                          {queryingId === req.id && (
                            <div className="bg-amber-50/70 border border-amber-200 p-2.5 rounded-lg text-[10px] text-slate-700 mb-3 flex flex-col gap-1.5">
                              <p className="font-bold text-amber-800">Ask for Clarification Details:</p>
                              <textarea
                                value={queryText}
                                onChange={(e) => setQueryText(e.target.value)}
                                rows={2}
                                className="w-full text-[11px] p-1.5 border border-amber-300 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500 font-sans bg-white text-slate-900"
                                placeholder="Enter query message..."
                              />
                              <div className="flex gap-1.5 justify-end">
                                <button
                                  onClick={() => {
                                    setQueryingId(null);
                                    setQueryText('');
                                  }}
                                  className="px-2 py-1 text-[9px] font-bold text-slate-500 hover:bg-slate-100 rounded cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleQueryRequest(req.id, queryText.trim())}
                                  disabled={!queryText.trim()}
                                  className="px-2.5 py-1 text-[9px] font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded cursor-pointer"
                                >
                                  Send Query
                                </button>
                              </div>
                            </div>
                          )}

                          <div className="flex gap-2 mt-auto">
                            <button 
                              onClick={() => handleRejectRequest(req.id)}
                              className="flex-1 bg-white border border-slate-200 py-2 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 active:scale-[0.97] transition-all cursor-pointer"
                            >
                              Reject
                            </button>
                            <button 
                              onClick={() => handleQueryRequest(req.id)}
                              className={`flex-1 border py-2 rounded-lg text-xs font-bold active:scale-[0.97] transition-all cursor-pointer ${
                                req.status === 'Queried'
                                  ? 'bg-purple-100/70 border-purple-200 text-purple-700 hover:bg-purple-200'
                                  : 'bg-white border-slate-200 text-amber-600 hover:bg-amber-50'
                              }`}
                            >
                              {req.status === 'Queried' ? 'Re-Query' : 'Query'}
                            </button>
                            <button 
                              onClick={() => handleApproveRequest(req.id)}
                              className="flex-1 bg-red-600 py-2 rounded-lg text-xs font-bold text-white shadow-sm shadow-red-100 hover:bg-red-700 active:scale-[0.97] transition-all cursor-pointer"
                            >
                              Approve
                            </button>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </div>

                {/* Sidebar bottom summary */}
                <div className="p-4 bg-slate-50 border-t border-slate-200">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold uppercase">
                    <span>Queue speed: <span className="text-emerald-600 font-bold">Fast (~3m)</span></span>
                    <span>{processedToday} processed today</span>
                  </div>
                </div>
              </section>
            ) : (
              // Booker View Side Directory & Amenities Check
              <section className="w-full md:w-[320px] bg-white border-t md:border-t-0 md:border-l border-slate-200 flex flex-col flex-shrink-0 animate-fade-in" id="booker-room-directory">
                {/* Active Simulated Session Card */}
                <div className="p-4 bg-slate-50 border-b border-slate-200" id="active-session-card">
                  <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-3xs hover:border-red-200 hover:shadow-2xs transition-all duration-300">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase">Simulated Session</span>
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${
                        activeBookerName === 'All Bookers' ? 'bg-slate-100 text-slate-600' : 'bg-red-50 text-red-600'
                      }`}>
                        {activeBookerName === 'All Bookers' ? 'Observer' : 'Active Profile'}
                      </span>
                    </div>

                    <div className="flex gap-3 items-center">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white flex-shrink-0 shadow-inner ${
                        activeBookerName === 'All Bookers' 
                          ? 'bg-gradient-to-br from-slate-400 to-slate-500' 
                          : 'bg-gradient-to-br from-red-500 to-rose-600'
                      }`}>
                        {activeBookerName === 'All Bookers' ? 'ALL' : activeBookerName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-black text-slate-800 truncate leading-tight">
                          {activeBookerName}
                        </h4>
                        {activeBookerName !== 'All Bookers' ? (() => {
                          const p = personas.find(pers => pers.name === activeBookerName);
                          return (
                            <>
                              <p className="text-[10px] text-red-600 font-extrabold truncate mt-0.5">{p?.role || 'Booker Persona'}</p>
                              <p className="text-[9px] text-slate-400 font-mono truncate">{p?.email || ''}</p>
                            </>
                          );
                        })() : (
                          <p className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">
                            Guest mode. Switch to a persona to book or reply.
                          </p>
                        )}
                      </div>
                    </div>

                    {activeBookerName !== 'All Bookers' && (
                      <div className="grid grid-cols-3 gap-1.5 mt-3 pt-3 border-t border-slate-100 text-center">
                        <div>
                          <p className="text-[10.5px] font-black text-slate-800">{bookings.filter(b => b.organizer.toLowerCase() === activeBookerName.toLowerCase()).length}</p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">Active</p>
                        </div>
                        <div>
                          <p className="text-[10.5px] font-black text-slate-800">{requests.filter(r => r.requesterName.toLowerCase() === activeBookerName.toLowerCase() && r.status === 'Pending').length}</p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">Pending</p>
                        </div>
                        <div className="relative">
                          {requests.filter(r => r.requesterName.toLowerCase() === activeBookerName.toLowerCase() && r.status === 'Queried').length > 0 && (
                            <span className="absolute top-0 right-1 w-1.5 h-1.5 rounded-full bg-purple-600 animate-ping"></span>
                          )}
                          <p className={`text-[10.5px] font-black ${
                            requests.filter(r => r.requesterName.toLowerCase() === activeBookerName.toLowerCase() && r.status === 'Queried').length > 0 ? 'text-purple-600 font-black' : 'text-slate-800'
                          }`}>
                            {requests.filter(r => r.requesterName.toLowerCase() === activeBookerName.toLowerCase() && r.status === 'Queried').length}
                          </p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">Queries</p>
                        </div>
                      </div>
                    )}

                    <div className="mt-3">
                      <button 
                        onClick={() => setIsProfileSwitcherOpen(true)}
                        className="w-full text-center text-[10px] bg-slate-50 hover:bg-slate-100 text-slate-700 font-extrabold py-2 px-3 rounded-lg border border-slate-200 transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-98"
                      >
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        <span>Switch Profile...</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-5 border-b border-slate-100 bg-red-50/20">
                  <h3 className="text-sm font-bold text-slate-950 uppercase tracking-tight flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-red-600" /> Room Specifications
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Available incubator spaces &amp; custom resources</p>
                </div>

                <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto" id="room-features-list">
                  {ROOMS.map((room) => (
                    <div key={room.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-2xs hover:border-slate-300 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-black text-slate-800">{room.name}</span>
                        <span className="bg-red-50 border border-red-100 text-red-700 text-[10px] font-black px-2 py-0.5 rounded-lg flex items-center gap-1">
                          <Users className="w-3 h-3" /> {room.capacity} seats
                        </span>
                      </div>
                      
                      <p className="text-[11px] text-slate-500 font-medium">{room.location}</p>
                      
                      {/* Amenities items list */}
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {room.amenities.map((item) => (
                          <span key={item} className="text-[10px] bg-white border border-slate-200 text-slate-700 px-2 py-1 rounded-md font-bold shadow-3xs">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Dynamic tracking list helper inside the sidebar */}
                  <div className="mt-2 pt-4 border-t border-slate-100">
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                      Your Quick Status Tracker
                    </h4>
                    {filteredRequests.slice(0, 3).map((req) => (
                      <div key={req.id} className="bg-white border border-slate-100 rounded-xl p-2.5 mb-2 shadow-3xs">
                        <div className="flex items-center justify-between">
                          <div className="truncate max-w-[170px]">
                            <p className="text-xs font-bold text-slate-800 truncate leading-none">{req.room}</p>
                            <p className="text-[10px] text-red-600 font-extrabold mt-1 truncate leading-none">By: {req.requesterName}</p>
                            <p className="text-[9px] text-slate-400 mt-1 font-semibold">{req.date} &bull; {req.slots[0]}</p>
                          </div>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${
                            req.status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                            req.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                            req.status === 'Queried' ? 'bg-purple-100 text-purple-800' :
                            'bg-rose-100 text-rose-800'
                          }`}>
                            {req.status}
                          </span>
                        </div>
                        {req.status === 'Queried' && req.queryMessage && (
                          <div className="mt-2 bg-purple-50 border border-purple-100 p-2 rounded-lg text-[10px]">
                            <p className="font-extrabold text-purple-800 leading-tight">Admin Question:</p>
                            <p className="text-purple-950 italic mt-0.5 mb-1.5 line-clamp-2">"{req.queryMessage}"</p>
                            
                            {replyingId === req.id ? (
                              <div className="flex flex-col gap-1 mt-1.5">
                                <textarea
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  rows={2}
                                  className="w-full text-[10px] p-1.5 border border-purple-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white text-slate-900 font-sans"
                                  placeholder="Type clarification reply..."
                                />
                                <div className="flex gap-1.5 justify-end">
                                  <button
                                    onClick={() => {
                                      setReplyingId(null);
                                      setReplyText('');
                                    }}
                                    className="px-1.5 py-0.5 text-[9px] font-bold text-slate-500 hover:bg-purple-100/50 rounded cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleReplyToQuery(req.id, replyText.trim());
                                      setReplyingId(null);
                                      setReplyText('');
                                    }}
                                    disabled={!replyText.trim()}
                                    className="px-2 py-0.5 text-[9px] font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded cursor-pointer"
                                  >
                                    Submit
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setReplyingId(req.id);
                                  setReplyText('');
                                }}
                                className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold px-2 py-1 rounded-md transition-all text-[9px] cursor-pointer"
                              >
                                Reply Now
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    {requests.length > 3 && (
                      <button 
                        onClick={() => setActiveTab('my-bookings')}
                        className="text-[11px] font-bold text-red-600 hover:text-red-800 hover:underline mt-1 flex items-center gap-1 cursor-pointer"
                      >
                        View all {requests.length} requests <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                    {requests.length === 0 && (
                      <div className="bg-white border border-dashed border-slate-200 rounded-xl p-3 text-center text-slate-400 text-[11px]">
                        No active booking requests in this session.
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-red-50/30 border-t border-red-100/50">
                  <p className="text-[10px] text-red-700 font-bold leading-tight flex items-start gap-1">
                    <Info className="w-3.5 h-3.5 flex-shrink-0 text-red-500 mt-0.5" />
                    <span>Clicking on any cell on the schedule grid automatically starts a pre-filled booking request form.</span>
                  </p>
                </div>
              </section>
            )}
          </>
        )}

        {/* ==================== VIEW 2: MY BOOKINGS ==================== */}
        {activeTab === 'my-bookings' && (
          <div className="flex-1 p-6 flex flex-col overflow-y-auto" id="my-bookings-container">
            <div className="max-w-4xl mx-auto w-full">
              <div className="mb-6 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Reservation Tracker</h2>
                  <p className="text-sm text-slate-500 mt-1">Track authorization statuses and history log of incubator spaces.</p>
                </div>
                
                <button 
                  onClick={openNewRequestModal}
                  className="bg-red-600 text-white font-semibold py-2 px-4 rounded-lg shadow hover:bg-red-700 transition-all text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> New Request
                </button>
              </div>

              {/* Requests Logs List */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {activeBookerName === 'All Bookers' 
                      ? `Historical Log (${requests.length} Requests)` 
                      : `My Requests (${filteredRequests.length} of ${requests.length})`}
                  </span>
                  <span className="text-[10px] bg-slate-200 text-slate-600 font-semibold px-2 py-0.5 rounded">Persistent Storage Active</span>
                </div>

                {filteredRequests.length === 0 ? (
                  <div className="p-12 text-center text-slate-500">
                    <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="font-bold text-slate-800 text-sm">No requested bookings found</p>
                    <p className="text-xs mt-1 text-slate-400">
                      {activeBookerName === 'All Bookers' 
                        ? 'Your requests will show up here.' 
                        : `No reservation requests found for "${activeBookerName}".`}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredRequests.map((req) => (
                      <div key={req.id} className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-start gap-3.5">
                          {/* Left icon with status */}
                          <div className="mt-0.5">
                            {req.status === 'Pending' && (
                              <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600" title="Awaiting Approval">
                                <Clock className="w-4 h-4" />
                              </div>
                            )}
                            {req.status === 'Approved' && (
                              <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600" title="Approved">
                                <Check className="w-4 h-4" />
                              </div>
                            )}
                            {req.status === 'Rejected' && (
                              <div className="w-8 h-8 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600" title="Rejected">
                                <X className="w-4 h-4" />
                              </div>
                            )}
                            {req.status === 'Queried' && (
                              <div className="w-8 h-8 rounded-full bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600" title="Clarification Requested">
                                <HelpCircle className="w-4 h-4" />
                              </div>
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-800 text-sm">{req.room}</span>
                              <span className="text-[9px] font-bold text-indigo-600 tracking-wider uppercase bg-indigo-50 px-1.5 py-0.5 rounded">
                                {req.role}
                              </span>
                              <span className="text-[10px] text-slate-500 font-medium">
                                Requested by {req.requesterName} {req.email ? `(${req.email})` : ''}
                              </span>
                            </div>
                            
                            <p className="text-xs text-slate-500 font-semibold mt-1 flex items-center gap-1">
                              <CalendarIcon className="w-3.5 h-3.5" /> {req.date} &bull; <Clock className="w-3.5 h-3.5 ml-1" /> {req.slots.join(', ')}
                            </p>

                            <p className="text-xs text-slate-600 italic mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                              &ldquo;{req.purpose}&rdquo;
                            </p>

                            {req.status === 'Queried' && req.queryMessage && (
                              <div className="mt-2.5 bg-purple-50 border border-purple-200 p-3 rounded-xl text-xs max-w-lg">
                                <p className="font-extrabold text-purple-800 flex items-center gap-1.5 mb-1">
                                  <HelpCircle className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
                                  <span>Admin requested clarification:</span>
                                </p>
                                <p className="text-purple-950 font-medium italic mb-2.5">
                                  &ldquo;{req.queryMessage}&rdquo;
                                </p>
                                
                                {replyingId === req.id ? (
                                  <div className="flex flex-col gap-2 mt-2">
                                    <textarea
                                      value={replyText}
                                      onChange={(e) => setReplyText(e.target.value)}
                                      rows={2}
                                      className="w-full text-xs p-2 border border-purple-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white text-slate-900 font-sans"
                                      placeholder="Type clarification reply..."
                                    />
                                    <div className="flex gap-2 justify-end">
                                      <button
                                        onClick={() => {
                                          setReplyingId(null);
                                          setReplyText('');
                                        }}
                                        className="px-2.5 py-1 text-xs font-bold text-slate-500 hover:bg-purple-100/50 rounded-md cursor-pointer"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        onClick={() => {
                                          handleReplyToQuery(req.id, replyText.trim());
                                          setReplyingId(null);
                                          setReplyText('');
                                        }}
                                        disabled={!replyText.trim()}
                                        className="px-3 py-1 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-md cursor-pointer shadow-sm"
                                      >
                                        Submit Reply
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setReplyingId(req.id);
                                      setReplyText('');
                                    }}
                                    className="bg-purple-600 hover:bg-purple-700 active:scale-[0.97] text-white font-extrabold px-3 py-1.5 rounded-lg transition-all text-[11px] cursor-pointer inline-flex items-center gap-1 shadow-sm"
                                  >
                                    <span>Submit Clarification</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Status + Action on right */}
                        <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                          <div className="text-right">
                            <span className={`inline-block px-2.5 py-1 text-xs font-black rounded-lg ${
                              req.status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                              req.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                              req.status === 'Queried' ? 'bg-purple-100 text-purple-800' :
                              'bg-rose-100 text-rose-800'
                            }`}>
                              {req.status}
                            </span>
                            <p className="text-[9px] text-slate-400 mt-1">Requested {new Date(req.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                          </div>

                          <div className="flex gap-1.5">
                            {(req.status === 'Pending' || req.status === 'Queried') && (
                              <button 
                                onClick={() => handleRejectRequest(req.id)}
                                className="text-[10px] text-rose-600 hover:bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer"
                              >
                                Revoke
                              </button>
                            )}
                            {req.status !== 'Pending' && (
                              <button 
                                onClick={() => handleDeleteRequestItem(req.id)}
                                className="text-[10px] text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1 rounded-md transition-all cursor-pointer"
                                title="Delete Log"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================== VIEW 3: INSIGHTS ==================== */}
        {activeTab === 'insights' && (
          <div className="flex-1 p-6 flex flex-col overflow-y-auto" id="insights-container">
            <div className="max-w-4xl mx-auto w-full">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Space Analytics &amp; Metrics</h2>
                <p className="text-sm text-slate-500 mt-1">Utilization ratios and popular booking demographics for TBI incubators.</p>
              </div>

              {/* Stats Overview Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Reserves</span>
                    <Building className="w-4 h-4 text-red-500" />
                  </div>
                  <p className="text-3xl font-black text-slate-900">{bookings.length}</p>
                  <p className="text-[11px] text-slate-500 font-medium mt-1">Total active confirmed reservations</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Processed Queue</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <p className="text-3xl font-black text-slate-900">{processedToday}</p>
                  <p className="text-[11px] text-slate-500 font-medium mt-1">Requests authorized or rejected today</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Awaiting Review</span>
                    <Clock className="w-4 h-4 text-amber-500" />
                  </div>
                  <p className="text-3xl font-black text-slate-900">{activeRequests.length}</p>
                  <p className="text-[11px] text-slate-500 font-medium mt-1">Pending items in the authorization queue</p>
                </div>
              </div>

              {/* Detailed Metrics Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Room Popularity Utilization */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-red-600" />
                    Room Popularity Ratios
                  </h3>
                  
                  <div className="space-y-4 flex-1 flex flex-col justify-center">
                    {roomUtilStats.map((room) => (
                      <div key={room.name}>
                        <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                          <span>{room.name}</span>
                          <span className="text-red-600">{room.percentage}% ({room.count} sessions)</span>
                        </div>
                        {/* Horizontal Bar */}
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-1000 ${
                              room.name.includes('IoT') ? 'bg-amber-500' :
                              room.name.includes('Pitch') ? 'bg-emerald-500' :
                              room.name.includes('Board') ? 'bg-slate-400' : 'bg-red-600'
                            }`}
                            style={{ width: `${room.percentage || 4}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Booking Demographics */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4 text-red-600" />
                    User Demographics
                  </h3>

                  {roleStats().length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-slate-400">
                      <p className="text-xs">No reservation demographic data loaded.</p>
                    </div>
                  ) : (
                    <div className="space-y-3.5 flex-1 flex flex-col justify-center">
                      {roleStats().map((stat, i) => {
                        const colors = ['bg-red-600', 'bg-emerald-500', 'bg-amber-500', 'bg-slate-400'];
                        const colorClass = colors[i % colors.length];

                        return (
                          <div key={stat.name} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                            <div className="flex items-center gap-2.5">
                              <span className={`w-3 h-3 rounded-full ${colorClass}`}></span>
                              <span className="text-xs font-bold text-slate-700">{stat.name}</span>
                            </div>
                            <span className="bg-white text-[10px] font-black text-slate-800 border px-2 py-0.5 rounded-lg shadow-sm">
                              {stat.count} Reserv.
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        )}

      </div>

      {/* ==================== RESERVATION REQUEST DIALOG MODAL ==================== */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" id="booking-modal">
            {/* Modal Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            ></motion.div>

            {/* Modal Window Container */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-100 overflow-hidden relative z-10"
            >
              <div className="bg-red-600 p-5 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-base font-extrabold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-red-200" />
                    Request Meeting Space
                  </h3>
                  <p className="text-[10px] text-red-100 font-medium mt-0.5">Subject to Superuser approval constraints</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="bg-white/10 hover:bg-white/20 p-1.5 rounded-lg text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleBookingSubmit} className="p-6 space-y-4">
                {formError && (
                  <div className="bg-rose-50 border border-rose-100 text-rose-700 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Requester Name input */}
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="e.g. Aryan Malhotra" 
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium text-slate-800"
                    />
                  </div>
                </div>

                {/* Email address input */}
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
                    <input 
                      id="input-form-email"
                      type="email" 
                      placeholder="yourname@domain.com" 
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium text-slate-800"
                    />
                  </div>
                </div>

                {/* Role and Date selection row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">Your Role</label>
                    <select 
                      value={formRole} 
                      onChange={(e) => setFormRole(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-bold text-slate-700 cursor-pointer"
                    >
                      <option value="Final Year Student">Final Year Student</option>
                      <option value="Faculty Mentor">Faculty Mentor</option>
                      <option value="Student Startup">Student Startup</option>
                      <option value="External Partner">External Partner</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">Reserve Date</label>
                    <input 
                      type="date" 
                      value={formDate} 
                      min={getLocalDateString()}
                      onChange={(e) => {
                        const newDate = e.target.value;
                        setFormDate(newDate);
                        const available = TIME_SLOTS.filter(s => !isSlotInPast(newDate, s));
                        if (available.length > 0) {
                          if (formSlots.some(s => !available.includes(s))) {
                            setFormSlots([available[0]]);
                          }
                        } else {
                          setFormSlots([]);
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-bold text-slate-700 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Room Selector option */}
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">Select Incubator Space</label>
                  <div className="grid grid-cols-2 gap-2">
                    {ROOMS.map((room) => {
                      const isSelected = formRoom === room.name;
                      return (
                        <button
                          type="button"
                          key={room.id}
                          onClick={() => setFormRoom(room.name)}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            isSelected 
                              ? 'bg-red-50 border-red-400 text-red-900 font-extrabold shadow-sm' 
                              : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600 font-semibold'
                          }`}
                        >
                          <p className="text-[11px] leading-tight">{room.name}</p>
                          <p className="text-[9px] text-slate-400 font-normal mt-0.5">Cap: {room.capacity} seats</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time Slot Selection */}
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">
                    Select Time Blocks <span className="text-[9px] text-slate-400 font-normal">(Select multiple for consecutive blocks)</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {TIME_SLOTS.filter((slot) => !isSlotInPast(formDate, slot)).length === 0 ? (
                      <div className="text-amber-700 bg-amber-50 border border-amber-200/50 p-3 rounded-xl text-xs font-bold w-full flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        <span>All time slots for today have already passed. Please select a future date.</span>
                      </div>
                    ) : (
                      TIME_SLOTS.filter((slot) => !isSlotInPast(formDate, slot)).map((slot) => {
                        const isSelected = formSlots.includes(slot);
                        return (
                          <button
                            type="button"
                            key={slot}
                            onClick={() => handleFormSlotToggle(slot)}
                            className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                              isSelected 
                                ? 'bg-red-600 border-red-600 text-white font-extrabold shadow-sm' 
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                            }`}
                          >
                            {slot}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Justification Text Area */}
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">Incubator Purpose Justification</label>
                  <textarea 
                    rows={2} 
                    placeholder="Describe what you plan to accomplish (e.g. meeting seed investors, debugging IoT chips...)" 
                    value={formPurpose}
                    onChange={(e) => setFormPurpose(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium text-slate-800"
                  ></textarea>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-xs font-bold shadow-md shadow-red-100 transition-all cursor-pointer"
                  >
                    Submit Booking Request
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Security PIN Passcode Modal */}
      <AnimatePresence>
        {isPinModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" id="pin-lock-modal">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-100 overflow-hidden p-6 relative"
            >
              {/* Close Button */}
              <button 
                onClick={() => setIsPinModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center text-center mt-2">
                {/* Security Indicator */}
                <div className="p-3.5 bg-red-50 text-red-600 rounded-full flex items-center justify-center shadow-inner mb-3 animate-pulse">
                  <Lock className="w-6 h-6" />
                </div>
                
                <h3 className="text-base font-extrabold text-slate-900">Superuser Verification</h3>
                <p className="text-xs text-slate-500 font-medium max-w-[260px] mt-1">
                  Access to the reservation approval queue is restricted. Enter the 4-digit Security PIN.
                </p>

                {/* Secure Pin dots */}
                <div className={`flex gap-4 my-6 justify-center items-center ${pinError ? 'animate-bounce' : ''}`}>
                  {[0, 1, 2, 3].map((index) => {
                    const isFilled = pinInput.length > index;
                    return (
                      <motion.div
                        key={index}
                        initial={false}
                        animate={isFilled ? { scale: [1, 1.2, 1], backgroundColor: '#DC2626' } : { scale: 1, backgroundColor: '#E2E8F0' }}
                        className="w-4.5 h-4.5 rounded-full shadow-inner border border-transparent transition-all duration-150"
                      />
                    );
                  })}
                </div>

                {/* Error status */}
                {pinError && (
                  <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2 animate-shake">
                    ⚠️ {pinError}
                  </p>
                )}

                {/* Keypad Grid */}
                <div className="grid grid-cols-3 gap-3 w-full max-w-[270px]">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handlePinKeyPress(num)}
                      className="h-12 w-full bg-slate-50 hover:bg-slate-100 active:scale-95 transition-all rounded-xl text-sm font-black text-slate-700 flex items-center justify-center cursor-pointer shadow-2xs border border-slate-200/50"
                    >
                      {num}
                    </button>
                  ))}
                  
                  {/* Clear Button */}
                  <button
                    type="button"
                    onClick={() => handlePinKeyPress('clear')}
                    className="h-12 w-full text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold flex items-center justify-center cursor-pointer transition-colors"
                  >
                    Clear
                  </button>

                  {/* Zero */}
                  <button
                    type="button"
                    onClick={() => handlePinKeyPress('0')}
                    className="h-12 w-full bg-slate-50 hover:bg-slate-100 active:scale-95 transition-all rounded-xl text-sm font-black text-slate-700 flex items-center justify-center cursor-pointer shadow-2xs border border-slate-200/50"
                  >
                    0
                  </button>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => handlePinKeyPress('delete')}
                    className="h-12 w-full text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-bold flex items-center justify-center cursor-pointer transition-all"
                  >
                    ⌫
                  </button>
                </div>

                {/* Security Note */}
                <div className="mt-6 pt-4 border-t border-slate-100 w-full">
                  <p className="text-[10px] text-slate-400 font-bold flex items-center justify-center gap-1">
                    <KeyRound className="w-3.5 h-3.5 text-slate-300" />
                    <span>Authorized Personnel Only</span>
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== BOOKER PROFILE SWITCHER MODAL ==================== */}
      <AnimatePresence>
        {isProfileSwitcherOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" id="profile-switcher-modal">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden relative"
            >
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-red-600" /> Switch Booker Profile
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">Toggle simulated sessions to view private logs and queries</p>
                </div>
                <button 
                  onClick={() => setIsProfileSwitcherOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              <div className="p-5 max-h-[360px] overflow-y-auto space-y-2.5">
                {/* All Bookers Option */}
                <button
                  onClick={() => {
                    setActiveBookerName('All Bookers');
                    setIsProfileSwitcherOpen(false);
                    triggerToast("Now viewing all bookings globally (Shared Observer).", "info");
                  }}
                  className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between group ${
                    activeBookerName === 'All Bookers'
                      ? 'bg-red-50/50 border-red-300 ring-1 ring-red-300'
                      : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex gap-3 items-center min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs flex-shrink-0">
                      ALL
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-black text-slate-800">👥 All Bookers (Shared Overview)</p>
                      <p className="text-[10px] text-slate-400 font-medium">Public guest view of schedule grid and requests log</p>
                    </div>
                  </div>
                  {activeBookerName === 'All Bookers' && (
                    <span className="text-[9px] bg-red-600 text-white font-extrabold px-1.5 py-0.5 rounded-full uppercase">Active</span>
                  )}
                </button>

                <div className="h-px bg-slate-100 my-2"></div>

                {/* Individual Personas */}
                {personas.map(p => {
                  const isActive = activeBookerName.toLowerCase() === p.name.toLowerCase();
                  const pBookings = bookings.filter(b => b.organizer.toLowerCase() === p.name.toLowerCase()).length;
                  const pRequests = requests.filter(r => r.requesterName.toLowerCase() === p.name.toLowerCase() && r.status === 'Pending').length;
                  const pQueries = requests.filter(r => r.requesterName.toLowerCase() === p.name.toLowerCase() && r.status === 'Queried').length;

                  return (
                    <div
                      key={p.name}
                      className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between group ${
                        isActive
                          ? 'bg-red-50/50 border-red-300 ring-1 ring-red-300'
                          : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setVerificationPersona(p);
                          setVerificationPin('');
                          setVerificationError('');
                          setIsVerificationModalOpen(true);
                        }}
                        className="flex gap-3 items-center min-w-0 flex-1 text-left cursor-pointer focus:outline-none"
                      >
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-black text-xs text-white flex-shrink-0 shadow-3xs ${
                          isActive ? 'bg-gradient-to-br from-red-500 to-rose-600' : 'bg-slate-400'
                        }`}>
                          {p.name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase()}
                        </div>
                        <div className="truncate pr-2">
                          <p className="text-xs font-black text-slate-800 truncate">{p.name}</p>
                          <p className="text-[10px] text-red-600 font-extrabold truncate mt-0.5">{p.role}</p>
                          <p className="text-[9px] text-slate-400 font-mono truncate">{p.email}</p>
                        </div>
                      </button>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Summary indicators */}
                        <div className="flex gap-1">
                          {pBookings > 0 && (
                            <span className="text-[9px] font-black bg-emerald-50 text-emerald-700 px-1 py-0.5 rounded border border-emerald-200/50">{pBookings} Approved</span>
                          )}
                          {pQueries > 0 && (
                            <span className="text-[9px] font-black bg-purple-50 text-purple-700 px-1 py-0.5 rounded border border-purple-200/50 animate-pulse">🚨 {pQueries} Query</span>
                          )}
                        </div>

                        {isActive && (
                          <span className="text-[9px] bg-red-600 text-white font-extrabold px-1.5 py-0.5 rounded-full uppercase flex-shrink-0">Active</span>
                        )}

                        {/* Inline delete confirmation or delete button */}
                        <div className="flex items-center justify-center">
                          {deletingPersonaName === p.name ? (
                            <div className="flex gap-1 items-center animate-fade-in bg-slate-100 p-1 rounded-lg border border-slate-200">
                              <span className="text-[8px] font-black text-slate-500 uppercase tracking-tight px-1">Remove?</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPersonas(prev => prev.filter(pers => pers.name !== p.name));
                                  if (isActive) {
                                    setActiveBookerName('All Bookers');
                                  }
                                  setDeletingPersonaName(null);
                                  triggerToast(`Simulated profile "${p.name}" deleted.`, "info");
                                }}
                                className="bg-rose-600 hover:bg-rose-700 text-white font-black text-[8px] px-1.5 py-0.5 rounded-md cursor-pointer transition-all active:scale-95"
                              >
                                Yes
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingPersonaName(null);
                                }}
                                className="bg-slate-300 text-slate-700 font-black text-[8px] px-1.5 py-0.5 rounded-md cursor-pointer transition-all active:scale-95"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingPersonaName(p.name);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                              title="Delete Simulated Profile"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPersonaFormName('');
                    setPersonaFormEmail('');
                    setPersonaFormRole('Student Startup');
                    setPersonaFormError('');
                    setIsCreatePersonaModalOpen(true);
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-red-200 hover:shadow-red-300"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Custom Profile...</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== PROFILE PIN VERIFICATION MODAL ==================== */}
      <AnimatePresence>
        {isVerificationModalOpen && verificationPersona && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs" id="verify-profile-pin-modal">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-100 overflow-hidden relative"
            >
              <div className="bg-gradient-to-tr from-slate-900 to-slate-800 p-5 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-black flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-red-400" /> 
                    {verificationPersona.pin ? 'Verify Profile PIN' : 'Set Profile PIN'}
                  </h3>
                  <p className="text-[10px] text-slate-300 font-medium mt-0.5">
                    {verificationPersona.pin 
                      ? `Accessing profile: ${verificationPersona.name}` 
                      : `Protect profile: ${verificationPersona.name}`}
                  </p>
                </div>
                <button 
                  onClick={() => setIsVerificationModalOpen(false)}
                  className="bg-white/10 hover:bg-white/20 p-1 rounded-lg text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const trimmedPIN = verificationPin.trim();
                  
                  if (!trimmedPIN) {
                    setVerificationError('PIN is required');
                    return;
                  }
                  if (!/^\d{4}$/.test(trimmedPIN)) {
                    setVerificationError('PIN must be exactly 4 digits');
                    return;
                  }

                  if (verificationPersona.pin) {
                    // Verification mode
                    if (verificationPersona.pin === trimmedPIN) {
                      setActiveBookerName(verificationPersona.name);
                      setIsVerificationModalOpen(false);
                      setIsProfileSwitcherOpen(false);
                      triggerToast(`Welcome back, ${verificationPersona.name}!`, "success");
                    } else {
                      setVerificationError('Incorrect security PIN. Please try again.');
                    }
                  } else {
                    // Set legacy pin mode
                    const updatedPersonas = personas.map(p => 
                      p.name === verificationPersona.name ? { ...p, pin: trimmedPIN } : p
                    );
                    setPersonas(updatedPersonas);
                    setActiveBookerName(verificationPersona.name);
                    setIsVerificationModalOpen(false);
                    setIsProfileSwitcherOpen(false);
                    triggerToast(`Profile "${verificationPersona.name}" secured and activated!`, "success");
                  }
                }}
                className="p-5 space-y-4"
              >
                {verificationError && (
                  <div className="bg-rose-50 border border-rose-100 text-rose-700 p-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 animate-shake">
                    <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                    <span>{verificationError}</span>
                  </div>
                )}

                <div className="text-center py-2">
                  <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <User className="w-6 h-6" />
                  </div>
                  <h4 className="font-extrabold text-sm text-slate-800">{verificationPersona.name}</h4>
                  <p className="text-[10px] text-red-600 font-extrabold uppercase tracking-wider mt-0.5">{verificationPersona.role}</p>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                    {verificationPersona.pin ? 'Enter 4-Digit PIN' : 'Create 4-Digit Security PIN'}
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    placeholder="e.g. 1234"
                    value={verificationPin}
                    onChange={(e) => setVerificationPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-center px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg tracking-widest focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-800 transition-all font-black text-slate-800"
                  />
                  <p className="text-[9px] text-slate-400 mt-1.5 text-center">
                    {verificationPersona.pin 
                      ? 'Only authorized users can access this profile.' 
                      : 'Please create a security PIN to secure this profile from other users.'}
                  </p>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsVerificationModalOpen(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    {verificationPersona.pin ? 'Unlock Profile' : 'Secure & Unlock'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== CREATE SIMULATED PERSONA MODAL ==================== */}
      <AnimatePresence>
        {isCreatePersonaModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs" id="create-persona-modal">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-100 overflow-hidden relative"
            >
              <div className="bg-gradient-to-tr from-slate-900 to-slate-800 p-5 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-black flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-red-400" /> Create Simulated Profile
                  </h3>
                  <p className="text-[10px] text-slate-300 font-medium mt-0.5">Define a custom user persona for the incubator workspace</p>
                </div>
                <button 
                  onClick={() => setIsCreatePersonaModalOpen(false)}
                  className="bg-white/10 hover:bg-white/20 p-1 rounded-lg text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const trimmedName = personaFormName.trim();
                  const trimmedEmail = personaFormEmail.trim();

                  if (!trimmedName) {
                    setPersonaFormError('Name is required');
                    return;
                  }
                  if (!trimmedEmail) {
                    setPersonaFormError('Email address is required');
                    return;
                  }
                  if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
                    setPersonaFormError('Please enter a valid email address');
                    return;
                  }

                  const trimmedPIN = personaFormPIN.trim();
                  if (!trimmedPIN) {
                    setPersonaFormError('4-digit Security PIN is required');
                    return;
                  }
                  if (!/^\d{4}$/.test(trimmedPIN)) {
                    setPersonaFormError('Security PIN must be exactly 4 digits');
                    return;
                  }

                  // Check duplicates
                  const isDup = personas.some(p => p.name.toLowerCase() === trimmedName.toLowerCase());
                  if (isDup) {
                    setPersonaFormError('A persona with this name already exists');
                    return;
                  }

                  const newPersona = {
                    name: trimmedName,
                    role: personaFormRole,
                    email: trimmedEmail,
                    pin: trimmedPIN
                  };

                  setPersonas(prev => [...prev, newPersona]);
                  setActiveBookerName(trimmedName);
                  setIsCreatePersonaModalOpen(false);
                  setIsProfileSwitcherOpen(false);
                  triggerToast(`Profile "${trimmedName}" created and secured with PIN!`, "success");
                }}
                className="p-5 space-y-4"
              >
                {personaFormError && (
                  <div className="bg-rose-50 border border-rose-100 text-rose-700 p-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 animate-shake">
                    <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                    <span>{personaFormError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Full Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Priyanshu Sharma" 
                    value={personaFormName}
                    onChange={(e) => setPersonaFormName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-800 transition-all font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
                  <input 
                    type="email" 
                    required
                    placeholder="e.g. priyanshu@niet.edu.in" 
                    value={personaFormEmail}
                    onChange={(e) => setPersonaFormEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-800 transition-all font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">4-Digit Security PIN</label>
                  <input 
                    type="password" 
                    maxLength={4}
                    required
                    placeholder="e.g. 1234" 
                    value={personaFormPIN}
                    onChange={(e) => setPersonaFormPIN(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-800 transition-all font-semibold text-slate-800"
                  />
                  <p className="text-[9px] text-slate-400 mt-1">This PIN is required to switch to your profile on any device.</p>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Incubator Role</label>
                  <select 
                    value={personaFormRole} 
                    onChange={(e) => setPersonaFormRole(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none cursor-pointer font-bold text-slate-700"
                  >
                    <option value="Student Startup">Student Startup</option>
                    <option value="Final Year Student">Final Year Student</option>
                    <option value="Faculty Mentor">Faculty Mentor</option>
                    <option value="External Partner">External Partner</option>
                  </select>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreatePersonaModalOpen(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
                  >
                    Create Profile
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== STARTUP ROLE SELECTOR MODAL ==================== */}
      <AnimatePresence>
        {showRoleSelector && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" id="role-selector-modal">
            {/* Modal Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRoleSelector(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            ></motion.div>

            {/* Centered Modern Card */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-white w-full max-w-xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden relative z-10 p-6 md:p-8 flex flex-col items-center text-center"
            >
              {/* Header: Logo and Title */}
              <img 
                src="https://niettbi.org/img/logo.png" 
                alt="NIET TBI Logo" 
                className="h-14 w-auto object-contain mb-5"
                referrerPolicy="no-referrer"
              />
              
              <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none mb-1">
                NIET Technology Business Incubator
              </h3>
              <p className="text-[11px] text-red-600 font-extrabold tracking-widest uppercase mb-2">
                Room Reservation Desk
              </p>
              <p className="text-xs text-slate-500 max-w-sm mb-6 leading-relaxed">
                Choose your portal role to continue. You can switch between roles instantly from the top header anytime.
              </p>

              {/* Grid of Interactive Choice Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mb-6">
                
                {/* Booker View Option */}
                <button
                  onClick={() => {
                    setPortalMode('booker');
                    setIsAdminAuthenticated(false);
                    setShowRoleSelector(false);
                    setIsProfileSwitcherOpen(true);
                    triggerToast("Choose a profile to view personalized requests!", "info");
                  }}
                  className="group relative flex flex-col items-center text-center p-5 rounded-xl border-2 border-slate-100 hover:border-red-500 hover:bg-red-50/10 active:scale-98 transition-all duration-300 cursor-pointer"
                >
                  <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-red-600 group-hover:text-white transition-all duration-300 shadow-sm">
                    <User className="w-5 h-5" />
                  </div>
                  <h4 className="font-extrabold text-sm text-slate-800 group-hover:text-red-600 transition-colors">
                    Booker Mode
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-1 font-bold">
                    Incubators, Faculty &amp; Students
                  </p>
                  <p className="text-[11px] text-slate-500 mt-2 leading-snug">
                    Submit booking requests, select amenities, &amp; check live status.
                  </p>
                </button>

                {/* Admin View Option */}
                <button
                  onClick={() => {
                    if (isAdminAuthenticated) {
                      setPortalMode('admin');
                      setShowRoleSelector(false);
                      triggerToast("Welcome back, Administrator!", "info");
                    } else {
                      setPinInput('');
                      setPinError('');
                      setShowRoleSelector(false);
                      setIsPinModalOpen(true);
                    }
                  }}
                  className="group relative flex flex-col items-center text-center p-5 rounded-xl border-2 border-slate-100 hover:border-slate-800 hover:bg-slate-50 active:scale-98 transition-all duration-300 cursor-pointer"
                >
                  <div className="w-12 h-12 bg-slate-100 text-slate-800 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-slate-900 group-hover:text-white transition-all duration-300 shadow-sm">
                    <Building className="w-5 h-5" />
                  </div>
                  <h4 className="font-extrabold text-sm text-slate-800 group-hover:text-slate-950 transition-colors">
                    Admin Queue
                  </h4>
                  <p className="text-[10px] text-red-600 font-bold mt-1 uppercase tracking-wider">
                    Superuser Access
                  </p>
                  <p className="text-[11px] text-slate-500 mt-2 leading-snug">
                    Review pending requests, toggle active reservations, &amp; track stats.
                  </p>
                </button>

              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-center gap-4 w-full border-t border-slate-100 pt-4">
                <button
                  onClick={() => setShowRoleSelector(false)}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  Skip &amp; Keep Booker View
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

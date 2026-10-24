const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://gujarat-weekend-backend.onrender.com/api";

function getAuthHeader(): Record<string, string> {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("gw_token");
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  }
  return {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    ...getAuthHeader(),
    ...(options.headers || {}),
  };

  const response = await fetch(url, { ...options, headers });
  const data = await response.json();

  if (!response.ok) {
    const errorMessage = data.detail || (data.error && data.error.message) || data.message || "Request failed";
    throw new Error(errorMessage);
  }

  return data;
}

export const api = {
  auth: {
    login: (credentials: any) => request<any>("/auth/login", { method: "POST", body: JSON.stringify(credentials) }),
    register: (userData: any) => request<any>("/auth/register", { method: "POST", body: JSON.stringify(userData) }),
    registerHost: (hostData: any) => request<any>("/auth/register-host", { method: "POST", body: JSON.stringify(hostData) }),
    getMe: () => request<any>("/auth/me"),
    updateProfile: (profileData: any) => request<any>("/auth/me", { method: "PUT", body: JSON.stringify(profileData) }),
    forgotPassword: (data: { email: string }) => request<any>("/auth/forgot-password", { method: "POST", body: JSON.stringify(data) }),
    verifyResetCode: (data: { email: string; code: string }) => request<any>("/auth/verify-reset-code", { method: "POST", body: JSON.stringify(data) }),
    resetPassword: (data: { email: string; code: string; new_password: string }) => request<any>("/auth/reset-password", { method: "POST", body: JSON.stringify(data) }),
  },
  locations: {
    getAll: () => request<any>("/locations"),
    search: (q: string, limit?: number) =>
      request<any>(`/locations/search?q=${encodeURIComponent(q)}${limit ? `&limit=${limit}` : ""}`),
    get: (slugOrId: string) => request<any>(`/locations/${slugOrId}`),
  },
  properties: {
    getAll: (params: Record<string, any> = {}) => {
      const search = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") search.append(k, String(v));
      });
      return request<any>(`/properties?${search.toString()}`);
    },
    search: (params: Record<string, any> = {}) => {
      const search = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") search.append(k, String(v));
      });
      return request<any>(`/properties/search?${search.toString()}`);
    },
    get: (idOrSlug: string) => request<any>(`/properties/${idOrSlug}`),
    getAvailability: (idOrSlug: string | number, params: Record<string, any> = {}) => {
      const search = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") search.append(k, String(v));
      });
      return request<any>(`/properties/${idOrSlug}/availability?${search.toString()}`);
    },
    checkAvailability: (data: any) => request<any>("/properties/check-availability", { method: "POST", body: JSON.stringify(data) }),
    create: (data: any) => request<any>("/properties", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: any) => request<any>(`/properties/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => request<any>(`/properties/${id}`, { method: "DELETE" }),
    setAvailability: (id: number, data: any) => request<any>(`/properties/${id}/availability`, { method: "POST", body: JSON.stringify(data) }),
    getAmenities: () => request<any>("/properties/amenities"),
    uploadImage: async (formData: FormData) => {
      const token = typeof window !== "undefined" ? localStorage.getItem("gw_token") : null;
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${API_BASE}/properties/upload-image`, {
        method: "POST",
        headers,
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Image upload failed");
      return data;
    },
    addImage: (propertyId: number, data: any) => request<any>(`/properties/${propertyId}/images`, { method: "POST", body: JSON.stringify(data) }),
    deleteImage: (propertyId: number, imageId: number) => request<any>(`/properties/${propertyId}/images/${imageId}`, { method: "DELETE" }),
    updateImage: (propertyId: number, imageId: number, data: any) => request<any>(`/properties/${propertyId}/images/${imageId}`, { method: "PATCH", body: JSON.stringify(data) }),
  },
  activities: {
    getAll: (params: Record<string, any> = {}) => {
      const search = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") search.append(k, String(v));
      });
      return request<any>(`/activities?${search.toString()}`);
    },
    get: (idOrSlug: string) => request<any>(`/activities/${idOrSlug}`),
    create: (data: any) => request<any>("/activities", { method: "POST", body: JSON.stringify(data) }),
    addSlot: (id: number, slotData: any) => request<any>(`/activities/${id}/slots`, { method: "POST", body: JSON.stringify(slotData) }),
  },
  bookings: {
    calculatePrice: (data: any) => request<any>("/bookings/calculate-price", { method: "POST", body: JSON.stringify(data) }),
    create: (data: any) => request<any>("/bookings", { method: "POST", body: JSON.stringify(data) }),
    getMyBookings: () => request<any>("/bookings"),
    getDetail: (idOrCode: string) => request<any>(`/bookings/${idOrCode}`),
    cancel: (id: number, reason: string) => request<any>(`/bookings/${id}/cancel`, { method: "POST", body: JSON.stringify({ reason }) }),
    verifyPass: (tokenOrCode: string) => request<any>(`/bookings/verify-pass/${encodeURIComponent(tokenOrCode)}`),
    checkIn: (tokenOrCode: string) => request<any>(`/bookings/${encodeURIComponent(tokenOrCode)}/check-in`, { method: "POST" }),
  },
  payments: {
    getConfig: () => request<any>("/payments/config"),
    initiate: (bookingId: number) => request<any>("/payments/initiate", { method: "POST", body: JSON.stringify({ booking_id: bookingId }) }),
    verify: (data: any) => request<any>("/payments/verify", { method: "POST", body: JSON.stringify(data) }),
    getSimulationSignature: (orderId: string, paymentId: string) =>
      request<any>(`/payments/generate-simulation-signature?order_id=${encodeURIComponent(orderId)}&payment_id=${encodeURIComponent(paymentId)}`, { method: "POST" }),
  },
  wishlist: {
    getAll: () => request<any>("/wishlist"),
    toggle: (propertyId: number) => request<any>("/wishlist/toggle", { method: "POST", body: JSON.stringify({ property_id: propertyId }) }),
  },
  reviews: {
    create: (data: any) => request<any>("/reviews", { method: "POST", body: JSON.stringify(data) }),
    getByProperty: (propertyId: number) => request<any>(`/reviews/property/${propertyId}`),
  },
  coupons: {
    validate: (code: string, amount: number) => request<any>("/coupons/validate", { method: "POST", body: JSON.stringify({ code, booking_amount: amount }) }),
    getAll: () => request<any>("/coupons"),
    create: (data: any) => request<any>("/coupons", { method: "POST", body: JSON.stringify(data) }),
  },
  planner: {
    generate: (data: any) => request<any>("/planner/generate", { method: "POST", body: JSON.stringify(data) }),
  },
  host: {
    getDashboard: () => request<any>("/host/dashboard"),
    getAnalytics: (period?: string) => request<any>(`/host/analytics${period ? `?period=${period}` : ""}`),
    getProperties: () => request<any>("/host/properties"),
    getActivities: () => request<any>("/host/activities"),
    getBookings: () => request<any>("/host/bookings"),
    getAvailabilityCalendar: (params: Record<string, any> = {}) => {
      const search = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") search.append(k, String(v));
      });
      return request<any>(`/host/availability-calendar?${search.toString()}`);
    },
    createInventoryBlock: (data: { property_id: number; start_date: string; end_date: string; blocked_units?: number; reason: string }) =>
      request<any>("/host/inventory-blocks", { method: "POST", body: JSON.stringify(data) }),
    deleteInventoryBlock: (blockId: number) =>
      request<any>(`/host/inventory-blocks/${blockId}`, { method: "DELETE" }),
  },
  admin: {
    getDashboard: () => request<any>("/admin/dashboard"),
    getBookingInsights: () => request<any>("/admin/booking-insights"),
    getAnalytics: (period?: string) => request<any>(`/admin/analytics${period ? `?period=${period}` : ""}`),
    getHosts: (status?: string) => request<any>(`/admin/hosts${status ? `?status=${status}` : ""}`),
    approveHost: (id: number, notes?: string) => request<any>(`/admin/hosts/${id}/approve`, { method: "POST", body: JSON.stringify({ status: "approved", notes }) }),
    rejectHost: (id: number, notes?: string) => request<any>(`/admin/hosts/${id}/reject`, { method: "POST", body: JSON.stringify({ status: "rejected", notes }) }),
    getProperties: (status?: string) => request<any>(`/admin/properties${status ? `?status=${status}` : ""}`),
    approveProperty: (id: number, notes?: string) => request<any>(`/admin/properties/${id}/approve`, { method: "POST", body: JSON.stringify({ status: "approved", notes }) }),
    rejectProperty: (id: number, notes?: string) => request<any>(`/admin/properties/${id}/reject`, { method: "POST", body: JSON.stringify({ status: "rejected", notes }) }),
    pauseProperty: (id: number, notes?: string) => request<any>(`/admin/properties/${id}/pause`, { method: "POST", body: JSON.stringify({ status: "paused", notes }) }),
    blockProperty: (id: number, notes?: string) => request<any>(`/admin/properties/${id}/block`, { method: "POST", body: JSON.stringify({ status: "blocked", notes }) }),
    resumeProperty: (id: number) => request<any>(`/admin/properties/${id}/resume`, { method: "POST" }),
    deleteProperty: (id: number) => request<any>(`/admin/properties/${id}`, { method: "DELETE" }),
    getActivities: (status?: string) => request<any>(`/admin/activities${status ? `?status=${status}` : ""}`),
    approveActivity: (id: number, notes?: string) => request<any>(`/admin/activities/${id}/approve`, { method: "POST", body: JSON.stringify({ status: "approved", notes }) }),
    rejectActivity: (id: number, notes?: string) => request<any>(`/admin/activities/${id}/reject`, { method: "POST", body: JSON.stringify({ status: "rejected", notes }) }),
    getBookings: (status?: string) => request<any>(`/admin/bookings${status ? `?status=${status}` : ""}`),
    getUsers: (role?: string) => request<any>(`/admin/users${role ? `?role=${role}` : ""}`),
    toggleUserStatus: (id: number, isActive: boolean) => request<any>(`/admin/users/${id}/status`, { method: "PATCH", body: JSON.stringify({ is_active: isActive }) }),
    getReviews: () => request<any>("/admin/reviews"),
    toggleReviewApproval: (id: number) => request<any>(`/admin/reviews/${id}/toggle-approval`, { method: "POST" }),
    getContactLogs: () => request<any>("/contacts/admin/logs"),
    updateContactSettings: (mode: "strict" | "standard") => request<any>("/contacts/admin/settings", { method: "POST", body: JSON.stringify({ mode }) }),
  },
  contacts: {
    getBookingAccess: (bookingIdOrCode: string | number) => request<any>(`/contacts/booking/${bookingIdOrCode}`),
    logAccess: (arg1: number | { booking_id: number; channel?: string; access_type?: string }, arg2?: "whatsapp" | "call" | string) => {
      const booking_id = typeof arg1 === "object" ? arg1.booking_id : arg1;
      const channel = typeof arg1 === "object" ? (arg1.channel || arg1.access_type || "whatsapp") : (arg2 || "whatsapp");
      return request<any>("/contacts/log-access", { method: "POST", body: JSON.stringify({ booking_id, channel }) });
    },
    getPropertyStatus: (propertyId: number) => request<any>(`/contacts/property/${propertyId}/status`),
  },
  notifications: {
    getAll: () => request<any>("/notifications"),
    markRead: (id: number) => request<any>(`/notifications/${id}/read`, { method: "PUT" }),
    markAllRead: () => request<any>("/notifications/read-all", { method: "PUT" }),
  },
  messages: {
    getUnreadCount: () => request<any>("/messages/unread-count"),
    getThread: (otherUserId: number, propertyId?: number) => {
      const q = new URLSearchParams({ other_user_id: String(otherUserId) });
      if (propertyId) q.append("property_id", String(propertyId));
      return request<any>(`/messages/thread?${q.toString()}`);
    },
    getConversations: () => request<any>("/messages/conversations"),
    send: (data: { receiver_id: number; property_id?: number; booking_id?: number; message: string }) =>
      request<any>("/messages", { method: "POST", body: JSON.stringify(data) }),
  },
};

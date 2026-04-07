export interface User {
  _id: string;
  name: string;
  email: string;
  tel: string;
  role: "user" | "admin";
  createdAt: string;
}

export interface CoworkingSpace {
  _id: string;
  name: string;
  address: string;
  tel: string;
  opentime: string;
  closetime: string;
  id: string;
}

export interface Reservation {
  _id: string;
  apptDate: string;
  apptEnd: string;
  user: string | User;
  coworkingSpace: string | CoworkingSpace;
  qrCode?: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  count?: number;
  pagination?: {
    next?: { page: number; limit: number };
    prev?: { page: number; limit: number };
  };
  data: T;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  _id?: string;
  name?: string;
  email?: string;
}

export interface RecommendResponse {
  success: boolean;
  data: {
    recommended: string;
    reason: string;
    alternativeSpaces: string[];
  };
}

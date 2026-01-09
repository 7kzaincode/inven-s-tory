
export interface Profile {
  id: string;
  username: string;
  email?: string;
  avatar_url?: string;
  bio?: string;
  contact_link?: string;
  created_at: string;
}

export interface Room {
  id: string;
  owner_id: string;
  parent_id?: string;
  name: string;
  image_url: string;
  x?: number; // Position on parent photo
  y?: number; // Position on parent photo
  created_at: string;
}

export interface Item {
  id: string;
  owner_id: string;
  room_id?: string; // Link to the specific hierarchical room
  name: string;
  image_url: string;
  public: boolean;
  for_sale: boolean;
  for_trade: boolean;
  price?: number;
  category?: string;
  condition?: string;
  // Spatial coordinates on the assigned room's photo
  loc_x?: number; 
  loc_y?: number; 
  loc_note?: string;
  created_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  text: string;
  created_at: string;
  sender?: Profile;
}

export interface Trade {
  id: string;
  sender_id: string;
  receiver_id: string;
  sender_items: string[];
  receiver_items: string[];
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  created_at: string;
  sender?: Profile;
  receiver?: Profile;
}

export interface Friend {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  requester?: Profile;
  receiver?: Profile;
}

export interface PublicTradeAd {
  id: string;
  owner_id: string;
  text: string;
  looking_for?: string;
  offering_ids?: string[];
  created_at: string;
  owner?: Profile;
}

export interface UserSession {
  user: {
    id: string;
    email: string;
  } | null;
  profile: Profile | null;
}

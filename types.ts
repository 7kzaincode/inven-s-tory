
export interface Profile {
  id: string;
  username: string;
  email?: string;
  avatar_url?: string;
  bio?: string;
  contact_link?: string;
  created_at: string;
}

export interface Item {
  id: string;
  owner_id: string;
  name: string;
  image_url: string;
  public: boolean;
  for_sale: boolean;
  for_trade: boolean;
  price?: number;
  category?: string;
  condition?: string;
  created_at: string;
}

export interface ItemHistory {
  id: string;
  item_id: string;
  from_owner_id?: string;
  to_owner_id: string;
  event_type: string;
  price?: number;
  created_at: string;
  from_profile?: Profile;
  to_profile?: Profile;
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

export interface PublicTradeAd {
  id: string;
  owner_id: string;
  text: string;
  offering_ids: string[];
  looking_for: string;
  created_at: string;
  owner?: Profile;
}

export interface Friend {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  requester?: Profile;
  receiver?: Profile;
}

export interface UserSession {
  user: {
    id: string;
    email: string;
  } | null;
  profile: Profile | null;
}

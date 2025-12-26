
export interface Profile {
  id: string;
  username: string;
  email?: string;
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
  category?: string;
  condition?: string;
  created_at: string;
}

export interface Want {
  id: string;
  owner_id: string;
  text: string;
}

export interface Friend {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  profiles?: Profile;
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

export interface UserSession {
  user: {
    id: string;
    email: string;
  } | null;
  profile: Profile | null;
}


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

export interface UserSession {
  user: {
    id: string;
    email: string;
  } | null;
  profile: Profile | null;
}

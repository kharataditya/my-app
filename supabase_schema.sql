-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender TEXT NOT NULL,
  recipient TEXT NOT NULL,
  message TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read BOOLEAN DEFAULT FALSE,
  read_timestamp TIMESTAMP WITH TIME ZONE,
  CONSTRAINT fk_sender FOREIGN KEY (sender) REFERENCES public.users(username),
  CONSTRAINT fk_recipient FOREIGN KEY (recipient) REFERENCES public.users(username)
);

-- Create user_status table for tracking online status
CREATE TABLE IF NOT EXISTS public.user_status (
  username TEXT PRIMARY KEY REFERENCES public.users(username),
  status TEXT DEFAULT 'offline',
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS policies

-- Enable RLS on tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_status ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users are viewable by everyone" 
  ON public.users FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert themselves" 
  ON public.users FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can update own record" 
  ON public.users FOR UPDATE 
  USING (true);

-- Messages table policies
CREATE POLICY "Messages are viewable by sender and recipient" 
  ON public.messages FOR SELECT 
  USING (true);

CREATE POLICY "Anyone can insert messages" 
  ON public.messages FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can update messages they sent or received" 
  ON public.messages FOR UPDATE 
  USING (true);

-- User status policies
CREATE POLICY "Status is viewable by everyone" 
  ON public.user_status FOR SELECT 
  USING (true);

CREATE POLICY "Users can update own status" 
  ON public.user_status FOR UPDATE 
  USING (true);

CREATE POLICY "Users can insert own status" 
  ON public.user_status FOR INSERT 
  WITH CHECK (true);

-- Create functions for realtime features

-- Function to update user's last seen timestamp
CREATE OR REPLACE FUNCTION public.update_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users
  SET last_seen = NOW()
  WHERE username = NEW.username;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update last seen on status change
CREATE TRIGGER update_user_last_seen
  AFTER UPDATE ON public.user_status
  FOR EACH ROW
  EXECUTE FUNCTION public.update_last_seen();

-- Function to handle message read status
CREATE OR REPLACE FUNCTION public.handle_message_read()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.read = TRUE AND OLD.read = FALSE THEN
    NEW.read_timestamp = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for message read status
CREATE TRIGGER on_message_read
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_message_read();

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_status;
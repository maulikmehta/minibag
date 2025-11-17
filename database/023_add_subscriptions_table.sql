-- Migration 023: Add subscriptions table for LocalLoops revenue tracking
-- Purpose: Track Minibag Pro, Partybag Pro, and other subscription revenue
-- This separates actual business revenue from peer-to-peer grocery payments

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User information
  user_id TEXT NOT NULL,  -- Will link to users table when user auth is implemented

  -- Subscription details
  product_type TEXT NOT NULL CHECK (product_type IN ('minibag', 'partybag', 'fitbag')),
  plan TEXT NOT NULL CHECK (plan IN ('pro', 'basic', 'premium')),
  amount NUMERIC(10, 2) NOT NULL,  -- Monthly/yearly subscription price

  -- Status and lifecycle
  status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'paused', 'expired', 'trial')) DEFAULT 'active',
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')) DEFAULT 'monthly',

  -- Timestamps
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_billing_at TIMESTAMPTZ,  -- Next payment due date
  cancelled_at TIMESTAMPTZ,     -- When subscription was cancelled (null if active)

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_product_type ON subscriptions(product_type);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing ON subscriptions(next_billing_at) WHERE status = 'active';

-- Create composite index for revenue queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_active_revenue ON subscriptions(status, product_type, created_at) WHERE status = 'active';

-- Add comment
COMMENT ON TABLE subscriptions IS 'Tracks LocalLoops subscription revenue (Minibag Pro, Partybag Pro, etc.). NOT for peer-to-peer grocery payments.';

-- Note: The 'payments' table tracks grocery payments between users
-- This 'subscriptions' table tracks actual LocalLoops revenue

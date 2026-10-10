/*
# Dynamic Price Tiers JSONB column on products

Adds price_tiers JSONB column to products table to support dynamic tiers (D6, B8, D8, D10, B12, D12, B14, etc.)
*/

ALTER TABLE products ADD COLUMN IF NOT EXISTS price_tiers jsonb DEFAULT '[]'::jsonb;

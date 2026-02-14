/*
  # Create products table

  1. New Tables
    - `products`
      - `id` (uuid, primary key)
      - `name` (text)
      - `category` (text) - rental, food, drink, equipment
      - `price` (numeric)
      - `rental_price_per_hour` (numeric) - for rental items
      - `stock_quantity` (integer)
      - `min_stock` (integer) - alert threshold
      - `barcode` (text)
      - `is_active` (boolean)
      - `created_at` (timestamptz)
  2. Security
    - Enable RLS
*/

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'drink' CHECK (category IN ('rental', 'food', 'drink', 'equipment', 'other')),
  price numeric NOT NULL DEFAULT 0,
  rental_price_per_hour numeric DEFAULT 0,
  stock_quantity integer DEFAULT 0,
  min_stock integer DEFAULT 5,
  barcode text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff and admins can view products"
  ON products FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

CREATE POLICY "Admins can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin'))
  );

CREATE POLICY "Admins can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin')));

CREATE POLICY "Admins can delete products"
  ON products FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin')));
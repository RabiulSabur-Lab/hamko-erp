-- Order from Hamko_Invoice.xlsx (Invoice 24865 - Talukder Brothers)
INSERT INTO orders (order_number, customer_id, order_date, status, subtotal, total_amount, paid_amount, due_amount, payment_status, notes)
SELECT 'ORD-24865', c.id, '2026-07-11', 'Delivered', 19682.00, 17713.80, 17713.80, 0, 'Paid', 'Invoice 24865 - D4-05092/26 .Van-KMAU-11-0062,Rasel'
FROM customers c WHERE c.name = 'Talukder' LIMIT 1;

-- Collection for this invoice
INSERT INTO collections (collection_number, customer_id, amount, collection_date, payment_method, notes)
SELECT 'COL-24865', c.id, 17713.80, '2026-07-11', 'Bank Transfer', 'Invoice 24865 payment'
FROM customers c WHERE c.name = 'Talukder' LIMIT 1;

-- Collections from Collection_and_Delivery.xlsx Comm sheet
INSERT INTO collections (collection_number, customer_id, amount, collection_date, payment_method, notes) SELECT 'COL-1000', (SELECT id FROM customers ORDER BY name LIMIT 1 OFFSET 0), 2085, '2026-01-18', 'Cash', '16Sep-15Oct';
INSERT INTO collections (collection_number, customer_id, amount, collection_date, payment_method, notes) SELECT 'COL-1001', (SELECT id FROM customers ORDER BY name LIMIT 1 OFFSET 1), 1040, '2026-01-25', 'Cash', '16Oct-15Nov';
INSERT INTO collections (collection_number, customer_id, amount, collection_date, payment_method, notes) SELECT 'COL-1002', (SELECT id FROM customers ORDER BY name LIMIT 1 OFFSET 2), 1496, '2026-02-10', 'Cash', '16Nov-15Dec';
INSERT INTO collections (collection_number, customer_id, amount, collection_date, payment_method, notes) SELECT 'COL-1003', (SELECT id FROM customers ORDER BY name LIMIT 1 OFFSET 3), 3500, '2026-03-09', 'Cash', 'Eid Bonus';
INSERT INTO collections (collection_number, customer_id, amount, collection_date, payment_method, notes) SELECT 'COL-1004', (SELECT id FROM customers ORDER BY name LIMIT 1 OFFSET 4), 1299, '2026-03-12', 'Cash', '16Dec-15Jan';
INSERT INTO collections (collection_number, customer_id, amount, collection_date, payment_method, notes) SELECT 'COL-1005', (SELECT id FROM customers ORDER BY name LIMIT 1 OFFSET 5), 2803, '2026-04-09', 'Cash', '16Jan-15Feb';
INSERT INTO collections (collection_number, customer_id, amount, collection_date, payment_method, notes) SELECT 'COL-1006', (SELECT id FROM customers ORDER BY name LIMIT 1 OFFSET 6), 5744, '2026-05-13', 'Cash', '16Feb-15Mar';
INSERT INTO collections (collection_number, customer_id, amount, collection_date, payment_method, notes) SELECT 'COL-1007', (SELECT id FROM customers ORDER BY name LIMIT 1 OFFSET 7), 4500, '2026-05-17', 'Cash', 'Eid Bonus';
INSERT INTO collections (collection_number, customer_id, amount, collection_date, payment_method, notes) SELECT 'COL-1008', (SELECT id FROM customers ORDER BY name LIMIT 1 OFFSET 8), 3862, '2026-06-15', 'Cash', '16Mar-15Apr';

-- Sample expenses
INSERT INTO expenses (expense_date, category, amount, description)
VALUES
  ('2026-07-01', 'Transport', 5000, 'Van rental - Jhalakathi route'),
  ('2026-07-05', 'Office', 12000, 'Office supplies and stationery'),
  ('2026-07-10', 'Salary', 85000, 'Sales officer salary - July'),
  ('2026-07-15', 'Marketing', 8500, 'Promotional materials'),
  ('2026-07-18', 'Fuel', 3200, 'Delivery vehicle fuel');

-- Sales targets
INSERT INTO sales_targets (period, period_start, period_end, target_amount, achieved_amount)
VALUES ('Monthly', '2026-07-01', '2026-07-31', 500000, 19682);

INSERT INTO sales_targets (period, period_start, period_end, target_amount, achieved_amount)
VALUES ('Quarterly', '2026-07-01', '2026-09-30', 1500000, 19682);

-- Notifications
INSERT INTO notifications (title, message, type, is_read)
VALUES ('Low Stock Alert', 'Multiple products below reorder level', 'Low Stock', false);

INSERT INTO notifications (title, message, type, is_read)
VALUES ('Overdue Payment', '3 customers have overdue payments exceeding 50,000 BDT', 'Due Reminder', false);

INSERT INTO notifications (title, message, type, is_read)
VALUES ('New Order', 'Order ORD-24865 delivered to Talukder Brothers', 'Order Status', true);

INSERT INTO notifications (title, message, type, is_read)
VALUES ('Monthly Target', 'July monthly target: 500,000 BDT - 4% achieved', 'Sales Target', false);
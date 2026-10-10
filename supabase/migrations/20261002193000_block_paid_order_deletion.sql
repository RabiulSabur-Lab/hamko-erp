-- Migration to prevent deleting orders with paid amounts or linked collections

CREATE OR REPLACE FUNCTION prevent_paid_order_deletion()
RETURNS TRIGGER AS $$
DECLARE
  v_collection_count INT;
BEGIN
  -- If order status is Cancelled, allow deletion and unlink collections to Customer Advance
  IF OLD.status = 'Cancelled' THEN
    UPDATE collections
    SET order_id = NULL
    WHERE order_id = OLD.id;

    RETURN OLD;
  END IF;

  -- 1. Check if paid_amount > 0
  IF COALESCE(OLD.paid_amount, 0) > 0 THEN
    RAISE EXCEPTION 'Cannot delete order % because it has recorded payments. Please void/refund the linked payment first or change status to Cancelled.', OLD.order_number;
  END IF;

  -- 2. Check if linked collections exist
  SELECT COUNT(*) INTO v_collection_count
  FROM collections
  WHERE order_id = OLD.id;

  IF v_collection_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete order % because it has recorded payments. Please void/refund the linked payment first or change status to Cancelled.', OLD.order_number;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_paid_order_deletion ON orders;

CREATE TRIGGER trg_prevent_paid_order_deletion
BEFORE DELETE ON orders
FOR EACH ROW
EXECUTE FUNCTION prevent_paid_order_deletion();

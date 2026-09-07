-- Delivery Challan lifecycle: a DC can be cleared by a linked return DC.
ALTER TYPE "SettlementType" ADD VALUE IF NOT EXISTS 'RETURN_DC';

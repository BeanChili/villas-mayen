-- Agregar categorías "Sillas para Niños" y "Mesas para Niños" al mobiliario.

INSERT INTO "Category" (id, name, type, "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), v.name, v.type, CURRENT_TIMESTAMP
FROM (VALUES
  ('SILLAS_NINOS', 'FURNITURE'),
  ('MESAS_NINOS', 'FURNITURE')
) AS v(name, type)
ON CONFLICT ("name", "type") DO NOTHING;

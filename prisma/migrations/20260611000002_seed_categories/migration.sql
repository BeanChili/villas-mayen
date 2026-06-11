-- Sembrar categorías existentes (antes hardcodeadas) para que aparezcan
-- en la pantalla de Configuración > Categorías y en los formularios.

INSERT INTO "Category" (id, name, type, "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), v.name, v.type, CURRENT_TIMESTAMP
FROM (VALUES
  ('COMIDA_MENU', 'PRODUCT'),
  ('MOBILIARIO', 'PRODUCT'),
  ('ADORNOS_DECORACION', 'PRODUCT'),
  ('SERVICIOS_ADICIONALES', 'PRODUCT'),
  ('PLATOS', 'PRODUCT'),
  ('CUBIERTOS', 'PRODUCT'),
  ('PICHELES', 'PRODUCT'),
  ('VASOS', 'PRODUCT'),
  ('COPAS', 'PRODUCT'),
  ('SILLAS', 'FURNITURE'),
  ('MESAS', 'FURNITURE'),
  ('MANTELES', 'FURNITURE'),
  ('VAJILLA', 'FURNITURE'),
  ('CRISTALERIA', 'FURNITURE'),
  ('CUBERTERIA', 'FURNITURE'),
  ('DECORACION', 'FURNITURE'),
  ('EQUIPOS_SONIDO', 'FURNITURE'),
  ('ILUMINACION', 'FURNITURE'),
  ('CARPAS', 'FURNITURE'),
  ('OTROS', 'FURNITURE')
) AS v(name, type)
ON CONFLICT ("name", "type") DO NOTHING;

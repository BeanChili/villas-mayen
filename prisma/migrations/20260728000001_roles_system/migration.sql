-- Sistema de roles customizables: entidad Role + matriz RolePermission por modulo.
-- Migra los 7 roles legacy (strings en User.role) a filas, con su matriz actual
-- traducida y expandida a los modulos nuevos, y reasigna cada usuario.

-- Drift preexistente entre migraciones y schema (efecto de db:push viejos)
ALTER TABLE "EventClosing" ALTER COLUMN "quoteId" SET NOT NULL;
ALTER TABLE "Product" ALTER COLUMN "rentalPrice" SET NOT NULL;
ALTER TABLE "QuoteItem" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "QuoteSpace" ALTER COLUMN "startTime" DROP DEFAULT,
ALTER COLUMN "endTime" DROP DEFAULT;

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "canEditPrices" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "canView" BOOLEAN NOT NULL DEFAULT false,
    "canCreate" BOOLEAN NOT NULL DEFAULT false,
    "canEdit" BOOLEAN NOT NULL DEFAULT false,
    "canDelete" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_key_key" ON "Role"("key");
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");
CREATE UNIQUE INDEX "RolePermission_roleId_module_key" ON "RolePermission"("roleId", "module");

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Roles legacy como filas (ids literales estables)
INSERT INTO "Role" ("id", "key", "name", "description", "isSystem", "canEditPrices", "createdAt", "updatedAt") VALUES
  ('role_superadmin',       'SUPERADMIN',       'Superadmin',           'Acceso total al sistema',                          true,  true,  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role_recepcionista',    'RECEPCIONISTA',    'Recepcionista',        'Calendario, clientes, cotizaciones y habitaciones', false, true,  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role_finanzas',         'FINANZAS',         'Finanzas',             'Gastos y consulta general',                        false, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role_almacen',          'ALMACEN',          'Almacén',              'Inventario y productos',                           false, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role_encargado_evento', 'ENCARGADO_EVENTO', 'Encargado de Evento',  'Eventos, liquidaciones y cierres',                 false, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role_usuario_sistema',  'USUARIO_SISTEMA',  'Usuario del Sistema',  'Calendario y habitaciones',                        false, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role_visual',           'VISUAL',           'Solo Visual',          'Consulta sin modificaciones',                      false, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- SUPERADMIN: todo en todos los modulos
INSERT INTO "RolePermission" ("id", "roleId", "module", "canView", "canCreate", "canEdit", "canDelete")
SELECT 'rp_superadmin_' || m, 'role_superadmin', m, true, true, true, true
FROM (VALUES
  ('dashboard'),('calendar'),('clients'),('quotes'),('sellers'),('inventory'),
  ('products'),('locations'),('rooms'),('categories'),('expenses'),('events'),
  ('closings'),('reports_cobranza'),('reports_ocupacion'),('screen'),('users'),('roles')
) AS t(m);

-- Matrices legacy traducidas. El typo historico "  calendar" (con espacios)
-- queda corregido de raiz. Modulos derivados: products y categories heredan de
-- inventory; closings hereda de events; locations hereda de settings (solo
-- admin); dashboard, screen y reportes eran visibles para todos.
INSERT INTO "RolePermission" ("id", "roleId", "module", "canView", "canCreate", "canEdit", "canDelete") VALUES
  -- RECEPCIONISTA
  ('rp_recepcionista_dashboard',        'role_recepcionista', 'dashboard',         true,  false, false, false),
  ('rp_recepcionista_calendar',         'role_recepcionista', 'calendar',          true,  true,  true,  true),
  ('rp_recepcionista_clients',          'role_recepcionista', 'clients',           true,  true,  true,  true),
  ('rp_recepcionista_quotes',           'role_recepcionista', 'quotes',            true,  true,  true,  true),
  ('rp_recepcionista_sellers',          'role_recepcionista', 'sellers',           true,  false, false, false),
  ('rp_recepcionista_inventory',        'role_recepcionista', 'inventory',         true,  false, false, false),
  ('rp_recepcionista_products',         'role_recepcionista', 'products',          true,  false, false, false),
  ('rp_recepcionista_categories',       'role_recepcionista', 'categories',        true,  false, false, false),
  ('rp_recepcionista_rooms',            'role_recepcionista', 'rooms',             true,  true,  true,  true),
  ('rp_recepcionista_reports_cobranza', 'role_recepcionista', 'reports_cobranza',  true,  false, false, false),
  ('rp_recepcionista_reports_ocupacion','role_recepcionista', 'reports_ocupacion', true,  false, false, false),
  ('rp_recepcionista_screen',           'role_recepcionista', 'screen',            true,  false, false, false),
  -- FINANZAS
  ('rp_finanzas_dashboard',             'role_finanzas', 'dashboard',         true,  false, false, false),
  ('rp_finanzas_calendar',              'role_finanzas', 'calendar',          true,  false, false, false),
  ('rp_finanzas_clients',               'role_finanzas', 'clients',           true,  false, false, false),
  ('rp_finanzas_quotes',                'role_finanzas', 'quotes',            true,  false, false, false),
  ('rp_finanzas_sellers',               'role_finanzas', 'sellers',           true,  false, false, false),
  ('rp_finanzas_expenses',              'role_finanzas', 'expenses',          true,  true,  true,  true),
  ('rp_finanzas_rooms',                 'role_finanzas', 'rooms',             true,  false, false, false),
  ('rp_finanzas_reports_cobranza',      'role_finanzas', 'reports_cobranza',  true,  false, false, false),
  ('rp_finanzas_reports_ocupacion',     'role_finanzas', 'reports_ocupacion', true,  false, false, false),
  ('rp_finanzas_screen',                'role_finanzas', 'screen',            true,  false, false, false),
  -- ALMACEN
  ('rp_almacen_dashboard',              'role_almacen', 'dashboard',         true,  false, false, false),
  ('rp_almacen_calendar',               'role_almacen', 'calendar',          true,  false, false, false),
  ('rp_almacen_inventory',              'role_almacen', 'inventory',         true,  true,  true,  true),
  ('rp_almacen_products',               'role_almacen', 'products',          true,  true,  true,  true),
  ('rp_almacen_categories',             'role_almacen', 'categories',        true,  true,  true,  true),
  ('rp_almacen_events',                 'role_almacen', 'events',            true,  false, false, false),
  ('rp_almacen_closings',               'role_almacen', 'closings',          true,  false, false, false),
  ('rp_almacen_rooms',                  'role_almacen', 'rooms',             true,  false, false, false),
  ('rp_almacen_reports_cobranza',       'role_almacen', 'reports_cobranza',  true,  false, false, false),
  ('rp_almacen_reports_ocupacion',      'role_almacen', 'reports_ocupacion', true,  false, false, false),
  ('rp_almacen_screen',                 'role_almacen', 'screen',            true,  false, false, false),
  -- ENCARGADO_EVENTO
  ('rp_encargado_dashboard',            'role_encargado_evento', 'dashboard',         true,  false, false, false),
  ('rp_encargado_calendar',             'role_encargado_evento', 'calendar',          true,  false, false, false),
  ('rp_encargado_inventory',            'role_encargado_evento', 'inventory',         true,  false, false, false),
  ('rp_encargado_products',             'role_encargado_evento', 'products',          true,  false, false, false),
  ('rp_encargado_categories',           'role_encargado_evento', 'categories',        true,  false, false, false),
  ('rp_encargado_events',               'role_encargado_evento', 'events',            true,  true,  true,  false),
  ('rp_encargado_closings',             'role_encargado_evento', 'closings',          true,  true,  true,  false),
  ('rp_encargado_rooms',                'role_encargado_evento', 'rooms',             true,  false, false, false),
  ('rp_encargado_reports_cobranza',     'role_encargado_evento', 'reports_cobranza',  true,  false, false, false),
  ('rp_encargado_reports_ocupacion',    'role_encargado_evento', 'reports_ocupacion', true,  false, false, false),
  ('rp_encargado_screen',               'role_encargado_evento', 'screen',            true,  false, false, false),
  -- USUARIO_SISTEMA
  ('rp_usuario_dashboard',              'role_usuario_sistema', 'dashboard',         true,  false, false, false),
  ('rp_usuario_calendar',               'role_usuario_sistema', 'calendar',          true,  true,  true,  true),
  ('rp_usuario_clients',                'role_usuario_sistema', 'clients',           true,  false, false, false),
  ('rp_usuario_rooms',                  'role_usuario_sistema', 'rooms',             true,  true,  true,  true),
  ('rp_usuario_reports_cobranza',       'role_usuario_sistema', 'reports_cobranza',  true,  false, false, false),
  ('rp_usuario_reports_ocupacion',      'role_usuario_sistema', 'reports_ocupacion', true,  false, false, false),
  ('rp_usuario_screen',                 'role_usuario_sistema', 'screen',            true,  false, false, false),
  -- VISUAL
  ('rp_visual_dashboard',               'role_visual', 'dashboard',         true,  false, false, false),
  ('rp_visual_calendar',                'role_visual', 'calendar',          true,  false, false, false),
  ('rp_visual_clients',                 'role_visual', 'clients',           true,  false, false, false),
  ('rp_visual_quotes',                  'role_visual', 'quotes',            true,  false, false, false),
  ('rp_visual_sellers',                 'role_visual', 'sellers',           true,  false, false, false),
  ('rp_visual_inventory',               'role_visual', 'inventory',         true,  false, false, false),
  ('rp_visual_products',                'role_visual', 'products',          true,  false, false, false),
  ('rp_visual_categories',              'role_visual', 'categories',        true,  false, false, false),
  ('rp_visual_events',                  'role_visual', 'events',            true,  false, false, false),
  ('rp_visual_closings',                'role_visual', 'closings',          true,  false, false, false),
  ('rp_visual_rooms',                   'role_visual', 'rooms',             true,  false, false, false),
  ('rp_visual_reports_cobranza',        'role_visual', 'reports_cobranza',  true,  false, false, false),
  ('rp_visual_reports_ocupacion',       'role_visual', 'reports_ocupacion', true,  false, false, false),
  ('rp_visual_screen',                  'role_visual', 'screen',            true,  false, false, false);

-- Reasignar usuarios: del string legacy al rol nuevo (fallback VISUAL)
ALTER TABLE "User" ADD COLUMN "roleId" TEXT;

UPDATE "User" SET "roleId" = CASE "role"
  WHEN 'ADMIN'            THEN 'role_superadmin'
  WHEN 'RECEPCIONISTA'    THEN 'role_recepcionista'
  WHEN 'FINANZAS'         THEN 'role_finanzas'
  WHEN 'ALMACEN'          THEN 'role_almacen'
  WHEN 'ENCARGADO_EVENTO' THEN 'role_encargado_evento'
  WHEN 'USUARIO_SISTEMA'  THEN 'role_usuario_sistema'
  ELSE 'role_visual'
END;

ALTER TABLE "User" ALTER COLUMN "roleId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "User" DROP COLUMN "role";

-- La tabla Permission nunca se uso desde el codigo
DROP TABLE "Permission";

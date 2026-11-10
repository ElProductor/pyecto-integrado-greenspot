-- ==============================================================================
-- GREENSPOT · 002 · Usuarios, roles y permisos reales
-- Se aplica DESPUÉS de schema.sql (y seed.sql si se quieren datos de ejemplo).
-- Reemplaza el acceso "cualquiera puede todo" por:
--   * Solo usuarios con sesión iniciada y cuenta activa ven datos.
--   * Operario: ve la planta, registra movimientos, crea lotes y avanza etapas.
--   * Administrador: todo lo anterior + empresas, materiales, certificados, usuarios.
--   * El kardex no se edita ni se borra (trazabilidad).
--   * No se puede sacar más stock del que hay: el movimiento se rechaza.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 1. PERFILES (uno por cuenta de Supabase Auth) -------------------------------
DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM ('admin', 'operator');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    role user_role_enum NOT NULL DEFAULT 'operator',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,      -- desactivar en vez de borrar
    pin_hash TEXT,                                -- PIN de 4 números para el cambio rápido
    pin_failed_attempts INT NOT NULL DEFAULT 0,
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Al crear una cuenta en Auth se crea su perfil. La PRIMERA cuenta queda como admin.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.email,
        CASE WHEN EXISTS (SELECT 1 FROM public.profiles) THEN 'operator'::user_role_enum ELSE 'admin'::user_role_enum END
    );
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ayudantes para las políticas (SECURITY DEFINER evita recursión en profiles)
CREATE OR REPLACE FUNCTION public.is_active_user() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_active);
$$;
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_active AND role = 'admin');
$$;

-- El usuario no puede subirse el rol ni reactivarse a sí mismo.
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    -- Sin usuario (panel/SQL Editor de Supabase) no aplica; anon no tiene permiso de UPDATE en profiles.
    IF auth.uid() IS NULL THEN RETURN NEW; END IF;
    IF NOT public.is_admin() AND (NEW.role <> OLD.role OR NEW.is_active <> OLD.is_active OR NEW.email <> OLD.email) THEN
        RAISE EXCEPTION 'Solo un administrador puede cambiar rol, estado o correo';
    END IF;
    IF public.is_admin() AND NEW.id = auth.uid() AND (NEW.role <> 'admin' OR NOT NEW.is_active) THEN
        RAISE EXCEPTION 'No puedes quitarte el rol de administrador ni desactivarte a ti mismo';
    END IF;
    RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_protect_profile ON public.profiles;
CREATE TRIGGER trg_protect_profile BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_fields();

-- 2. PIN para cambio rápido de usuario -----------------------------------------
-- El navegador nunca ve el hash. Tras 5 intentos fallidos el PIN se bloquea
-- y hay que entrar con contraseña (o que el admin lo reinicie).
CREATE OR REPLACE FUNCTION public.set_my_pin(p_pin TEXT) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
    IF p_pin !~ '^\d{4}$' THEN RAISE EXCEPTION 'El PIN debe tener 4 números'; END IF;
    UPDATE public.profiles SET pin_hash = crypt(p_pin, gen_salt('bf')), pin_failed_attempts = 0 WHERE id = auth.uid();
END $$;

CREATE OR REPLACE FUNCTION public.verify_my_pin(p_pin TEXT) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE r public.profiles;
BEGIN
    SELECT * INTO r FROM public.profiles WHERE id = auth.uid();
    IF r IS NULL OR NOT r.is_active OR r.pin_hash IS NULL OR r.pin_failed_attempts >= 5 THEN RETURN FALSE; END IF;
    IF r.pin_hash = crypt(p_pin, r.pin_hash) THEN
        UPDATE public.profiles SET pin_failed_attempts = 0, last_seen_at = NOW() WHERE id = r.id;
        RETURN TRUE;
    END IF;
    UPDATE public.profiles SET pin_failed_attempts = pin_failed_attempts + 1 WHERE id = r.id;
    RETURN FALSE;
END $$;

CREATE OR REPLACE FUNCTION public.reset_user_pin(p_user UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NOT public.is_admin() THEN RAISE EXCEPTION 'Solo un administrador'; END IF;
    UPDATE public.profiles SET pin_hash = NULL, pin_failed_attempts = 0 WHERE id = p_user;
END $$;

REVOKE ALL ON FUNCTION public.set_my_pin(TEXT), public.verify_my_pin(TEXT), public.reset_user_pin(UUID) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.set_my_pin(TEXT), public.verify_my_pin(TEXT), public.reset_user_pin(UUID) TO authenticated;
-- Permisos por columna: nadie lee el hash ni toca los intentos fallidos desde el navegador.
-- (Por eso en la app hay que pedir columnas explícitas, no select('*').)
REVOKE ALL ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, full_name, email, role, is_active, last_seen_at, created_at) ON public.profiles TO authenticated;
GRANT UPDATE (full_name, role, is_active) ON public.profiles TO authenticated;

-- 3. QUIÉN HIZO CADA MOVIMIENTO ---------------------------------------------------
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) DEFAULT auth.uid();
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) DEFAULT auth.uid();
ALTER TABLE public.valorization_certificates ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) DEFAULT auth.uid();

-- Corrección de conteo hacia arriba (waste_adjustment solo resta)
ALTER TYPE movement_type_enum ADD VALUE IF NOT EXISTS 'count_adjustment_in';

-- 4. STOCK: rechazar en vez de dejar en cero ---------------------------------------
-- Antes usaba GREATEST(0, ...) y "perdía" kilos sin avisar.
CREATE OR REPLACE FUNCTION apply_inventory_movement()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE disponible NUMERIC;
BEGIN
    IF NEW.movement_type IN ('dispatch', 'production_intake', 'waste_adjustment', 'internal_transfer') THEN
        IF NEW.from_warehouse_id IS NULL THEN RAISE EXCEPTION 'Falta la bodega de origen'; END IF;
        SELECT quantity INTO disponible FROM public.inventory_stock
        WHERE material_id = NEW.material_id AND warehouse_id = NEW.from_warehouse_id FOR UPDATE;
        IF COALESCE(disponible, 0) < NEW.quantity THEN
            RAISE EXCEPTION 'Stock insuficiente: hay % kg y se intentan sacar % kg', COALESCE(disponible, 0), NEW.quantity;
        END IF;
        UPDATE public.inventory_stock SET quantity = quantity - NEW.quantity, updated_at = NOW()
        WHERE material_id = NEW.material_id AND warehouse_id = NEW.from_warehouse_id;
    END IF;

    IF NEW.movement_type IN ('reception', 'production_output', 'internal_transfer', 'count_adjustment_in') THEN
        IF NEW.to_warehouse_id IS NULL THEN RAISE EXCEPTION 'Falta la bodega de destino'; END IF;
        INSERT INTO public.inventory_stock (material_id, warehouse_id, quantity, updated_at)
        VALUES (NEW.material_id, NEW.to_warehouse_id, NEW.quantity, NOW())
        ON CONFLICT (material_id, warehouse_id)
        DO UPDATE SET quantity = public.inventory_stock.quantity + NEW.quantity, updated_at = NOW();
    END IF;

    -- El total del catálogo siempre es la suma de las bodegas (no puede descuadrarse)
    UPDATE public.materials_and_products
    SET current_stock = (SELECT COALESCE(SUM(quantity), 0) FROM public.inventory_stock WHERE material_id = NEW.material_id),
        updated_at = NOW()
    WHERE id = NEW.material_id;
    RETURN NEW;
END $$;

-- 5. PERMISOS POR ROL (RLS) -----------------------------------------------------
-- Borra las políticas "acceso total a anon" del schema original.
DROP POLICY IF EXISTS "Permitir lectura y escritura a anon y autenticados en warehouses" ON public.warehouses;
DROP POLICY IF EXISTS "Permitir lectura y escritura a anon y autenticados en stakeholders" ON public.stakeholders;
DROP POLICY IF EXISTS "Permitir lectura y escritura a anon y autenticados en materials" ON public.materials_and_products;
DROP POLICY IF EXISTS "Permitir lectura y escritura a anon y autenticados en batches" ON public.batches;
DROP POLICY IF EXISTS "Permitir lectura y escritura a anon y autenticados en stock" ON public.inventory_stock;
DROP POLICY IF EXISTS "Permitir lectura y escritura a anon y autenticados en movements" ON public.inventory_movements;
DROP POLICY IF EXISTS "Permitir lectura y escritura a anon y autenticados en certs" ON public.valorization_certificates;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Perfiles: cada uno ve el suyo; el admin ve y edita todos.
CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin());
CREATE POLICY profiles_update ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_admin());

-- Lectura de la planta: cualquier usuario activo.
CREATE POLICY warehouses_select ON public.warehouses FOR SELECT TO authenticated USING (public.is_active_user());
CREATE POLICY stakeholders_select ON public.stakeholders FOR SELECT TO authenticated USING (public.is_active_user());
CREATE POLICY materials_select ON public.materials_and_products FOR SELECT TO authenticated USING (public.is_active_user());
CREATE POLICY batches_select ON public.batches FOR SELECT TO authenticated USING (public.is_active_user());
CREATE POLICY stock_select ON public.inventory_stock FOR SELECT TO authenticated USING (public.is_active_user());
CREATE POLICY movements_select ON public.inventory_movements FOR SELECT TO authenticated USING (public.is_active_user());

-- Operario y admin: registrar movimientos y lotes, avanzar etapas.
CREATE POLICY movements_insert ON public.inventory_movements FOR INSERT TO authenticated
    WITH CHECK (public.is_active_user() AND created_by = auth.uid());
CREATE POLICY batches_insert ON public.batches FOR INSERT TO authenticated
    WITH CHECK (public.is_active_user() AND created_by = auth.uid());
CREATE POLICY batches_update ON public.batches FOR UPDATE TO authenticated USING (public.is_active_user());
-- (inventory_stock no tiene políticas de escritura: solo lo cambia el trigger)
-- (inventory_movements no tiene UPDATE ni DELETE: el kardex es inmutable)

-- Solo admin: catálogo, bodegas, empresas, borrar lotes.
CREATE POLICY materials_admin ON public.materials_and_products FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY warehouses_admin ON public.warehouses FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY stakeholders_admin ON public.stakeholders FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY batches_delete ON public.batches FOR DELETE TO authenticated USING (public.is_admin());

-- Certificados: solo admin ve y emite.
CREATE POLICY certs_admin ON public.valorization_certificates FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 6. ARCHIVOS: solo usuarios activos (antes cualquiera podía subir) ----------------
DROP POLICY IF EXISTS "Acceso Publico a Media de Greenspot" ON storage.objects;
DROP POLICY IF EXISTS "Subida Permitida en Media de Greenspot" ON storage.objects;
DROP POLICY IF EXISTS "Acceso Publico a Documentos de Greenspot" ON storage.objects;
DROP POLICY IF EXISTS "Subida Permitida en Documentos de Greenspot" ON storage.objects;
UPDATE storage.buckets SET public = false WHERE id IN ('greenspot-media', 'greenspot-docs');
CREATE POLICY greenspot_files_select ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id IN ('greenspot-media', 'greenspot-docs') AND public.is_active_user());
CREATE POLICY greenspot_files_insert ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id IN ('greenspot-media', 'greenspot-docs') AND public.is_active_user());

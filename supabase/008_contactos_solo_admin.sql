-- ==============================================================================
-- GREENSPOT · 008 · Contactos de empresas solo para administración
-- Se aplica después de 004. Se puede correr de nuevo sin daño. No cambia tablas ni datos.
-- El operario necesita el nombre y el RUT de las empresas (camión, salidas), pero no su correo,
-- teléfono ni dirección. Mismo patrón que profiles en 003: permisos por columna.
-- ==============================================================================

-- Lectura directa: sin columnas de contacto para nadie.
REVOKE SELECT ON public.stakeholders FROM anon, authenticated;
GRANT SELECT (id, name, type, tax_id, city, industry_sector, notes, created_at, updated_at)
    ON public.stakeholders TO authenticated;

-- La app lee las empresas con esta función: administración recibe los contactos; el operario, vacíos.
CREATE OR REPLACE FUNCTION public.empresas()
RETURNS SETOF public.stakeholders LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT id, name, type, tax_id,
           CASE WHEN public.is_admin() THEN contact_email END,
           CASE WHEN public.is_admin() THEN contact_phone END,
           CASE WHEN public.is_admin() THEN address END,
           city, industry_sector, notes, created_at, updated_at
      FROM public.stakeholders
     WHERE public.is_active_user();
$$;
REVOKE ALL ON FUNCTION public.empresas() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.empresas() TO authenticated;

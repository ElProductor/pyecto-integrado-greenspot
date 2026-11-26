-- GREENSPOT · 009 · Se quita el código QR de los certificados (decisión del grupo).
-- Se puede correr de nuevo sin daño. Borra la columna y su contenido.
ALTER TABLE public.valorization_certificates DROP COLUMN IF EXISTS qr_verification_code;

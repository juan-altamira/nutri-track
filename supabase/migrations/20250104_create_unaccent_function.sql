-- Función para normalizar texto removiendo acentos y caracteres especiales
-- Útil para búsquedas insensibles a acentos sin requerir la extensión unaccent
CREATE OR REPLACE FUNCTION public.normalize_text(text TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT lower(
    translate(
      $1,
      'áéíóúàèìòùäëïöüâêîôûãõñçÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÂÊÎÔÛÃÕÑÇ',
      'aeiouaeiouaeiouaoncAEIOUAEIOUAEIOUAEIOUAONC'
    )
  );
$$;

-- Función RPC para buscar alimentos globales con búsqueda insensible a acentos
CREATE OR REPLACE FUNCTION public.search_foods_normalized(search_term TEXT)
RETURNS TABLE(id TEXT, name TEXT)
LANGUAGE SQL
STABLE
AS $$
  SELECT id::TEXT, name
  FROM public."Food"
  WHERE public.normalize_text(name) LIKE '%' || search_term || '%'
  ORDER BY name
  LIMIT 10;
$$;

-- Función RPC para buscar alimentos del usuario con búsqueda insensible a acentos
CREATE OR REPLACE FUNCTION public.search_userfoods_normalized(search_term TEXT)
RETURNS TABLE(id TEXT, name TEXT)
LANGUAGE SQL
STABLE
AS $$
  SELECT id::TEXT, name
  FROM public."UserFood"
  WHERE public.normalize_text(name) LIKE '%' || search_term || '%'
  ORDER BY name
  LIMIT 10;
$$;

-- Índice funcional en Food.name para acelerar búsquedas normalizadas
CREATE INDEX IF NOT EXISTS idx_food_name_normalized
ON public."Food" (public.normalize_text(name));

-- Índice funcional en UserFood.name para acelerar búsquedas normalizadas
CREATE INDEX IF NOT EXISTS idx_userfood_name_normalized
ON public."UserFood" (public.normalize_text(name));

-- Comentarios para documentación
COMMENT ON FUNCTION public.normalize_text IS 'Normaliza texto removiendo acentos y convirtiendo a minúsculas para búsquedas insensibles a acentos';
COMMENT ON FUNCTION public.search_foods_normalized IS 'Busca alimentos globales ignorando acentos y mayúsculas';
COMMENT ON FUNCTION public.search_userfoods_normalized IS 'Busca alimentos del usuario ignorando acentos y mayúsculas';

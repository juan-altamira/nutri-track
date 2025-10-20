-- Verificar alimentos existentes en la base de datos
SELECT 
  id,
  name,
  source,
  "createdAt"
FROM "Food"
ORDER BY "createdAt" DESC;

-- Contar por source
SELECT 
  source,
  COUNT(*) as total
FROM "Food"
GROUP BY source;

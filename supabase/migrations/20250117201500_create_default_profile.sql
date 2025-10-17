-- Crear función para crear perfil por defecto cuando se registra un usuario
CREATE OR REPLACE FUNCTION public.create_default_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Crear perfil por defecto con nombre "Perfil principal"
  INSERT INTO public."UserProfile" ("userId", name, age, sex)
  VALUES (NEW.id, 'Perfil principal', 25, 'MALE');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger que se ejecuta cuando se crea un nuevo usuario
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_user_profile();

COMMENT ON FUNCTION public.create_default_user_profile() IS 'Crea automáticamente un perfil por defecto cuando se registra un nuevo usuario';
